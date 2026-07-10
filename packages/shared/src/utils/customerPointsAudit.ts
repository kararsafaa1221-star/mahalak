import {
  calcTierUpgradeBonus,
  getTierPeriodStart,
  resolveLoyaltySettings,
  resolveTierFromOrders,
  type LoyaltySettings,
  type LoyaltyTierKey,
} from '../constants/loyaltySettings';
import type { Customer, Order, PromoCode, RechargeCode, Store, StoreReview } from '../types';

export type PointsAuditSourceType =
  | 'order_purchase'
  | 'tier_upgrade'
  | 'store_review'
  | 'share_app'
  | 'recharge_code'
  | 'signup_bonus'
  | 'points_redemption';

export interface PointsAuditEntry {
  id: string;
  type: PointsAuditSourceType;
  points: number;
  labelAr: string;
  storeId?: string;
  storeName?: string;
  occurredAt: string;
  orderId?: string;
  orderTotal?: number;
}

export interface PointsAuditStoreBreakdown {
  storeId: string;
  storeName: string;
  orderCount: number;
  orderPoints: number;
  tierBonusPoints: number;
  reviewPoints: number;
  totalPoints: number;
  shareOfEarnedPercent: number;
}

export interface PointsAuditFraudFlag {
  severity: 'warning' | 'critical';
  messageAr: string;
}

export interface CustomerShareRewardDay {
  date: string;
  count: number;
  points: number;
}

export interface CustomerPointsAudit {
  customerId: string;
  currentBalance: number;
  totalEarned: number;
  totalSpent: number;
  reconstructedNet: number;
  balanceGap: number;
  entries: PointsAuditEntry[];
  bySource: Record<PointsAuditSourceType, number>;
  byStore: PointsAuditStoreBreakdown[];
  fraudFlags: PointsAuditFraudFlag[];
  dominantStore?: { storeId: string; storeName: string; percent: number };
}

export interface BuildCustomerPointsAuditInput {
  customer: Customer;
  orders: Order[];
  storeReviews: Array<StoreReview & { pointsAwardedAmount?: number; pointsAwarded?: boolean }>;
  rechargeCodes: RechargeCode[];
  promoCodes: PromoCode[];
  stores: Store[];
  adminSettings?: Record<string, unknown> | null;
  shareRewardDays?: CustomerShareRewardDay[];
}

const SOURCE_LABELS: Record<PointsAuditSourceType, string> = {
  order_purchase: 'طلب مكتمل',
  tier_upgrade: 'ترقية مستوى',
  store_review: 'تقييم متجر',
  share_app: 'مشاركة التطبيق',
  recharge_code: 'كود شحن',
  signup_bonus: 'مكافأة تسجيل',
  points_redemption: 'استبدال نقاط',
};

function emptyBySource(): Record<PointsAuditSourceType, number> {
  return {
    order_purchase: 0,
    tier_upgrade: 0,
    store_review: 0,
    share_app: 0,
    recharge_code: 0,
    signup_bonus: 0,
    points_redemption: 0,
  };
}

