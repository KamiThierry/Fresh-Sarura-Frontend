import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (!token || !user) {
    // Redirect to login but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Role not authorized - redirect to a safe home or show access denied
    // For now, redirect to the default dashboard for their role
    const defaultPaths: Record<string, string> = {
      'production_manager': '/pm',
      'farm_manager': '/farm-manager',
      'admin': '/admin',
      'logistic_officer': '/logistics',
      'quality_officer': '/qc'
    };
    
    return <Navigate to={defaultPaths[user.role] || '/'} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
