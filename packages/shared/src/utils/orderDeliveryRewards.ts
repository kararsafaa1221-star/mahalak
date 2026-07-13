import {
  increment,
  type DocumentReference,
  type DocumentSnapshot,
  type Transaction,
} from 'firebase/firestore';
import {
  calcOrderDeliveryPoints,
  calcTierUpgradeBonus,
  getEffectiveCustomerTierState,
  getOrderPointsEligibleAmount,
  resolveTierFromOrders,
  type LoyaltySettings,
} from '../constants/loyaltySettings';
import type { PromoCode } from '../types';

export interface OrderDeliveryRewardResult {
  applied: boolean;
  orderPoints: number;
  tierBonus: number;
  totalPoints: number;
}

export function resolveAdminSponsoredOrder(
  orderData: {
    discountSponsor?: string;
    promoCode?: string;
    discountAmount?: number;
  },
  promoCodes: PromoCode[] = [],
): { isAdminSponsored: boolean; storeEarnings: number } {
  let isAdminSponsored = orderData.discountSponsor === 'ADMIN';
  if (orderData.promoCode) {
    const usedPromo = promoCodes.find((p) => p.code === orderData.promoCode);
    if (usedPromo && (usedPromo.source === 'admin' || usedPromo.source === 'points')) {
      isAdminSponsored = true;
    }
  }
  const storeEarnings = Number(orderData.discountAmount) || 0;
  return { isAdminSponsored, storeEarnings };
}

export function applyOrderDeliveryRewardsInTransaction(
  transaction: Transaction,
  params: {
    orderRef: DocumentReference;
    customerRef: DocumentReference;
    storeSecretsRef: DocumentReference;
    orderSnap: DocumentSnapshot;
    customerSnap: DocumentSnapshot;
    orderUpdate: Record<string, unknown>;
    loyalty: LoyaltySettings;
    promoCodes?: PromoCode[];
  },
): OrderDeliveryRewardResult {
  const {
    orderRef,
    customerRef,
    storeSecretsRef,
    orderSnap,
    customerSnap,
    orderUpdate,
    loyalty,
    promoCodes = [],
  } = params;

  if (!orderSnap.exists()) {
    return { applied: false, orderPoints: 0, tierBonus: 0, totalPoints: 0 };
  }

  const orderData = orderSnap.data() as {
    status?: string;
    deliveryRewardsApplied?: boolean;
    total?: number;
    subtotal?: number;
    storeId?: string;
    discountSponsor?: string;
    promoCode?: string;
    discountAmount?: number;
  };

  // Rely ONLY on the deliveryRewardsApplied flag for idempotency.
  // Checking status alone is insufficient because an admin could reset the flag
  // and re-trigger delivery — that must never re-award points.
  if (orderData.deliveryRewardsApplied) {
    return { applied: false, orderPoints: 0, tierBonus: 0, totalPoints: 0 };
  }

  let orderPoints = 0;
  let tierBonus = 0;

  if (customerSnap.exists()) {
    const customerData = customerSnap.data() as {
      monthlyOrdersCount?: number;
      tier?: 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
      lastResetMonth?: string;
    };
    const periodState = getEffectiveCustomerTierState(
      {
        monthlyOrdersCount: customerData.monthlyOrdersCount,
        tier: customerData.tier,
        lastResetMonth: customerData.lastResetMonth,
      },
      loyalty,
    );
    const newCount = periodState.monthlyOrdersCount + 1;
    orderPoints = calcOrderDeliveryPoints(getOrderPointsEligibleAmount(orderData), loyalty);
    const oldTier = periodState.tier;
    const newTier = resolveTierFromOrders(newCount, loyalty.tiers);
    tierBonus = calcTierUpgradeBonus(oldTier, newTier, loyalty);

    transaction.update(customerRef, {
      points: increment(orderPoints + tierBonus),
      monthlyOrdersCount: newCount,
      tier: newTier,
      lastResetMonth: periodState.lastResetMonth,
    });
  }

  const { isAdminSponsored, storeEarnings } = resolveAdminSponsoredOrder(orderData, promoCodes);
  if (isAdminSponsored && storeEarnings > 0 && orderData.storeId) {
    transaction.set(
      storeSecretsRef,
      {
        storeId: orderData.storeId,
        walletBalance: increment(storeEarnings),
      },
      { merge: true },
    );
  }

  transaction.update(orderRef, {
    ...orderUpdate,
    deliveryRewardsApplied: true,
  });

  return {
    applied: true,
    orderPoints,
    tierBonus,
    totalPoints: orderPoints + tierBonus,
  };
}

export function buildOrderDeliveryRewardMessage(totalPoints: number): string {
  if (totalPoints > 0) {
    return `حصلت تلقائياً على +${totalPoints} نقطة كمكافأة استلام طلبك!`;
  }
  return 'تم استلام طلبك بنجاح.';
}
