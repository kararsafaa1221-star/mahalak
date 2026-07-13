/** Server-side loyalty settings — keep defaults aligned with packages/shared/src/constants/loyaltySettings.ts */

const DEFAULT_LOYALTY = {
  pointsPer1000Iqd: 1,
  orderDeliveryBonusPoints: 0,
  signupBonusPoints: 50,
  shareRewardPoints: 5,
  shareDailyLimit: 10,
  storeReviewRewardPoints: 50,
  productReviewRewardPoints: 0,
  tierUpgradeBonuses: {
    silverToGold: 100,
    goldToPlatinum: 125,
    platinumToDiamond: 150,
  },
  tierResetPeriodMonths: 1,
  redemptionBasePoints: 150,
  redemptionBaseDiscountIqd: 5000,
  tiers: [
    { key: "Silver", labelAr: "فضي", shortIcon: "S", ordersRequired: 0, upgradeBonusPoints: 0 },
    { key: "Gold", labelAr: "ذهبي", shortIcon: "G", ordersRequired: 5, upgradeBonusPoints: 100 },
    { key: "Platinum", labelAr: "بلاتيني", shortIcon: "P", ordersRequired: 10, upgradeBonusPoints: 125 },
    { key: "Diamond", labelAr: "ماسي", shortIcon: "D", ordersRequired: 15, upgradeBonusPoints: 150 },
  ],
  redemptionPackages: [
    { id: "red_bronze", points: 150, discountIqd: 5000, title: "كوبون برونزي للخصم المباشر", enabled: true },
    { id: "red_silver", points: 300, discountIqd: 10000, title: "كوبون فضي للتوفير السريع", enabled: true },
    { id: "red_gold", points: 450, discountIqd: 15000, title: "كوبون ذهبي مذهل للمشتريات", enabled: true },
    { id: "red_platinum", points: 600, discountIqd: 20000, title: "كوبون بلاتيني فخم ومميز", enabled: true },
    { id: "red_diamond", points: 750, discountIqd: 25000, title: "كوبون ماسي ملكي فائق التوفير", enabled: true },
  ],
};

let loyaltyCache = { data: null, fetchedAt: 0 };

function mergeTiers(raw, legacyBonuses) {
  const bonusFallback = {
    Silver: 0,
    Gold: legacyBonuses?.silverToGold ?? 100,
    Platinum: legacyBonuses?.goldToPlatinum ?? 125,
    Diamond: legacyBonuses?.platinumToDiamond ?? 150,
  };

  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_LOYALTY.tiers.map((t) => ({ ...t }));
  }

  return raw.map((t) => {
    const key = String(t.key || "Silver");
    return {
      key,
      labelAr: String(t.labelAr || ""),
      shortIcon: String(t.shortIcon || "•"),
      ordersRequired: Number(t.ordersRequired) || 0,
      upgradeBonusPoints:
        t.upgradeBonusPoints != null
          ? Number(t.upgradeBonusPoints) || 0
          : bonusFallback[key] ?? 0,
    };
  });
}

function syncTierUpgradeBonusesFromTiers(tiers) {
  const byKey = Object.fromEntries(tiers.map((t) => [t.key, t.upgradeBonusPoints]));
  return {
    silverToGold: byKey.Gold ?? 0,
    goldToPlatinum: byKey.Platinum ?? 0,
    platinumToDiamond: byKey.Diamond ?? 0,
  };
}

function mergePackages(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_LOYALTY.redemptionPackages;
  return raw
    .filter((p) => p && p.id)
    .map((p) => ({
      id: String(p.id),
      points: Number(p.points) || 0,
      discountIqd: Number(p.discountIqd) || 0,
      title: String(p.title || ""),
      enabled: p.enabled !== false,
    }));
}

function mergeEarnRules(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ id: "earn_order", type: "order_completed", enabled: true, pointsPer1000Iqd: 1 }];
  }
  return raw
    .filter((r) => r && r.id && r.type)
    .map((r) => ({
      id: String(r.id),
      type: String(r.type),
      enabled: r.enabled !== false,
      pointsPer1000Iqd: r.pointsPer1000Iqd != null ? Number(r.pointsPer1000Iqd) || 0 : undefined,
    }));
}

