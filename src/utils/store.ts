import type { Store } from '../types';

/** Whether a store should appear in the customer app (supports legacy + new subscription fields). */
export function isStoreVisibleToCustomer(s: Store): boolean {
  if (s.isBanned || s.status === 'suspended') return false;

  const expiry = s.subscriptionExpiry;
  const hasLegacyExpiry =
    expiry &&
    expiry !== 'none' &&
    expiry !== 'منتهي';

  const legacyActive =
    s.status === 'active' &&
    (expiry === 'Lifetime' || (hasLegacyExpiry && new Date(expiry).getTime() > Date.now()));

  if (s.subscriptionStatus === 'active') {
    if (s.subscriptionValidUntil) {
      return new Date(s.subscriptionValidUntil).getTime() > Date.now();
    }
    if (expiry === 'Lifetime') return true;
    if (hasLegacyExpiry) return new Date(expiry).getTime() > Date.now();
    return legacyActive;
  }

  if (s.subscriptionStatus === 'expired' || s.subscriptionStatus === 'none') {
    return false;
  }

  return legacyActive;
}
