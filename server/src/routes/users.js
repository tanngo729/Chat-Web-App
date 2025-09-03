import express from 'express';
import { searchUsers, updateProfile, getUserProfile, uploadAvatar, upload } from '../controllers/users.js';
import { authenticate } from '../middlewares/auth.js';
import { updateProfileValidation, mongoIdValidation } from '../middlewares/validation.js';
import { query } from 'express-validator';

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

// Search users
router.get('/search', [
  query('q').optional().trim().isLength({ min: 1, max: 50 }),
], searchUsers);

// Update current user profile
router.put('/profile', updateProfileValidation, updateProfile);

// Upload avatar
router.post('/avatar', upload.single('avatar'), uploadAvatar);

// Get user profile by ID
router.get('/:id', mongoIdValidation('id'), getUserProfile);

export default router;