import { useMemo } from 'react';
import { useApp } from '../context/useApp';
import {
  hasPageAccess,
  hasPermission,
  resolvePermissions,
  type PageKey,
} from '../lib/permissions';

/**
 * Returns whether the signed-in admin's role grants access to a pageKey.
 * Driven strictly by AdminContext.currentAdminDoc.role.
 */
export function usePermission(pageKey: PageKey): boolean {
  const { currentAdminDoc } = useApp();
  return useMemo(
    () => hasPermission(currentAdminDoc, pageKey),
    [currentAdminDoc, pageKey],
  );
}

/** All pageKeys allowed for the current admin role. */
export function useAllowedPages(): PageKey[] {
  const { currentAdminDoc } = useApp();
  return useMemo(() => resolvePermissions(currentAdminDoc), [currentAdminDoc]);
}

/** Check access by raw role (testing / display helpers). */
export function useRolePageAccess(pageKey: PageKey): boolean {
  const { adminRole } = useApp();
  return useMemo(() => hasPageAccess(adminRole, pageKey), [adminRole, pageKey]);
}
