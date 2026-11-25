/** Store verification (blue badge) pricing & revenue accounting — mirrors the
 *  subscription-plan pattern in `merchantRenewalPlans.ts` (tiered packages with
 *  volume discounts, paid grant vs. free admin gift, lifetime revenue that
 *  persists after the badge expires/is revoked). Packages are admin-managed,
 *  stored in settings/global.verificationPlans, and edited from the same
 *  "الاشتراكات والتفعيل التلقائي" settings tab as subscription plans. */

import type { Store } from '@shared/types';
import { addDurationToDate, formatSubscriptionExpiryDate } from '@shared/utils/store';

export interface VerificationPlanConfig {
  id: string;
  labelAr: string;
  priceIqd: number;
  durationDays: number;
  badge?: string;
  highlight?: boolean;
  enabled?: boolean;
  sortOrder?: number;
}

export const DEFAULT_VERIFICATION_PLANS: VerificationPlanConfig[] = [
  { id: 'verify_1m', labelAr: 'شهر واحد', priceIqd: 5000, durationDays: 30, sortOrder: 1, enabled: true },
  { id: 'verify_3m', labelAr: '3 أشهر', priceIqd: 13000, durationDays: 90, badge: 'وفّر 13%', sortOrder: 2, enabled: true },
  { id: 'verify_6m', labelAr: '6 أشهر', priceIqd: 25000, durationDays: 180, badge: 'وفّر 17%', sortOrder: 3, enabled: true },
  {
    id: 'verify_12m',
    labelAr: 'سنة كاملة',
    priceIqd: 47500,
    durationDays: 360,
    badge: 'أعلى توفير',
    highlight: true,
    sortOrder: 4,
    enabled: true,
  },
];

function normalizePlanConfig(
  raw: Partial<VerificationPlanConfig>,
  fallback?: VerificationPlanConfig,
): VerificationPlanConfig | null {
  const id = String(raw.id ?? fallback?.id ?? '').trim();
  if (!id) return null;
  const base =
    fallback ?? {
      id,
      labelAr: 'باقة توثيق',
      priceIqd: 0,
      durationDays: 30,
      enabled: true,
      sortOrder: 99,
    };
  return {
    ...base,
    ...raw,
    id,
    labelAr: String(raw.labelAr ?? base.labelAr).trim() || base.labelAr,
    priceIqd: Math.max(0, Number(raw.priceIqd ?? base.priceIqd) || 0),
    durationDays: Math.max(1, Number(raw.durationDays ?? base.durationDays) || 1),
    enabled: raw.enabled !== false,
    sortOrder: Number(raw.sortOrder ?? base.sortOrder ?? 99),
  };
}

/** All verification packages (id = stored on verificationPlanId). Custom edits from Firestore fully supported. */
export function resolveAllVerificationPlans(
  adminSettings?: Record<string, unknown> | null,
): VerificationPlanConfig[] {
  const rawPlans = Array.isArray(adminSettings?.verificationPlans) ? (adminSettings!.verificationPlans as unknown[]) : [];
  const defaultsById = Object.fromEntries(DEFAULT_VERIFICATION_PLANS.map((p) => [p.id, p]));

  if (rawPlans.length === 0) {
    return DEFAULT_VERIFICATION_PLANS.slice();
  }

  const seen = new Set<string>();
  const merged: VerificationPlanConfig[] = [];

  for (const item of rawPlans) {
    if (!item || typeof item !== 'object') continue;
    const patch = item as Partial<VerificationPlanConfig>;
    const def = defaultsById[patch.id ?? ''];
    const normalized = normalizePlanConfig(patch, def);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    merged.push(normalized);
  }

  for (const def of DEFAULT_VERIFICATION_PLANS) {
    if (!seen.has(def.id)) merged.push(def);
  }

  return merged.filter((p) => p.enabled !== false).sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
}

export function findVerificationPlanById(
  planId: string | undefined | null,
  adminSettings?: Record<string, unknown> | null,
): VerificationPlanConfig | undefined {
  if (!planId) return undefined;
  return resolveAllVerificationPlans(adminSettings).find((p) => p.id === planId);
}

