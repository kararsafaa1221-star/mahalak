export type LoyaltyTierKey = 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export interface LoyaltyTierConfig {
  key: LoyaltyTierKey;
  labelAr: string;
  shortIcon: string;
  ordersRequired: number;
  /** نقاط الهدية عند الوصول لهذا المستوى (0 للفضي) */
  upgradeBonusPoints: number;
}

export interface LoyaltyRedemptionPackage {
  id: string;
  points: number;
  discountIqd: number;
  title: string;
  enabled: boolean;
}

export type LoyaltyEarnRuleType =
  | 'order_completed'
  | 'tier_upgrade'
  | 'share_app'
  | 'store_review'
  | 'product_review'
  | 'signup'
  | 'custom';

export interface LoyaltyEarnRule {
  id: string;
  type: LoyaltyEarnRuleType;
  titleAr: string;
  descriptionAr: string;
  emoji: string;
  points: number;
  pointsPer1000Iqd?: number;
  dailyLimit?: number;
  enabled: boolean;
}

export interface LoyaltyWalletTexts {
  pageTitle: string;
  pointsTabLabel: string;
  giftsTabLabel: string;
  balanceLabel: string;
  pointsUnit: string;
  nextTierLabel: string;
  maxTierMessage: string;
  rewardShopTitle: string;
  redeemButton: string;
  redeemRemainingTemplate: string;
  rechargeTitle: string;
  rechargePlaceholder: string;
  rechargeButton: string;
  earnSectionTitle: string;
  earnSectionSubtitle: string;
  tierUpgradeTitle: string;
  tierUpgradeNote: string;
  giftsHeaderTitle: string;
  giftsHeaderSubtitle: string;
  giftsEmptyTitle: string;
  giftsEmptyText: string;
  promoHeaderPoints: string;
  promoHeaderStore: string;
  promoHeaderAdmin: string;
  shareRewardNotificationTemplate: string;
  storeReviewRewardNotificationTemplate: string;
}

export interface LoyaltyTierUpgradeBonuses {
  silverToGold: number;
  goldToPlatinum: number;
  platinumToDiamond: number;
}

export interface LoyaltySettings {
  pointsPer1000Iqd: number;
  signupBonusPoints: number;
  shareRewardPoints: number;
  shareDailyLimit: number;
  storeReviewRewardPoints: number;
  productReviewRewardPoints: number;
  tierUpgradeBonuses: LoyaltyTierUpgradeBonuses;
  /** كل كم شهر يُصفَّر عداد الطلبات والمستوى (1 = شهرياً) */
  tierResetPeriodMonths: number;
  redemptionBasePoints: number;
  redemptionBaseDiscountIqd: number;
  tiers: LoyaltyTierConfig[];
  redemptionPackages: LoyaltyRedemptionPackage[];
  earnRules: LoyaltyEarnRule[];
  texts: LoyaltyWalletTexts;
}

const DEFAULT_TIERS: LoyaltyTierConfig[] = [
  { key: 'Silver', labelAr: 'فضي', shortIcon: 'S', ordersRequired: 0, upgradeBonusPoints: 0 },
  { key: 'Gold', labelAr: 'ذهبي', shortIcon: 'G', ordersRequired: 5, upgradeBonusPoints: 100 },
  { key: 'Platinum', labelAr: 'بلاتيني', shortIcon: 'P', ordersRequired: 10, upgradeBonusPoints: 125 },
  { key: 'Diamond', labelAr: 'ماسي', shortIcon: 'D', ordersRequired: 15, upgradeBonusPoints: 150 },
];

const DEFAULT_REDEMPTION_PACKAGES: LoyaltyRedemptionPackage[] = [
  { id: 'red_bronze', points: 150, discountIqd: 5000, title: 'كوبون برونزي للخصم المباشر', enabled: true },
  { id: 'red_silver', points: 300, discountIqd: 10000, title: 'كوبون فضي للتوفير السريع', enabled: true },
  { id: 'red_gold', points: 450, discountIqd: 15000, title: 'كوبون ذهبي مذهل للمشتريات', enabled: true },
  { id: 'red_platinum', points: 600, discountIqd: 20000, title: 'كوبون بلاتيني فخم ومميز', enabled: true },
  { id: 'red_diamond', points: 750, discountIqd: 25000, title: 'كوبون ماسي ملكي فائق التوفير', enabled: true },
];

