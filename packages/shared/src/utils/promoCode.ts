import type { PromoCode } from '@shared/types';

export function normalizePromoCode(code: string): string {
  return String(code ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

/** Treat missing status as active for legacy documents. */
export function isPromoActive(promo: Pick<PromoCode, 'status'>): boolean {
  return !promo.status || promo.status === 'active';
}

export function isPromoPercentType(discountType?: PromoCode['discountType']): boolean {
  return discountType === 'percent' || discountType === 'PERCENTAGE';
}

export function isPromoAmountType(discountType?: PromoCode['discountType']): boolean {
  return discountType === 'amount' || discountType === 'FIXED';
}

export function getPromoDiscountValue(promo: PromoCode): number {
  if (isPromoPercentType(promo.discountType)) {
    return promo.discountValue ?? 0;
  }
  return promo.discountAmount ?? promo.amount ?? promo.discountValue ?? 0;
}

export function formatPromoDiscount(promo: PromoCode): string {
  const value = getPromoDiscountValue(promo);
  return isPromoPercentType(promo.discountType)
    ? `${value.toLocaleString()}%`
    : `${value.toLocaleString()} د.ع`;
}

export function calculatePromoDiscount(promo: PromoCode, cartSubtotal: number): number {
  if (isPromoPercentType(promo.discountType)) {
    return (cartSubtotal * getPromoDiscountValue(promo)) / 100;
  }
  return getPromoDiscountValue(promo);
}

export function findPromoByCode(promos: PromoCode[], code: string): PromoCode | undefined {
  const normalized = normalizePromoCode(code);
  return promos.find(
    (promo) => normalizePromoCode(promo.code) === normalized && isPromoActive(promo),
  );
}

export interface PromoCartContext {
  customerId?: string;
  customerProvince?: string;
  storeIdsInCart: string[];
  orders: Array<{ customerId?: string; storeId?: string; promoCode?: string; status?: string }>;
}

export function validatePromoForCart(
  promo: PromoCode,
  ctx: PromoCartContext,
): string | null {
  if (promo.startDate && new Date(promo.startDate) > new Date()) {
    return 'هذا الكود لم يبدأ بعد ⏳';
  }

  const expDateStr = promo.expirationDate || promo.expiresAt;
  if (expDateStr && Date.now() > new Date(expDateStr).getTime()) {
    return 'الكود منتهي الصلاحية ❌';
  }

  const currentGlobalUses = promo.currentGlobalUses ?? promo.usedCount ?? 0;
  const maxGlobalUses = promo.maxGlobalUses ?? promo.maxUses ?? 0;
  if (maxGlobalUses > 0 && currentGlobalUses >= maxGlobalUses) {
    return 'الكود منتهي — تم استنفاد عدد الاستخدامات ❌';
  }

  if (promo.maxUsesPerUser && ctx.customerId) {
    const userPromoUsage = ctx.orders.filter(
      (order) =>
        order.customerId === ctx.customerId &&
        normalizePromoCode(order.promoCode || '') === normalizePromoCode(promo.code) &&
        order.status !== 'cancelled' &&
        order.status !== 'rejected',
    ).length;
    if (userPromoUsage >= promo.maxUsesPerUser) {
      return 'لقد استخدمت هذا الكود الحد الأقصى المسموح ❌';
    }
  }

  if (promo.targetProvinces?.length && ctx.customerProvince) {
    if (!promo.targetProvinces.includes(ctx.customerProvince)) {
      return 'هذا الكود غير متاح في محافظتك ❌';
    }
  }

  if (
    promo.targetStores &&
    promo.targetStores !== 'ALL' &&
    Array.isArray(promo.targetStores) &&
    promo.targetStores.length > 0
  ) {
    const isStoreValid = ctx.storeIdsInCart.some((id) => promo.targetStores!.includes(id));
    if (!isStoreValid) {
      return 'هذا الكود غير مخصص لمتاجر سلتك الحالية ❌';
    }
  } else if (
    promo.storeId &&
    promo.storeId !== 'ALL_STORES' &&
    promo.storeId !== ctx.customerId
  ) {
    const isStoreValid = ctx.storeIdsInCart.includes(promo.storeId);
    if (!isStoreValid && promo.source !== 'points') {
      return 'هذا الكود غير مخصص لهذا المتجر ❌';
    }
  }

  if (promo.sponsor === 'MERCHANT' && promo.merchantId && ctx.customerId) {
    // Audience checks need customer object — handled by caller if needed
  }

  return null;
}

export const PROMO_CODE_DEFAULTS = {
  status: 'active' as const,
  usedCount: 0,
  currentGlobalUses: 0,
};
