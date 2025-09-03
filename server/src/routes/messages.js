import express from 'express';
import {
  markMessageAsRead,
  deleteMessage
} from '../controllers/messages.js';
import { authenticate } from '../middlewares/auth.js';
import { mongoIdValidation } from '../middlewares/validation.js';

const router = express.Router();

// All message routes require authentication
router.use(authenticate);

// Mark specific message as read
router.post('/:id/read',
  mongoIdValidation('id'),
  markMessageAsRead
);

// Delete message
router.delete('/:id',
  mongoIdValidation('id'),
  deleteMessage
);

export default router;