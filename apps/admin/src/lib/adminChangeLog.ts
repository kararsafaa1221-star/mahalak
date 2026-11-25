import type { Store } from '@shared/types';
import { isStoreSubscriptionActive } from '@shared/utils/store';
import { getSubscriptionPlanLabel } from '@shared/constants/merchantRenewalPlans';
import type { ActivityLogMeta } from './activityLogI18n';
import { ROLE_LABELS_AR } from './activityLogI18n';

const STORE_FIELD_LABELS_AR: Record<string, string> = {
  shopName: 'اسم المتجر',
  ownerName: 'اسم المالك',
  username: 'اسم المستخدم',
  phone: 'رقم الهاتف',
  province: 'المحافظة',
  area: 'المنطقة',
  landmark: 'أقرب نقطة دالة',
  deliveryPrice: 'سعر التوصيل',
  isFreeDelivery: 'التوصيل المجاني',
  logo: 'الشعار',
  status: 'حالة الحساب',
  category: 'التصنيف',
  subscriptionAmountIqd: 'مبلغ الاشتراك',
  subscriptionLifetimeRevenueIqd: 'إجمالي أرباح الاشتراك',
  subscriptionLastActivatedAt: 'تاريخ آخر تفعيل',
};

const SETTINGS_FIELD_LABELS_AR: Record<string, string> = {
  autoSubscriptionEnabled: 'تفعيل الاشتراك التلقائي',
  autoSubscriptionDurationValue: 'مدة الاشتراك التلقائي',
  autoSubscriptionDurationUnit: 'وحدة مدة الاشتراك التلقائي',
  featuredStoreIds: 'المتاجر المميزة',
  nearbyStoreIds: 'قائمة المتاجر القريبة',
  enableAutoNearby: 'الفرز التلقائي حسب المسافة',
  enableVerifiedStoresCarousel: 'سلايدر المتاجر الموثّقة',
  verifiedStoresCarouselInterval: 'فترة تقليب سلايدر المتاجر الموثّقة',
  verifiedStoresCarouselExcludeIds: 'استبعاد متاجر من سلايدر التوثيق',
  enableMaps: 'عرض الخرائط',
  enableAutoBackup: 'النسخ الاحتياطي التلقائي',
  adInterval: 'فترة عرض إعلانات الزبون',
  merchantAdInterval: 'فترة عرض إعلانات التجار',
  merchantAdsSectionOrder: 'ترتيب مجموعات إعلانات التجار',
  adBadgeText: 'نص شارة الإعلانات',
  ads: 'إعلانات واجهة العملاء',
  merchantDeliveryAds: 'إعلانات توصيل التجار',
  merchantMediaAds: 'إعلانات وسائط التجار',
  autoApproveStores: 'الموافقة التلقائية على المتاجر',
  whatsappNumber: 'رقم واتساب الدعم',
  plans: 'أسعار خطط الاشتراك',
  merchantRenewalPage: 'صفحة باقات التاجر',
  verificationPlans: 'باقات وأسعار التوثيق',
  verificationBenefits: 'مميزات الحساب الموثّق',
  verificationBenefitsTitleAr: 'عنوان مميزات التوثيق (عربي)',
  verificationBenefitsTitleCkb: 'عنوان مميزات التوثيق (كردي)',
  roleLabels: 'أسماء وأوصاف الأدوار الأساسية',
  customRoles: 'الأدوار المخصصة',
};

interface RoleLabelEntry {
  label?: string;
  description?: string;
}

interface CustomRoleLike {
  id: string;
  label: string;
  description?: string;
  permissions?: string[];
}

