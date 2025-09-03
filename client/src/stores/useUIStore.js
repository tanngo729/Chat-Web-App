import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUIStore = create(
  persist(
    (set, get) => ({
      // Theme
      theme: 'light',
      
      // Sidebar
      sidebarCollapsed: false,
      
      // Modals
      modals: {
        newConversation: false,
        userProfile: false,
        conversationSettings: false,
        searchMessages: false,
      },
      
      // Active modal data
      modalData: null,
      
      // Toast notifications
      toasts: [],
      
      // Search
      searchQuery: '',
      searchResults: [],
      searchLoading: false,
      
      // Right panel
      rightPanelVisible: false,
      rightPanelType: null, // 'conversation-info' | 'user-profile' | 'search-results'
      
      // Mobile responsiveness
      isMobile: false,
      
      // Actions
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },
      
      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },
      
      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },
      
      toggleSidebar: () => {
        set(state => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },
      
      openModal: (modalName, data = null) => {
        set(state => ({
          modals: { ...state.modals, [modalName]: true },
          modalData: data
        }));
      },
      
      closeModal: (modalName) => {
        set(state => ({
          modals: { ...state.modals, [modalName]: false },
          modalData: null
        }));
      },
      
      closeAllModals: () => {
        set(state => ({
          modals: Object.keys(state.modals).reduce((acc, key) => {
            acc[key] = false;
            return acc;
          }, {}),
          modalData: null
        }));
      },
      
      addToast: (toast) => {
        const id = Date.now().toString();
        const newToast = {
          id,
          type: 'info',
          duration: 4000,
          ...toast
        };
        
        set(state => ({
          toasts: [...state.toasts, newToast]
        }));
        
        // Auto remove toast
        setTimeout(() => {
          get().removeToast(id);
        }, newToast.duration);
        
        return id;
      },
      
      removeToast: (id) => {
        set(state => ({
          toasts: state.toasts.filter(toast => toast.id !== id)
        }));
      },
      
      showSuccess: (message) => {
        get().addToast({
          type: 'success',
          message
        });
      },
      
      showError: (message) => {
        get().addToast({
          type: 'error',
          message
        });
      },
      
      showWarning: (message) => {
        get().addToast({
          type: 'warning',
          message
        });
      },
      
      showInfo: (message) => {
        get().addToast({
          type: 'info',
          message
        });
      },
      
      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },
      
      setSearchResults: (results) => {
        set({ searchResults: results });
      },
      
      setSearchLoading: (loading) => {
        set({ searchLoading: loading });
      },
      
      clearSearch: () => {
        set({
          searchQuery: '',
          searchResults: [],
          searchLoading: false
        });
      },
      
      setRightPanel: (visible, type = null) => {
        set({
          rightPanelVisible: visible,
          rightPanelType: visible ? type : null
        });
      },
      
      toggleRightPanel: (type) => {
        const { rightPanelVisible, rightPanelType } = get();
        if (rightPanelVisible && rightPanelType === type) {
          get().setRightPanel(false);
        } else {
          get().setRightPanel(true, type);
        }
      },
      
      setIsMobile: (isMobile) => {
        set({ isMobile });
      },
      
      // Utility functions
      isModalOpen: (modalName) => {
        return get().modals[modalName] || false;
      },
      
      getModalData: () => {
        return get().modalData;
      },
      
      isDarkTheme: () => {
        return get().theme === 'dark';
      },
      
      reset: () => set({
        sidebarCollapsed: false,
        modals: {
          newConversation: false,
          userProfile: false,
          conversationSettings: false,
          searchMessages: false,
        },
        modalData: null,
        toasts: [],
        searchQuery: '',
        searchResults: [],
        searchLoading: false,
        rightPanelVisible: false,
        rightPanelType: null,
      }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

export default useUIStore;