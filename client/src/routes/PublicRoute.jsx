import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores';

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return children;
};

export default PublicRoute;