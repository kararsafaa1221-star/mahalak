import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
  Transaction,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from './firebase';
import { stripUndefinedFields } from './firestoreUtils';
import { normalizeIraqiPhone } from '../utils/phone';

export const UNIQUE_PHONES = 'unique_phones';
export const UNIQUE_USERNAMES = 'unique_usernames';
export const BLOCKED_PHONES = 'blocked_phones';

export type BlockedPhoneRecord = {
  id: string;
  phone: string;
  phoneKey: string;
  entityType: 'customer' | 'store';
  displayName: string;
  originalEntityId?: string;
  blockedBy?: string;
  reason?: string;
  blocked?: boolean;
  blockedAt?: unknown;
};

/** Canonical phone key for registry documents (9647XXXXXXXXX). */
export function normalizePhoneKey(phone: string): string {
  return normalizeIraqiPhone(phone);
}

/** Canonical username key (lowercase trimmed). */
export function normalizeUsernameKey(username: string): string {
  return String(username || '').trim().toLowerCase();
}

export async function isPhoneRegistered(phone: string): Promise<boolean> {
  // unique_phones is server-only (H4); use checkPhoneAvailable callable before signup.
  void phone;
  return false;
}

export async function isUsernameRegistered(username: string): Promise<boolean> {
  // unique_usernames is server-only (H4); use checkUsernameAvailable callable before signup.
  void username;
  return false;
}

function phoneTakenMessage(entityType?: string): string {
  if (entityType === 'store') {
    return 'رقم الهاتف مسجل مسبقاً كتاجر! لا يمكن إنشاء حساب جديد بنفس الرقم.';
  }
  return 'رقم الهاتف مسجل مسبقاً كزبون! لا يمكن استخدامه لإنشاء حساب آخر.';
}

export function assertPhoneAvailableInTransaction(
  phoneSnap: { exists: () => boolean; data: () => Record<string, unknown> | undefined },
): void {
  if (!phoneSnap.exists()) return;
  const existing = phoneSnap.data();
  throw new Error(phoneTakenMessage(String(existing?.entityType || '')));
}

export function assertUsernameAvailableInTransaction(
  usernameSnap: { exists: () => boolean; data: () => Record<string, unknown> | undefined },
  storeId: string,
): void {
  if (!usernameSnap.exists()) return;
  const existing = usernameSnap.data();
  if (existing?.storeId === storeId) return;
  throw new Error('اسم المستخدم مسجل مسبقاً من متجر آخر!');
}

export function claimPhoneInTransaction(
  tx: Transaction,
  phone: string,
  entityType: 'customer' | 'store',
  entityId: string,
): string {
  const phoneKey = normalizePhoneKey(phone);
  if (!phoneKey || phoneKey.length < 12) {
    throw new Error('رقم الهاتف غير صالح');
  }
  const ref = doc(db, UNIQUE_PHONES, phoneKey);
  tx.set(ref, {
    entityType,
    entityId,
    phone: phoneKey,
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

/** Atomically claim phone + write entity document (customer). */
export async function createCustomerWithUniquePhone(
  customerRef: DocumentReference,
  customerData: Record<string, unknown>,
  phone: string,
): Promise<void> {
  const phoneKey = normalizePhoneKey(phone);

  await runTransaction(db, async (tx) => {
    const blockedSnap = await tx.get(doc(db, BLOCKED_PHONES, phoneKey));
    if (blockedSnap.exists() && blockedSnap.data()?.blocked !== false) {
      throw new Error('هذا الرقم محظور من قبل إدارة النظام. تواصل مع الدعم لرفع الحظر.');
    }
    claimPhoneInTransaction(tx, phone, 'customer', customerRef.id);
    tx.set(customerRef, stripUndefinedFields(customerData));
  });
}

/** Atomically claim phone + username + write store document. */
export async function createStoreWithUniquePhoneAndUsername(
  storeRef: DocumentReference,
  storeData: Record<string, unknown>,
  phone: string,
  username: string,
): Promise<void> {
  const phoneKey = normalizePhoneKey(phone);
  const usernameKey = normalizeUsernameKey(username);

  await runTransaction(db, async (tx) => {
    const blockedSnap = await tx.get(doc(db, BLOCKED_PHONES, phoneKey));
    if (blockedSnap.exists() && blockedSnap.data()?.blocked !== false) {
      throw new Error('هذا الرقم محظور من قبل إدارة النظام. تواصل مع الدعم لرفع الحظر.');
    }
    claimPhoneInTransaction(tx, phone, 'store', storeRef.id);
    claimUsernameInTransaction(tx, username, storeRef.id);
    tx.set(storeRef, stripUndefinedFields(storeData));
  });
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

export async function isPhoneBlocked(phone: string): Promise<boolean> {
  const phoneKey = normalizePhoneKey(phone);
  if (!phoneKey) return false;
  const snap = await getDoc(doc(db, BLOCKED_PHONES, phoneKey));
  return snap.exists() && snap.data()?.blocked !== false;
}

export async function blockPhoneRegistry(
  phone: string,
  meta: {
    entityType: 'customer' | 'store';
    displayName: string;
    originalEntityId?: string;
    blockedBy?: string;
    reason?: string;
  },
): Promise<string> {
  const phoneKey = normalizePhoneKey(phone);
  if (!phoneKey) throw new Error('رقم الهاتف غير صالح');
  await setDoc(doc(db, BLOCKED_PHONES, phoneKey), {
    phone: phoneKey,
    phoneKey,
    entityType: meta.entityType,
    displayName: String(meta.displayName || '').trim(),
    originalEntityId: meta.originalEntityId || '',
    blockedBy: meta.blockedBy || '',
    reason: meta.reason || '',
    blocked: true,
    blockedAt: serverTimestamp(),
  });
  return phoneKey;
}

export async function unblockPhoneRegistry(phone: string): Promise<void> {
  const phoneKey = normalizePhoneKey(phone);
  if (!phoneKey) return;
  await runTransaction(db, async (tx) => {
    const ref = doc(db, BLOCKED_PHONES, phoneKey);
    const snap = await tx.get(ref);
    if (snap.exists()) tx.delete(ref);
  });
}
