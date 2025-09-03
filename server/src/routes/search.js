import express from 'express';
import { searchMessages, searchConversations } from '../controllers/search.js';
import { authenticate } from '../middlewares/auth.js';
import { searchValidation } from '../middlewares/validation.js';

const router = express.Router();

// All search routes require authentication
router.use(authenticate);

// Search messages
router.get('/messages', searchValidation, searchMessages);

// Search conversations
router.get('/conversations', searchValidation, searchConversations);

export default router;