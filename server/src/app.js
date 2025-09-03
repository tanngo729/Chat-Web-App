import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import conversationRoutes from './routes/conversations.js';
import messageRoutes from './routes/messages.js';
import searchRoutes from './routes/search.js';
import uploadRoutes from './routes/uploads.js';
import { errorHandler } from './middlewares/error.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security middleware - disable CSP for development
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'http://localhost:5178'
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Auth rate limiting (more lenient for development)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // 50 attempts in dev, 5 in production
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many authentication attempts' } }
});
app.use('/api/auth', authLimiter);

// Serve static files for uploads
app.use('/uploads', express.static('uploads'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'Chat API is running' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/uploads', uploadRoutes);

// Error handling
app.use(errorHandler);

export default app;