function parseDate(value?: string): Date {
  if (!value) return new Date(0);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

function storeNameFor(stores: Store[], storeId: string, fallback?: string): string {
  return stores.find((s) => s.id === storeId)?.shopName || fallback || storeId;
}

function inferRedemptionPoints(promo: PromoCode, loyalty: LoyaltySettings): number | null {
  const discount = Number(promo.discountValue ?? promo.amount ?? 0);
  const pkg = loyalty.redemptionPackages.find((p) => p.enabled && p.discountIqd === discount);
  if (pkg) return pkg.points;
  const basePts = loyalty.redemptionBasePoints || 150;
  const baseDisc = loyalty.redemptionBaseDiscountIqd || 5000;
  if (baseDisc > 0 && discount > 0 && discount % baseDisc === 0) {
    return (discount / baseDisc) * basePts;
  }
  return null;
}

function applyTierStateForOrder(
  state: { monthlyOrdersCount: number; tier: LoyaltyTierKey; lastResetMonth: string },
  orderDate: Date,
  loyalty: LoyaltySettings,
) {
  const periodStart = getTierPeriodStart(orderDate, loyalty.tierResetPeriodMonths);
  if (state.lastResetMonth !== periodStart) {
    state = { monthlyOrdersCount: 0, tier: 'Silver', lastResetMonth: periodStart };
  }
  const oldTier = state.tier;
  const newCount = state.monthlyOrdersCount + 1;
  const newTier = resolveTierFromOrders(newCount, loyalty.tiers);
  const tierBonus = calcTierUpgradeBonus(oldTier, newTier, loyalty);
  return {
    tierBonus,
    state: {
      monthlyOrdersCount: newCount,
      tier: newTier,
      lastResetMonth: periodStart,
    },
  };
}

export function buildCustomerPointsAudit(input: BuildCustomerPointsAuditInput): CustomerPointsAudit {
  const loyalty = resolveLoyaltySettings(input.adminSettings);
  const customerId = input.customer.id;
  const entries: PointsAuditEntry[] = [];
  const bySource = emptyBySource();
  const storeMap = new Map<string, PointsAuditStoreBreakdown>();

  const ensureStore = (storeId: string, storeName?: string) => {
    if (!storeMap.has(storeId)) {
      storeMap.set(storeId, {
        storeId,
        storeName: storeNameFor(input.stores, storeId, storeName),
        orderCount: 0,
        orderPoints: 0,
        tierBonusPoints: 0,
        reviewPoints: 0,
        totalPoints: 0,
        shareOfEarnedPercent: 0,
      });
    }
    return storeMap.get(storeId)!;
  };

  const deliveredOrders = input.orders
    .filter((o) => o.customerId === customerId && o.status === 'delivered')
    .sort((a, b) => parseDate(a.createdAt).getTime() - parseDate(b.createdAt).getTime());

  let tierState = {
    monthlyOrdersCount: 0,
    tier: 'Silver' as LoyaltyTierKey,
    lastResetMonth: getTierPeriodStart(new Date(0), loyalty.tierResetPeriodMonths),
  };

  for (const order of deliveredOrders) {
    const orderDate = parseDate(order.createdAt);
    const purchasePoints = Math.floor((order.total || 0) / 1000) * (loyalty.pointsPer1000Iqd || 1);
    const { tierBonus, state } = applyTierStateForOrder(tierState, orderDate, loyalty);
    tierState = state;

    const storeRow = ensureStore(order.storeId, order.storeName);
    storeRow.orderCount += 1;
    storeRow.orderPoints += purchasePoints;
    storeRow.tierBonusPoints += tierBonus;

    if (purchasePoints > 0) {
      entries.push({
        id: `order_pts_${order.id}`,
        type: 'order_purchase',
        points: purchasePoints,
        labelAr: SOURCE_LABELS.order_purchase,
        storeId: order.storeId,
        storeName: storeNameFor(input.stores, order.storeId, order.storeName),
        occurredAt: order.createdAt,
        orderId: order.id,
        orderTotal: order.total,
      });
      bySource.order_purchase += purchasePoints;
    }

    if (tierBonus > 0) {
      entries.push({
        id: `order_tier_${order.id}`,
        type: 'tier_upgrade',
        points: tierBonus,
        labelAr: `${SOURCE_LABELS.tier_upgrade} (${state.tier})`,
        storeId: order.storeId,
        storeName: storeNameFor(input.stores, order.storeId, order.storeName),
        occurredAt: order.createdAt,
        orderId: order.id,
        orderTotal: order.total,
      });
      bySource.tier_upgrade += tierBonus;
    }
  }

  for (const review of input.storeReviews.filter((r) => r.customerId === customerId)) {
    const pts = Number(review.pointsAwardedAmount) || loyalty.storeReviewRewardPoints;
    const row = ensureStore(review.storeId);
    row.reviewPoints += pts;
    entries.push({
      id: `review_${review.id}`,
      type: 'store_review',
      points: pts,
      labelAr: SOURCE_LABELS.store_review,
      storeId: review.storeId,
      storeName: row.storeName,
      occurredAt: review.createdAt,
    });
    bySource.store_review += pts;
  }

  for (const code of input.rechargeCodes.filter((c) => c.usedBy === customerId && c.status === 'used')) {
    const pts = Number(code.points) || 0;
    entries.push({
      id: `recharge_${code.id}`,
      type: 'recharge_code',
      points: pts,
      labelAr: `${SOURCE_LABELS.recharge_code} (${code.code})`,
      occurredAt: code.usedAt || code.createdAt,
    });
    bySource.recharge_code += pts;
  }

  for (const day of input.shareRewardDays ?? []) {
    if (day.points <= 0) continue;
    entries.push({
      id: `share_${day.date}`,
      type: 'share_app',
      points: day.points,
      labelAr: `${SOURCE_LABELS.share_app} (${day.count} مرة)`,
      occurredAt: `${day.date}T12:00:00.000Z`,
    });
    bySource.share_app += day.points;
  }

  for (const promo of input.promoCodes.filter((p) => p.ownerCustomerId === customerId && p.source === 'points')) {
    const pts = inferRedemptionPoints(promo, loyalty);
    if (!pts || pts <= 0) continue;
    entries.push({
      id: `redeem_${promo.id}`,
      type: 'points_redemption',
      points: -pts,
      labelAr: `${SOURCE_LABELS.points_redemption} (${promo.code})`,
      occurredAt: promo.createdAt || '',
    });
    bySource.points_redemption -= pts;
  }

  entries.sort((a, b) => parseDate(b.occurredAt).getTime() - parseDate(a.occurredAt).getTime());

  const totalEarned = Object.entries(bySource)
    .filter(([key]) => key !== 'points_redemption')
    .reduce((sum, [, value]) => sum + Math.max(0, value), 0);
  const totalSpent = Math.abs(bySource.points_redemption);
  let reconstructedNet = totalEarned - totalSpent;
  const currentBalance = Number(input.customer.points) || 0;
  let balanceGap = currentBalance - reconstructedNet;

  if (balanceGap > 0 && balanceGap <= loyalty.signupBonusPoints + 5) {
    entries.push({
      id: 'signup_estimate',
      type: 'signup_bonus',
      points: balanceGap,
      labelAr: `${SOURCE_LABELS.signup_bonus} (تقديرية)`,
      occurredAt: input.customer.joinedAt || '',
    });
    bySource.signup_bonus += balanceGap;
    reconstructedNet += balanceGap;
    balanceGap = currentBalance - reconstructedNet;
  }

  const byStore = Array.from(storeMap.values())
    .map((row) => ({
      ...row,
      totalPoints: row.orderPoints + row.tierBonusPoints + row.reviewPoints,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const orderRelatedEarned = bySource.order_purchase + bySource.tier_upgrade + bySource.store_review;
  for (const row of byStore) {
    row.shareOfEarnedPercent =
      orderRelatedEarned > 0 ? Math.round((row.totalPoints / orderRelatedEarned) * 100) : 0;
  }

  const fraudFlags: PointsAuditFraudFlag[] = [];
  const dominant = byStore[0];
  if (dominant && orderRelatedEarned > 0) {
    const percent = dominant.shareOfEarnedPercent;
    if (percent >= 80) {
      fraudFlags.push({
        severity: 'critical',
        messageAr: `⚠️ ${percent}% من نقاط الطلبات/التقييمات مرتبطة بمتجر واحد: «${dominant.storeName}» — احتمال تلاعب.`,
      });
    } else if (percent >= 60) {
      fraudFlags.push({
        severity: 'warning',
        messageAr: `${percent}% من نقاط الطلبات/التقييمات من متجر «${dominant.storeName}» — يستحق مراجعة.`,
      });
    }
  }

  if (Math.abs(balanceGap) >= 20) {
    fraudFlags.push({
      severity: balanceGap > 50 ? 'critical' : 'warning',
      messageAr:
        balanceGap > 0
          ? `فجوة ${balanceGap} نقطة غير موثّقة في السجلات المتاحة (قد تكون تعديلات يدوية أو مصادر قديمة).`
          : `الرصيد أقل من المحسوب بـ ${Math.abs(balanceGap)} نقطة — راجع الاستبدالات أو التصفير السابق.`,
    });
  }

  if (bySource.share_app >= loyalty.shareRewardPoints * loyalty.shareDailyLimit * 3) {
    fraudFlags.push({
      severity: 'warning',
      messageAr: 'نشاط مشاركة مرتفع جداً مقارنة بالحد اليومي — راجع سجل المشاركات.',
    });
  }

  const reviewStoreCounts = new Map<string, number>();
  for (const review of input.storeReviews.filter((r) => r.customerId === customerId)) {
    reviewStoreCounts.set(review.storeId, (reviewStoreCounts.get(review.storeId) || 0) + 1);
  }
  for (const [storeId, count] of reviewStoreCounts) {
    if (count >= 3) {
      fraudFlags.push({
        severity: 'warning',
        messageAr: `${count} تقييمات لنفس المتجر «${storeNameFor(input.stores, storeId)}» — قد يشير لاحتيال تقييمات.`,
      });
    }
  }

  return {
    customerId,
    currentBalance,
    totalEarned: totalEarned + bySource.signup_bonus,
    totalSpent,
    reconstructedNet,
    balanceGap,
    entries,
    bySource,
    byStore,
    fraudFlags,
    dominantStore: dominant
      ? { storeId: dominant.storeId, storeName: dominant.storeName, percent: dominant.shareOfEarnedPercent }
      : undefined,
  };
}
