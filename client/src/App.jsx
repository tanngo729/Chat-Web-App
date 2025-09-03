import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { App as AntApp, message, Spin } from 'antd';
import { useAuthStore, useUIStore } from './stores';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicRoute from './routes/PublicRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages for better performance
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ChatApp = lazy(() => import('./pages/ChatApp'));

function App() {
  const { initializeAuth } = useAuthStore();
  const { toasts, removeToast } = useUIStore();
  const [messageApi, contextHolder] = message.useMessage();

  // Initialize auth on app load
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Handle toast notifications
  useEffect(() => {
    toasts.forEach(toast => {
      messageApi.open({
        type: toast.type,
        content: toast.message,
        duration: toast.duration / 1000,
        onClose: () => removeToast(toast.id),
      });
    });
  }, [toasts, messageApi, removeToast]);

  return (
    <ErrorBoundary>
      <AntApp>
        {contextHolder}
        <Suspense fallback={
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh' 
          }}>
            <Spin size="large" />
          </div>
        }>
        <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          } 
        />
        
        {/* Protected routes */}
        <Route 
          path="/app/*" 
          element={
            <ProtectedRoute>
              <ChatApp />
            </ProtectedRoute>
          } 
        />
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
        </Suspense>
      </AntApp>
    </ErrorBoundary>
  );
}

export default App;
