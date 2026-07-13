import {
  getDoc,
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type FirestoreError,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore';
import { auth } from './firebase';

/** Firestore rejects `undefined` field values; omit them before writes. */
export function stripUndefinedFields<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as T;
}

export function isFirestoreOfflineError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('client is offline') ||
    message.includes('Failed to get document') ||
    message.includes('network-request-failed') ||
    message.includes('unavailable')
  );
}

export function isFirestorePermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  if (code === 'permission-denied') return true;
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('permission-denied') ||
    message.includes('Missing or insufficient permissions')
  );
}

/** Swallow permission-denied while auth/session is still bootstrapping. */
export function shouldSuppressFirestoreError(
  error: unknown,
  duringAuthBootstrap: boolean,
): boolean {
  return duringAuthBootstrap && isFirestorePermissionDenied(error);
}

export function safeOnSnapshot<T = DocumentData>(
  ref: DocumentReference<T> | Query<T>,
  onNext: (snapshot: DocumentSnapshot<T> | QuerySnapshot<T>) => void,
  options?: {
    suppressPermissionDenied?: boolean;
    onError?: (error: FirestoreError) => void;
  },
): () => void {
  const suppress = options?.suppressPermissionDenied !== false;
  return onSnapshot(
    ref,
    onNext as (snapshot: DocumentSnapshot<T> | QuerySnapshot<T>) => void,
    (error) => {
      if (suppress && isFirestorePermissionDenied(error)) return;
      options?.onError?.(error);
      if (!suppress || !isFirestorePermissionDenied(error)) {
        console.warn('[Firestore listener]', error.code, error.message);
      }
    },
  );
}

export async function safeGetDoc<T = DocumentData>(
  ref: DocumentReference<T>,
  options?: { suppressPermissionDenied?: boolean },
): Promise<DocumentSnapshot<T> | null> {
  try {
    return await getDoc(ref);
  } catch (error) {
    if (options?.suppressPermissionDenied !== false && isFirestorePermissionDenied(error)) {
      return null;
    }
    throw error;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  throw new Error(JSON.stringify(errInfo));
}
