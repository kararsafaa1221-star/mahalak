import type { SponsoredAdItem } from '../components/SponsoredAdSlider';

export const DEFAULT_SPONSORED_AD_BADGE = 'إعلان مميز ممول ✨';

/** إعلانات جاهزة للعرض — يجب أن تحتوي على صورة محفوظة من لوحة الإدارة. */
export function getPublishedSponsoredAds(ads?: SponsoredAdItem[] | null): SponsoredAdItem[] {
  return (ads || []).filter((ad) => Boolean(ad?.url?.trim()));
}

/** Soft boost: ads that point at verified stores appear earlier in the slider. */
export function prioritizeAdsTargetingVerifiedStores(
  ads: SponsoredAdItem[],
  isVerifiedStoreId: (storeId: string | undefined | null) => boolean,
): SponsoredAdItem[] {
  if (!ads.length) return ads;
  return [...ads].sort((a, b) => {
    const storeIdA =
      a.targetType === 'store' ? a.targetId : a.storeId || a.targetStoreId || undefined;
    const storeIdB =
      b.targetType === 'store' ? b.targetId : b.storeId || b.targetStoreId || undefined;
    const scoreA = isVerifiedStoreId(storeIdA) ? 0 : 1;
    const scoreB = isVerifiedStoreId(storeIdB) ? 0 : 1;
    return scoreA - scoreB;
  });
}

export function isSponsoredAdClickable(ad: SponsoredAdItem): boolean {
  const targetType = ad.targetType || 'none';

  if (targetType === 'store' && ad.targetId) return true;
  if (targetType === 'product' && ad.targetId && (ad.storeId || ad.targetStoreId)) return true;
  if (targetType === 'link' && ad.link?.trim()) return true;
  if (ad.link?.trim()) return true;

  return false;
}

export function getSponsoredAdTitle(ad: SponsoredAdItem, fallback?: string): string | null {
  const title = ad.title?.trim();
  if (title) return title;
  return fallback?.trim() || null;
}

export function getSponsoredAdDesc(ad: SponsoredAdItem, fallback?: string): string | null {
  const desc = ad.desc?.trim();
  if (desc) return desc;
  return fallback?.trim() || null;
}

export function getSponsoredAdBadge(ad: SponsoredAdItem, fallback?: string): string | null {
  if (ad.badge != null) {
    const badge = ad.badge.trim();
    return badge || null;
  }
  // Explicit fallback (including empty string) overrides the default — empty hides the badge.
  if (fallback !== undefined) {
    const globalBadge = fallback.trim();
    return globalBadge || null;
  }
  return DEFAULT_SPONSORED_AD_BADGE;
}

export function getSponsoredAdsFingerprint(ads: SponsoredAdItem[]): string {
  return ads
    .map((ad) => [ad.id, ad.url, ad.title, ad.desc, ad.badge, ad.targetType, ad.targetId, ad.storeId, ad.link].join(':'))
    .join('|');
}

export function reorderSponsoredAds<T>(ads: T[], index: number, direction: 'up' | 'down'): T[] {
  const next = [...ads];
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= next.length) return next;
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

export type MerchantAdsSectionKey = 'delivery' | 'media';

export function getMerchantAdsSectionOrder(order?: MerchantAdsSectionKey[] | null): MerchantAdsSectionKey[] {
  const normalized = (order || []).filter((key): key is MerchantAdsSectionKey => key === 'delivery' || key === 'media');
  if (normalized.includes('delivery') && normalized.includes('media')) {
    return normalized.slice(0, 2);
  }
  return ['delivery', 'media'];
}
