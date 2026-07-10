import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Store } from '../types';

export type StoreSecrets = {
  storeId: string;
  ownerId?: string;
  walletBalance?: number;
  payoutMethods?: {
    zainCashNumber?: string;
    mastercardNumber?: string;
  };
};

export function storeSecretsDocRef(storeId: string) {
  return doc(db, 'store_secrets', storeId);
}

export async function fetchStoreSecrets(storeId: string): Promise<StoreSecrets | null> {
  const snap = await getDoc(storeSecretsDocRef(storeId));
  if (!snap.exists()) return null;
  return { ...(snap.data() as StoreSecrets), storeId: snap.id };
}

export async function upsertStoreSecretsPayout(
  storeId: string,
  ownerId: string,
  payoutMethods: NonNullable<Store['payoutMethods']>,
): Promise<void> {
  await setDoc(
    storeSecretsDocRef(storeId),
    {
      storeId,
      ownerId,
      payoutMethods,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** Merge private financial fields into a public store document for merchant UI. */
export function mergeStoreWithSecrets(store: Store, secrets: StoreSecrets | null | undefined): Store {
  if (!secrets) return store;
  return {
    ...store,
    walletBalance: secrets.walletBalance ?? store.walletBalance ?? 0,
    payoutMethods: secrets.payoutMethods ?? store.payoutMethods,
  };
}
