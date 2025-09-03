import { User } from '../models/index.js';
import { generateTokens } from '../services/jwt.js';
import { asyncHandler } from '../middlewares/error.js';

export const register = asyncHandler(async (req, res) => {
  const { email, password, displayName } = req.body;
  
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'USER_EXISTS',
        message: 'User with this email already exists'
      }
    });
  }
  
  // Create new user
  const user = new User({
    email,
    passwordHash: password, // Will be hashed by pre-save middleware
    displayName
  });
  
  await user.save();
  
  // Generate tokens
  const tokens = generateTokens(user);
  
  res.status(201).json({
    ok: true,
    data: {
      user,
      ...tokens
    }
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({
      ok: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }
    });
  }
  
  // Check password
  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    return res.status(401).json({
      ok: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }
    });
  }
  
  // Update last active
  user.updateLastActive();
  
  // Generate tokens
  const tokens = generateTokens(user);
  
  res.json({
    ok: true,
    data: {
      user,
      ...tokens
    }
  });
});

export const logout = asyncHandler(async (req, res) => {
  // For stateless JWT, logout is handled on client side
  // Here we could implement token blacklisting if needed
  res.json({
    ok: true,
    data: {
      message: 'Logged out successfully'
    }
  });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({
    ok: true,
    data: {
      user: req.user
    }
  });
});

export const refreshToken = asyncHandler(async (req, res) => {
  // For a more robust implementation, you could implement refresh tokens
  // For now, we'll just return a new token based on the current user
  const tokens = generateTokens(req.user);
  
  res.json({
    ok: true,
    data: tokens
  });
});