import { doc, getDoc, runTransaction, serverTimestamp, Transaction } from 'firebase/firestore';
import { db } from './firebase';

export const UNIQUE_PHONES = 'unique_phones';
export const UNIQUE_USERNAMES = 'unique_usernames';

/** Canonical phone key for registry documents (9647XXXXXXXXX). */
export function normalizePhoneKey(phone: string): string {
  let cleaned = String(phone || '').replace(/\D/g, '');
  if (cleaned.startsWith('07')) cleaned = '964' + cleaned.substring(1);
  else if (cleaned.startsWith('7') && cleaned.length === 10) cleaned = '964' + cleaned;
  else if (!cleaned.startsWith('964')) cleaned = '964' + cleaned;
  return cleaned;
}

/** Canonical username key (lowercase trimmed). */
export function normalizeUsernameKey(username: string): string {
  return String(username || '').trim().toLowerCase();
}

export async function isPhoneRegistered(phone: string): Promise<boolean> {
  const key = normalizePhoneKey(phone);
  if (!key) return false;
  const snap = await getDoc(doc(db, UNIQUE_PHONES, key));
  return snap.exists();
}

export async function isUsernameRegistered(username: string): Promise<boolean> {
  const key = normalizeUsernameKey(username);
  if (!key) return false;
  const snap = await getDoc(doc(db, UNIQUE_USERNAMES, key));
  return snap.exists();
}

export function claimPhoneInTransaction(
  tx: Transaction,
  phone: string,
  entityType: 'customer' | 'store',
  entityId: string,
): string {
  const phoneKey = normalizePhoneKey(phone);
  if (!phoneKey || phoneKey.length < 10) {
    throw new Error('رقم الهاتف غير صالح');
  }
  const ref = doc(db, UNIQUE_PHONES, phoneKey);
  tx.set(ref, {
    entityType,
    entityId,
    phone: String(phone).trim(),
    phoneKey,
    createdAt: serverTimestamp(),
  });
  return phoneKey;
}

export function claimUsernameInTransaction(
  tx: Transaction,
  username: string,
  storeId: string,
): string {
  const usernameKey = normalizeUsernameKey(username);
  if (!usernameKey || usernameKey.length < 3) {
    throw new Error('اسم المستخدم غير صالح');
  }
  const ref = doc(db, UNIQUE_USERNAMES, usernameKey);
  tx.set(ref, {
    storeId,
    username: String(username).trim(),
    usernameKey,
    createdAt: serverTimestamp(),
  });
  return usernameKey;
}

export async function releasePhoneRegistry(phoneKey: string | undefined | null): Promise<void> {
  if (!phoneKey) return;
  await runTransaction(db, async (tx) => {
    const ref = doc(db, UNIQUE_PHONES, phoneKey);
    const snap = await tx.get(ref);
    if (snap.exists()) tx.delete(ref);
  });
}

export async function releaseUsernameRegistry(usernameKey: string | undefined | null): Promise<void> {
  if (!usernameKey) return;
  await runTransaction(db, async (tx) => {
    const ref = doc(db, UNIQUE_USERNAMES, usernameKey);
    const snap = await tx.get(ref);
    if (snap.exists()) tx.delete(ref);
  });
}
