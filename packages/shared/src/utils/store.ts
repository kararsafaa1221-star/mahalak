import type { Store } from '@shared/types';

export const SUBSCRIPTION_EXPIRED_LABEL = 'منتهي';
export const SUBSCRIPTION_NONE_LABEL = 'none';

export type SubscriptionDurationUnit = 'days' | 'months' | 'years';

export function addDurationToDate(
  base: Date,
  value: number,
  unit: SubscriptionDurationUnit,
): Date {
  const result = new Date(base);
  if (unit === 'days') result.setDate(result.getDate() + value);
  else if (unit === 'months') result.setMonth(result.getMonth() + value);
  else if (unit === 'years') result.setFullYear(result.getFullYear() + value);
  return result;
}

export function formatSubscriptionExpiryDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Compute subscription fields for auto-subscription on new merchant registration. */
export function buildAutoSubscriptionPatch(
  durationValue: number,
  durationUnit: SubscriptionDurationUnit,
  baseDate: Date = new Date(),
) {
  const expiryDate = addDurationToDate(baseDate, durationValue, durationUnit);
  const expiryStr = formatSubscriptionExpiryDate(expiryDate);
  const validUntilIso = expiryDate.toISOString();
  return {
    subscriptionStatus: 'active' as const,
    subscriptionExpiry: expiryStr,
    subscriptionExpiryDate: expiryStr,
    subscriptionValidUntil: validUntilIso,
    subscriptionId: 'sub_auto',
    autoSubscriptionDuration: { value: durationValue, unit: durationUnit },
  };
}

function isPastOrInvalidDate(value: string): boolean {
  const t = new Date(value).getTime();
  return Number.isNaN(t) || t <= Date.now();
}

/** Single source of truth: merchant subscription is active and not expired. */
export function isStoreSubscriptionActive(s: Store): boolean {
  if (s.subscriptionStatus === 'expired' || s.subscriptionStatus === 'none') return false;
  if (s.subscriptionStatus !== 'active') return false;

  const expiry = s.subscriptionExpiry;
  if (!expiry || expiry === SUBSCRIPTION_NONE_LABEL || expiry === SUBSCRIPTION_EXPIRED_LABEL) return false;
  if (expiry === 'Lifetime') return true;

  const legacyStillValid = !isPastOrInvalidDate(expiry);

  if (s.subscriptionValidUntil) {
    const validUntilActive = new Date(s.subscriptionValidUntil).getTime() > Date.now();
    return validUntilActive && legacyStillValid;
  }

  return legacyStillValid;
}

/** Whether a store should appear in the customer app. */
export function isStoreVisibleToCustomer(s: Store): boolean {
  if (s.isBanned || s.status === 'suspended') return false;
  if (s.status !== 'active') return false;
  return isStoreSubscriptionActive(s);
}

/** Firestore patch when admin ends a store subscription. */
export function buildExpiredSubscriptionPatch() {
  return {
    subscriptionExpiry: SUBSCRIPTION_EXPIRED_LABEL,
    subscriptionExpiryDate: SUBSCRIPTION_EXPIRED_LABEL,
    subscriptionStatus: 'expired' as const,
    subscriptionValidUntil: new Date().toISOString(),
  };
}

/** Firestore patch when admin activates or renews a subscription. */
export function buildActiveSubscriptionPatch(
  finalExpiry: string,
  finalSubId: string,
  validUntilDate: string,
) {
  return {
    subscriptionExpiry: finalExpiry,
    subscriptionExpiryDate: finalExpiry === 'Lifetime' ? 'Lifetime' : finalExpiry,
    subscriptionId: finalSubId,
    subscriptionStatus: 'active' as const,
    subscriptionValidUntil: validUntilDate,
  };
}
