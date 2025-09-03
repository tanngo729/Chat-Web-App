import express from 'express';
import {
  createConversation,
  getConversations,
  getConversation,
  updateConversation,
  leaveConversation
} from '../controllers/conversations.js';
import {
  getMessages,
  sendMessage,
  markConversationAsRead
} from '../controllers/messages.js';
import { authenticate } from '../middlewares/auth.js';
import {
  createConversationValidation,
  updateConversationValidation,
  sendMessageValidation,
  paginationValidation,
  mongoIdValidation
} from '../middlewares/validation.js';

const router = express.Router();

// All conversation routes require authentication
router.use(authenticate);

// Create conversation
router.post('/', createConversationValidation, createConversation);

// Get user's conversations
router.get('/', getConversations);

// Get specific conversation
router.get('/:id', mongoIdValidation('id'), getConversation);

// Update conversation (group only)
router.patch('/:id', mongoIdValidation('id'), updateConversationValidation, updateConversation);

// Leave conversation (group only)
router.delete('/:id/leave', mongoIdValidation('id'), leaveConversation);

// Message routes within conversations
// Get messages for a conversation
router.get('/:id/messages', 
  mongoIdValidation('id'), 
  paginationValidation, 
  getMessages
);

// Send message to conversation
router.post('/:id/messages',
  mongoIdValidation('id'),
  sendMessageValidation,
  sendMessage
);

// Mark conversation as read
router.post('/:id/read',
  mongoIdValidation('id'),
  markConversationAsRead
);

export default router;