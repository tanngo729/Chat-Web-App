import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(token) {
    if (this.socket?.connected) {
      return;
    }

    // Disconnect existing socket if any
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      path: '/ws/socket.io',
      auth: {
        token
      },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 2000, // Increase delay to prevent spam
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 10000, // Add timeout
      forceNew: true, // Force new connection
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.connected = true;
      this.reconnectAttempts = 0;
      this.processMessageQueue(); // Process any queued messages
      this.emit('socket:connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.connected = false;
      this.emit('socket:disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      this.emit('socket:error', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.emit('socket:reconnected', attemptNumber);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      this.emit('socket:reconnect_failed');
    });

    // Message events
    this.socket.on('message:new', (data) => {
      this.emit('message:new', data);
    });

    this.socket.on('message:ack', (data) => {
      this.emit('message:ack', data);
    });

    this.socket.on('message:error', (data) => {
      this.emit('message:error', data);
    });

    this.socket.on('message:read', (data) => {
      this.emit('message:read', data);
    });

    // Typing events
    this.socket.on('typing', (data) => {
      this.emit('typing', data);
    });

    // Presence events
    this.socket.on('presence:update', (data) => {
      this.emit('presence:update', data);
    });

    // Conversation events
    this.socket.on('conversation:updated', (data) => {
      this.emit('conversation:updated', data);
    });

    // Call events
    this.socket.on('call:ringing', (data) => {
      this.emit('call:ringing', data);
    });

    this.socket.on('call:answered', (data) => {
      this.emit('call:answered', data);
    });

    this.socket.on('call:rejected', (data) => {
      this.emit('call:rejected', data);
    });

    this.socket.on('call:hangup', (data) => {
      this.emit('call:hangup', data);
    });

    this.socket.on('call:candidate', (data) => {
      this.emit('call:candidate', data);
    });

    this.socket.on('call:error', (data) => {
      this.emit('call:error', data);
    });

    this.socket.on('call:initiated', (data) => {
      this.emit('call:initiated', data);
    });

    // WebRTC signaling events
    this.socket.on('call:offer', (data) => {
      this.emit('call:offer', data);
    });

    this.socket.on('call:answer-signal', (data) => {
      this.emit('call:answer-signal', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Event emitter methods
  on(event, handler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    this.messageHandlers.get(event).add(handler);
  }

  off(event, handler) {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(event);
      }
    }
  }

  emit(event, data) {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // Socket.IO methods
  sendMessage(data) {
    if (this.connected) {
      this.socket.emit('message:send', data);
    } else {
      console.warn('Socket not connected, message queued');
      // Store failed message for retry after reconnection
      this.queueMessage(data);
    }
  }

  queueMessage(data) {
    if (!this.messageQueue) {
      this.messageQueue = [];
    }
    this.messageQueue.push(data);
  }

  processMessageQueue() {
    if (this.messageQueue && this.messageQueue.length > 0) {
      console.log(`Processing ${this.messageQueue.length} queued messages`);
      const messages = [...this.messageQueue];
      this.messageQueue = [];
      messages.forEach(message => this.sendMessage(message));
    }
  }

  startTyping(conversationId) {
    if (this.connected) {
      this.socket.emit('typing:start', { conversationId });
    }
  }

  stopTyping(conversationId) {
    if (this.connected) {
      this.socket.emit('typing:stop', { conversationId });
    }
  }

  markMessageAsRead(messageId, conversationId) {
    if (this.connected) {
      this.socket.emit('message:read', { messageId, conversationId });
    }
  }

  joinConversation(conversationId) {
    if (this.connected) {
      this.socket.emit('conversation:join', { conversationId });
    }
  }

  leaveConversation(conversationId) {
    if (this.connected) {
      this.socket.emit('conversation:leave', { conversationId });
    }
  }

  sendPresencePing() {
    if (this.connected) {
      this.socket.emit('presence:ping');
    }
  }

  // Call methods
  initiateCall(targetUserId, conversationId, type = 'voice') {
    if (this.connected) {
      this.socket.emit('call:init', { targetUserId, conversationId, type });
    }
  }

  answerCall(callId) {
    if (this.connected) {
      this.socket.emit('call:answer', { callId });
    }
  }

  rejectCall(callId) {
    if (this.connected) {
      this.socket.emit('call:reject', { callId });
    }
  }

  hangupCall(callId) {
    if (this.connected) {
      this.socket.emit('call:hangup', { callId });
    }
  }

  sendICECandidate(callId, candidate) {
    if (this.connected) {
      this.socket.emit('call:candidate', { callId, candidate });
    }
  }

  sendCallOffer(callId, offer) {
    if (this.connected) {
      this.socket.emit('call:offer', { callId, offer });
    }
  }

  sendCallAnswer(callId, answer) {
    if (this.connected) {
      this.socket.emit('call:answer-signal', { callId, answer });
    }
  }

  isConnected() {
    return this.connected;
  }
}

// Create singleton instance
const socketService = new SocketService();

// Make it globally available for other parts of the app
if (typeof window !== 'undefined') {
  window.socketService = socketService;
}

export default socketService;