/** Detailed Arabic diff for settings/global.roleLabels (built-in role name/description overrides). */
function describeRoleLabelsChange(
  prev: Record<string, RoleLabelEntry> | undefined,
  next: Record<string, RoleLabelEntry> | undefined,
): string {
  const prevMap = prev && typeof prev === 'object' ? prev : {};
  const nextMap = next && typeof next === 'object' ? next : {};
  const roleIds = Array.from(new Set([...Object.keys(prevMap), ...Object.keys(nextMap)]));

  const changed = roleIds
    .filter((id) => {
      const p = prevMap[id];
      const n = nextMap[id];
      return (p?.label ?? '') !== (n?.label ?? '') || (p?.description ?? '') !== (n?.description ?? '');
    })
    .map((id) => {
      const roleName = ROLE_LABELS_AR[id] || id;
      const n = nextMap[id];
      return `الدور «${roleName}» أصبح اسمه «${n?.label || '—'}» ووصفه «${n?.description || '—'}»`;
    });

  if (changed.length === 0) return 'تم حفظ أسماء الأدوار دون أي تغيير فعلي في المسميات أو الأوصاف.';
  return `تم تحديث ${changed.join('، و')}.`;
}

/** Detailed Arabic diff for settings/global.customRoles (added / edited / removed custom roles). */
function describeCustomRolesChange(
  prevList: CustomRoleLike[] | undefined,
  nextList: CustomRoleLike[] | undefined,
): string {
  const prev = Array.isArray(prevList) ? prevList : [];
  const next = Array.isArray(nextList) ? nextList : [];
  const prevById = new Map(prev.map((r) => [r.id, r]));
  const nextById = new Map(next.map((r) => [r.id, r]));

  const added = next.filter((r) => !prevById.has(r.id));
  const removed = prev.filter((r) => !nextById.has(r.id));
  const edited = next.filter((r) => {
    const before = prevById.get(r.id);
    if (!before) return false;
    return (
      before.label !== r.label ||
      (before.description || '') !== (r.description || '') ||
      JSON.stringify(before.permissions || []) !== JSON.stringify(r.permissions || [])
    );
  });

  const parts: string[] = [];
  if (added.length) {
    parts.push(
      `إضافة دور${added.length > 1 ? 'أدوار' : ''} جديد: ${added
        .map((r) => `«${r.label}» (${r.permissions?.length ?? 0} صفحة مسموحة${r.description ? ` — ${r.description}` : ''})`)
        .join('، ')}`,
    );
  }
  if (edited.length) {
    parts.push(
      `تعديل الدور${edited.length > 1 ? 'الأدوار' : ''}: ${edited
        .map((r) => `«${r.label}» (${r.permissions?.length ?? 0} صفحة مسموحة${r.description ? ` — ${r.description}` : ''})`)
        .join('، ')}`,
    );
  }
  if (removed.length) {
    parts.push(`حذف الدور${removed.length > 1 ? 'الأدوار' : ''}: ${removed.map((r) => `«${r.label}»`).join('، ')}`);
  }

  if (parts.length === 0) return 'تم حفظ الأدوار المخصصة دون أي تغيير فعلي.';
  return `${parts.join(' — ')}.`;
}

const AUTO_SUB_KEYS = ['autoSubscriptionEnabled', 'autoSubscriptionDurationValue', 'autoSubscriptionDurationUnit'];
const AD_KEYS = [
  'ads',
  'adInterval',
  'merchantAdInterval',
  'merchantAdsSectionOrder',
  'adBadgeText',
  'merchantDeliveryAds',
  'merchantMediaAds',
  'enableVerifiedStoresCarousel',
  'verifiedStoresCarouselInterval',
  'verifiedStoresCarouselExcludeIds',
];
const SILENT_SETTINGS_KEYS = new Set(['lastSyncTime', 'lastAutoBackup']);

function planIdToAr(id?: string): string {
  return getSubscriptionPlanLabel(id);
}

function durationUnitAr(unit?: string): string {
  if (unit === 'days') return 'يوم';
  if (unit === 'years') return 'سنة';
  return 'شهر';
}

function verificationTypeAr(type?: string): string {
  if (type === 'lifetime') return 'مدى الحياة';
  if (type === 'days') return 'أيام';
  if (type === 'months') return 'أشهر';
  if (type === 'years') return 'سنوات';
  return type || '—';
}

function formatBoolAr(value: unknown): string {
  return value === true || value === 'true' ? 'مفعّل' : 'معطّل';
}