const DEFAULT_EARN_RULES: LoyaltyEarnRule[] = [
  {
    id: 'earn_order',
    type: 'order_completed',
    titleAr: 'عند كل طلب مكتمل',
    descriptionAr: 'كل 1000 د.ع تنفقها تمنحك نقطة واحدة تلقائياً.',
    emoji: '🛒',
    points: 1,
    pointsPer1000Iqd: 1,
    enabled: true,
  },
  {
    id: 'earn_tier',
    type: 'tier_upgrade',
    titleAr: 'ترقية المستوى',
    descriptionAr: 'احصل على نقاط هدية عند صعود مستواك.',
    emoji: '🆙',
    points: 0,
    enabled: true,
  },
  {
    id: 'earn_share',
    type: 'share_app',
    titleAr: 'مشاركة التطبيق',
    descriptionAr: 'شارك رابط التطبيق عبر الواتساب واحصل على نقاط هدية.',
    emoji: '📱',
    points: 5,
    dailyLimit: 10,
    enabled: true,
  },
  {
    id: 'earn_store_review',
    type: 'store_review',
    titleAr: 'تقييم المتجر',
    descriptionAr: 'شاركنا رأيك وقيّم المتجر لتحصل على نقاط ولاء.',
    emoji: '⭐',
    points: 50,
    enabled: true,
  },
  {
    id: 'earn_product_review',
    type: 'product_review',
    titleAr: 'تقييم المنتج',
    descriptionAr: 'قيّم المنتجات التي اشتريتها واحصل على نقاط ولاء.',
    emoji: '💬',
    points: 0,
    enabled: false,
  },
  {
    id: 'earn_signup',
    type: 'signup',
    titleAr: 'تسجيل حساب جديد',
    descriptionAr: 'مكافأة ترحيبية عند إنشاء حسابك لأول مرة.',
    emoji: '🎉',
    points: 50,
    enabled: true,
  },
];

const DEFAULT_TEXTS: LoyaltyWalletTexts = {
  pageTitle: 'محفظة النقاط والولاء',
  pointsTabLabel: 'النقاط والاستبدال',
  giftsTabLabel: 'الجوائز والأكواد',
  balanceLabel: 'رصيدك من النقاط',
  pointsUnit: 'نقطة',
  nextTierLabel: 'المستوى التالي',
  maxTierMessage: 'أعلى مستوى متاح 🔥',
  rewardShopTitle: 'متجر المكافآت',
  redeemButton: 'استبدال الكوبون',
  redeemRemainingTemplate: 'متبقي {remaining} نقطة',
  rechargeTitle: 'شحن نقاط عبر كود',
  rechargePlaceholder: 'أدخل الكود هنا...',
  rechargeButton: 'تفعيل',
  earnSectionTitle: '💰 كيف تكسب النقاط؟',
  earnSectionSubtitle: 'يمكنك زيادة رصيد نقاطك بطرق سهلة وممتعة:',
  tierUpgradeTitle: 'ترقية المستوى',
  tierUpgradeNote: '💡 ملاحظة: يتم تصفير المستوى شهرياً.',
  giftsHeaderTitle: 'الأكواد والجوائز',
  giftsHeaderSubtitle:
    'استمتع بمكافآتك الحصرية! هنا تجد جميع كوبونات الخصم التي حصلت عليها من استبدال النقاط أو هدايا المتاجر.',
  giftsEmptyTitle: 'لا توجد أكواد حالياً',
  giftsEmptyText:
    'يمكنك الحصول على أكواد عبر استبدال نقاطك أو بمتابعة متاجرك المفضلة للحصول على هداياهم الحصرية.',
  promoHeaderPoints: 'كوبون استبدال النقاط',
  promoHeaderStore: 'مكافأة من المتجر',
  promoHeaderAdmin: 'مكافأة من تطبيق محلك',
  shareRewardNotificationTemplate: 'تمت إضافة {points} نقطة ولاء لمشاركتك التطبيق بنجاح!',
  storeReviewRewardNotificationTemplate: 'تمت إضافة {points} نقطة ولاء إلى محفظتك لتقييمك المتجر بنجاح!',
};

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  pointsPer1000Iqd: 1,
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
  tiers: DEFAULT_TIERS,
  redemptionPackages: DEFAULT_REDEMPTION_PACKAGES,
  earnRules: DEFAULT_EARN_RULES,
  texts: DEFAULT_TEXTS,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function mergeTexts(raw: unknown): LoyaltyWalletTexts {
  const src = asRecord(raw);
  if (!src) return { ...DEFAULT_TEXTS };
  const merged = { ...DEFAULT_TEXTS, ...src } as LoyaltyWalletTexts;
  if (merged.redeemRemainingTemplate === 'متبقي {remaining} ن') {
    merged.redeemRemainingTemplate = DEFAULT_TEXTS.redeemRemainingTemplate;
  }
  return merged;
}

