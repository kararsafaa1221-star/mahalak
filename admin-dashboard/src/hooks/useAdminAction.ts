import { useCallback, useMemo } from 'react';
import { useApp } from '../context/useApp';
import {
  buildAdminActor,
  canWritePage,
  recordAdminAction,
  runAdminAction,
  type AdminActor,
  type ActivityLogMeta,
} from '../lib/adminActionRunner';
import { createAdminService } from '../services/adminService';
import { type PageKey } from '../lib/permissions';

/**
 * Hook for components that perform admin mutations outside AdminContext.
 * Prefer adminService methods — they include permission checks and activity logging.
 */
export function useAdminAction() {
  const { adminUid, adminEmail, currentAdminDoc, adminRole } = useApp();

  const actor: AdminActor = useMemo(
    () =>
      buildAdminActor({
        uid: adminUid,
        name: currentAdminDoc?.name,
        email: adminEmail ?? currentAdminDoc?.email,
        role: adminRole ?? currentAdminDoc?.role,
        adminDoc: currentAdminDoc,
      }),
    [adminUid, adminEmail, currentAdminDoc, adminRole],
  );

  const adminService = useMemo(() => createAdminService(actor), [actor]);

  const runAction = useCallback(
    <T>(
      pageKey: PageKey,
      actionKey: string,
      targetId: string | null | undefined,
      logMeta: ActivityLogMeta | undefined,
      operation: () => Promise<T>,
    ) => runAdminAction(actor, pageKey, actionKey, targetId, logMeta, operation),
    [actor],
  );

  const logAction = useCallback(
    (pageKey: PageKey, actionKey: string, targetId: string | null | undefined, logMeta?: ActivityLogMeta) =>
      recordAdminAction(actor, pageKey, actionKey, targetId, logMeta),
    [actor],
  );

  const canWrite = useCallback((pageKey: PageKey) => canWritePage(actor, pageKey), [actor]);

  return { actor, adminService, runAction, logAction, canWrite };
}
