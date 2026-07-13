import { Product, Store } from '@shared/types';

function publishedStoreProducts(storeId: string, products: Product[]): Product[] {
  return products.filter((p) => p.storeId === storeId && p.status === 'published');
}

export function productHasActiveDiscount(product: Product): boolean {
  const discountType = product.discountType || 'none';
  if (discountType === 'none') return false;
  return (product.discountValue ?? 0) > 0;
}

/** True when every published product in the store has an active discount. */
export function storeHasDiscountOnAllProducts(store: Store, products: Product[]): boolean {
  const storeProducts = publishedStoreProducts(store.id, products);
  if (storeProducts.length === 0) return false;
  return storeProducts.every(productHasActiveDiscount);
}

/** True when the store has at least one explicit product discount or active promo banner. */
export function storeHasActiveDiscounts(store: Store, products: Product[]): boolean {
  return getStoreOfferBadge(store, products) !== null;
}

/** Returns a short badge label (e.g. "50%") only for real store discounts. */
export function getStoreOfferBadge(store: Store, products: Product[]): string | null {
  const storeProducts = publishedStoreProducts(store.id, products);

  let maxPercent = 0;

  for (const product of storeProducts) {
    const discountType = product.discountType || 'none';
    if (discountType === 'none') continue;

    if (discountType === 'percent' && product.discountValue > 0) {
      maxPercent = Math.max(maxPercent, product.discountValue);
      continue;
    }

    if (discountType === 'amount' && product.discountValue > 0 && product.price > 0) {
      maxPercent = Math.max(
        maxPercent,
        Math.round((product.discountValue / product.price) * 100),
      );
    }
  }

  if (maxPercent >= 1) {
    return `${Math.round(maxPercent)}%`;
  }

  const promo = store.promoBanner;
  if (promo?.isActive) {
    const match = promo.subtitle?.match(/(\d+)\s*%/);
    if (match) return `${match[1]}%`;
    return 'عرض';
  }

  return null;
}
