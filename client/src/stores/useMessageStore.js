import { create } from 'zustand';
import { conversationsAPI, messagesAPI } from '../services/api';
import { v4 as uuidv4 } from 'uuid';

const useMessageStore = create((set, get) => ({
  messagesByConversation: {}, // conversationId -> { messages: [], hasMore: boolean, cursor: string }
  optimisticMessages: {}, // tempId -> message
  loading: {},
  error: null,

  // Actions
  fetchMessages: async (conversationId, cursor = null) => {
    const loadingKey = `${conversationId}_${cursor || 'initial'}`;
    set(state => ({
      loading: { ...state.loading, [loadingKey]: true }
    }));

    try {
      const params = cursor ? { cursor, limit: 50 } : { limit: 50 };
      const response = await conversationsAPI.getMessages(conversationId, params);
      const { messages, hasMore, nextCursor } = response.data.data;

      set(state => {
        const existing = state.messagesByConversation[conversationId] || { messages: [], hasMore: true, cursor: null };
        const newMessages = cursor 
          ? [...existing.messages, ...messages] // Append older messages
          : messages; // Replace with fresh messages

        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: {
              messages: newMessages,
              hasMore,
              cursor: nextCursor
            }
          },
          loading: { ...state.loading, [loadingKey]: false }
        };
      });

      return { success: true };
    } catch (error) {
      set(state => ({
        loading: { ...state.loading, [loadingKey]: false },
        error: error.response?.data?.error?.message || 'Failed to fetch messages'
      }));
      return { success: false, error: error.message };
    }
  },

  sendMessage: async (conversationId, messageData) => {
    // Import socket service here to avoid circular imports
    const { default: socketService } = await import('../services/socket');
    
    const tempId = uuidv4();
    const tempMessage = {
      _id: tempId,
      tempId,
      conversationId,
      senderId: messageData.senderId,
      body: messageData.body,
      type: messageData.type || 'text',
      fileUrl: messageData.fileUrl,
      fileName: messageData.fileName,
      fileSize: messageData.fileSize,
      createdAt: new Date().toISOString(),
      sending: true,
      readBy: []
    };

    // Add optimistic message
    set(state => ({
      optimisticMessages: {
        ...state.optimisticMessages,
        [tempId]: tempMessage
      },
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: {
          ...state.messagesByConversation[conversationId],
          messages: [
            ...(state.messagesByConversation[conversationId]?.messages || []),
            tempMessage
          ]
        }
      }
    }));

    // Send via Socket.IO for real-time delivery
    const socketData = {
      conversationId,
      body: messageData.body,
      type: messageData.type || 'text',
      tempId
    };

    // Only add file fields if they exist
    if (messageData.fileUrl) socketData.fileUrl = messageData.fileUrl;
    if (messageData.fileName) socketData.fileName = messageData.fileName;
    if (messageData.fileSize) socketData.fileSize = messageData.fileSize;
    if (messageData.meta) socketData.meta = messageData.meta;

    socketService.sendMessage(socketData);

    return { success: true, tempId };
  },

  // Handle successful message acknowledgment from socket
  confirmMessage: (tempId, realMessage) => {
    set(state => {
      const optimistic = state.optimisticMessages[tempId];
      if (!optimistic) return state;

      const conversationId = optimistic.conversationId;
      const newOptimistic = { ...state.optimisticMessages };
      delete newOptimistic[tempId];

      return {
        optimisticMessages: newOptimistic,
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: {
            ...state.messagesByConversation[conversationId],
            messages: state.messagesByConversation[conversationId].messages.map(msg =>
              msg.tempId === tempId ? realMessage : msg
            )
          }
        }
      };
    });
  },

  // Add new message (from socket or other source)
  addMessage: (message) => {
    const conversationId = message.conversationId;
    
    set(state => {
      const existing = state.messagesByConversation[conversationId];
      if (!existing) {
        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: {
              messages: [message],
              hasMore: true,
              cursor: null
            }
          }
        };
      }

      // Check if message already exists
      const messageExists = existing.messages.some(msg => msg._id === message._id);
      if (messageExists) return state;

      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: {
            ...existing,
            messages: [...existing.messages, message]
          }
        }
      };
    });
  },

  updateMessage: (messageId, updates) => {
    set(state => {
      const newMessagesByConversation = { ...state.messagesByConversation };
      
      for (const [conversationId, data] of Object.entries(newMessagesByConversation)) {
        const messageIndex = data.messages.findIndex(msg => msg._id === messageId);
        if (messageIndex !== -1) {
          newMessagesByConversation[conversationId] = {
            ...data,
            messages: [
              ...data.messages.slice(0, messageIndex),
              { ...data.messages[messageIndex], ...updates },
              ...data.messages.slice(messageIndex + 1)
            ]
          };
          break;
        }
      }
      
      return { messagesByConversation: newMessagesByConversation };
    });
  },

  deleteMessage: async (messageId) => {
    try {
      await messagesAPI.delete(messageId);
      
      // Remove from local state
      set(state => {
        const newMessagesByConversation = { ...state.messagesByConversation };
        
        for (const [conversationId, data] of Object.entries(newMessagesByConversation)) {
          newMessagesByConversation[conversationId] = {
            ...data,
            messages: data.messages.filter(msg => msg._id !== messageId)
          };
        }
        
        return { messagesByConversation: newMessagesByConversation };
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  markMessageAsRead: async (messageId) => {
    try {
      await messagesAPI.markAsRead(messageId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update read receipts for a message
  updateReadReceipt: (messageId, userId, readAt) => {
    set(state => {
      const newMessagesByConversation = { ...state.messagesByConversation };
      
      for (const [conversationId, data] of Object.entries(newMessagesByConversation)) {
        const messageIndex = data.messages.findIndex(msg => msg._id === messageId);
        if (messageIndex !== -1) {
          const message = data.messages[messageIndex];
          const existingReadBy = message.readBy || [];
          const userReadIndex = existingReadBy.findIndex(r => r.userId === userId);
          
          let newReadBy;
          if (userReadIndex !== -1) {
            newReadBy = [
              ...existingReadBy.slice(0, userReadIndex),
              { ...existingReadBy[userReadIndex], at: readAt },
              ...existingReadBy.slice(userReadIndex + 1)
            ];
          } else {
            newReadBy = [...existingReadBy, { userId, at: readAt }];
          }

          newMessagesByConversation[conversationId] = {
            ...data,
            messages: [
              ...data.messages.slice(0, messageIndex),
              { ...message, readBy: newReadBy },
              ...data.messages.slice(messageIndex + 1)
            ]
          };
          break;
        }
      }
      
      return { messagesByConversation: newMessagesByConversation };
    });
  },

  getMessages: (conversationId) => {
    return get().messagesByConversation[conversationId]?.messages || [];
  },

  getConversationData: (conversationId) => {
    return get().messagesByConversation[conversationId];
  },

  hasMoreMessages: (conversationId) => {
    return get().messagesByConversation[conversationId]?.hasMore || false;
  },

  isLoading: (conversationId, cursor = null) => {
    const loadingKey = `${conversationId}_${cursor || 'initial'}`;
    return get().loading[loadingKey] || false;
  },

  clearMessages: (conversationId) => {
    set(state => {
      const newMessagesByConversation = { ...state.messagesByConversation };
      delete newMessagesByConversation[conversationId];
      return { messagesByConversation: newMessagesByConversation };
    });
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    messagesByConversation: {},
    optimisticMessages: {},
    loading: {},
    error: null,
  }),
}));

export default useMessageStore;