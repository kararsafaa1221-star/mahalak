import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Store } from '../types';

/** Links a store document to the current Firebase Auth session (ownerId). */
export async function linkStoreToAuthSession(store: Store): Promise<Store> {
  const uid = auth.currentUser?.uid;
  if (!uid || store.ownerId === uid) return store;

  try {
    await updateDoc(doc(db, 'stores', store.id), { ownerId: uid });
    return { ...store, ownerId: uid };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return store;
  }
}

/** Ensures new stores are created with an ownerId tied to Firebase Auth. */
export function withStoreOwnerId<T extends Record<string, unknown>>(data: T): T & { ownerId: string } {
  const uid = auth.currentUser?.uid ?? '';
  return { ...data, ownerId: uid };
}
