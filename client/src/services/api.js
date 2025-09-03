import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refreshToken: () => api.post('/auth/refresh'),
};

// Users API
export const usersAPI = {
  search: (query) => api.get(`/users/search?q=${encodeURIComponent(query)}`),
  updateProfile: (data) => api.patch('/users/me', data),
  getUserProfile: (userId) => api.get(`/users/${userId}`),
};

// Conversations API
export const conversationsAPI = {
  getAll: () => api.get('/conversations'),
  getById: (id) => api.get(`/conversations/${id}`),
  create: (data) => api.post('/conversations', data),
  update: (id, data) => api.patch(`/conversations/${id}`, data),
  leave: (id) => api.delete(`/conversations/${id}/leave`),
  getMessages: (id, params) => api.get(`/conversations/${id}/messages`, { params }),
  sendMessage: (id, data) => api.post(`/conversations/${id}/messages`, data),
  markAsRead: (id) => api.post(`/conversations/${id}/read`),
};

// Messages API
export const messagesAPI = {
  markAsRead: (id) => api.post(`/messages/${id}/read`),
  delete: (id) => api.delete(`/messages/${id}`),
};

// Upload API
export const uploadAPI = {
  single: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/uploads/single', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  multiple: (files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return api.post('/uploads/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getSignedUrl: (filename, contentType) => 
    api.post('/uploads/sign', { filename, contentType })
};

// Search API
export const searchAPI = {
  messages: (query, conversationId) => {
    const params = new URLSearchParams({ q: query });
    if (conversationId) params.append('conversationId', conversationId);
    return api.get(`/search/messages?${params}`);
  },
  conversations: (query) => api.get(`/search/conversations?q=${encodeURIComponent(query)}`),
};

export default api;