/** Merchant subscription plans — admin-managed, stored in settings/global.merchantRenewalPage.
 *  Plan `id` is the store `subscriptionId` in Firestore. */

import type { Store } from '@shared/types';
import {
  addDurationToDate,
  buildActiveSubscriptionPatch,
  formatSubscriptionExpiryDate,
} from '@shared/utils/store';

export interface MerchantRenewalPlanConfig {
  /** Same value stored on store.subscriptionId */
  id: string;
  labelAr: string;
  priceIqd: number;
  durationDays: number;
  dailyIqd?: number;
  badge?: string;
  highlight?: boolean;
  enabled?: boolean;
  sortOrder?: number;
}

export interface MerchantRenewalPageSettings {
  titleRenewal: string;
  titleActivation: string;
  subtitle: string;
  footerNote: string;
  whatsappButtonLabel: string;
  plans: MerchantRenewalPlanConfig[];
}

export type MerchantRenewalPlan = MerchantRenewalPlanConfig & { dailyIqd: number };

export type MerchantRenewalPageResolved = Omit<MerchantRenewalPageSettings, 'plans'> & {
  plans: MerchantRenewalPlan[];
};

export const DEFAULT_MERCHANT_RENEWAL_PLANS: MerchantRenewalPlanConfig[] = [
  { id: 'renew_1m', labelAr: 'شهر واحد', priceIqd: 25000, durationDays: 30, sortOrder: 1, enabled: true },
  {
    id: 'renew_3m',
    labelAr: '3 أشهر',
    priceIqd: 65000,
    durationDays: 90,
    badge: 'التوفير الذكي',
    sortOrder: 2,
    enabled: true,
  },
  { id: 'renew_6m', labelAr: '6 أشهر', priceIqd: 125000, durationDays: 180, sortOrder: 3, enabled: true },
  {
    id: 'renew_12m',
    labelAr: 'سنة كاملة',
    priceIqd: 235000,
    durationDays: 360,
    badge: 'أعلى توفير وأفضل قيمة',
    highlight: true,
    sortOrder: 4,
    enabled: true,
  },
];

export const DEFAULT_MERCHANT_RENEWAL_PAGE_SETTINGS: MerchantRenewalPageSettings = {
  titleRenewal: 'جدّد اشتراكك',
  titleActivation: 'فعّل اشتراك متجرك',
  subtitle: 'اختر الباقة المناسبة ثم تواصل مع الدعم عبر واتساب لتفعيل اشتراكك يدوياً',
  footerNote: 'يُفعَّل الاشتراك من دعم محلك بعد تأكيد الدفع عبر واتساب',
  whatsappButtonLabel: 'واتساب',
  plans: DEFAULT_MERCHANT_RENEWAL_PLANS,
};

/** @deprecated use resolveMerchantRenewalPageSettings */
export const MERCHANT_RENEWAL_PLANS = DEFAULT_MERCHANT_RENEWAL_PLANS;

const LEGACY_SUBSCRIPTION_LABELS: Record<string, string> = {
  sub_monthly: 'شهرية (قديم)',
  sub_semi: '6 أشهر (قديم)',
  sub_yearly: 'سنوية (قديم)',
  sub_auto: 'اشتراك تلقائي',
  sub_premium: 'باقة مميزة',
};

function computeDailyIqd(priceIqd: number, durationDays: number, override?: number): number {
  if (override != null && override > 0) return override;
  if (!durationDays) return 0;
  return Math.round(priceIqd / durationDays);
}