function getOrderDeliveryEarnRule(loyalty) {
  return (loyalty.earnRules || []).find((rule) => rule.type === "order_completed");
}

function isOrderDeliveryRewardEnabled(loyalty) {
  const rule = getOrderDeliveryEarnRule(loyalty);
  return rule ? rule.enabled !== false : true;
}

function getOrderDeliveryPointsPer1000(loyalty) {
  const rule = getOrderDeliveryEarnRule(loyalty);
  return rule?.pointsPer1000Iqd ?? loyalty.pointsPer1000Iqd ?? 0;
}

function calcOrderDeliveryPoints(orderTotal, loyalty) {
  if (!isOrderDeliveryRewardEnabled(loyalty)) return 0;
  const per1000 = getOrderDeliveryPointsPer1000(loyalty);
  const volumePoints = Math.floor((orderTotal || 0) / 1000) * (per1000 || 0);
  const fixedBonus = Math.max(0, Number(loyalty.orderDeliveryBonusPoints) || 0);
  return volumePoints + fixedBonus;
}

/** Product subtotal for loyalty points — delivery fees are excluded. */
function getOrderPointsEligibleAmount(order) {
  const subtotal = Number(order?.subtotal);
  if (Number.isFinite(subtotal) && subtotal >= 0) return subtotal;
  const total = Number(order?.total);
  return Number.isFinite(total) && total >= 0 ? total : 0;
}

function resolveLoyaltySettings(globalData) {
  const raw = globalData?.loyaltyWallet;
  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_LOYALTY,
      tiers: DEFAULT_LOYALTY.tiers.map((t) => ({ ...t })),
      redemptionPackages: [...DEFAULT_LOYALTY.redemptionPackages],
      earnRules: [{ id: "earn_order", type: "order_completed", enabled: true, pointsPer1000Iqd: 1 }],
    };
  }

  const legacyBonuses = {
    silverToGold: Number(raw.tierUpgradeBonuses?.silverToGold ?? DEFAULT_LOYALTY.tierUpgradeBonuses.silverToGold),
    goldToPlatinum: Number(raw.tierUpgradeBonuses?.goldToPlatinum ?? DEFAULT_LOYALTY.tierUpgradeBonuses.goldToPlatinum),
    platinumToDiamond: Number(raw.tierUpgradeBonuses?.platinumToDiamond ?? DEFAULT_LOYALTY.tierUpgradeBonuses.platinumToDiamond),
  };
  const tiers = mergeTiers(raw.tiers, legacyBonuses);

  return {
    pointsPer1000Iqd: Number(raw.pointsPer1000Iqd ?? DEFAULT_LOYALTY.pointsPer1000Iqd),
    orderDeliveryBonusPoints: Number(raw.orderDeliveryBonusPoints ?? DEFAULT_LOYALTY.orderDeliveryBonusPoints),
    signupBonusPoints: Number(raw.signupBonusPoints ?? DEFAULT_LOYALTY.signupBonusPoints),
    shareRewardPoints: Number(raw.shareRewardPoints ?? DEFAULT_LOYALTY.shareRewardPoints),
    shareDailyLimit: Number(raw.shareDailyLimit ?? DEFAULT_LOYALTY.shareDailyLimit),
    storeReviewRewardPoints: Number(raw.storeReviewRewardPoints ?? DEFAULT_LOYALTY.storeReviewRewardPoints),
    productReviewRewardPoints: Number(raw.productReviewRewardPoints ?? DEFAULT_LOYALTY.productReviewRewardPoints),
    tierUpgradeBonuses: syncTierUpgradeBonusesFromTiers(tiers),
    tierResetPeriodMonths: Math.max(1, Number(raw.tierResetPeriodMonths ?? DEFAULT_LOYALTY.tierResetPeriodMonths)),
    redemptionBasePoints: Number(raw.redemptionBasePoints ?? DEFAULT_LOYALTY.redemptionBasePoints),
    redemptionBaseDiscountIqd: Number(raw.redemptionBaseDiscountIqd ?? DEFAULT_LOYALTY.redemptionBaseDiscountIqd),
    tiers,
    redemptionPackages: mergePackages(raw.redemptionPackages),
    earnRules: mergeEarnRules(raw.earnRules),
  };
}