function formatSettingValue(key: string, value: unknown): string {
  if (typeof value === 'boolean') return formatBoolAr(value);
  if (Array.isArray(value)) return `${value.length} عنصر`;
  if (key === 'autoSubscriptionDurationUnit') return durationUnitAr(String(value));
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return 'تفاصيل محدثة';
  return String(value);
}

function describeSettingChange(key: string, prev: unknown, next: unknown): string {
  const label = SETTINGS_FIELD_LABELS_AR[key] || key;
  if (typeof next === 'boolean' || typeof prev === 'boolean') {
    return `«${label}»: ${formatBoolAr(prev)} ← ${formatBoolAr(next)}`;
  }
  if (Array.isArray(next) || Array.isArray(prev)) {
    const prevLen = Array.isArray(prev) ? prev.length : 0;
    const nextLen = Array.isArray(next) ? next.length : 0;
    return `«${label}»: ${prevLen} عنصر ← ${nextLen} عنصر`;
  }
  return `«${label}»: ${formatSettingValue(key, prev)} ← ${formatSettingValue(key, next)}`;
}

export interface SettingsChangeLog {
  actionKey: string;
  description: string;
}

/** Build a detailed activity-log entry for settings/global patches. */
export function buildSettingsChangeLog(
  prev: Record<string, unknown>,
  patch: Partial<Record<string, unknown>>,
): SettingsChangeLog | null {
  const keys = Object.keys(patch).filter((k) => !SILENT_SETTINGS_KEYS.has(k));
  if (keys.length === 0) return null;

  if (keys.every((k) => AUTO_SUB_KEYS.includes(k))) {
    const enabled = (patch.autoSubscriptionEnabled ?? prev.autoSubscriptionEnabled) === true;
    const value = Number(patch.autoSubscriptionDurationValue ?? prev.autoSubscriptionDurationValue ?? 1);
    const unit = String(patch.autoSubscriptionDurationUnit ?? prev.autoSubscriptionDurationUnit ?? 'months');
    return {
      actionKey: 'settings.auto_subscription',
      description: `تم تحديث إعدادات الاشتراك التلقائي: ${enabled ? 'مفعّل' : 'معطّل'} — مدة ${value} ${durationUnitAr(unit)} لكل تاجر جديد.`,
    };
  }

  if (keys.every((k) => AD_KEYS.includes(k))) {
    const parts = keys.map((k) => describeSettingChange(k, prev[k], patch[k]));
    return {
      actionKey: 'settings.ads',
      description: `تم تحديث إعدادات الإعلانات: ${parts.join('؛ ')}.`,
    };
  }

  const VERIFICATION_BENEFIT_KEYS = [
    'verificationBenefits',
    'verificationBenefitsTitleAr',
    'verificationBenefitsTitleCkb',
  ];
  if (keys.every((k) => VERIFICATION_BENEFIT_KEYS.includes(k))) {
    const prevLen = Array.isArray(prev.verificationBenefits) ? prev.verificationBenefits.length : 0;
    const nextLen = Array.isArray(patch.verificationBenefits)
      ? patch.verificationBenefits.length
      : prevLen;
    return {
      actionKey: 'settings.verification_benefits',
      description: `تم تحديث مميزات الحساب الموثّق: ${prevLen} ميزة ← ${nextLen} ميزة.`,
    };
  }

  if (keys.length === 1 && keys[0] === 'featuredStoreIds') {
    const prevLen = Array.isArray(prev.featuredStoreIds) ? prev.featuredStoreIds.length : 0;
    const nextLen = Array.isArray(patch.featuredStoreIds) ? patch.featuredStoreIds.length : 0;
    return {
      actionKey: 'settings.featured_stores',
      description: `تم تحديث قائمة المتاجر المميزة: ${prevLen} متجر ← ${nextLen} متجر.`,
    };
  }

  if (keys.length === 1 && keys[0] === 'nearbyStoreIds') {
    const prevLen = Array.isArray(prev.nearbyStoreIds) ? prev.nearbyStoreIds.length : 0;
    const nextLen = Array.isArray(patch.nearbyStoreIds) ? patch.nearbyStoreIds.length : 0;
    return {
      actionKey: 'settings.nearby_stores',
      description: `تم تحديث قائمة المتاجر القريبة اليدوية: ${prevLen} متجر ← ${nextLen} متجر.`,
    };
  }

  if (keys.length === 1 && keys[0] === 'verifiedStoresCarouselExcludeIds') {
    const prevLen = Array.isArray(prev.verifiedStoresCarouselExcludeIds)
      ? prev.verifiedStoresCarouselExcludeIds.length
      : 0;
    const nextLen = Array.isArray(patch.verifiedStoresCarouselExcludeIds)
      ? patch.verifiedStoresCarouselExcludeIds.length
      : 0;
    return {
      actionKey: 'settings.verified_carousel_exclude',
      description: `تم تحديث قائمة الاستبعاد من سلايدر المتاجر الموثّقة: ${prevLen} متجر ← ${nextLen} متجر.`,
    };
  }

  if (
    keys.length === 1 &&
    (keys[0] === 'enableAutoNearby' ||
      keys[0] === 'enableMaps' ||
      keys[0] === 'enableAutoBackup' ||
      keys[0] === 'enableVerifiedStoresCarousel')
  ) {
    const label = SETTINGS_FIELD_LABELS_AR[keys[0]];
    const next = patch[keys[0]];
    return {
      actionKey: 'settings.toggle',
      description: `تم تغيير «${label}» إلى ${formatBoolAr(next)}.`,
    };
  }

  if (keys.length === 1 && keys[0] === 'verifiedStoresCarouselInterval') {
    return {
      actionKey: 'settings.verified_carousel_interval',
      description: `تم تغيير فترة تقليب سلايدر المتاجر الموثّقة إلى ${patch.verifiedStoresCarouselInterval} ثانية.`,
    };
  }

  if (keys.length === 1 && keys[0] === 'roleLabels') {
    return {
      actionKey: 'settings.role_labels_update',
      description: describeRoleLabelsChange(
        prev.roleLabels as Record<string, RoleLabelEntry> | undefined,
        patch.roleLabels as Record<string, RoleLabelEntry> | undefined,
      ),
    };
  }

  if (keys.length === 1 && keys[0] === 'customRoles') {
    return {
      actionKey: 'settings.custom_roles_update',
      description: describeCustomRolesChange(
        prev.customRoles as CustomRoleLike[] | undefined,
        patch.customRoles as CustomRoleLike[] | undefined,
      ),
    };
  }

  const parts = keys.map((k) => describeSettingChange(k, prev[k], patch[k]));
  return {
    actionKey: 'settings.update',
    description: `تم تحديث الإعدادات العامة: ${parts.join('؛ ')}.`,
  };
}

