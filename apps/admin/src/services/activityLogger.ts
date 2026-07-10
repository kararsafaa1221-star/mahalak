import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@shared/lib/firebase';

export interface ActivityActorSnapshot {
  adminUid?: string;
  adminName?: string;
  adminEmail?: string;
  adminRole?: string;
  adminPermissions?: string[];
}

export interface LogActivityInput extends ActivityActorSnapshot {
  /** Technical action id, e.g. store.delete */
  actionKey?: string;
  /** Arabic label shown in UI */
  action: string;
  /** Arabic target label shown in UI */
  targetId?: string;
  description?: string;
  details?: string;
}

/**
 * Writes an immutable row to activityLogs.
 * Prefer passing actor fields from AdminContext to avoid an extra admins/{uid} read.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  const uid = input.adminUid ?? auth.currentUser?.uid;
  if (!uid) return;

  const description = input.description ?? input.details ?? '';

  await addDoc(collection(db, 'activityLogs'), {
    adminUid: uid,
    adminName: input.adminName ?? input.adminEmail ?? uid,
    adminEmail: input.adminEmail ?? auth.currentUser?.email ?? null,
    adminRole: input.adminRole ?? '',
    adminPermissions: input.adminPermissions ?? [],
    actionKey: input.actionKey ?? null,
    action: input.action,
    targetId: input.targetId ?? null,
    description,
    createdAt: serverTimestamp(),
  });
}
