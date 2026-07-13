import type { PromoCode } from '../types';

export type WalletSeenState = {
  points: number;
  promoKeys: string[];
};

const storageKey = (customerId: string) => `mahalak_wallet_seen_${customerId}`;

export function readWalletSeenState(customerId: string): WalletSeenState {
  try {
    const raw = localStorage.getItem(storageKey(customerId));
    if (!raw) return { points: 0, promoKeys: [] };
    const parsed = JSON.parse(raw) as WalletSeenState;
    return {
      points: Number(parsed.points) || 0,
      promoKeys: Array.isArray(parsed.promoKeys) ? parsed.promoKeys.filter(Boolean) : [],
    };
  } catch {
    return { points: 0, promoKeys: [] };
  }
}

export function writeWalletSeenState(customerId: string, state: WalletSeenState): void {
  try {
    localStorage.setItem(storageKey(customerId), JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

export function walletPromoKey(promo: PromoCode): string {
  return promo.id || promo.code || '';
}

export function isWalletPromoStillValid(promo: PromoCode, now = Date.now()): boolean {
  if (promo.status !== 'active') return false;
  const expiry = promo.expirationDate || promo.expiresAt;
  if (expiry && new Date(expiry).getTime() < now) return false;
  const currentUses = promo.currentGlobalUses ?? promo.usedCount ?? 0;
  const maxUses = promo.maxGlobalUses ?? promo.maxUses ?? 0;
  if (maxUses > 0 && currentUses >= maxUses) return false;
  return true;
}

export function getVisibleWalletPromoKeys(
  promos: PromoCode[],
  customerId: string,
  now = Date.now(),
): string[] {
  const keys = new Set<string>();
  for (const p of promos) {
    if (!isWalletPromoStillValid(p, now)) continue;
    if (p.source === 'points') {
      if (p.ownerCustomerId === customerId) keys.add(walletPromoKey(p));
      continue;
    }
    if (p.ownerCustomerId && p.ownerCustomerId !== customerId) continue;
    keys.add(walletPromoKey(p));
  }
  return Array.from(keys).filter(Boolean);
}

/** Show 🎁 on حسابي when redeemable, new points, or new promo codes since last wallet visit. */
export function shouldShowProfileWalletGiftBadge(args: {
  points: number;
  promos: PromoCode[];
  customerId: string;
  minRedeemPoints: number;
  seen?: WalletSeenState;
}): boolean {
  const seen = args.seen ?? readWalletSeenState(args.customerId);
  const promoKeys = getVisibleWalletPromoKeys(args.promos, args.customerId);
  const hasNewPoints = args.points > seen.points;
  const hasNewPromos = promoKeys.some((k) => !seen.promoKeys.includes(k));
  const canRedeemNow = args.points >= args.minRedeemPoints;
  const newlyRedeemable = canRedeemNow && seen.points < args.minRedeemPoints;
  return hasNewPoints || hasNewPromos || newlyRedeemable;
}

export function markWalletRewardsSeen(
  customerId: string,
  points: number,
  promos: PromoCode[],
): void {
  writeWalletSeenState(customerId, {
    points,
    promoKeys: getVisibleWalletPromoKeys(promos, customerId),
  });
}
