import mongoose from 'mongoose';

const readReceiptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  at: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  body: {
    type: String,
    required: function() {
      return this.type === 'text';
    },
    maxlength: [2000, 'Message body cannot exceed 2000 characters']
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'file'],
    default: 'text'
  },
  fileUrl: {
    type: String,
    required: function() {
      return this.type === 'image' || this.type === 'video' || this.type === 'file';
    }
  },
  fileName: {
    type: String,
    // Required for file type messages
    required: function() {
      return this.type === 'file';
    }
  },
  fileSize: {
    type: Number,
    // For file type messages
    validate: {
      validator: function(v) {
        if (this.type === 'file' || this.type === 'image' || this.type === 'video') {
          return v > 0;
        }
        return true;
      },
      message: 'File size must be greater than 0'
    }
  },
  meta: {
    width: Number,
    height: Number,
    duration: Number, // For videos in seconds
    mime: String,
    thumbnailUrl: String // For videos
  },
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  readBy: [readReceiptSchema]
}, {
  timestamps: true
});

// Compound indexes for efficient queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ senderId: 1, createdAt: -1 });

// Text index for search functionality
messageSchema.index({ 
  body: 'text'
}, {
  name: 'message_text_index',
  default_language: 'english'
});

// Helper method to check if message is deleted for a user
messageSchema.methods.isDeletedFor = function(userId) {
  return this.deletedFor.includes(userId);
};

// Helper method to mark message as read
messageSchema.methods.markAsRead = function(userId) {
  // Check if already read by this user
  const existingReceipt = this.readBy.find(r => r.userId.equals(userId));
  if (!existingReceipt) {
    this.readBy.push({ userId, at: new Date() });
    return this.save();
  }
  return Promise.resolve(this);
};

// Helper method to check if message is read by user
messageSchema.methods.isReadBy = function(userId) {
  return this.readBy.some(r => r.userId.equals(userId));
};

// Helper method to soft delete message
messageSchema.methods.deleteFor = function(userId) {
  if (!this.deletedFor.includes(userId)) {
    this.deletedFor.push(userId);
  }
  return this.save();
};

// Helper method to get formatted message for user
messageSchema.methods.toUserJSON = function(userId) {
  const message = this.toObject();
  
  // Don't include message if it's deleted for this user
  if (this.isDeletedFor(userId)) {
    message.body = '[Deleted]';
    message.type = 'text';
    message.fileUrl = null;
    message.fileName = null;
    message.fileSize = null;
    message.meta = null;
  }
  
  return message;
};

export default mongoose.model('Message', messageSchema);