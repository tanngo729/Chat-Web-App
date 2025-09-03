import { create } from 'zustand';
import { conversationsAPI } from '../services/api';

const useConversationStore = create((set, get) => ({
  conversations: [],
  activeConversationId: null,
  loading: false,
  error: null,

  // Actions
  fetchConversations: async () => {
    set({ loading: true, error: null });
    try {
      const response = await conversationsAPI.getAll();
      const conversations = response.data.data;
      
      set({ 
        conversations: conversations.sort((a, b) => 
          new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
        ),
        loading: false 
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to fetch conversations';
      set({ loading: false, error: errorMessage });
    }
  },

  createConversation: async (conversationData) => {
    try {
      const response = await conversationsAPI.create(conversationData);
      const newConversation = response.data.data.conversation;
      
      set(state => ({
        conversations: [newConversation, ...state.conversations]
      }));
      
      return { success: true, conversation: newConversation };
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to create conversation';
      return { success: false, error: errorMessage };
    }
  },

  updateConversation: (conversationId, updates) => {
    set(state => ({
      conversations: state.conversations.map(conv =>
        conv._id === conversationId ? { ...conv, ...updates } : conv
      )
    }));
  },

  setActiveConversation: (conversationId) => {
    set({ activeConversationId: conversationId });
  },

  getActiveConversation: () => {
    const { conversations, activeConversationId } = get();
    return conversations.find(conv => conv._id === activeConversationId);
  },

  addConversation: (conversation) => {
    set(state => {
      const exists = state.conversations.find(c => c._id === conversation._id);
      if (exists) {
        return {
          conversations: state.conversations.map(c =>
            c._id === conversation._id ? { ...c, ...conversation } : c
          )
        };
      }
      return {
        conversations: [conversation, ...state.conversations]
      };
    });
  },

  removeConversation: (conversationId) => {
    set(state => ({
      conversations: state.conversations.filter(conv => conv._id !== conversationId),
      activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId
    }));
  },

  updateUnreadCount: (conversationId, count) => {
    set(state => ({
      conversations: state.conversations.map(conv =>
        conv._id === conversationId 
          ? { ...conv, unreadCount: count }
          : conv
      )
    }));
  },

  markConversationAsRead: async (conversationId) => {
    try {
      await conversationsAPI.markAsRead(conversationId);
      
      set(state => ({
        conversations: state.conversations.map(conv =>
          conv._id === conversationId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      }));
    } catch (error) {
      console.error('Failed to mark conversation as read:', error);
    }
  },

  updateLastMessage: (conversationId, message) => {
    set(state => ({
      conversations: state.conversations
        .map(conv => 
          conv._id === conversationId 
            ? { 
                ...conv, 
                lastMessage: message, 
                lastMessageAt: message.createdAt,
                unreadCount: conv.unreadCount ? conv.unreadCount + 1 : 1
              }
            : conv
        )
        .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
    }));
  },

  getConversationById: (conversationId) => {
    return get().conversations.find(conv => conv._id === conversationId);
  },

  getTotalUnreadCount: () => {
    return get().conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
  },

  // Find or create direct conversation
  findOrCreateDirectConversation: async (userId) => {
    const { conversations } = get();
    // Import here to avoid circular dependency
    const { default: useAuthStore } = await import('./useAuthStore');
    const currentUser = useAuthStore.getState().user;
    
    // Look for existing direct conversation
    const existing = conversations.find(conv => 
      conv.type === 'direct' && 
      conv.members.some(member => member._id === userId) &&
      conv.members.some(member => member._id === currentUser._id)
    );
    
    if (existing) {
      return { success: true, conversation: existing };
    }
    
    // Create new direct conversation
    return get().createConversation({
      type: 'direct',
      memberIds: [userId]
    });
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    conversations: [],
    activeConversationId: null,
    loading: false,
    error: null,
  }),
}));

export default useConversationStore;