function mergeTiers(raw: unknown, legacyBonuses?: LoyaltyTierUpgradeBonuses): LoyaltyTierConfig[] {
  const bonusFallback: Record<LoyaltyTierKey, number> = {
    Silver: 0,
    Gold: legacyBonuses?.silverToGold ?? 100,
    Platinum: legacyBonuses?.goldToPlatinum ?? 125,
    Diamond: legacyBonuses?.platinumToDiamond ?? 150,
  };

  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_TIERS.map((t) => ({ ...t }));
  }

  return raw
    .map((item) => {
      const t = asRecord(item);
      if (!t?.key) return null;
      const key = String(t.key) as LoyaltyTierKey;
      return {
        key,
        labelAr: String(t.labelAr ?? ''),
        shortIcon: String(t.shortIcon ?? '•'),
        ordersRequired: Number(t.ordersRequired) || 0,
        upgradeBonusPoints:
          t.upgradeBonusPoints != null
            ? Number(t.upgradeBonusPoints) || 0
            : bonusFallback[key] ?? 0,
      };
    })
    .filter(Boolean) as LoyaltyTierConfig[];
}

function syncTierUpgradeBonusesFromTiers(tiers: LoyaltyTierConfig[]): LoyaltyTierUpgradeBonuses {
  const byKey = Object.fromEntries(tiers.map((t) => [t.key, t.upgradeBonusPoints])) as Record<
    LoyaltyTierKey,
    number
  >;
  return {
    silverToGold: byKey.Gold ?? 0,
    goldToPlatinum: byKey.Platinum ?? 0,
    platinumToDiamond: byKey.Diamond ?? 0,
  };
}

function mergeRedemptionPackages(raw: unknown): LoyaltyRedemptionPackage[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...DEFAULT_REDEMPTION_PACKAGES];
  return raw
    .map((item) => {
      const p = asRecord(item);
      if (!p?.id) return null;
      return {
        id: String(p.id),
        points: Number(p.points) || 0,
        discountIqd: Number(p.discountIqd) || 0,
        title: String(p.title ?? ''),
        enabled: p.enabled !== false,
      };
    })
    .filter(Boolean) as LoyaltyRedemptionPackage[];
}

function mergeEarnRules(raw: unknown): LoyaltyEarnRule[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...DEFAULT_EARN_RULES];
  return raw
    .map((item) => {
      const r = asRecord(item);
      if (!r?.id || !r?.type) return null;
      return {
        id: String(r.id),
        type: String(r.type) as LoyaltyEarnRuleType,
        titleAr: String(r.titleAr ?? ''),
        descriptionAr: String(r.descriptionAr ?? ''),
        emoji: String(r.emoji ?? '✨'),
        points: Number(r.points) || 0,
        pointsPer1000Iqd: r.pointsPer1000Iqd != null ? Number(r.pointsPer1000Iqd) : undefined,
        dailyLimit: r.dailyLimit != null ? Number(r.dailyLimit) : undefined,
        enabled: r.enabled !== false,
      };
    })
    .filter(Boolean) as LoyaltyEarnRule[];
}

function mergeBonuses(raw: unknown): LoyaltyTierUpgradeBonuses {
  const src = asRecord(raw);
  return {
    silverToGold: Number(src?.silverToGold ?? DEFAULT_LOYALTY_SETTINGS.tierUpgradeBonuses.silverToGold),
    goldToPlatinum: Number(src?.goldToPlatinum ?? DEFAULT_LOYALTY_SETTINGS.tierUpgradeBonuses.goldToPlatinum),
    platinumToDiamond: Number(src?.platinumToDiamond ?? DEFAULT_LOYALTY_SETTINGS.tierUpgradeBonuses.platinumToDiamond),
  };
}

