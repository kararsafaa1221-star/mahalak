import type { Customer, Store } from '@shared/types';

/** Firestore collection for catalog-safe store documents (synced server-side). */
export const STORES_PUBLIC_COLLECTION = 'stores_public';

const STORE_SENSITIVE_KEYS = [
  'password',
  'walletBalance',
  'payoutMethods',
  'mastercardNumber',
  'zainCashNumber',
] as const;

const CUSTOMER_SENSITIVE_KEYS = [
  'password',
  'authUid',
] as const;

function stripKeys<T extends Record<string, unknown>>(obj: T, keys: readonly string[]): T {
  const next = { ...obj };
  for (const key of keys) {
    delete next[key];
  }
  return next;
}

/** Strip credentials and financial fields from public store reads. */
export function toPublicStore(store: Store): Store {
  return stripKeys(store as Store & Record<string, unknown>, STORE_SENSITIVE_KEYS) as Store;
}

/** Strip credentials from customer data when not the authenticated owner session. */
export function toPublicCustomer(customer: Customer): Customer {
  return stripKeys(customer as Customer & Record<string, unknown>, CUSTOMER_SENSITIVE_KEYS) as Customer;
}
