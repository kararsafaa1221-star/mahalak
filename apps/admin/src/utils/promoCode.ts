import type { PromoCode } from '@shared/types';

export function normalizePromoCode(code: string): string {
  return String(code ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

export function isPromoActive(promo: Pick<PromoCode, 'status'>): boolean {
  return !promo.status || promo.status === 'active';
}

export function isPromoPercentType(discountType?: PromoCode['discountType']): boolean {
  return discountType === 'percent' || discountType === 'PERCENTAGE';
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

export const PROMO_CODE_DEFAULTS = {
  status: 'active' as const,
  usedCount: 0,
  currentGlobalUses: 0,
};
