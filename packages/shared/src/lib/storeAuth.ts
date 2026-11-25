import { getMahalakCallableError, httpsCallable } from './callMahalakFunction';
import { auth, mahalakFunctions } from './firebase';
import type { Store } from '@shared/types';

async function refreshAuthToken(): Promise<void> {
  await auth.currentUser?.getIdToken(true);
}

async function readMerchantStoreClaim(): Promise<string | undefined> {
  const user = auth.currentUser;
  if (!user) return undefined;
  const token = await user.getIdTokenResult();
  const claim = token.claims.merchantStoreId;
  return claim != null ? String(claim) : undefined;
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

  let result: { data?: { success: boolean; ownerId: string } };
  try {
    result = await sync({ storeId });
  } catch (error) {
    throw new Error(
      getMahalakCallableError(
        error,
        'تعذر ربط المتجر بالجلسة. تحقق من الإنترنت ثم سجّل الدخول مرة أخرى.',
      ),
    );
  }

  await refreshAuthToken();
  const linkedOwnerId = result.data?.ownerId ?? uid;

  if (linkedOwnerId !== uid) {
    throw new Error('تعذر ربط المتجر بجلسة Firebase. يرجى تسجيل الدخول مرة أخرى.');
  }

  let claimStoreId = await readMerchantStoreClaim();
  if (claimStoreId !== String(storeId)) {
    try {
      await sync({ storeId });
      await refreshAuthToken();
      claimStoreId = await readMerchantStoreClaim();
    } catch (error) {
      throw new Error(
        getMahalakCallableError(
          error,
          'تعذر تفعيل صلاحية رفع الصور. سجّل الخروج ثم ادخل مجدداً.',
        ),
      );
    }
  }

  if (claimStoreId !== String(storeId)) {
    throw new Error('صلاحية رفع الصور غير مفعّلة لهذا المتجر. سجّل الخروج ثم ادخل مجدداً بكلمة المرور.');
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