async function getLoyaltySettings(dbRef) {
  const now = Date.now();
  if (loyaltyCache.data && now - loyaltyCache.fetchedAt < 60_000) {
    return loyaltyCache.data;
  }
  const snap = await dbRef.collection("settings").doc("global").get();
  const resolved = resolveLoyaltySettings(snap.exists ? snap.data() : null);
  loyaltyCache = { data: resolved, fetchedAt: now };
  return resolved;
}

function getTierPeriodStart(date, periodMonths) {
  const months = Math.max(1, periodMonths);
  const totalMonths = date.getFullYear() * 12 + date.getMonth();
  const periodStartTotal = Math.floor(totalMonths / months) * months;
  const y = Math.floor(periodStartTotal / 12);
  const m = (periodStartTotal % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function applyTierPeriodReset(customerData, loyalty, now = new Date()) {
  const periodStart = getTierPeriodStart(now, loyalty.tierResetPeriodMonths);
  const lastReset = customerData.lastResetMonth || "";
  if (lastReset === periodStart) {
    return {
      monthlyOrdersCount: customerData.monthlyOrdersCount || 0,
      tier: customerData.tier || "Silver",
      lastResetMonth: periodStart,
      didReset: false,
    };
  }
  return {
    monthlyOrdersCount: 0,
    tier: "Silver",
    lastResetMonth: periodStart,
    didReset: true,
  };
}

function resolveTierFromOrders(monthlyOrders, tiers) {
  const sorted = [...tiers].sort((a, b) => a.ordersRequired - b.ordersRequired);
  let result = "Silver";
  for (const tier of sorted) {
    if (monthlyOrders >= tier.ordersRequired) result = tier.key;
  }
  return result;
}

function getTierUpgradeBonus(tierKey, tiers) {
  const tier = tiers.find((t) => t.key === tierKey);
  return tier ? Number(tier.upgradeBonusPoints) || 0 : 0;
}

function calcTierBonus(oldTier, newTier, tiers) {
  if (oldTier === newTier) return 0;
  return getTierUpgradeBonus(newTier, tiers);
}

function calcRedemptionDiscount(points, loyalty) {
  const pkg = loyalty.redemptionPackages.find((p) => p.enabled && p.points === points);
  if (pkg) return pkg.discountIqd;
  const basePts = loyalty.redemptionBasePoints || 150;
  const baseDisc = loyalty.redemptionBaseDiscountIqd || 5000;
  return Math.floor(points / basePts) * baseDisc;
}

function isValidRedemptionPoints(points, loyalty) {
  const enabled = loyalty.redemptionPackages.filter((p) => p.enabled);
  if (enabled.some((p) => p.points === points)) return true;
  const minPts = Math.min(...enabled.map((p) => p.points), loyalty.redemptionBasePoints || 150);
  return Number.isFinite(points) && points >= minPts;
}

function buildOrderDeliveryRewardMessage(totalPoints) {
  if (totalPoints > 0) {
    return `حصلت تلقائياً على +${totalPoints} نقطة كمكافأة استلام طلبك!`;
  }
  return "تم استلام طلبك بنجاح.";
}

module.exports = {
  DEFAULT_LOYALTY,
  resolveLoyaltySettings,
  getLoyaltySettings,
  getTierPeriodStart,
  applyTierPeriodReset,
  resolveTierFromOrders,
  calcTierBonus,
  calcRedemptionDiscount,
  isValidRedemptionPoints,
  calcOrderDeliveryPoints,
  isOrderDeliveryRewardEnabled,
  buildOrderDeliveryRewardMessage,
  getOrderPointsEligibleAmount,
};
