import type { Product, Store } from '../types';

/** Whether the store currently has an active verified badge (supports legacy is_verified). */
export function isStoreVerified(store: Pick<Store, 'isVerified'> | null | undefined): boolean {
  if (!store) return false;
  return store.isVerified === true || (store as Store & { is_verified?: boolean }).is_verified === true;
}

/** Sort comparator — verified stores appear first. */
export function compareStoresVerifiedFirst(
  a: Pick<Store, 'isVerified'>,
  b: Pick<Store, 'isVerified'>,
): number {
  const verifiedA = isStoreVerified(a);
  const verifiedB = isStoreVerified(b);
  if (verifiedA && !verifiedB) return -1;
  if (!verifiedA && verifiedB) return 1;
  return 0;
}

/** Apply verified-first ordering, then an optional secondary comparator. */
export function sortStoresVerifiedFirst<T extends Pick<Store, 'isVerified'>>(
  stores: T[],
  secondary?: (a: T, b: T) => number,
): T[] {
  return [...stores].sort((a, b) => {
    const verifiedCmp = compareStoresVerifiedFirst(a, b);
    if (verifiedCmp !== 0) return verifiedCmp;
    return secondary ? secondary(a, b) : 0;
  });
}

/** Products from verified stores appear before others; secondary sort runs within each group. */
export function sortProductsByVerifiedStoreFirst<T extends Product>(
  products: T[],
  storeMap: Map<string, Store | undefined> | ReadonlyMap<string, Store | undefined>,
  secondary?: (a: T, b: T) => number,
): T[] {
  return [...products].sort((a, b) => {
    const verifiedA = isStoreVerified(storeMap.get(a.storeId));
    const verifiedB = isStoreVerified(storeMap.get(b.storeId));
    if (verifiedA && !verifiedB) return -1;
    if (!verifiedA && verifiedB) return 1;
    return secondary ? secondary(a, b) : 0;
  });
}
