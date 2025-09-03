import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/api';
import socketService from '../services/socket';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      // Actions
      login: async (credentials) => {
        console.log('🔐 Attempting login with:', credentials);
        set({ loading: true, error: null });
        try {
          const response = await authAPI.login(credentials);
          console.log('✅ Login response:', response.data);
          const { user, accessToken } = response.data.data || response.data;
          
          localStorage.setItem('auth_token', accessToken);
          localStorage.setItem('auth_user', JSON.stringify(user));
          
          set({ 
            user, 
            token: accessToken, 
            isAuthenticated: true, 
            loading: false 
          });
          
          // Connect to socket
          socketService.connect(accessToken);
          
          return { success: true };
        } catch (error) {
          console.error('❌ Login error:', error);
          console.error('Error response:', error.response?.data);
          const errorMessage = error.response?.data?.error?.message || 'Login failed';
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      register: async (userData) => {
        console.log('📝 Attempting register with:', userData);
        set({ loading: true, error: null });
        try {
          const response = await authAPI.register(userData);
          console.log('✅ Register response:', response.data);
          const { user, accessToken } = response.data.data || response.data;
          
          localStorage.setItem('auth_token', accessToken);
          localStorage.setItem('auth_user', JSON.stringify(user));
          
          set({ 
            user, 
            token: accessToken, 
            isAuthenticated: true, 
            loading: false 
          });
          
          // Connect to socket
          socketService.connect(accessToken);
          
          return { success: true };
        } catch (error) {
          console.error('❌ Register error:', error);
          console.error('Error response:', error.response?.data);
          const errorMessage = error.response?.data?.error?.message || 'Registration failed';
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          socketService.disconnect();
          
          set({ 
            user: null, 
            token: null, 
            isAuthenticated: false, 
            loading: false, 
            error: null 
          });
        }
      },

      updateUser: (userData) => {
        const updatedUser = { ...get().user, ...userData };
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
        set({ user: updatedUser });
      },

      clearError: () => set({ error: null }),

      // Initialize auth from localStorage
      initializeAuth: () => {
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('auth_user');
        
        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            set({ 
              user, 
              token, 
              isAuthenticated: true 
            });
            
            // Verify token is still valid
            authAPI.getMe().then(response => {
              const freshUser = response.data.data.user;
              set({ user: freshUser });
              localStorage.setItem('auth_user', JSON.stringify(freshUser));
              
              // Connect to socket
              socketService.connect(token);
            }).catch(() => {
              // Token is invalid, clear auth
              get().logout();
            });
          } catch (error) {
            console.error('Failed to parse stored user:', error);
            get().logout();
          }
        }
      },

      refreshToken: async () => {
        try {
          const response = await authAPI.refreshToken();
          const { accessToken } = response.data.data;
          
          localStorage.setItem('auth_token', accessToken);
          set({ token: accessToken });
          
          return accessToken;
        } catch (error) {
          console.error('Token refresh failed:', error);
          get().logout();
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;