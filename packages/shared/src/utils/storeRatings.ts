import type { StoreReview } from '@shared/types';

/** Precompute store ratings in one pass (avoids O(stores × reviews) per render). */
export function computeStoreRatingsMap(
  storeReviews: StoreReview[],
): Map<string, { avg: number; display: string }> {
  const sums = new Map<string, { total: number; count: number }>();
  for (const review of storeReviews) {
    const prev = sums.get(review.storeId) || { total: 0, count: 0 };
    sums.set(review.storeId, { total: prev.total + review.rating, count: prev.count + 1 });
  }
  const result = new Map<string, { avg: number; display: string }>();
  sums.forEach(({ total, count }, storeId) => {
    const avg = total / count;
    result.set(storeId, { avg, display: avg.toFixed(1) });
  });
  return result;
}

export function lookupStoreRating(
  map: Map<string, { avg: number; display: string }>,
  storeId: string,
  fallback: number,
): string {
  return map.get(storeId)?.display ?? Number(fallback).toFixed(1);
}
