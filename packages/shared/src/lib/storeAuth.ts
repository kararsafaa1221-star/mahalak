import { httpsCallable } from 'firebase/functions';
import { auth, mahalakFunctions } from './firebase';
import type { Store } from '@shared/types';

async function refreshAuthToken(): Promise<void> {
  await auth.currentUser?.getIdToken(true);
}

/** Links a store document to the current Firebase Auth session (ownerId + Storage claims). */
export async function linkStoreToAuthSession(store: Store): Promise<Store | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;

  if (store.ownerId === uid) {
    return { ...store, ownerId: uid };
  }

  try {
    const sync = httpsCallable<{ storeId: string }, { success: boolean; ownerId: string }>(
      mahalakFunctions,
      'syncStoreOwnerSession',
    );
    const result = await sync({ storeId: store.id });
    await refreshAuthToken();
    const ownerId = result.data?.ownerId ?? uid;
    return { ...store, ownerId };
  } catch (error) {
    const code = (error as { code?: string })?.code ?? '';
    const msg = error instanceof Error ? error.message : String(error);
    if (code === 'functions/permission-denied' || msg.includes('linked to another session')) {
      return null;
    }
    console.warn('[linkStoreToAuthSession]', msg);
    return null;
  }
}

/** Ensures Storage rules (merchantStoreId claim) will pass before uploading product images. */
export async function ensureStoreSessionForStorage(storeId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('يجب تسجيل الدخول قبل رفع الصور.');
  }

  const sync = httpsCallable<{ storeId: string }, { success: boolean; ownerId: string }>(
    mahalakFunctions,
    'syncStoreOwnerSession',
  );
  const result = await sync({ storeId });
  await refreshAuthToken();
  const linkedOwnerId = result.data?.ownerId ?? uid;

  if (linkedOwnerId !== uid) {
    throw new Error('تعذر ربط المتجر بجلسة Firebase. يرجى تسجيل الدخول مرة أخرى.');
  }
}

/** Sets adminRole custom claim for Storage uploads in the admin dashboard. */
export async function syncAdminStorageClaims(): Promise<void> {
  if (!auth.currentUser) return;
  const sync = httpsCallable<Record<string, never>, { success: boolean; adminRole: string }>(
    mahalakFunctions,
    'syncAdminStorageSession',
  );
  await sync({});
  await refreshAuthToken();
}

/** Ensures new stores are created with an ownerId tied to Firebase Auth. */
export function withStoreOwnerId<T extends Record<string, unknown>>(data: T): T & { ownerId: string } {
  const uid = auth.currentUser?.uid ?? '';
  return { ...data, ownerId: uid };
}
