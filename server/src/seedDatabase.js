import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User, Conversation, Message } from './models/index.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp';

const seedUsers = [
  {
    email: 'alice@example.com',
    passwordHash: 'password123',
    displayName: 'Alice Johnson',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
    status: 'Available for chat!'
  },
  {
    email: 'bob@example.com',
    passwordHash: 'password123',
    displayName: 'Bob Smith',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
    status: 'Working remotely'
  },
  {
    email: 'charlie@example.com',
    passwordHash: 'password123',
    displayName: 'Charlie Brown',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
    status: 'Coffee lover ☕'
  }
];

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await Message.deleteMany({});
    await Conversation.deleteMany({});
    await User.deleteMany({});

    // Create users
    console.log('Creating users...');
    const users = [];
    for (const userData of seedUsers) {
      const user = new User(userData);
      await user.save();
      users.push(user);
      console.log(`Created user: ${user.displayName} (${user.email})`);
    }

    // Create a direct conversation between Alice and Bob
    console.log('Creating direct conversation...');
    const directConversation = new Conversation({
      type: 'direct',
      members: [users[0]._id, users[1]._id]
    });
    await directConversation.save();
    console.log('Created direct conversation between Alice and Bob');

    // Create a group conversation
    console.log('Creating group conversation...');
    const groupConversation = new Conversation({
      type: 'group',
      name: 'Development Team',
      members: users.map(user => user._id),
      adminIds: [users[0]._id]
    });
    await groupConversation.save();
    console.log('Created group conversation: Development Team');

    // Create sample messages for direct conversation
    console.log('Creating sample messages for direct conversation...');
    const directMessages = [
      {
        conversationId: directConversation._id,
        senderId: users[0]._id,
        body: 'Hey Bob! How are you doing?',
        type: 'text',
        createdAt: new Date(Date.now() - 3600000) // 1 hour ago
      },
      {
        conversationId: directConversation._id,
        senderId: users[1]._id,
        body: 'Hi Alice! I\'m doing great, thanks for asking. How about you?',
        type: 'text',
        createdAt: new Date(Date.now() - 3300000) // 55 minutes ago
      },
      {
        conversationId: directConversation._id,
        senderId: users[0]._id,
        body: 'I\'m good too! Are you ready for the project demo tomorrow?',
        type: 'text',
        createdAt: new Date(Date.now() - 3000000) // 50 minutes ago
      },
      {
        conversationId: directConversation._id,
        senderId: users[1]._id,
        body: 'Absolutely! I\'ve been preparing the presentation. Should be interesting!',
        type: 'text',
        createdAt: new Date(Date.now() - 2700000) // 45 minutes ago
      }
    ];

    for (const messageData of directMessages) {
      const message = new Message(messageData);
      await message.save();
    }

    // Update conversation's lastMessageAt
    directConversation.lastMessageAt = directMessages[directMessages.length - 1].createdAt;
    await directConversation.save();

    // Create sample messages for group conversation
    console.log('Creating sample messages for group conversation...');
    const groupMessages = [
      {
        conversationId: groupConversation._id,
        senderId: users[0]._id,
        body: 'Welcome to the Development Team chat, everyone!',
        type: 'text',
        createdAt: new Date(Date.now() - 7200000) // 2 hours ago
      },
      {
        conversationId: groupConversation._id,
        senderId: users[1]._id,
        body: 'Thanks Alice! Excited to work with the team.',
        type: 'text',
        createdAt: new Date(Date.now() - 7000000) // ~2 hours ago
      },
      {
        conversationId: groupConversation._id,
        senderId: users[2]._id,
        body: 'Hello team! Looking forward to our collaboration! 🚀',
        type: 'text',
        createdAt: new Date(Date.now() - 6800000) // ~2 hours ago
      },
      {
        conversationId: groupConversation._id,
        senderId: users[0]._id,
        body: 'Let\'s discuss our upcoming sprint planning in tomorrow\'s meeting.',
        type: 'text',
        createdAt: new Date(Date.now() - 1800000) // 30 minutes ago
      },
      {
        conversationId: groupConversation._id,
        senderId: users[1]._id,
        body: 'Sounds good! I\'ll prepare the user story estimates.',
        type: 'text',
        createdAt: new Date(Date.now() - 1500000) // 25 minutes ago
      }
    ];

    for (const messageData of groupMessages) {
      const message = new Message(messageData);
      await message.save();
    }

    // Update conversation's lastMessageAt
    groupConversation.lastMessageAt = groupMessages[groupMessages.length - 1].createdAt;
    await groupConversation.save();

    console.log('\n✅ Database seeded successfully!');
    console.log('\nDemo users created:');
    users.forEach(user => {
      console.log(`  📧 ${user.email} (password: password123)`);
    });
    console.log('\nYou can now start the application and login with any of these accounts.');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Run the seed function
seedDatabase();