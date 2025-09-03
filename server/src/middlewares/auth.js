import { verifyToken } from '../services/jwt.js';
import { User } from '../models/index.js';
import { asyncHandler } from './error.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  let token;
  
  // Check for token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({
      ok: false,
      error: {
        code: 'NO_TOKEN',
        message: 'Access token is required'
      }
    });
  }
  
  try {
    // Verify token
    const decoded = verifyToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }
    
    // Update last active timestamp
    user.updateLastActive();
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      }
    });
  }
});

export const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('-passwordHash');
      
      if (user) {
        req.user = user;
        user.updateLastActive();
      }
    } catch (error) {
      // Silently fail for optional auth
    }
  }
  
  next();
});