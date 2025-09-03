import mongoose from 'mongoose';
import { Conversation, Message, User } from '../models/index.js';
import { asyncHandler } from '../middlewares/error.js';

export const createConversation = asyncHandler(async (req, res) => {
  const { type, memberIds, name } = req.body;
  const currentUserId = req.user._id;
  
  // Add current user to members if not already included
  const allMemberIds = [...new Set([...memberIds, currentUserId.toString()])];
  
  // Validate that all member IDs exist
  const users = await User.find({ _id: { $in: allMemberIds } });
  if (users.length !== allMemberIds.length) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'INVALID_MEMBERS',
        message: 'One or more member IDs are invalid'
      }
    });
  }
  
  // For direct conversations, check if one already exists
  if (type === 'direct') {
    if (allMemberIds.length !== 2) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_DIRECT_CONVERSATION',
          message: 'Direct conversations must have exactly 2 members'
        }
      });
    }
    
    // Check if direct conversation already exists
    const existingConversation = await Conversation.findOne({
      type: 'direct',
      members: { $all: allMemberIds, $size: 2 }
    });
    
    if (existingConversation) {
      return res.json({
        ok: true,
        data: {
          conversation: await existingConversation.populate('members', 'displayName email avatarUrl status lastActiveAt')
        }
      });
    }
  }
  
  // Create conversation
  const conversationData = {
    type,
    members: allMemberIds,
    ...(type === 'group' && { 
      name, 
      adminIds: [currentUserId] // Creator is admin for group conversations
    })
  };
  
  const conversation = new Conversation(conversationData);
  await conversation.save();
  
  await conversation.populate('members', 'displayName email avatarUrl status lastActiveAt');
  
  res.status(201).json({
    ok: true,
    data: {
      conversation
    }
  });
});

export const getConversations = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;
  
  // Get all conversations where user is a member
  const conversations = await Conversation.find({
    members: currentUserId
  })
  .populate('members', 'displayName email avatarUrl status lastActiveAt')
  .sort({ lastMessageAt: -1 })
  .lean();
  
  // Get last message for each conversation
  const conversationIds = conversations.map(c => c._id);
  const lastMessages = await Message.aggregate([
    {
      $match: {
        conversationId: { $in: conversationIds },
        deletedFor: { $ne: currentUserId }
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $first: '$$ROOT' }
      }
    }
  ]);
  
  // Map last messages to conversations
  const lastMessageMap = lastMessages.reduce((acc, item) => {
    acc[item._id] = item.lastMessage;
    return acc;
  }, {});
  
  // Add last message and unread count to each conversation
  const conversationsWithData = await Promise.all(
    conversations.map(async (conversation) => {
      const lastMessage = lastMessageMap[conversation._id];
      
      // Get user's last read time for this conversation
      // Handle both Map (new format) and Object (old format) structures
      let lastReadAt = new Date(0);
      if (conversation.lastReadAt) {
        if (typeof conversation.lastReadAt.get === 'function') {
          // New Map format
          lastReadAt = conversation.lastReadAt.get(currentUserId.toString()) || new Date(0);
        } else if (conversation.lastReadAt[currentUserId.toString()]) {
          // Old Object format
          lastReadAt = conversation.lastReadAt[currentUserId.toString()] || new Date(0);
        }
      }
      
      // Count unread messages (messages created after last read time)
      const unreadCount = await Message.countDocuments({
        conversationId: conversation._id,
        senderId: { $ne: currentUserId },
        deletedFor: { $ne: currentUserId },
        createdAt: { $gt: lastReadAt }
      });
      
      return {
        ...conversation,
        lastMessage: lastMessage || null,
        unreadCount
      };
    })
  );
  
  res.json({
    ok: true,
    data: conversationsWithData
  });
});

export const getConversation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user._id;
  
  const conversation = await Conversation.findOne({
    _id: id,
    members: currentUserId
  }).populate('members', 'displayName email avatarUrl status lastActiveAt');
  
  if (!conversation) {
    return res.status(404).json({
      ok: false,
      error: {
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Conversation not found or access denied'
      }
    });
  }
  
  res.json({
    ok: true,
    data: {
      conversation
    }
  });
});

export const updateConversation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, memberIds } = req.body;
  const currentUserId = req.user._id;
  
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
  
  // Only group conversations can be updated
  if (conversation.type !== 'group') {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'INVALID_OPERATION',
        message: 'Cannot update direct conversations'
      }
    });
  }
  
  // Only admins can update group conversations
  if (!conversation.isAdmin(currentUserId)) {
    return res.status(403).json({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Only admins can update group conversations'
      }
    });
  }
  
  // Update name if provided
  if (name !== undefined) {
    conversation.name = name;
  }
  
  // Update members if provided
  if (memberIds !== undefined) {
    // Validate that all member IDs exist
    const users = await User.find({ _id: { $in: memberIds } });
    if (users.length !== memberIds.length) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_MEMBERS',
          message: 'One or more member IDs are invalid'
        }
      });
    }
    
    conversation.members = memberIds;
    
    // Remove any admin who is no longer a member
    conversation.adminIds = conversation.adminIds.filter(adminId =>
      memberIds.includes(adminId.toString())
    );
    
    // Ensure at least one admin remains
    if (conversation.adminIds.length === 0) {
      conversation.adminIds = [memberIds[0]];
    }
  }
  
  await conversation.save();
  await conversation.populate('members', 'displayName email avatarUrl status lastActiveAt');
  
  res.json({
    ok: true,
    data: {
      conversation
    }
  });
});

export const leaveConversation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user._id;
  
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
  
  // Cannot leave direct conversations
  if (conversation.type === 'direct') {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'INVALID_OPERATION',
        message: 'Cannot leave direct conversations'
      }
    });
  }
  
  // Remove user from members and admins
  conversation.members = conversation.members.filter(
    memberId => !memberId.equals(currentUserId)
  );
  conversation.adminIds = conversation.adminIds.filter(
    adminId => !adminId.equals(currentUserId)
  );
  
  // If no members left, delete conversation
  if (conversation.members.length === 0) {
    await Conversation.findByIdAndDelete(id);
    await Message.deleteMany({ conversationId: id });
  } else {
    // Ensure at least one admin remains
    if (conversation.adminIds.length === 0 && conversation.members.length > 0) {
      conversation.adminIds = [conversation.members[0]];
    }
    await conversation.save();
  }
  
  res.json({
    ok: true,
    data: {
      message: 'Successfully left conversation'
    }
  });
});