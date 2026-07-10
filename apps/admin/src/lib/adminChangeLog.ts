import type { Store } from '@shared/types';
import { isStoreSubscriptionActive } from '@shared/utils/store';
import { getSubscriptionPlanLabel } from '@shared/constants/merchantRenewalPlans';
import type { ActivityLogMeta } from './activityLogI18n';

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
  enableMaps: 'عرض الخرائط',
  enableAutoBackup: 'النسخ الاحتياطي التلقائي',
  adInterval: 'فترة عرض الإعلانات',
  ads: 'إعلانات واجهة العملاء',
  merchantDeliveryAds: 'إعلانات توصيل التجار',
  merchantMediaAds: 'إعلانات وسائط التجار',
  autoApproveStores: 'الموافقة التلقائية على المتاجر',
  whatsappNumber: 'رقم واتساب الدعم',
  plans: 'أسعار خطط الاشتراك',
  merchantRenewalPage: 'صفحة باقات التاجر',
};

const AUTO_SUB_KEYS = ['autoSubscriptionEnabled', 'autoSubscriptionDurationValue', 'autoSubscriptionDurationUnit'];
const AD_KEYS = ['ads', 'adInterval', 'merchantDeliveryAds', 'merchantMediaAds'];
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

  if (keys.length === 1 && (keys[0] === 'enableAutoNearby' || keys[0] === 'enableMaps' || keys[0] === 'enableAutoBackup')) {
    const label = SETTINGS_FIELD_LABELS_AR[keys[0]];
    const next = patch[keys[0]];
    return {
      actionKey: 'settings.toggle',
      description: `تم تغيير «${label}» إلى ${formatBoolAr(next)}.`,
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

  const subKeys = ['subscriptionStatus', 'subscriptionExpiry', 'subscriptionValidUntil', 'subscriptionId', 'subscriptionExpiryDate', 'subscriptionAmountIqd', 'subscriptionLifetimeRevenueIqd', 'subscriptionLastActivatedAt'];
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

  if (keys.some((k) => ['isVerified', 'verificationType', 'verificationExpiresAt'].includes(k))) {
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
    return {
      actionKey: 'store.verification_grant',
      meta: {
        name,
        subscriptionExpiry: data.verificationExpiresAt,
        status: data.verificationType,
        description: `تم توثيق المتجر «${name}» — نوع الصلاحية: ${verificationTypeAr(data.verificationType)}، ينتهي في: ${expiry}.`,
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
