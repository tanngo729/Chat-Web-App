# 💬 ChatApp - Real-time Chat Application

A modern, full-stack chat application built with React, Node.js, Socket.IO, and MongoDB. Features real-time messaging, user authentication, typing indicators, read receipts, and group chat support.

![ChatApp Screenshot](https://via.placeholder.com/800x400?text=ChatApp+Screenshot)

## ✨ Features

### Core Functionality
- 🔐 **User Authentication** - JWT-based registration and login
- 💬 **Real-time Messaging** - Instant message delivery via Socket.IO
- 👥 **Direct & Group Chats** - One-on-one conversations and group messaging
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- ⚡ **Optimistic Updates** - Smooth UI with instant message display

### Advanced Features
- ✍️ **Typing Indicators** - See when others are typing
- ✅ **Read Receipts** - Track message delivery and read status with accurate unread counters
- 🟢 **Online/Offline Status** - Real-time presence indicators (online/offline/in-call)
- 📷 **Media Messaging** - Send images, videos (MP4/WebM), and files with drag & drop
- 🎥 **Video Calling** - 1:1 voice and video calls using WebRTC
- 📞 **Call Features** - Accept/reject/hangup, mute/unmute, camera toggle
- 🔍 **User Search** - Find and start conversations with other users
- 📝 **Message History** - Infinite scroll with pagination
- 🎯 **Smart Unread Counters** - Accurate badge notifications that clear immediately after reading

### Technical Features
- 🔒 **Secure Authentication** - Password hashing and JWT tokens
- 🚀 **Performance Optimized** - Efficient database queries and caching
- 🛡️ **Rate Limiting** - Protection against spam and abuse
- ♻️ **Auto-reconnection** - Seamless reconnection on network issues
- 📊 **Real-time Sync** - Automatic message synchronization across devices

## 🏗️ Tech Stack

### Frontend
- **React 19** - Modern React with hooks and functional components
- **Vite** - Fast build tool and development server
- **Ant Design** - Professional UI component library
- **Zustand** - Lightweight state management
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client for API calls
- **React Router** - Client-side routing

### Backend  
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB** - NoSQL database with Mongoose ODM
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **Helmet** - Security middleware

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chat-app
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Set up environment variables**

   Create `server/.env`:
   ```env
   PORT=5001
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/chatapp
   # Or use MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/chatapp
   
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:5173
   SOCKET_CORS_ORIGIN=http://localhost:5173
   ```

   Create `client/.env`:
   ```env
   VITE_API_URL=http://localhost:5001/api
   VITE_SOCKET_URL=http://localhost:5001
   ```

5. **Start the application**

   Terminal 1 (Server):
   ```bash
   cd server
   npm run dev
   ```

   Terminal 2 (Client):
   ```bash
   cd client
   npm run dev
   ```

6. **Open your browser**
   - Navigate to `http://localhost:5173`
   - Create a new account or login
   - Start chatting!

## 📁 Project Structure

```
chat-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── stores/         # Zustand state management
│   │   ├── services/       # API and Socket.IO services
│   │   ├── hooks/          # Custom React hooks
│   │   └── routes/         # Route protection components
│   └── public/             # Static assets
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── middlewares/    # Express middlewares
│   │   ├── services/       # Business logic services
│   │   └── sockets/        # Socket.IO event handlers
│   └── .env                # Environment variables
└── README.md
```

## 🔧 Development

### Available Scripts

**Server:**
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run seed` - Seed database with sample data
- `npm test` - Run tests

**Client:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code

### API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

#### Users
- `GET /api/users/search?q={query}` - Search users
- `PATCH /api/users/me` - Update profile
- `GET /api/users/{id}` - Get user profile

#### Conversations
- `GET /api/conversations` - Get user's conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/{id}` - Get conversation details
- `PATCH /api/conversations/{id}` - Update conversation
- `DELETE /api/conversations/{id}/leave` - Leave conversation

#### Messages
- `GET /api/conversations/{id}/messages` - Get messages
- `POST /api/conversations/{id}/messages` - Send message
- `POST /api/messages/{id}/read` - Mark as read
- `DELETE /api/messages/{id}` - Delete message

### Socket.IO Events

#### Client to Server
- `message:send` - Send new message
- `typing:start` - Start typing indicator
- `typing:stop` - Stop typing indicator  
- `message:read` - Mark message as read
- `conversation:join` - Join conversation room
- `conversation:leave` - Leave conversation room
- `presence:ping` - Update user presence

#### Server to Client
- `message:new` - New message received
- `message:ack` - Message sent confirmation
- `message:error` - Message send error
- `message:read` - Message read receipt
- `typing` - Typing indicator update
- `presence:update` - User presence change
- `conversation:updated` - Conversation update

## 🔒 Security Features

- **Password Hashing** - bcryptjs with salt rounds
- **JWT Authentication** - Stateless authentication tokens
- **Rate Limiting** - Prevents spam and brute force attacks
- **CORS Protection** - Controlled cross-origin requests
- **Input Validation** - Express-validator middleware
- **Helmet Security** - Security headers and protections
- **MongoDB Injection Protection** - Mongoose schema validation

## 🚀 Deployment

### Environment Setup
1. Set `NODE_ENV=production` in server environment
2. Configure production MongoDB URI
3. Set secure JWT secret (at least 32 characters)
4. Update CORS origins for production domains

### Production Build
```bash
# Build client
cd client
npm run build

# The build files will be in client/dist/
# Serve these with a web server or CDN
```

### Hosting Recommendations
- **Frontend**: Vercel, Netlify, AWS S3 + CloudFront
- **Backend**: Railway, Render, AWS EC2, DigitalOcean
- **Database**: MongoDB Atlas, AWS DocumentDB

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Kill process using the port
netstat -ano | findstr :5001  # Windows
lsof -ti:5001 | xargs kill -9  # macOS/Linux
```

**MongoDB Connection Error**
- Ensure MongoDB is running locally or check Atlas connection string
- Verify database permissions and network access

**Socket Connection Failed**
- Check CORS configuration in server
- Verify Socket.IO URL in client environment

**Build Errors**
- Clear node_modules and reinstall dependencies
- Check Node.js version compatibility

## 🆘 Support

- 📧 Email: support@chatapp.com
- 💬 Discord: [Join our community](https://discord.gg/chatapp)
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/chat-app/issues)
- 📖 Documentation: [Full Documentation](https://docs.chatapp.com)

---

**Built with ❤️ by the ChatApp Team**

[![Deploy to Railway](https://railway.app/button.svg)](https://railway.app/template/your-template)
[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/chat-app)