function normalizePlanConfig(raw: Partial<MerchantRenewalPlanConfig>, fallback?: MerchantRenewalPlanConfig): MerchantRenewalPlanConfig | null {
  const id = String(raw.id ?? fallback?.id ?? '').trim();
  if (!id) return null;
  const base = fallback ?? {
    id,
    labelAr: 'باقة',
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

function toResolvedPlan(config: MerchantRenewalPlanConfig): MerchantRenewalPlan {
  return {
    ...config,
    dailyIqd: computeDailyIqd(config.priceIqd, config.durationDays, config.dailyIqd),
  };
}

/** All subscription plans (id = subscriptionId). Custom plans from Firestore are fully supported. */
export function resolveAllSubscriptionPlans(
  adminSettings?: Record<string, unknown> | null,
): MerchantRenewalPlan[] {
  const raw = adminSettings?.merchantRenewalPage as Partial<MerchantRenewalPageSettings> | undefined;
  const rawPlans = Array.isArray(raw?.plans) ? raw.plans : [];
  const defaultsById = Object.fromEntries(DEFAULT_MERCHANT_RENEWAL_PLANS.map((p) => [p.id, p]));

  if (rawPlans.length === 0) {
    return DEFAULT_MERCHANT_RENEWAL_PLANS.map((p) => toResolvedPlan(p));
  }

  const seen = new Set<string>();
  const merged: MerchantRenewalPlan[] = [];

  for (const item of rawPlans) {
    if (!item || typeof item !== 'object') continue;
    const patch = item as Partial<MerchantRenewalPlanConfig>;
    const def = defaultsById[patch.id ?? ''];
    const normalized = normalizePlanConfig(patch, def);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    merged.push(toResolvedPlan(normalized));
  }

  for (const def of DEFAULT_MERCHANT_RENEWAL_PLANS) {
    if (!seen.has(def.id)) merged.push(toResolvedPlan(def));
  }

  return merged.filter((p) => p.enabled !== false).sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
}

/** Resolve merchant renewal page copy + enabled plans. */
export function resolveMerchantRenewalPageSettings(
  adminSettings?: Record<string, unknown> | null,
): MerchantRenewalPageResolved {
  const raw = adminSettings?.merchantRenewalPage as Partial<MerchantRenewalPageSettings> | undefined;
  const base = DEFAULT_MERCHANT_RENEWAL_PAGE_SETTINGS;
  const plans = resolveAllSubscriptionPlans(adminSettings);

  return {
    titleRenewal: String(raw?.titleRenewal ?? base.titleRenewal).trim() || base.titleRenewal,
    titleActivation: String(raw?.titleActivation ?? base.titleActivation).trim() || base.titleActivation,
    subtitle: String(raw?.subtitle ?? base.subtitle).trim() || base.subtitle,
    footerNote: String(raw?.footerNote ?? base.footerNote).trim() || base.footerNote,
    whatsappButtonLabel:
      String(raw?.whatsappButtonLabel ?? base.whatsappButtonLabel).trim() || base.whatsappButtonLabel,
    plans,
  };
}

export function findSubscriptionPlanById(
  subscriptionId: string | undefined | null,
  adminSettings?: Record<string, unknown> | null,
): MerchantRenewalPlan | undefined {
  if (!subscriptionId) return undefined;
  return resolveAllSubscriptionPlans(adminSettings).find((p) => p.id === subscriptionId);
}

export function getSubscriptionPlanLabel(
  subscriptionId: string | undefined | null,
  adminSettings?: Record<string, unknown> | null,
): string {
  if (!subscriptionId) return 'غير محددة';
  const plan = findSubscriptionPlanById(subscriptionId, adminSettings);
  if (plan) return plan.labelAr;
  return LEGACY_SUBSCRIPTION_LABELS[subscriptionId] ?? subscriptionId;
}

export function getStoreSubscriptionAmountIqd(
  store: Pick<Store, 'subscriptionId' | 'subscriptionAmountIqd'>,
  adminSettings?: Record<string, unknown> | null,
): number {
  if (store.subscriptionAmountIqd != null && store.subscriptionAmountIqd > 0) {
    return store.subscriptionAmountIqd;
  }
  const plan = findSubscriptionPlanById(store.subscriptionId, adminSettings);
  return plan?.priceIqd ?? 0;
}

/** Lifetime revenue for a store — persists after subscription expires. */
export function getStoreLifetimeRevenueIqd(
  store: Pick<Store, 'subscriptionId' | 'subscriptionAmountIqd' | 'subscriptionLifetimeRevenueIqd'>,
  adminSettings?: Record<string, unknown> | null,
): number {
  if (store.subscriptionLifetimeRevenueIqd != null && store.subscriptionLifetimeRevenueIqd > 0) {
    return store.subscriptionLifetimeRevenueIqd;
  }
  return getStoreSubscriptionAmountIqd(store, adminSettings);
}

function resolveStoreActivationDate(
  store: Pick<Store, 'subscriptionId' | 'subscriptionExpiry' | 'subscriptionExpiryDate' | 'subscriptionLastActivatedAt'>,
  adminSettings?: Record<string, unknown> | null,
): Date | null {
  if (store.subscriptionLastActivatedAt) {
    const d = new Date(store.subscriptionLastActivatedAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const expiryRaw = store.subscriptionExpiryDate || store.subscriptionExpiry;
  if (!expiryRaw || expiryRaw === 'none' || expiryRaw === 'منتهي' || expiryRaw === 'Lifetime') return null;
  const expiry = new Date(expiryRaw);
  if (Number.isNaN(expiry.getTime())) return null;
  const plan = findSubscriptionPlanById(store.subscriptionId, adminSettings);
  const days = plan?.durationDays ?? 30;
  const start = new Date(expiry);
  start.setDate(start.getDate() - days);
  return start;
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

function hasRecordedSubscription(
  store: Pick<Store, 'subscriptionId' | 'subscriptionAmountIqd' | 'subscriptionLifetimeRevenueIqd'>,
  adminSettings?: Record<string, unknown> | null,
): boolean {
  if (!store.subscriptionId || store.subscriptionId === 'none') return false;
  return getStoreLifetimeRevenueIqd(store, adminSettings) > 0;
}

export type SubscriptionPlanAccountRow = {
  planId: string;
  labelAr: string;
  priceIqd: number;
  durationDays: number;
  activeStores: number;
  totalActiveAmountIqd: number;
  /** All stores on this plan (incl. expired) */
  totalStores: number;
  /** Lifetime revenue — stays counted after expiry */
  totalRevenueIqd: number;
};

export type SubscriptionStoreLedgerRow = {
  storeId: string;
  shopName: string;
  ownerName: string;
  subscriptionId: string;
  planLabel: string;
  amountIqd: number;
  lifetimeRevenueIqd: number;
  activatedAt: string | null;
  expiry: string;
  isActive: boolean;
};

export type SubscriptionRevenuePeriods = {
  todayIqd: number;
  monthIqd: number;
  yearIqd: number;
};

export type SubscriptionAccountsSummary = {
  byPlan: SubscriptionPlanAccountRow[];
  ledger: SubscriptionStoreLedgerRow[];
  activeStoresCount: number;
  grandTotalActiveIqd: number;
  /** All stores that ever paid — incl. expired */
  totalStoresWithRevenue: number;
  grandTotalLifetimeIqd: number;
  periods: SubscriptionRevenuePeriods;
};

export function computeSubscriptionAccounts(
  stores: Store[],
  adminSettings?: Record<string, unknown> | null,
  isActive: (s: Store) => boolean = () => true,
  now: Date = new Date(),
): SubscriptionAccountsSummary {
  const plans = resolveAllSubscriptionPlans(adminSettings);
  const planMap = Object.fromEntries(plans.map((p) => [p.id, p]));

  const byPlanMap = new Map<string, SubscriptionPlanAccountRow>();
  for (const plan of plans) {
    byPlanMap.set(plan.id, {
      planId: plan.id,
      labelAr: plan.labelAr,
      priceIqd: plan.priceIqd,
      durationDays: plan.durationDays,
      activeStores: 0,
      totalActiveAmountIqd: 0,
      totalStores: 0,
      totalRevenueIqd: 0,
    });
  }

  const ledger: SubscriptionStoreLedgerRow[] = [];
  let grandTotalActiveIqd = 0;
  let grandTotalLifetimeIqd = 0;
  let activeStoresCount = 0;
  let totalStoresWithRevenue = 0;
  const periods: SubscriptionRevenuePeriods = { todayIqd: 0, monthIqd: 0, yearIqd: 0 };

  for (const store of stores) {
    if (!hasRecordedSubscription(store, adminSettings)) continue;

    const subId = store.subscriptionId;
    const amount = getStoreSubscriptionAmountIqd(store, adminSettings);
    const lifetime = getStoreLifetimeRevenueIqd(store, adminSettings);
    const active = isActive(store);
    const label = getSubscriptionPlanLabel(subId, adminSettings);
    const activatedAt = resolveStoreActivationDate(store, adminSettings);
    const lastPayment = amount > 0 ? amount : lifetime;

    totalStoresWithRevenue += 1;
    grandTotalLifetimeIqd += lifetime;

    if (activatedAt && lastPayment > 0) {
      if (isSameCalendarDay(activatedAt, now)) periods.todayIqd += lastPayment;
      if (isSameCalendarMonth(activatedAt, now)) periods.monthIqd += lastPayment;
      if (isSameCalendarYear(activatedAt, now)) periods.yearIqd += lastPayment;
    }

    if (active && store.subscriptionStatus === 'active') {
      activeStoresCount += 1;
      grandTotalActiveIqd += amount;
    }

    const planRow = byPlanMap.get(subId) ?? {
      planId: subId,
      labelAr: label,
      priceIqd: planMap[subId]?.priceIqd ?? amount,
      durationDays: planMap[subId]?.durationDays ?? 0,
      activeStores: 0,
      totalActiveAmountIqd: 0,
      totalStores: 0,
      totalRevenueIqd: 0,
    };
    planRow.totalStores += 1;
    planRow.totalRevenueIqd += lifetime;
    if (active && store.subscriptionStatus === 'active') {
      planRow.activeStores += 1;
      planRow.totalActiveAmountIqd += amount;
    }
    byPlanMap.set(subId, planRow);

    ledger.push({
      storeId: store.id,
      shopName: store.shopName,
      ownerName: store.ownerName,
      subscriptionId: subId,
      planLabel: label,
      amountIqd: amount,
      lifetimeRevenueIqd: lifetime,
      activatedAt: activatedAt?.toISOString() ?? store.subscriptionLastActivatedAt ?? null,
      expiry: store.subscriptionExpiry || store.subscriptionExpiryDate || '—',
      isActive: active,
    });
  }

  return {
    byPlan: [...byPlanMap.values()]
      .filter((r) => r.totalStores > 0)
      .sort((a, b) => b.totalRevenueIqd - a.totalRevenueIqd),
    ledger: ledger.sort((a, b) => b.lifetimeRevenueIqd - a.lifetimeRevenueIqd),
    activeStoresCount,
    grandTotalActiveIqd,
    totalStoresWithRevenue,
    grandTotalLifetimeIqd,
    periods,
  };
}

/** Build store patch when admin activates/renews using a catalog plan (subscriptionId = plan.id). */
export function buildStoreActivationFromPlan(
  planId: string,
  adminSettings?: Record<string, unknown> | null,
  baseDate: Date = new Date(),
  existingStore?: Pick<Store, 'subscriptionExpiry' | 'subscriptionLifetimeRevenueIqd'>,
) {
  const plan = findSubscriptionPlanById(planId, adminSettings);
  if (!plan) return null;

  let start = baseDate;
  if (existingStore?.subscriptionExpiry) {
    const exp = existingStore.subscriptionExpiry;
    if (exp !== 'none' && exp !== 'منتهي' && exp !== 'Lifetime') {
      const parsed = new Date(exp);
      if (!Number.isNaN(parsed.getTime()) && parsed > baseDate) start = parsed;
    }
  }

  const activatedAt = new Date();
  const expiryDate = addDurationToDate(start, plan.durationDays, 'days');
  const finalExpiry = formatSubscriptionExpiryDate(expiryDate);
  const prevLifetime = existingStore?.subscriptionLifetimeRevenueIqd ?? 0;

  return {
    plan,
    patch: {
      ...buildActiveSubscriptionPatch(finalExpiry, plan.id, expiryDate.toISOString()),
      subscriptionAmountIqd: plan.priceIqd,
      subscriptionLastActivatedAt: activatedAt.toISOString(),
      subscriptionLifetimeRevenueIqd: prevLifetime + plan.priceIqd,
    },
  };
}

export function createNewSubscriptionPlanId(): string {
  return `sub_${Date.now().toString(36)}`;
}

export function formatIqd(amount: number): string {
  return amount.toLocaleString('ar-IQ');
}

export type MerchantRenewalWhatsAppContext = {
  shopName: string;
  username: string;
  phone: string;
};

export function buildMerchantRenewalWhatsAppMessage(
  store: MerchantRenewalWhatsAppContext,
  planLabelAr: string,
): string {
  const shopName = String(store.shopName || '').trim() || '—';
  const username = String(store.username || '').trim() || '—';
  const phone = String(store.phone || '').trim() || '—';
  const plan = String(planLabelAr || '').trim() || '—';

  return [
    'مرحباً دعم محلك، أريد تجديد إشتراك متجري',
    `اسم المتجر: ${shopName}`,
    `(معرف المتجر): ${username}`,
    `رقم هاتف: ${phone}`,
    `على الباقة المختارة: ${plan}.`,
  ].join('\n');
}

export function buildMerchantRenewalWhatsAppUrl(
  supportNumberDigits: string,
  store: MerchantRenewalWhatsAppContext,
  planLabelAr: string,
): string {
  const text = buildMerchantRenewalWhatsAppMessage(store, planLabelAr);
  return `https://wa.me/${supportNumberDigits}?text=${encodeURIComponent(text)}`;
}