export interface StoreUpdateLog {
  actionKey: string;
  meta: ActivityLogMeta;
}

/** Classify a store patch into a specific activity-log action with Arabic details. */
export function classifyStoreUpdate(
  data: Partial<Store>,
  store?: Store | null,
): StoreUpdateLog {
  const keys = Object.keys(data).filter((k) => k !== 'id');
  const name = store?.shopName ?? (data.shopName as string | undefined);

  if (keys.length === 1 && keys[0] === 'autoSubscriptionDisabled') {
    const exempt = data.autoSubscriptionDisabled === true;
    return {
      actionKey: exempt ? 'store.auto_subscription_exempt' : 'store.auto_subscription_include',
      meta: {
        name,
        description: exempt
          ? `تم استثناء المتجر «${name}» من الاشتراك التلقائي عند التسجيل.`
          : `تم إلغاء استثناء المتجر «${name}» — سيُمنح اشتراك تلقائي عند التسجيل إذا كانت الإعدادات مفعّلة.`,
      },
    };
  }

  const subKeys = ['subscriptionStatus', 'subscriptionExpiry', 'subscriptionValidUntil', 'subscriptionId', 'subscriptionExpiryDate', 'subscriptionAmountIqd', 'subscriptionLifetimeRevenueIqd', 'subscriptionLastActivatedAt', 'subscriptionIsGift'];
  if (keys.some((k) => subKeys.includes(k))) {
    if (data.subscriptionStatus === 'expired') {
      return {
        actionKey: 'store.subscription_end',
        meta: {
          name,
          description: `تم إنهاء اشتراك المتجر «${name}» فوراً — لم يعد الاشتراك نشطاً.`,
        },
      };
    }

    if (data.subscriptionStatus === 'active') {
      const expiry = (data.subscriptionExpiry || data.subscriptionExpiryDate || '—') as string;
      const plan = planIdToAr(data.subscriptionId as string | undefined);
      const amount = Number(data.subscriptionAmountIqd);
      const amountStr = amount > 0 ? ` · ${amount.toLocaleString('ar-IQ')} د.ع` : '';
      const wasActive = store ? isStoreSubscriptionActive(store) : false;
      const isGift = data.subscriptionIsGift === true;

      if (isGift) {
        return {
          actionKey: 'store.subscription_gift',
          meta: {
            name,
            subscriptionPlan: data.subscriptionId as string,
            subscriptionExpiry: expiry,
            description: `تم إرسال اشتراك هدية (بدون مقابل) للمتجر «${name}» — الباقة: ${plan}، ينتهي في: ${expiry}. غير محسوب ضمن أرباح الاشتراكات.`,
          },
        };
      }

      return {
        actionKey: wasActive ? 'store.subscription_renew' : 'store.subscription_activate',
        meta: {
          name,
          subscriptionPlan: data.subscriptionId as string,
          subscriptionExpiry: expiry,
          description: wasActive
            ? `تم تجديد اشتراك المتجر «${name}» — الباقة: ${plan}${amountStr}، ينتهي في: ${expiry}.`
            : `تم تفعيل اشتراك المتجر «${name}» لأول مرة — الباقة: ${plan}${amountStr}، ينتهي في: ${expiry}.`,
        },
      };
    }

    if (keys.includes('subscriptionExpiry') || keys.includes('subscriptionExpiryDate')) {
      const expiry = (data.subscriptionExpiry || data.subscriptionExpiryDate || '—') as string;
      return {
        actionKey: 'store.subscription_decrease',
        meta: {
          name,
          subscriptionExpiry: expiry,
          description: `تم تقليل مدة اشتراك المتجر «${name}» — تاريخ الانتهاء الجديد: ${expiry}.`,
        },
      };
    }
  }

  if (keys.some((k) => ['isVerified', 'verificationType', 'verificationExpiresAt', 'verificationAmountIqd', 'verificationLifetimeRevenueIqd', 'verificationIsGift'].includes(k))) {
    if (data.isVerified === false) {
      return {
        actionKey: 'store.verification_revoke',
        meta: {
          name,
          description: `تم إلغاء توثيق المتجر «${name}» وسحب الشارة الرسمية.`,
        },
      };
    }
    const expiry = data.verificationExpiresAt || verificationTypeAr(data.verificationType);
    const isGift = data.verificationIsGift === true;
    const amount = Number(data.verificationAmountIqd);
    const amountStr = amount > 0 ? ` — المبلغ: ${amount.toLocaleString('ar-IQ')} د.ع` : '';

    if (isGift) {
      return {
        actionKey: 'store.verification_gift',
        meta: {
          name,
          subscriptionExpiry: data.verificationExpiresAt,
          status: data.verificationType,
          description: `تم إرسال توثيق هدية (بدون مقابل) للمتجر «${name}» — نوع الصلاحية: ${verificationTypeAr(data.verificationType)}، ينتهي في: ${expiry}. غير محسوب ضمن أرباح التوثيق.`,
        },
      };
    }

    return {
      actionKey: 'store.verification_grant',
      meta: {
        name,
        subscriptionExpiry: data.verificationExpiresAt,
        status: data.verificationType,
        description: `تم توثيق المتجر «${name}» — نوع الصلاحية: ${verificationTypeAr(data.verificationType)}، ينتهي في: ${expiry}${amountStr}.`,
      },
    };
  }

  const fieldLabels = keys.map((k) => STORE_FIELD_LABELS_AR[k] || k).join('، ');
  return {
    actionKey: 'store.update',
    meta: {
      name,
      fields: keys,
      description: `تم تعديل بيانات المتجر «${name}»: ${fieldLabels}.`,
    },
  };
}