export function createNewVerificationPlanId(): string {
  return `verify_${Date.now().toString(36)}`;
}

export function formatVerificationIqd(amount: number): string {
  return amount.toLocaleString('ar-IQ');
}

export type MerchantVerificationWhatsAppContext = {
  shopName: string;
  username: string;
  phone: string;
};

/** WhatsApp message when a merchant requests a verification package. */
export function buildMerchantVerificationWhatsAppMessage(
  store: MerchantVerificationWhatsAppContext,
  planLabelAr: string,
): string {
  const shopName = String(store.shopName || '').trim() || '—';
  const username = String(store.username || '').trim() || '—';
  const phone = String(store.phone || '').trim() || '—';
  const plan = String(planLabelAr || '').trim() || '—';

  return [
    'مرحباً دعم محلك، أريد توثيق حساب متجري',
    `اسم المتجر: ${shopName}`,
    `(معرف المتجر): ${username}`,
    `رقم هاتف: ${phone}`,
    `على باقة التوثيق: ${plan}.`,
  ].join('\n');
}

export function buildMerchantVerificationWhatsAppUrl(
  supportNumberDigits: string,
  store: MerchantVerificationWhatsAppContext,
  planLabelAr: string,
): string {
  const text = buildMerchantVerificationWhatsAppMessage(store, planLabelAr);
  return `https://wa.me/${supportNumberDigits}?text=${encodeURIComponent(text)}`;
}

/** Lifetime verification revenue for a store — persists after the badge expires or is revoked. */
export function getStoreVerificationLifetimeRevenueIqd(
  store: Pick<Store, 'verificationAmountIqd' | 'verificationLifetimeRevenueIqd'>,
): number {
  if (store.verificationLifetimeRevenueIqd != null && store.verificationLifetimeRevenueIqd > 0) {
    return store.verificationLifetimeRevenueIqd;
  }
  return store.verificationAmountIqd ?? 0;
}

