import { Message, Conversation } from '../models/index.js';
import { asyncHandler } from '../middlewares/error.js';

export const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.params; // conversation id
  const { cursor, limit = 50 } = req.query;
  const currentUserId = req.user._id;
  
  // Verify user is member of conversation
  const conversation = await Conversation.findOne({
    _id: id,
    members: currentUserId
  });
  
  if (!conversation) {
    return res.status(404).json({
      ok: false,
      error: {
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Conversation not found or access denied'
      }
    });
  }
  
  // Build query
  const query = {
    conversationId: id,
    deletedFor: { $ne: currentUserId }
  };
  
  // Add cursor for pagination
  if (cursor) {
    query._id = { $lt: cursor };
  }
  
  // Get messages
  const messages = await Message.find(query)
    .populate('senderId', 'displayName avatarUrl')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();
  
  // Format messages for user (handle deleted messages)
  const formattedMessages = messages.map(message => {
    if (message.deletedFor.includes(currentUserId)) {
      return {
        ...message,
        body: '[Deleted]',
        type: 'text',
        fileUrl: null,
        fileName: null,
        fileSize: null
      };
    }
    return message;
  }).reverse(); // Reverse to get chronological order
  
  res.json({
    ok: true,
    data: {
      messages: formattedMessages,
      hasMore: messages.length === parseInt(limit),
      nextCursor: messages.length > 0 ? messages[messages.length - 1]._id : null
    }
  });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { id } = req.params; // conversation id
  const { body, type = 'text', fileUrl, fileName, fileSize, meta, tempId } = req.body;
  const currentUserId = req.user._id;
  
  // Verify user is member of conversation
  const conversation = await Conversation.findOne({
    _id: id,
    members: currentUserId
  });
  
  if (!conversation) {
    return res.status(404).json({
      ok: false,
      error: {
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Conversation not found or access denied'
      }
    });
  }
  
  // Create message
  const messageData = {
    conversationId: id,
    senderId: currentUserId,
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
  
  res.status(201).json({
    ok: true,
    data: {
      message,
      tempId // Return tempId for client-side optimistic updates
    }
  });
});

export const markMessageAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params; // message id
  const currentUserId = req.user._id;
  
  const message = await Message.findById(id);
  if (!message) {
    return res.status(404).json({
      ok: false,
      error: {
        code: 'MESSAGE_NOT_FOUND',
        message: 'Message not found'
      }
    });
  }
  
  // Verify user is member of the conversation
  const conversation = await Conversation.findOne({
    _id: message.conversationId,
    members: currentUserId
  });
  
  if (!conversation) {
    return res.status(403).json({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied'
      }
    });
  }
  
  // Mark as read
  await message.markAsRead(currentUserId);
  
  res.json({
    ok: true,
    data: {
      message: 'Message marked as read'
    }
  });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const { id } = req.params; // message id
  const currentUserId = req.user._id;
  
  const message = await Message.findById(id);
  if (!message) {
    return res.status(404).json({
      ok: false,
      error: {
        code: 'MESSAGE_NOT_FOUND',
        message: 'Message not found'
      }
    });
  }
  
  // Verify user is member of the conversation
  const conversation = await Conversation.findOne({
    _id: message.conversationId,
    members: currentUserId
  });
  
  if (!conversation) {
    return res.status(403).json({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied'
      }
    });
  }
  
  // Check if user can delete this message
  const canDelete = message.senderId.equals(currentUserId) || 
                   (conversation.type === 'group' && conversation.isAdmin(currentUserId));
  
  if (!canDelete) {
    return res.status(403).json({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You can only delete your own messages'
      }
    });
  }
  
  // Soft delete message
  await message.deleteFor(currentUserId);
  
  res.json({
    ok: true,
    data: {
      message: 'Message deleted'
    }
  });
});

// Bulk mark messages as read for a conversation
export const markConversationAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params; // conversation id
  const currentUserId = req.user._id;
  
  // Verify user is member of conversation
  const conversation = await Conversation.findOne({
    _id: id,
    members: currentUserId
  });
  
  if (!conversation) {
    return res.status(404).json({
      ok: false,
      error: {
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Conversation not found or access denied'
      }
    });
  }
  
  // Update the user's last read time for this conversation
  await conversation.updateLastReadAt(currentUserId);
  
  res.json({
    ok: true,
    data: {
      message: 'Conversation marked as read'
    }
  });
});