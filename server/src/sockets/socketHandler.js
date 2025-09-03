import { verifyToken } from '../services/jwt.js';
import { User, Conversation, Message } from '../models/index.js';

// Store active connections
const activeConnections = new Map(); // userId -> { socketId, lastSeen, status }
const typingUsers = new Map(); // conversationId -> Set of userIds
const activeCalls = new Map(); // callId -> { participants, type, status }
const userInCall = new Map(); // userId -> callId

export const initializeSocket = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('-passwordHash');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`User ${socket.user.displayName} connected (${userId})`);

    // Store active connection
    activeConnections.set(userId, {
      socketId: socket.id,
      lastSeen: new Date(),
      status: 'online'
    });

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Join user to all their conversation rooms
    const userConversations = await Conversation.find({
      members: userId
    }).select('_id');

    for (const conversation of userConversations) {
      socket.join(`conv:${conversation._id}`);
    }

    // Broadcast user online status
    socket.broadcast.emit('presence:update', {
      userId,
      status: 'online',
      lastActiveAt: new Date()
    });

    // Handle message sending
    socket.on('message:send', async (data) => {
      try {
        const { conversationId, body, type = 'text', fileUrl, fileName, fileSize, meta, tempId } = data;

        // Verify user is member of conversation
        const conversation = await Conversation.findOne({
          _id: conversationId,
          members: userId
        });

        if (!conversation) {
          socket.emit('message:error', {
            tempId,
            error: 'Conversation not found or access denied'
          });
          return;
        }

        // Create message
        const messageData = {
          conversationId,
          senderId: userId,
          body,
          type
        };

        if (fileUrl) messageData.fileUrl = fileUrl;
        if (fileName) messageData.fileName = fileName;
        if (fileSize) messageData.fileSize = fileSize;
        if (meta) messageData.meta = meta;

        const message = new Message(messageData);
        await message.save();

        // Update conversation's lastMessageAt
        conversation.lastMessageAt = new Date();
        await conversation.save();

        // Populate sender info
        await message.populate('senderId', 'displayName avatarUrl');

        // Send acknowledgment to sender
        socket.emit('message:ack', {
          tempId,
          message
        });

        // Broadcast message to all conversation members
        socket.to(`conv:${conversationId}`).emit('message:new', {
          message
        });

      } catch (error) {
        console.error('Message send error:', error);
        socket.emit('message:error', {
          tempId: data.tempId,
          error: 'Failed to send message'
        });
      }
    });

    // Handle typing indicators
    socket.on('typing:start', async (data) => {
      const { conversationId } = data;
      
      // Verify user is member of conversation
      const conversation = await Conversation.findOne({
        _id: conversationId,
        members: userId
      });

      if (!conversation) return;

      // Add user to typing users for this conversation
      if (!typingUsers.has(conversationId)) {
        typingUsers.set(conversationId, new Set());
      }
      typingUsers.get(conversationId).add(userId);

      // Broadcast typing indicator to other conversation members
      socket.to(`conv:${conversationId}`).emit('typing', {
        conversationId,
        userId,
        displayName: socket.user.displayName,
        isTyping: true
      });
    });

    socket.on('typing:stop', async (data) => {
      const { conversationId } = data;
      
      // Remove user from typing users
      if (typingUsers.has(conversationId)) {
        typingUsers.get(conversationId).delete(userId);
        
        // Clean up empty sets
        if (typingUsers.get(conversationId).size === 0) {
          typingUsers.delete(conversationId);
        }
      }

      // Broadcast stop typing indicator
      socket.to(`conv:${conversationId}`).emit('typing', {
        conversationId,
        userId,
        displayName: socket.user.displayName,
        isTyping: false
      });
    });

    // Handle message read receipts
    socket.on('message:read', async (data) => {
      try {
        const { messageId, conversationId } = data;

        const message = await Message.findById(messageId);
        if (!message) return;

        // Verify user is member of the conversation
        const conversation = await Conversation.findOne({
          _id: conversationId,
          members: userId
        });

        if (!conversation) return;

        // Mark message as read
        await message.markAsRead(userId);

        // Broadcast read receipt to conversation members
        socket.to(`conv:${conversationId}`).emit('message:read', {
          messageId,
          userId,
          readAt: new Date()
        });

      } catch (error) {
        console.error('Message read error:', error);
      }
    });

    // Handle presence ping
    socket.on('presence:ping', () => {
      if (activeConnections.has(userId)) {
        activeConnections.get(userId).lastSeen = new Date();
      }
      
      // Update user's last active timestamp
      socket.user.updateLastActive();
    });

    // Handle conversation joining (when user opens a conversation)
    socket.on('conversation:join', async (data) => {
      const { conversationId } = data;
      
      // Verify user is member of conversation
      const conversation = await Conversation.findOne({
        _id: conversationId,
        members: userId
      });

      if (conversation) {
        socket.join(`conv:${conversationId}`);
        
        // Update user's last read time for this conversation
        await conversation.updateLastReadAt(userId);
        
        // Broadcast updated conversation to notify unread count changes
        socket.to(`conv:${conversationId}`).emit('conversation:updated', {
          conversationId,
          lastReadAt: {
            [userId]: new Date()
          }
        });
      }
    });

    // Handle conversation leaving
    socket.on('conversation:leave', (data) => {
      const { conversationId } = data;
      socket.leave(`conv:${conversationId}`);
      
      // Stop any typing indicators
      if (typingUsers.has(conversationId)) {
        typingUsers.get(conversationId).delete(userId);
      }
    });

    // WebRTC Calling Signaling Events
    
    // Initialize call
    socket.on('call:init', async (data) => {
      try {
        const { targetUserId, conversationId, type = 'voice' } = data; // type: 'voice' | 'video'
        
        // Check if user is in a call already
        if (userInCall.has(userId)) {
          socket.emit('call:error', { error: 'Already in a call' });
          return;
        }
        
        // Check if target user is online
        const targetConnection = activeConnections.get(targetUserId);
        if (!targetConnection) {
          socket.emit('call:error', { error: 'User is offline' });
          return;
        }
        
        // Check if target user is in a call
        if (userInCall.has(targetUserId)) {
          socket.emit('call:error', { error: 'User is busy' });
          return;
        }
        
        // Verify conversation membership
        const conversation = await Conversation.findOne({
          _id: conversationId,
          members: { $all: [userId, targetUserId] }
        });
        
        if (!conversation) {
          socket.emit('call:error', { error: 'Invalid conversation' });
          return;
        }
        
        const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create call session
        activeCalls.set(callId, {
          participants: [userId, targetUserId],
          initiator: userId,
          type,
          status: 'ringing',
          conversationId,
          startTime: new Date()
        });
        
        // Mark both users as in call
        userInCall.set(userId, callId);
        userInCall.set(targetUserId, callId);
        
        // Update user status
        if (activeConnections.has(userId)) {
          activeConnections.get(userId).status = 'in-call';
        }
        
        // Send ringing to target user
        io.to(`user:${targetUserId}`).emit('call:ringing', {
          callId,
          from: {
            userId,
            displayName: socket.user.displayName,
            avatarUrl: socket.user.avatarUrl
          },
          type,
          conversationId
        });
        
        // Confirm to initiator
        socket.emit('call:initiated', {
          callId,
          targetUserId,
          type,
          status: 'ringing'
        });
        
      } catch (error) {
        console.error('Call init error:', error);
        socket.emit('call:error', { error: 'Failed to initiate call' });
      }
    });
    
    // Answer call
    socket.on('call:answer', async (data) => {
      try {
        const { callId } = data;
        const call = activeCalls.get(callId);
        
        if (!call || !call.participants.includes(userId)) {
          socket.emit('call:error', { error: 'Invalid call' });
          return;
        }
        
        call.status = 'active';
        call.answerTime = new Date();
        
        // Update user status
        if (activeConnections.has(userId)) {
          activeConnections.get(userId).status = 'in-call';
        }
        
        // Notify initiator
        const initiatorId = call.participants.find(id => id !== userId);
        io.to(`user:${initiatorId}`).emit('call:answered', {
          callId,
          answeredBy: userId
        });
        
        socket.emit('call:answered', { callId });
        
      } catch (error) {
        console.error('Call answer error:', error);
        socket.emit('call:error', { error: 'Failed to answer call' });
      }
    });
    
    // Reject call
    socket.on('call:reject', async (data) => {
      try {
        const { callId } = data;
        const call = activeCalls.get(callId);
        
        if (!call || !call.participants.includes(userId)) {
          socket.emit('call:error', { error: 'Invalid call' });
          return;
        }
        
        // Clean up call
        for (const participantId of call.participants) {
          userInCall.delete(participantId);
          if (activeConnections.has(participantId)) {
            activeConnections.get(participantId).status = 'online';
          }
        }
        
        activeCalls.delete(callId);
        
        // Notify other participant
        const otherParticipant = call.participants.find(id => id !== userId);
        io.to(`user:${otherParticipant}`).emit('call:rejected', {
          callId,
          rejectedBy: userId
        });
        
      } catch (error) {
        console.error('Call reject error:', error);
        socket.emit('call:error', { error: 'Failed to reject call' });
      }
    });
    
    // Hang up call
    socket.on('call:hangup', async (data) => {
      try {
        const { callId } = data;
        const call = activeCalls.get(callId);
        
        if (!call || !call.participants.includes(userId)) {
          socket.emit('call:error', { error: 'Invalid call' });
          return;
        }
        
        call.endTime = new Date();
        call.status = 'ended';
        
        // Clean up call
        for (const participantId of call.participants) {
          userInCall.delete(participantId);
          if (activeConnections.has(participantId)) {
            activeConnections.get(participantId).status = 'online';
          }
        }
        
        // Notify other participants
        for (const participantId of call.participants) {
          if (participantId !== userId) {
            io.to(`user:${participantId}`).emit('call:hangup', {
              callId,
              hangupBy: userId
            });
          }
        }
        
        activeCalls.delete(callId);
        
      } catch (error) {
        console.error('Call hangup error:', error);
        socket.emit('call:error', { error: 'Failed to hang up call' });
      }
    });
    
    // Handle WebRTC offer
    socket.on('call:offer', (data) => {
      try {
        const { callId, offer } = data;
        const call = activeCalls.get(callId);
        
        if (!call || !call.participants.includes(userId)) {
          return;
        }
        
        // Forward offer to other participant
        const otherParticipant = call.participants.find(id => id !== userId);
        io.to(`user:${otherParticipant}`).emit('call:offer', {
          callId,
          offer,
          from: userId
        });
        
      } catch (error) {
        console.error('WebRTC offer error:', error);
      }
    });
    
    // Handle WebRTC answer
    socket.on('call:answer-signal', (data) => {
      try {
        const { callId, answer } = data;
        const call = activeCalls.get(callId);
        
        if (!call || !call.participants.includes(userId)) {
          return;
        }
        
        // Forward answer to other participant
        const otherParticipant = call.participants.find(id => id !== userId);
        io.to(`user:${otherParticipant}`).emit('call:answer-signal', {
          callId,
          answer,
          from: userId
        });
        
      } catch (error) {
        console.error('WebRTC answer error:', error);
      }
    });

    // Handle ICE candidates
    socket.on('call:candidate', (data) => {
      try {
        const { callId, candidate } = data;
        const call = activeCalls.get(callId);
        
        if (!call || !call.participants.includes(userId)) {
          return;
        }
        
        // Forward ICE candidate to other participant
        const otherParticipant = call.participants.find(id => id !== userId);
        io.to(`user:${otherParticipant}`).emit('call:candidate', {
          callId,
          candidate,
          from: userId
        });
        
      } catch (error) {
        console.error('ICE candidate error:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.displayName} disconnected (${userId})`);
      
      // Remove from active connections
      activeConnections.delete(userId);
      
      // Clean up active calls
      if (userInCall.has(userId)) {
        const callId = userInCall.get(userId);
        const call = activeCalls.get(callId);
        
        if (call) {
          call.endTime = new Date();
          call.status = 'ended';
          
          // Clean up call for all participants
          for (const participantId of call.participants) {
            userInCall.delete(participantId);
            if (activeConnections.has(participantId)) {
              activeConnections.get(participantId).status = 'online';
            }
          }
          
          // Notify other participants of disconnect
          for (const participantId of call.participants) {
            if (participantId !== userId) {
              io.to(`user:${participantId}`).emit('call:hangup', {
                callId,
                hangupBy: userId,
                reason: 'disconnect'
              });
            }
          }
          
          activeCalls.delete(callId);
        }
      }

      // Clean up typing indicators
      for (const [conversationId, typingSet] of typingUsers.entries()) {
        if (typingSet.has(userId)) {
          typingSet.delete(userId);
          // Broadcast stop typing
          socket.to(`conv:${conversationId}`).emit('typing', {
            conversationId,
            userId,
            displayName: socket.user.displayName,
            isTyping: false
          });
        }
      }

      // Broadcast user offline status (after a delay to handle reconnections)
      setTimeout(() => {
        if (!activeConnections.has(userId)) {
          socket.broadcast.emit('presence:update', {
            userId,
            status: 'offline',
            lastActiveAt: new Date()
          });
        }
      }, 5000);
    });
  });

  // Cleanup inactive typing indicators periodically
  setInterval(() => {
    const now = Date.now();
    for (const [userId, connection] of activeConnections.entries()) {
      if (now - connection.lastSeen.getTime() > 60000) { // 1 minute timeout
        // Clean up typing indicators for inactive users
        for (const [conversationId, typingSet] of typingUsers.entries()) {
          if (typingSet.has(userId)) {
            typingSet.delete(userId);
            io.to(`conv:${conversationId}`).emit('typing', {
              conversationId,
              userId,
              isTyping: false
            });
          }
        }
      }
    }
  }, 30000); // Check every 30 seconds
};

// Helper function to get online users
export const getOnlineUsers = () => {
  return Array.from(activeConnections.keys());
};