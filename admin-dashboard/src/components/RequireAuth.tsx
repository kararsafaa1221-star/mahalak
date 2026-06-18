import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/useApp';

/** Ensures Firebase admin session exists before rendering dashboard routes. */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentAdmin, authLoading } = useApp();

  if (authLoading) return null;

  if (!currentAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
