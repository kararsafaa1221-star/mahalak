import { hasPermission, resolvePermissions, type AdminDocLike, type PageKey } from './permissions';
import { logActivity, type ActivityActorSnapshot } from '../services/activityLogger';
import { buildLocalizedLogFields, type ActivityLogMeta } from './activityLogI18n';

export type { ActivityLogMeta };

export interface AdminActor {
  uid: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  adminDoc: AdminDocLike | null;
}

export function buildAdminActor(input: {
  uid: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  adminDoc: AdminDocLike | null;
}): AdminActor {
  return {
    uid: input.uid,
    name: input.name,
    email: input.email,
    role: input.role,
    adminDoc: input.adminDoc,
  };
}

export function canWritePage(actor: AdminActor, pageKey: PageKey): boolean {
  return hasPermission(actor.adminDoc, pageKey);
}

export function assertWritePage(actor: AdminActor, pageKey: PageKey): void {
  if (!canWritePage(actor, pageKey)) {
    throw new Error(`Permission denied for page: ${pageKey}`);
  }
}

function actorSnapshot(actor: AdminActor): ActivityActorSnapshot {
  return {
    adminUid: actor.uid ?? undefined,
    adminName: actor.name ?? actor.email ?? actor.uid ?? undefined,
    adminEmail: actor.email ?? undefined,
    adminRole: actor.role ?? actor.adminDoc?.role ?? undefined,
    adminPermissions: resolvePermissions(actor.adminDoc),
  };
}

/**
 * Permission gate + Firestore mutation + automatic activity log.
 * Logs only after the operation succeeds.
 */
export async function runAdminAction<T>(
  actor: AdminActor,
  pageKey: PageKey,
  actionKey: string,
  targetId: string | null | undefined,
  logMeta: ActivityLogMeta | undefined,
  operation: () => Promise<T>,
): Promise<T> {
  assertWritePage(actor, pageKey);
  const result = await operation();
  const localized = buildLocalizedLogFields(actionKey, targetId, logMeta);
  await logActivity({
    actionKey,
    action: localized.action,
    targetId: localized.targetLabel,
    description: localized.description,
    ...actorSnapshot(actor),
  });
  return result;
}

/** Fire-and-forget log for operations that already ran elsewhere. */
export async function recordAdminAction(
  actor: AdminActor,
  pageKey: PageKey,
  actionKey: string,
  targetId: string | null | undefined,
  logMeta?: ActivityLogMeta,
): Promise<void> {
  assertWritePage(actor, pageKey);
  const localized = buildLocalizedLogFields(actionKey, targetId, logMeta);
  await logActivity({
    actionKey,
    action: localized.action,
    targetId: localized.targetLabel,
    description: localized.description,
    ...actorSnapshot(actor),
  });
}
