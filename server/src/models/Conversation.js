import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['direct', 'group'],
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Conversation name cannot exceed 100 characters'],
    // Required only for group conversations
    validate: {
      validator: function(v) {
        if (this.type === 'group') {
          return v && v.trim().length > 0;
        }
        return true;
      },
      message: 'Group conversations must have a name'
    }
  },
  adminIds: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    validate: {
      validator: function(adminIds) {
        if (this.type === 'group') {
          return adminIds && adminIds.length > 0;
        }
        return true;
      },
      message: 'Group conversations must have at least one admin'
    }
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  lastReadAt: {
    type: Map,
    of: Date,
    default: () => new Map()
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
conversationSchema.index({ members: 1, lastMessageAt: -1 });
conversationSchema.index({ type: 1, lastMessageAt: -1 });

// Ensure direct conversations have exactly 2 members
conversationSchema.pre('save', function(next) {
  if (this.type === 'direct' && this.members.length !== 2) {
    return next(new Error('Direct conversations must have exactly 2 members'));
  }
  
  if (this.type === 'group' && this.members.length < 2) {
    return next(new Error('Group conversations must have at least 2 members'));
  }
  
  next();
});

// Helper method to check if user is a member
conversationSchema.methods.isMember = function(userId) {
  return this.members.includes(userId);
};

// Helper method to check if user is an admin
conversationSchema.methods.isAdmin = function(userId) {
  return this.adminIds && this.adminIds.includes(userId);
};

// Helper method to add member (group only)
conversationSchema.methods.addMember = function(userId, adminId) {
  if (this.type !== 'group') {
    throw new Error('Cannot add members to direct conversations');
  }
  
  if (!this.isAdmin(adminId)) {
    throw new Error('Only admins can add members');
  }
  
  if (!this.isMember(userId)) {
    this.members.push(userId);
  }
  
  return this.save();
};

// Helper method to remove member (group only)
conversationSchema.methods.removeMember = function(userId, adminId) {
  if (this.type !== 'group') {
    throw new Error('Cannot remove members from direct conversations');
  }
  
  if (!this.isAdmin(adminId)) {
    throw new Error('Only admins can remove members');
  }
  
  this.members = this.members.filter(id => !id.equals(userId));
  this.adminIds = this.adminIds.filter(id => !id.equals(userId));
  
  return this.save();
};

// Helper method to update last read time for a user
conversationSchema.methods.updateLastReadAt = function(userId, timestamp = new Date()) {
  this.lastReadAt.set(userId.toString(), timestamp);
  return this.save();
};

// Helper method to get last read time for a user
conversationSchema.methods.getLastReadAt = function(userId) {
  if (!this.lastReadAt) return new Date(0);
  
  // Handle both Map (new format) and Object (old format) structures
  if (typeof this.lastReadAt.get === 'function') {
    // New Map format
    return this.lastReadAt.get(userId.toString()) || new Date(0);
  } else if (this.lastReadAt[userId.toString()]) {
    // Old Object format
    return this.lastReadAt[userId.toString()] || new Date(0);
  }
  
  return new Date(0);
};

export default mongoose.model('Conversation', conversationSchema);