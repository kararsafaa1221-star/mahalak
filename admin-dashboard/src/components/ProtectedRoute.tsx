import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useApp } from '../context/useApp';
import { usePermission } from '../hooks/usePermission';
import {
  getFirstAllowedPageKey,
  hasPermission,
  isValidPageKey,
  type PageKey,
} from '../lib/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** When set, overrides the :pageKey URL param. */
  pageKey?: PageKey;
}

/**
 * Blocks dashboard pages the current role cannot access.
 * Redirects to /unauthorized or the first allowed page.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, pageKey: pageKeyProp }) => {
  const { pageKey: pageKeyParam } = useParams<{ pageKey?: string }>();
  const { currentAdminDoc, authLoading } = useApp();

  const resolvedKey = (pageKeyProp ?? pageKeyParam ?? '').trim();
  const checkKey: PageKey = isValidPageKey(resolvedKey) ? resolvedKey : 'stores';
  const allowedByHook = usePermission(checkKey);

  if (authLoading) return null;

  if (!resolvedKey) {
    const fallback = getFirstAllowedPageKey(currentAdminDoc) ?? 'stores';
    return <Navigate to={`/dashboard/${fallback}`} replace />;
  }

  if (!isValidPageKey(resolvedKey)) {
    const fallback = getFirstAllowedPageKey(currentAdminDoc) ?? 'stores';
    return <Navigate to={`/dashboard/${fallback}`} replace />;
  }

  const allowed = isValidPageKey(resolvedKey)
    ? allowedByHook
    : hasPermission(currentAdminDoc, checkKey);

  if (!allowed) {
    return <Navigate to="/unauthorized" replace state={{ from: resolvedKey }} />;
  }

  return <>{children}</>;
};
