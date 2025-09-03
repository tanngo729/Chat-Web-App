import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
    index: true
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true,
    maxlength: [50, 'Display name cannot exceed 50 characters']
  },
  avatarUrl: {
    type: String,
    default: null
  },
  status: {
    type: String,
    default: '',
    maxlength: [100, 'Status cannot exceed 100 characters']
  },
  bio: {
    type: String,
    default: '',
    maxlength: [200, 'Bio cannot exceed 200 characters']
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.passwordHash;
      delete ret.__v;
      return ret;
    }
  }
});

// Index for faster lookups  
userSchema.index({ lastActiveAt: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Update last active timestamp
userSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

export default mongoose.model('User', userSchema);