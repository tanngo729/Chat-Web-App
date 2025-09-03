import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '../stores';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;