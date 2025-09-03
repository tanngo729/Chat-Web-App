import express from 'express';
import { register, login, logout, getMe, refreshToken } from '../controllers/auth.js';
import { authenticate } from '../middlewares/auth.js';
import { registerValidation, loginValidation } from '../middlewares/validation.js';

const router = express.Router();

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes
router.use(authenticate); // All routes below require authentication
router.post('/logout', logout);
router.get('/me', getMe);
router.post('/refresh', refreshToken);

export default router;