function hasRecordedVerification(
  store: Pick<Store, 'verificationAmountIqd' | 'verificationLifetimeRevenueIqd' | 'verificationIsGift'>,
): boolean {
  // Gift verifications are granted for free and must never count toward revenue accounting.
  if (store.verificationIsGift) return false;
  return getStoreVerificationLifetimeRevenueIqd(store) > 0;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isSameCalendarMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isSameCalendarYear(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear();
}

export type VerificationRevenuePeriods = {
  todayIqd: number;
  monthIqd: number;
  yearIqd: number;
};

export type VerificationStoreLedgerRow = {
  storeId: string;
  shopName: string;
  ownerName: string;
  amountIqd: number;
  lifetimeRevenueIqd: number;
  activatedAt: string | null;
  isActive: boolean;
  expiry: string;
};

export type VerificationAccountsSummary = {
  ledger: VerificationStoreLedgerRow[];
  totalStoresWithRevenue: number;
  activeVerifiedCount: number;
  grandTotalLifetimeIqd: number;
  periods: VerificationRevenuePeriods;
};

export function computeVerificationAccounts(
  stores: Store[],
  now: Date = new Date(),
): VerificationAccountsSummary {
  const ledger: VerificationStoreLedgerRow[] = [];
  let grandTotalLifetimeIqd = 0;
  let totalStoresWithRevenue = 0;
  let activeVerifiedCount = 0;
  const periods: VerificationRevenuePeriods = { todayIqd: 0, monthIqd: 0, yearIqd: 0 };

  for (const store of stores) {
    if (!hasRecordedVerification(store)) continue;

    const amount = store.verificationAmountIqd ?? 0;
    const lifetime = getStoreVerificationLifetimeRevenueIqd(store);
    const activatedAt = store.verificationLastActivatedAt ? new Date(store.verificationLastActivatedAt) : null;
    const validActivatedAt = activatedAt && !Number.isNaN(activatedAt.getTime()) ? activatedAt : null;

    totalStoresWithRevenue += 1;
    grandTotalLifetimeIqd += lifetime;
    if (store.isVerified) activeVerifiedCount += 1;

    if (validActivatedAt && amount > 0) {
      if (isSameCalendarDay(validActivatedAt, now)) periods.todayIqd += amount;
      if (isSameCalendarMonth(validActivatedAt, now)) periods.monthIqd += amount;
      if (isSameCalendarYear(validActivatedAt, now)) periods.yearIqd += amount;
    }

    ledger.push({
      storeId: store.id,
      shopName: store.shopName,
      ownerName: store.ownerName,
      amountIqd: amount,
      lifetimeRevenueIqd: lifetime,
      activatedAt: validActivatedAt?.toISOString() ?? null,
      isActive: !!store.isVerified,
      expiry: store.isVerified
        ? (store.verificationType === 'lifetime' ? 'مدى الحياة' : store.verificationExpiresAt || '—')
        : '—',
    });
  }

  return {
    ledger: ledger.sort((a, b) => b.lifetimeRevenueIqd - a.lifetimeRevenueIqd),
    totalStoresWithRevenue,
    activeVerifiedCount,
    grandTotalLifetimeIqd,
    periods,
  };
}

type VerificationGrantResult = {
  plan: VerificationPlanConfig;
  patch: {
    isVerified: true;
    verificationType: 'days' | 'lifetime';
    verificationExpiresAt: string;
    verificationAmountIqd: number;
    verificationLastActivatedAt: string;
    verificationLifetimeRevenueIqd: number;
    verificationIsGift: boolean;
  };
};

/** Build store patch when admin activates verification using a package (paid).
 *  `asLifetime` grants a permanent badge while still charging the selected package's price —
 *  lets the admin pick which price tier to charge for a lifetime grant. */
function buildVerificationGrant(
  planId: string,
  adminSettings: Record<string, unknown> | null | undefined,
  asLifetime: boolean,
  isGift: boolean,
  baseDate: Date,
  existingStore: Pick<Store, 'verificationLifetimeRevenueIqd'> | null | undefined,
): VerificationGrantResult | null {
  const plan = findVerificationPlanById(planId, adminSettings);
  if (!plan) return null;

  const verificationExpiresAt = asLifetime
    ? 'Lifetime'
    : formatSubscriptionExpiryDate(addDurationToDate(baseDate, plan.durationDays, 'days'));
  const prevLifetime = existingStore?.verificationLifetimeRevenueIqd ?? 0;
  const amount = isGift ? 0 : plan.priceIqd;

  return {
    plan,
    patch: {
      isVerified: true,
      verificationType: asLifetime ? 'lifetime' : 'days',
      verificationExpiresAt,
      verificationAmountIqd: amount,
      verificationLastActivatedAt: new Date().toISOString(),
      verificationLifetimeRevenueIqd: isGift ? prevLifetime : prevLifetime + amount,
      verificationIsGift: isGift,
    },
  };
}

/** Paid verification grant — records the package price and adds it to lifetime revenue. */
export function buildVerificationPaidGrant(
  planId: string,
  adminSettings: Record<string, unknown> | null | undefined,
  asLifetime = false,
  baseDate: Date = new Date(),
  existingStore?: Pick<Store, 'verificationLifetimeRevenueIqd'> | null,
): VerificationGrantResult | null {
  return buildVerificationGrant(planId, adminSettings, asLifetime, false, baseDate, existingStore);
}

/** Free admin gift — activates the badge for the package's duration but records zero revenue
 *  and flags `verificationIsGift` so accounting always excludes it. */
export function buildVerificationGiftGrant(
  planId: string,
  adminSettings: Record<string, unknown> | null | undefined,
  asLifetime = false,
  baseDate: Date = new Date(),
  existingStore?: Pick<Store, 'verificationLifetimeRevenueIqd'> | null,
): VerificationGrantResult | null {
  return buildVerificationGrant(planId, adminSettings, asLifetime, true, baseDate, existingStore);
}
