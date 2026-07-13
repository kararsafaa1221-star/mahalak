import type { Product } from '../types';

export function computeProductFinalPrice(
  price: number,
  discountType: Product['discountType'],
  discountValue: number,
): number {
  if (discountType === 'percent') {
    return Math.max(0, price - price * (discountValue / 100));
  }
  if (discountType === 'amount') {
    return Math.max(0, price - (discountValue || 0));
  }
  return price;
}
