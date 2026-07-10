import {
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore';
import { collection } from 'firebase/firestore';
import { db } from '@shared/lib/firebase';
import type { ActivityLog } from '@shared/types';

export { logActivity, type LogActivityInput, type ActivityActorSnapshot } from './activityLogger';

function mapActivityLog(id: string, data: Record<string, unknown>): ActivityLog {
  const description =
    typeof data.description === 'string'
      ? data.description
      : typeof data.details === 'string'
        ? data.details
        : undefined;

  return {
    id,
    action: String(data.action ?? ''),
    targetId: typeof data.targetId === 'string' ? data.targetId : data.targetId === null ? undefined : String(data.targetId ?? ''),
    description,
    details: description,
    adminUid: String(data.adminUid ?? ''),
    adminEmail: typeof data.adminEmail === 'string' ? data.adminEmail : undefined,
    adminName: typeof data.adminName === 'string' ? data.adminName : undefined,
    adminRole: typeof data.adminRole === 'string' ? data.adminRole : undefined,
    adminPermissions: Array.isArray(data.adminPermissions)
      ? data.adminPermissions.filter((p): p is string => typeof p === 'string')
      : undefined,
    createdAt:
      typeof data.createdAt === 'string'
        ? data.createdAt
        : data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
  };
}

export function subscribeActivityLogs(
  onData: (logs: ActivityLog[]) => void,
  onError?: (error: Error) => void,
  maxRows = 200,
): Unsubscribe {
  const q = query(collection(db, 'activityLogs'), orderBy('createdAt', 'desc'), limit(maxRows));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((docSnap) =>
        mapActivityLog(docSnap.id, docSnap.data() as Record<string, unknown>),
      );
      onData(rows);
    },
    (error) => onError?.(error),
  );
}
