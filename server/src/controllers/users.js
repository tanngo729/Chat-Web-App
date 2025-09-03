import { User } from '../models/index.js';
import { asyncHandler } from '../middlewares/error.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for avatar upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/avatars';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

export const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const currentUserId = req.user._id;
  
  if (!q) {
    return res.json({
      ok: true,
      data: []
    });
  }
  
  // Search users by display name or email (excluding current user)
  const users = await User.find({
    _id: { $ne: currentUserId },
    $or: [
      { displayName: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } }
    ]
  })
  .select('displayName email avatarUrl status lastActiveAt')
  .limit(20)
  .sort({ displayName: 1 });
  
  res.json({
    ok: true,
    data: users
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { displayName, avatarUrl, status, bio } = req.body;
  const user = req.user;
  
  // Update fields if provided
  if (displayName !== undefined) user.displayName = displayName;
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
  if (status !== undefined) user.status = status;
  if (bio !== undefined) user.bio = bio;
  
  await user.save();
  
  res.json({
    ok: true,
    data: {
      user
    }
  });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'NO_FILE',
        message: 'No avatar file provided'
      }
    });
  }

  const user = req.user;
  
  // Delete old avatar if exists
  if (user.avatarUrl) {
    const oldAvatarPath = path.join(process.cwd(), 'uploads', 'avatars', path.basename(user.avatarUrl));
    if (fs.existsSync(oldAvatarPath)) {
      fs.unlinkSync(oldAvatarPath);
    }
  }
  
  // Update user avatar URL
  user.avatarUrl = `/uploads/avatars/${req.file.filename}`;
  await user.save();
  
  res.json({
    ok: true,
    data: {
      user,
      avatarUrl: user.avatarUrl
    }
  });
});

export const getUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const user = await User.findById(id)
    .select('displayName email avatarUrl status bio lastActiveAt createdAt');
    
  if (!user) {
    return res.status(404).json({
      ok: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }
    });
  }
  
  res.json({
    ok: true,
    data: {
      user
    }
  });
});