export function resolveLoyaltySettings(adminSettings?: Record<string, unknown> | null): LoyaltySettings {
  const raw = asRecord(adminSettings?.loyaltyWallet);
  if (!raw) {
    return {
      ...DEFAULT_LOYALTY_SETTINGS,
      texts: { ...DEFAULT_TEXTS },
      tiers: DEFAULT_TIERS.map((t) => ({ ...t })),
      redemptionPackages: [...DEFAULT_REDEMPTION_PACKAGES],
      earnRules: [...DEFAULT_EARN_RULES],
    };
  }

  const legacyBonuses = mergeBonuses(raw.tierUpgradeBonuses);
  const tiers = mergeTiers(raw.tiers, legacyBonuses);
  const tierResetPeriodMonths = Math.max(1, Number(raw.tierResetPeriodMonths ?? DEFAULT_LOYALTY_SETTINGS.tierResetPeriodMonths));

  return {
    pointsPer1000Iqd: Number(raw.pointsPer1000Iqd ?? DEFAULT_LOYALTY_SETTINGS.pointsPer1000Iqd),
    signupBonusPoints: Number(raw.signupBonusPoints ?? DEFAULT_LOYALTY_SETTINGS.signupBonusPoints),
    shareRewardPoints: Number(raw.shareRewardPoints ?? DEFAULT_LOYALTY_SETTINGS.shareRewardPoints),
    shareDailyLimit: Number(raw.shareDailyLimit ?? DEFAULT_LOYALTY_SETTINGS.shareDailyLimit),
    storeReviewRewardPoints: Number(raw.storeReviewRewardPoints ?? DEFAULT_LOYALTY_SETTINGS.storeReviewRewardPoints),
    productReviewRewardPoints: Number(raw.productReviewRewardPoints ?? DEFAULT_LOYALTY_SETTINGS.productReviewRewardPoints),
    tierUpgradeBonuses: syncTierUpgradeBonusesFromTiers(tiers),
    tierResetPeriodMonths,
    redemptionBasePoints: Number(raw.redemptionBasePoints ?? DEFAULT_LOYALTY_SETTINGS.redemptionBasePoints),
    redemptionBaseDiscountIqd: Number(raw.redemptionBaseDiscountIqd ?? DEFAULT_LOYALTY_SETTINGS.redemptionBaseDiscountIqd),
    tiers,
    redemptionPackages: mergeRedemptionPackages(raw.redemptionPackages),
    earnRules: mergeEarnRules(raw.earnRules),
    texts: mergeTexts(raw.texts),
  };
}

export function getTierUpgradeBonus(tierKey: LoyaltyTierKey, settings: LoyaltySettings): number {
  return getTierConfig(tierKey, settings.tiers)?.upgradeBonusPoints ?? 0;
}

