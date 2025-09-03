import { Message, Conversation } from '../models/index.js';
import { asyncHandler } from '../middlewares/error.js';

export const searchMessages = asyncHandler(async (req, res) => {
  const { q, conversationId } = req.query;
  const currentUserId = req.user._id;
  
  if (!q) {
    return res.json({
      ok: true,
      data: []
    });
  }
  
  // Build base query
  let query = {
    deletedFor: { $ne: currentUserId },
    $text: { $search: q }
  };
  
  // If conversationId is provided, search within specific conversation
  if (conversationId) {
    // Verify user is member of the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
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
    
    query.conversationId = conversationId;
  } else {
    // Search only in conversations where user is a member
    const userConversations = await Conversation.find({
      members: currentUserId
    }).select('_id');
    
    const conversationIds = userConversations.map(c => c._id);
    query.conversationId = { $in: conversationIds };
  }
  
  // Perform search
  const messages = await Message.find(query)
    .populate('senderId', 'displayName avatarUrl')
    .populate('conversationId', 'name type members')
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .limit(50)
    .lean();
  
  // Filter out messages from conversations user is not a member of (additional safety check)
  const filteredMessages = messages.filter(message => 
    message.conversationId.members.some(memberId => 
      memberId.toString() === currentUserId.toString()
    )
  );
  
  res.json({
    ok: true,
    data: filteredMessages
  });
});

export const searchConversations = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const currentUserId = req.user._id;
  
  if (!q) {
    return res.json({
      ok: true,
      data: []
    });
  }
  
  // Search conversations by name (for group conversations)
  const conversations = await Conversation.find({
    members: currentUserId,
    type: 'group',
    name: { $regex: q, $options: 'i' }
  })
  .populate('members', 'displayName email avatarUrl')
  .sort({ lastMessageAt: -1 })
  .limit(20);
  
  res.json({
    ok: true,
    data: conversations
  });
});