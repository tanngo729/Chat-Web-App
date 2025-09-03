import { create } from 'zustand';

const usePresenceStore = create((set, get) => ({
  onlineUsers: new Set(),
  typingUsers: {}, // conversationId -> Set of user info
  userPresence: {}, // userId -> { status, lastActiveAt }

  // Actions
  setUserOnline: (userId) => {
    set(state => ({
      onlineUsers: new Set([...state.onlineUsers, userId]),
      userPresence: {
        ...state.userPresence,
        [userId]: {
          status: 'online',
          lastActiveAt: new Date().toISOString()
        }
      }
    }));
  },

  setUserOffline: (userId) => {
    set(state => {
      const newOnlineUsers = new Set(state.onlineUsers);
      newOnlineUsers.delete(userId);
      
      return {
        onlineUsers: newOnlineUsers,
        userPresence: {
          ...state.userPresence,
          [userId]: {
            ...state.userPresence[userId],
            status: 'offline',
            lastActiveAt: new Date().toISOString()
          }
        }
      };
    });
  },

  updateUserPresence: (userId, presence) => {
    set(state => {
      const newOnlineUsers = new Set(state.onlineUsers);
      
      if (presence.status === 'online') {
        newOnlineUsers.add(userId);
      } else {
        newOnlineUsers.delete(userId);
      }

      return {
        onlineUsers: newOnlineUsers,
        userPresence: {
          ...state.userPresence,
          [userId]: {
            status: presence.status,
            lastActiveAt: presence.lastActiveAt || new Date().toISOString()
          }
        }
      };
    });
  },

  setTyping: (conversationId, userId, displayName, isTyping) => {
    set(state => {
      const conversationTyping = state.typingUsers[conversationId] || new Set();
      const newTypingUsers = { ...state.typingUsers };
      
      if (isTyping) {
        const newConversationTyping = new Set(conversationTyping);
        newConversationTyping.add(JSON.stringify({ userId, displayName }));
        newTypingUsers[conversationId] = newConversationTyping;
      } else {
        const newConversationTyping = new Set(conversationTyping);
        // Remove all entries for this user (in case displayName changed)
        for (const entry of newConversationTyping) {
          const parsed = JSON.parse(entry);
          if (parsed.userId === userId) {
            newConversationTyping.delete(entry);
          }
        }
        
        if (newConversationTyping.size === 0) {
          delete newTypingUsers[conversationId];
        } else {
          newTypingUsers[conversationId] = newConversationTyping;
        }
      }
      
      return { typingUsers: newTypingUsers };
    });
  },

  clearTyping: (conversationId) => {
    set(state => {
      const newTypingUsers = { ...state.typingUsers };
      delete newTypingUsers[conversationId];
      return { typingUsers: newTypingUsers };
    });
  },

  // Getters
  isUserOnline: (userId) => {
    return get().onlineUsers.has(userId);
  },

  getUserPresence: (userId) => {
    return get().userPresence[userId] || { status: 'offline' };
  },

  getTypingUsers: (conversationId) => {
    const typingSet = get().typingUsers[conversationId];
    if (!typingSet) return [];
    
    return Array.from(typingSet).map(entry => JSON.parse(entry));
  },

  getTypingText: (conversationId) => {
    const typingUsers = get().getTypingUsers(conversationId);
    if (typingUsers.length === 0) return '';
    
    if (typingUsers.length === 1) {
      return `${typingUsers[0].displayName} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].displayName} and ${typingUsers[1].displayName} are typing...`;
    } else {
      return 'Several people are typing...';
    }
  },

  getOnlineCount: () => {
    return get().onlineUsers.size;
  },

  getOnlineUsersList: () => {
    return Array.from(get().onlineUsers);
  },

  // Utility functions
  formatLastSeen: (lastActiveAt) => {
    if (!lastActiveAt) return 'Unknown';
    
    const now = new Date();
    const lastActive = new Date(lastActiveAt);
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return lastActive.toLocaleDateString();
  },

  reset: () => set({
    onlineUsers: new Set(),
    typingUsers: {},
    userPresence: {},
  }),
}));

export default usePresenceStore;