export function getTierPeriodStart(date: Date, periodMonths: number): string {
  const months = Math.max(1, periodMonths);
  const totalMonths = date.getFullYear() * 12 + date.getMonth();
  const periodStartTotal = Math.floor(totalMonths / months) * months;
  const y = Math.floor(periodStartTotal / 12);
  const m = (periodStartTotal % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function formatTierResetNoteAr(periodMonths: number): string {
  const months = Math.max(1, periodMonths);
  if (months === 1) return '💡 ملاحظة: يتم تصفير المستوى شهرياً.';
  if (months === 2) return '💡 ملاحظة: يتم تصفير المستوى كل شهرين.';
  if (months === 12) return '💡 ملاحظة: يتم تصفير المستوى سنوياً.';
  return `💡 ملاحظة: يتم تصفير المستوى كل ${months} أشهر.`;
}

export function shouldResetTierPeriod(
  lastResetMonth: string | undefined,
  periodMonths: number,
  now = new Date(),
): boolean {
  const current = getTierPeriodStart(now, periodMonths);
  return (lastResetMonth || '') !== current;
}

export function getEffectiveCustomerTierState(
  customer: { monthlyOrdersCount?: number; tier?: LoyaltyTierKey; lastResetMonth?: string },
  settings: LoyaltySettings,
  now = new Date(),
) {
  const periodStart = getTierPeriodStart(now, settings.tierResetPeriodMonths);
  if (!shouldResetTierPeriod(customer.lastResetMonth, settings.tierResetPeriodMonths, now)) {
    return {
      monthlyOrdersCount: customer.monthlyOrdersCount || 0,
      tier: customer.tier || 'Silver',
      lastResetMonth: customer.lastResetMonth || periodStart,
      needsPersistReset: false,
    };
  }
  return {
    monthlyOrdersCount: 0,
    tier: 'Silver' as LoyaltyTierKey,
    lastResetMonth: periodStart,
    needsPersistReset: true,
  };
}

export function calcTierUpgradeBonus(
  oldTier: LoyaltyTierKey,
  newTier: LoyaltyTierKey,
  settings: LoyaltySettings,
): number {
  if (oldTier === newTier) return 0;
  return getTierUpgradeBonus(newTier, settings);
}

export function getUpgradeableTiers(tiers: LoyaltyTierConfig[]): LoyaltyTierConfig[] {
  return getSortedTiers(tiers).filter((t) => t.key !== 'Silver' && t.upgradeBonusPoints > 0);
}

export function createLoyaltyEarnRuleId(): string {
  return `earn_${Date.now().toString(36)}`;
}

export function createLoyaltyRedemptionId(): string {
  return `red_${Date.now().toString(36)}`;
}

export function getSortedTiers(tiers: LoyaltyTierConfig[]): LoyaltyTierConfig[] {
  return [...tiers].sort((a, b) => a.ordersRequired - b.ordersRequired);
}

export function resolveTierFromOrders(monthlyOrders: number, tiers: LoyaltyTierConfig[]): LoyaltyTierKey {
  const sorted = getSortedTiers(tiers);
  let result: LoyaltyTierKey = 'Silver';
  for (const tier of sorted) {
    if (monthlyOrders >= tier.ordersRequired) result = tier.key;
  }
  return result;
}

export function getTierConfig(key: LoyaltyTierKey, tiers: LoyaltyTierConfig[]): LoyaltyTierConfig | undefined {
  return tiers.find((t) => t.key === key);
}

export function getNextTierProgress(
  currentTier: LoyaltyTierKey,
  monthlyOrders: number,
  tiers: LoyaltyTierConfig[],
) {
  const sorted = getSortedTiers(tiers);
  const currentIdx = sorted.findIndex((t) => t.key === currentTier);
  const nextTier = currentIdx >= 0 && currentIdx < sorted.length - 1 ? sorted[currentIdx + 1] : null;
  if (!nextTier) {
    return { nextTier: null as LoyaltyTierConfig | null, remaining: 0, progressTarget: 0, progressPercent: 100 };
  }
  const currentThreshold = sorted[currentIdx]?.ordersRequired ?? 0;
  const remaining = Math.max(0, nextTier.ordersRequired - monthlyOrders);
  const span = nextTier.ordersRequired - currentThreshold;
  const progress = monthlyOrders - currentThreshold;
  return {
    nextTier,
    remaining,
    progressTarget: nextTier.ordersRequired,
    progressPercent: span > 0 ? Math.min(100, (progress / span) * 100) : 100,
  };
}

export function calcRedemptionDiscount(points: number, settings: LoyaltySettings): number {
  const pkg = settings.redemptionPackages.find((p) => p.enabled && p.points === points);
  if (pkg) return pkg.discountIqd;
  const basePts = settings.redemptionBasePoints || 150;
  const baseDisc = settings.redemptionBaseDiscountIqd || 5000;
  return Math.floor(points / basePts) * baseDisc;
}

export function formatLoyaltyTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}

export function storeReviewRewardHintText(settings?: LoyaltySettings | null): string {
  const resolved = settings ?? DEFAULT_LOYALTY_SETTINGS;
  const rule = resolved.earnRules.find((r) => r.type === 'store_review' && r.enabled);
  const pts = rule?.points ?? resolved.storeReviewRewardPoints;
  if (rule?.descriptionAr?.trim()) return rule.descriptionAr;
  return `شاركنا رأيك وقيّم المتجر لتحصل على ${pts} نقطة ولاء.`;
}

export function storeReviewRewardNotificationMessage(settings?: LoyaltySettings | null): string {
  const resolved = settings ?? DEFAULT_LOYALTY_SETTINGS;
  const pts = resolved.storeReviewRewardPoints;
  return formatLoyaltyTemplate(resolved.texts.storeReviewRewardNotificationTemplate, { points: pts });
}

export const STORE_REVIEW_REWARD_POINTS = DEFAULT_LOYALTY_SETTINGS.storeReviewRewardPoints;
export const SHARE_REWARD_POINTS = DEFAULT_LOYALTY_SETTINGS.shareRewardPoints;
