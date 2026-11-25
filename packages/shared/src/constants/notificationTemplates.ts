/** قوالب إشعارات النظام (زبون/تاجر) — تُدار من لوحة التحكم (settings/global.notificationTemplates). */

import i18n from '../i18n';
import type { AppLanguage } from '../i18n';

export type NotificationAudience = 'customer' | 'merchant';

/** Sound behavior for a notification template.
 *  - sound_both: normal sound both for push (app closed/background) and in-app toast (app open).
 *  - silent_both: fully silent — visual only, no sound in either state.
 *  - silent_inapp: push keeps its normal sound; only the in-app toast (user already inside the app) stays silent. */
export type NotificationSoundProfile = 'sound_both' | 'silent_both' | 'silent_inapp';

export const DEFAULT_SOUND_PROFILE: NotificationSoundProfile = 'sound_both';

/** How a template can be manually triggered from the admin Notification Center.
 *  - broadcast: sends immediately to the whole eligible audience (same filtering as the free broadcast form).
 *  - targeted: admin picks one specific store/customer, and real placeholder values are resolved from that entity.
 *  - undefined: automatic/event-driven only — no manual "send now" action shown. */
export type NotificationSendMode = 'broadcast' | 'targeted';

export interface NotificationTemplateDef {
  key: string;
  audience: NotificationAudience;
  labelAr: string;
  descriptionAr: string;
  placeholders: string[];
  defaultTitle: string;
  defaultBody: string;
  defaultSoundProfile?: NotificationSoundProfile;
  sendable?: NotificationSendMode;
}

export interface ResolvedNotificationTemplate {
  key: string;
  title: string;
  body: string;
  /** Kurdish (Sorani) title — optional admin override; falls back to locale defaults */
  titleCkb: string;
  /** Kurdish (Sorani) body — optional admin override; falls back to locale defaults */
  bodyCkb: string;
  enabled: boolean;
  soundProfile: NotificationSoundProfile;
}

export type NotificationTemplateVars = Record<string, string | number | undefined | null>;

function localeTemplateField(key: string, field: 'title' | 'body', lng: AppLanguage): string {
  const path = `notifTemplates.${key}.${field}`;
  const value = i18n.t(path, { lng, defaultValue: '' });
  if (!value || value === path) return '';
  return value;
}

function defaultCkbTitle(key: string, fallbackAr: string): string {
  return localeTemplateField(key, 'title', 'ckb') || fallbackAr;
}

function defaultCkbBody(key: string, fallbackAr: string): string {
  return localeTemplateField(key, 'body', 'ckb') || fallbackAr;
}

/** Delivery fields to spread onto any notification document — controls push + in-app sound. */
export interface NotificationDeliveryFields {
  sound: boolean;
  inAppSound: boolean;
  soundProfile: NotificationSoundProfile;
}

export const NOTIFICATION_TEMPLATE_DEFS: NotificationTemplateDef[] = [
  // ── Customer ──────────────────────────────────────────────────────────────
  {
    key: 'customer.newProduct',
    audience: 'customer',
    labelAr: 'منتج جديد من متجر متابَع',
    descriptionAr: 'يُرسل للزبائن الذين فعّلوا إشعارات المتجر عند إضافة منتج.',
    placeholders: ['{storeName}', '{productName}'],
    defaultTitle: 'منتج جديد من {storeName} ✨',
    defaultBody: 'تمت إضافة منتج جديد: {productName}. سارع بالشراء الآن!',
  },
  {
    key: 'customer.platformPromo',
    audience: 'customer',
    labelAr: 'كود خصم منصة (لجميع المتاجر)',
    descriptionAr: 'عند إنشاء كود خصم إداري يشمل جميع المتاجر.',
    placeholders: ['{code}'],
    defaultTitle: 'محلك 🎁',
    defaultBody: 'عرض جديد بمناسبة العيد أو الفعاليات الخاصة! كود الخصم: {code}',
    sendable: 'broadcast',
  },
  {
    key: 'customer.orderStatus',
    audience: 'customer',
    labelAr: 'تحديث حالة الطلب',
    descriptionAr: 'القالب العام؛ تسميات الحالات أدناه تملأ {statusText}.',
    placeholders: ['{orderLabel}', '{statusText}'],
    defaultTitle: 'تحديث حالة الطلب',
    defaultBody: 'طلب رقم {orderLabel}: {statusText}',
  },
  {
    key: 'customer.status.accepted',
    audience: 'customer',
    labelAr: 'نص حالة: مقبول',
    descriptionAr: 'يُستخدم كـ {statusText} عند قبول الطلب.',
    placeholders: [],
    defaultTitle: '',
    defaultBody: 'تم قبول طلبك بنجاح',
  },
  {
    key: 'customer.status.preparing',
    audience: 'customer',
    labelAr: 'نص حالة: قيد التجهيز',
    descriptionAr: 'يُستخدم كـ {statusText} أثناء التجهيز.',
    placeholders: [],
    defaultTitle: '',
    defaultBody: 'طلبك قيد التجهيز',
  },
  {
    key: 'customer.status.shipped',
    audience: 'customer',
    labelAr: 'نص حالة: في الطريق',
    descriptionAr: 'يُستخدم كـ {statusText} عند الشحن.',
    placeholders: [],
    defaultTitle: '',
    defaultBody: 'طلبك في الطريق إليك ومندوب التوصيل في طريقه',
  },
  {
    key: 'customer.status.delivered',
    audience: 'customer',
    labelAr: 'نص حالة: تم التوصيل',
    descriptionAr: 'يُستخدم كـ {statusText} عند التسليم.',
    placeholders: [],
    defaultTitle: '',
    defaultBody: 'تم توصيل طلبك بنجاح. شكراً لك!',
  },
  {
    key: 'customer.status.rejected',
    audience: 'customer',
    labelAr: 'نص حالة: مرفوض',
    descriptionAr: 'يُستخدم كـ {statusText} عند الرفض.',
    placeholders: ['{reason}'],
    defaultTitle: '',
    defaultBody: 'تم رفض الطلب: {reason}',
  },
  {
    key: 'customer.status.returned',
    audience: 'customer',
    labelAr: 'نص حالة: إرجاع',
    descriptionAr: 'يُستخدم كـ {statusText} عند الإرجاع.',
    placeholders: ['{reason}'],
    defaultTitle: '',
    defaultBody: 'تم إرجاع الطلب: {reason}',
  },
  {
    key: 'customer.status.replaced',
    audience: 'customer',
    labelAr: 'نص حالة: استبدال',
    descriptionAr: 'يُستخدم كـ {statusText} عند الاستبدال.',
    placeholders: ['{reason}'],
    defaultTitle: '',
    defaultBody: 'تم استبدال الطلب: {reason}',
  },
  {
    key: 'customer.loyaltyOrderReward',
    audience: 'customer',
    labelAr: 'مكافأة نقاط استلام الطلب',
    descriptionAr: 'بعد تسليم الطلب ومنح نقاط الولاء.',
    placeholders: ['{points}'],
    defaultTitle: '🎁 تم شحن محفظة نقاطك!',
    defaultBody: 'حصلت تلقائياً على +{points} نقطة كمكافأة استلام طلبك!',
  },
  {
    key: 'customer.storeReviewReward',
    audience: 'customer',
    labelAr: 'شكر تقييم المتجر',
    descriptionAr: 'بعد تقييم الزبون للمتجر وحصوله على نقاط.',
    placeholders: ['{points}'],
    defaultTitle: '🎁 شكرًا على التقييم!',
    defaultBody: 'تمت إضافة {points} نقطة ولاء إلى محفظتك لتقييمك المتجر بنجاح!',
  },
  {
    key: 'customer.merchantGiftPromo',
    audience: 'customer',
    labelAr: 'هدية كود خصم من التاجر',
    descriptionAr: 'عند إهداء التاجر كود خصم لزبون.',
    placeholders: ['{shopName}', '{valueLabel}', '{code}', '{days}'],
    defaultTitle: 'هدية خاصة من المتجر! 🎁🎟️',
    defaultBody:
      'أرسل لك متجر {shopName} كود خصم خاص بقيمة {valueLabel}! الرمز: {code} (صالح للاستخدام لمرة واحدة خلال {days} أيام).',
  },
  {
    key: 'customer.merchantGiftProduct',
    audience: 'customer',
    labelAr: 'هدية منتج من التاجر',
    descriptionAr: 'عند إهداء التاجر منتجاً لزبون.',
    placeholders: ['{shopName}', '{productName}'],
    defaultTitle: 'لقد تلقيت هديّة منتج! 🎁🎉',
    defaultBody:
      'مبروك! لقد أهداك متجر {shopName} منتج: "{productName}" مجاناً كرمز تقدير لولائك! تواصل مع المتجر لتنسيق الاستلام.',
  },
  {
    key: 'customer.flashSaleActive',
    audience: 'customer',
    labelAr: 'بدء فعالية فلاش سيلز',
    descriptionAr: 'عند تفعيل فعالية مركزية من لوحة التحكم.',
    placeholders: ['{saleTitle}'],
    defaultTitle: 'محلك',
    defaultBody: 'بدأت الآن الفعالية الكبرى "{saleTitle}"! تصفح أفضل العروض والخصومات.',
  },
  {
    key: 'customer.promoCreatedPush',
    audience: 'customer',
    labelAr: 'بث فوري عند إنشاء كود خصم',
    descriptionAr: 'إشعار Push جماعي لمشتركي تطبيق الزبون عند إنشاء كود.',
    placeholders: ['{code}', '{discountLabel}'],
    defaultTitle: 'كود خصم جديد',
    defaultBody: '{code} — خصم {discountLabel}',
  },
  {
    key: 'customer.tierUpgrade',
    audience: 'customer',
    labelAr: 'صعود مستوى الولاء',
    descriptionAr: 'عند ترقية مستوى الزبون (فضي/ذهبي/بلاتيني/ماسي) بعد تسليم طلب.',
    placeholders: ['{tierLabel}', '{bonusPoints}'],
    defaultTitle: '🏆 ترقية مستوى!',
    defaultBody: 'مبروك! أصبحت الآن بمستوى {tierLabel} وحصلت على +{bonusPoints} نقطة مكافأة ترقية!',
  },
  {
    key: 'customer.productReviewReward',
    audience: 'customer',
    labelAr: 'مكافأة تقييم منتج',
    descriptionAr: 'بعد تقييم الزبون لمنتج وحصوله على نقاط.',
    placeholders: ['{points}'],
    defaultTitle: '🎁 شكرًا على تقييم المنتج!',
    defaultBody: 'تمت إضافة {points} نقطة ولاء إلى محفظتك لتقييمك المنتج بنجاح!',
  },
  {
    key: 'customer.storeWideSale',
    audience: 'customer',
    labelAr: 'خصم شامل على متجر متابَع',
    descriptionAr: 'عند تطبيق التاجر خصماً شاملاً على كل منتجات متجره.',
    placeholders: ['{storeName}', '{percent}'],
    defaultTitle: '🔥 خصم شامل من {storeName}!',
    defaultBody: 'أعلن متجر {storeName} عن خصم {percent}% على كل منتجاته! تصفح العروض الآن.',
  },
  {
    key: 'customer.merchantFollowerPromo',
    audience: 'customer',
    labelAr: 'كود خصم لمتابعي المتجر',
    descriptionAr: 'عند إنشاء التاجر كود خصم لمتابعي متجره المفعّلين للإشعارات.',
    placeholders: ['{storeName}', '{code}', '{discountLabel}'],
    defaultTitle: 'كود خصم جديد من {storeName} 🎉',
    defaultBody: 'كود الخصم: {code} — خصم {discountLabel}. سارع بالاستخدام قبل النفاد!',
  },
  {
    key: 'customer.accountSuspended',
    audience: 'customer',
    labelAr: 'توقيف الحساب مؤقتاً',
    descriptionAr: 'عند توقيف حساب الزبون مؤقتاً من الإدارة.',
    placeholders: [],
    defaultTitle: 'تحديث حالة الحساب',
    defaultBody: 'تم توقيف حسابك مؤقتاً. يرجى التواصل مع الدعم الفني لمعرفة السبب.',
    defaultSoundProfile: 'sound_both',
    sendable: 'targeted',
  },

  // ── Merchant ──────────────────────────────────────────────────────────────
  {
    key: 'merchant.newOrder',
    audience: 'merchant',
    labelAr: 'طلب جديد',
    descriptionAr: 'بعد انتهاء فترة السماح لإلغاء الطلب.',
    placeholders: ['{orderLabel}', '{customerName}'],
    defaultTitle: 'طلب جديد',
    defaultBody: 'لديك طلب جديد برقم {orderLabel} من {customerName}',
  },
  {
    key: 'merchant.reelsOrder',
    audience: 'merchant',
    labelAr: 'طلب من ريلز',
    descriptionAr: 'طلب عبر مقطع فيديو المنتج.',
    placeholders: ['{productName}', '{totalCost}'],
    defaultTitle: 'طلب ريلز جديد! 🎬🛍️',
    defaultBody: 'طلب زبون جديد من مقطع الفيديو الخاص بـ: {productName}. بقيمة إجمالية {totalCost} د.ع.',
  },
  {
    key: 'merchant.newFollower',
    audience: 'merchant',
    labelAr: 'متابع جديد',
    descriptionAr: 'عند متابعة زبون للمتجر.',
    placeholders: ['{customerName}'],
    defaultTitle: 'متابع جديد!',
    defaultBody: '{customerName} قام بمتابعة متجرك.',
    defaultSoundProfile: 'silent_both',
  },
  {
    key: 'merchant.storeReview',
    audience: 'merchant',
    labelAr: 'تقييم متجر جديد',
    descriptionAr: 'عند تقييم الزبون للمتجر.',
    placeholders: ['{rating}', '{customerName}'],
    defaultTitle: 'تقييم جديد!',
    defaultBody: 'حصلت على استعراض {rating} نجوم من {customerName}',
  },
  {
    key: 'merchant.productReview',
    audience: 'merchant',
    labelAr: 'تقييم منتج جديد',
    descriptionAr: 'عند تقييم منتج.',
    placeholders: ['{rating}', '{productId}'],
    defaultTitle: 'تقييم منتج جديد',
    defaultBody: 'تقييم {rating} نجوم على {productId}',
  },
  {
    key: 'merchant.storeActivated',
    audience: 'merchant',
    labelAr: 'تفعيل المتجر',
    descriptionAr: 'عند تفعيل الحساب من الإدارة أو الموافقة التلقائية.',
    placeholders: [],
    defaultTitle: 'تحديث حالة المتجر',
    defaultBody: 'تم تفعيل حساب متجرك بنجاح. يمكنك الآن استقبال الطلبات!',
  },
  {
    key: 'merchant.storeSuspended',
    audience: 'merchant',
    labelAr: 'إيقاف المتجر',
    descriptionAr: 'عند تعليق حساب المتجر.',
    placeholders: [],
    defaultTitle: 'تحديث حالة المتجر',
    defaultBody: 'تم إيقاف حساب متجرك مؤقتاً. يرجى التواصل مع الدعم الفني.',
    sendable: 'targeted',
  },
  {
    key: 'merchant.platformPromo',
    audience: 'merchant',
    labelAr: 'كود خصم منصة (للتاجر)',
    descriptionAr: 'إشعار التجار عند إطلاق كود خصم شامل.',
    placeholders: ['{code}'],
    defaultTitle: 'محلك 🎁',
    defaultBody: 'تم إطلاق كود خصم جديد لزيادة مبيعاتك! كود الخصم: {code}',
    sendable: 'broadcast',
  },
  {
    key: 'merchant.flashSaleCreated',
    audience: 'merchant',
    labelAr: 'دعوة للمشاركة بفعالية',
    descriptionAr: 'دعوة التجار للمشاركة عند إنشاء فعالية.',
    placeholders: ['{saleTitle}'],
    defaultTitle: 'محلك',
    defaultBody: 'فعالية جديدة معلنة! "{saleTitle}"، يمكنك الآن طلب المشاركة بمنتجاتك!',
  },
  {
    key: 'merchant.flashSaleActive',
    audience: 'merchant',
    labelAr: 'انطلاق الفعالية (للمشاركين)',
    descriptionAr: 'عند تفعيل الفعالية — يُرسل للتجار الذين لديهم منتجات معتمدة فيها.',
    placeholders: ['{saleTitle}'],
    defaultTitle: '🚀 انطلقت الفعالية!',
    defaultBody: 'انطلقت الآن فعالية "{saleTitle}"! منتجاتك المعتمدة ظاهرة الآن للزبائن، تابع مبيعاتك.',
  },
  {
    key: 'merchant.verificationGranted',
    audience: 'merchant',
    labelAr: 'توثيق الحساب',
    descriptionAr: 'عند منح شارة التوثيق للمتجر.',
    placeholders: ['{shopName}'],
    defaultTitle: '✅ تم توثيق متجرك!',
    defaultBody: 'مبروك! حصل متجرك "{shopName}" على شارة التوثيق الرسمية.',
    sendable: 'targeted',
  },
  {
    key: 'merchant.verificationGift',
    audience: 'merchant',
    labelAr: 'هدية توثيق',
    descriptionAr: 'عند إرسال توثيق هدية (بدون مقابل) من لوحة الإدارة.',
    placeholders: ['{shopName}', '{planLabel}', '{expiryDate}'],
    defaultTitle: '🎁 هدية توثيق من محلك!',
    defaultBody:
      'مبروك! حصلت على هدية توثيق مجانية لمتجرك "{shopName}" ({planLabel}). صلاحية التوثيق حتى: {expiryDate}.',
    sendable: 'targeted',
  },
  {
    key: 'merchant.verificationRevoked',
    audience: 'merchant',
    labelAr: 'إلغاء التوثيق',
    descriptionAr: 'عند سحب شارة التوثيق من المتجر.',
    placeholders: ['{shopName}'],
    defaultTitle: 'تحديث حالة التوثيق',
    defaultBody: 'تم إلغاء شارة التوثيق عن متجرك "{shopName}".',
    sendable: 'targeted',
  },
  {
    key: 'merchant.verificationExpired',
    audience: 'merchant',
    labelAr: 'انتهاء صلاحية التوثيق',
    descriptionAr: 'عند انتهاء تاريخ صلاحية شارة التوثيق تلقائياً.',
    placeholders: ['{shopName}'],
    defaultTitle: 'انتهت صلاحية التوثيق ⚠️',
    defaultBody: 'انتهت صلاحية شارة التوثيق لمتجرك "{shopName}". يمكنك التواصل مع الدعم للتجديد.',
    sendable: 'targeted',
  },
  {
    key: 'merchant.subscription.7days',
    audience: 'merchant',
    labelAr: 'تنبيه اشتراك: 7 أيام',
    descriptionAr: 'تنبيه مبكر قبل أسبوع من الانتهاء.',
    placeholders: ['{ownerName}', '{shopName}', '{expiryDate}'],
    defaultTitle: '⚠️ اقتراب انتهاء الاشتراك (7 أيام)',
    defaultBody:
      'مرحباً {ownerName}، ينتهي اشتراك متجرك المميز "{shopName}" خلال 7 أيام بتاريخ {expiryDate}. يرجى التجديد الآن لضمان بقاء المتجر مفعلاً واستمرار تلقي الطلبات.',
    sendable: 'targeted',
  },
  {
    key: 'merchant.subscription.3days',
    audience: 'merchant',
    labelAr: 'تنبيه اشتراك: 3 أيام',
    descriptionAr: 'تنبيه قبل 3 أيام (تطبيق التاجر).',
    placeholders: ['{diffDays}', '{shopName}', '{expiryDate}'],
    defaultTitle: 'تنبيه الاشتراك ⚠️',
    defaultBody:
      'اشتراكك ينتهي خلال {diffDays} يوم. يرجى التجديد لضمان استمرارية الخدمة وعدم تقييد المبيعات.',
    sendable: 'targeted',
  },
  {
    key: 'merchant.subscription.2days',
    audience: 'merchant',
    labelAr: 'تنبيه اشتراك: يومان',
    descriptionAr: 'تنبيه قبل يومين.',
    placeholders: ['{ownerName}', '{shopName}', '{expiryDate}'],
    defaultTitle: '🚨 تنبيه هام: يومين فقط لانتهاء الاشتراك!',
    defaultBody:
      'عزيزي التاجر، اشتراكك سينتهي بعد 48 ساعة فقط ({expiryDate}). لم يتلقى المتجر أي تجديد بعد. يرجى تجديد اشتراكك فوراً تلافياً لتعليق المتجر أو إخفاء منتجاتك عن زبائنك.',
  },
  {
    key: 'merchant.subscription.1day',
    audience: 'merchant',
    labelAr: 'تنبيه اشتراك: يوم واحد',
    descriptionAr: 'تنبيه قبل يوم من الانتهاء.',
    placeholders: ['{ownerName}', '{shopName}', '{expiryDate}'],
    defaultTitle: '🔥 تنبيه حرج جداً: اشتراكك ينتهي غداً!',
    defaultBody:
      'انتباه! غداً سيتم وقف اشتراك متجر "{shopName}" تلقائياً. الموعد النهائي هو {expiryDate}. يرجى تجديد الباقة فوراً لمنع تعليق المتجر.',
    sendable: 'targeted',
  },
  {
    key: 'merchant.subscription.expired',
    audience: 'merchant',
    labelAr: 'انتهاء الاشتراك',
    descriptionAr: 'عند انتهاء صلاحية الاشتراك.',
    placeholders: ['{shopName}'],
    defaultTitle: 'انتهى الاشتراك ⚠️',
    defaultBody:
      'لقد انتهت صلاحية اشتراكك! متجرك الآن مخفي عن الزبائن، بادر بتجديد الاشتراك للعودة لحركة المبيعات.',
    sendable: 'targeted',
  },
  {
    key: 'merchant.subscriptionGift',
    audience: 'merchant',
    labelAr: 'هدية اشتراك',
    descriptionAr: 'عند إرسال اشتراك هدية (بدون مقابل) من لوحة الإدارة.',
    placeholders: ['{shopName}', '{planLabel}', '{expiryDate}'],
    defaultTitle: '🎁 هدية اشتراك من محلك!',
    defaultBody:
      'مبروك! حصلت على هدية اشتراك مجانية لمتجرك "{shopName}" ({planLabel}). صلاحية الاشتراك حتى: {expiryDate}.',
    sendable: 'targeted',
  },
  {
    key: 'merchant.bannerOn',
    audience: 'merchant',
    labelAr: 'تفعيل بانر العرض',
    descriptionAr: 'تأكيد محلي للتاجر عند تفعيل البانر.',
    placeholders: [],
    defaultTitle: 'تم تفعيل البانر',
    defaultBody: 'تم تفعيل عرض البانر في متجرك',
  },
  {
    key: 'merchant.bannerOff',
    audience: 'merchant',
    labelAr: 'إيقاف بانر العرض',
    descriptionAr: 'تأكيد محلي للتاجر عند إيقاف البانر.',
    placeholders: [],
    defaultTitle: 'تم إيقاف البانر',
    defaultBody: 'تم إيقاف عرض البانر مؤقتاً',
  },
];

const DEF_BY_KEY = Object.fromEntries(
  NOTIFICATION_TEMPLATE_DEFS.map((d) => [d.key, d]),
) as Record<string, NotificationTemplateDef>;

export const NOTIFICATION_TEMPLATE_KEYS = NOTIFICATION_TEMPLATE_DEFS.map((d) => d.key);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asSoundProfile(value: unknown, fallback: NotificationSoundProfile): NotificationSoundProfile {
  if (value === 'sound_both' || value === 'silent_both' || value === 'silent_inapp') return value;
  return fallback;
}

/** استبدال {placeholders} في النص */
export function fillNotificationTemplate(
  template: string,
  vars: Record<string, string | number | undefined | null> = {},
): string {
  return String(template ?? '').replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key];
    if (v === undefined || v === null) return '';
    return String(v);
  });
}

export function resolveNotificationTemplate(
  adminSettings: Record<string, unknown> | null | undefined,
  key: string,
): ResolvedNotificationTemplate {
  const def = DEF_BY_KEY[key];
  const defSoundProfile = def?.defaultSoundProfile ?? DEFAULT_SOUND_PROFILE;
  const arTitle = def?.defaultTitle ?? '';
  const arBody = def?.defaultBody ?? '';
  const fallback: ResolvedNotificationTemplate = {
    key,
    title: arTitle,
    body: arBody,
    titleCkb: defaultCkbTitle(key, arTitle),
    bodyCkb: defaultCkbBody(key, arBody),
    enabled: true,
    soundProfile: defSoundProfile,
  };
  if (!def) return fallback;

  const root = asRecord(adminSettings?.notificationTemplates);
  const raw = asRecord(root?.[key]);
  if (!raw) return { ...fallback };

  const title = asString(raw.title, def.defaultTitle);
  const body = asString(raw.body, def.defaultBody);
  return {
    key,
    title,
    body,
    titleCkb: asString(raw.titleCkb, defaultCkbTitle(key, title)),
    bodyCkb: asString(raw.bodyCkb, defaultCkbBody(key, body)),
    enabled: asBool(raw.enabled, true),
    soundProfile: asSoundProfile(raw.soundProfile, defSoundProfile),
  };
}

function resolveLang(lang?: AppLanguage): AppLanguage {
  if (lang === 'ar' || lang === 'ckb') return lang;
  return i18n.language === 'ckb' ? 'ckb' : 'ar';
}

/** يبني العنوان والنص الجاهزين، أو null إذا القالب معطّل */
export function buildNotificationContent(
  adminSettings: Record<string, unknown> | null | undefined,
  key: string,
  vars: NotificationTemplateVars = {},
  options?: { lang?: AppLanguage },
): { title: string; message: string } | null {
  const tpl = resolveNotificationTemplate(adminSettings, key);
  if (!tpl.enabled) return null;
  const lang = resolveLang(options?.lang);
  const titleTpl = lang === 'ckb' ? tpl.titleCkb : tpl.title;
  const bodyTpl = lang === 'ckb' ? tpl.bodyCkb : tpl.body;
  return {
    title: fillNotificationTemplate(titleTpl, vars),
    message: fillNotificationTemplate(bodyTpl, vars),
  };
}

/** Arabic + Kurdish payload for storing bilingual notifications */
export function buildBilingualNotificationContent(
  adminSettings: Record<string, unknown> | null | undefined,
  key: string,
  vars: NotificationTemplateVars = {},
): {
  title: string;
  message: string;
  titleCkb: string;
  messageCkb: string;
  templateKey: string;
  templateVars: NotificationTemplateVars;
} | null {
  const ar = buildNotificationContent(adminSettings, key, vars, { lang: 'ar' });
  if (!ar) return null;
  const ckb = buildNotificationContent(adminSettings, key, vars, { lang: 'ckb' });
  return {
    title: ar.title,
    message: ar.message,
    titleCkb: ckb?.title ?? ar.title,
    messageCkb: ckb?.message ?? ar.message,
    templateKey: key,
    templateVars: vars,
  };
}

/** Pick display title/message for the viewer's language */
export function getNotificationDisplayText(
  n: {
    title?: string;
    message?: string;
    titleCkb?: string;
    messageCkb?: string;
    templateKey?: string;
    templateVars?: NotificationTemplateVars;
  },
  lang: AppLanguage = resolveLang(),
  adminSettings?: Record<string, unknown> | null,
): { title: string; message: string } {
  const arTitle = n.title || '';
  const arMessage = n.message || '';
  if (lang !== 'ckb') return { title: arTitle, message: arMessage };

  if (n.titleCkb || n.messageCkb) {
    return {
      title: n.titleCkb || arTitle,
      message: n.messageCkb || arMessage,
    };
  }

  if (n.templateKey) {
    const rebuilt = buildNotificationContent(
      adminSettings,
      n.templateKey,
      n.templateVars || {},
      { lang: 'ckb' },
    );
    if (rebuilt) return rebuilt;
  }

  return { title: arTitle, message: arMessage };
}

/** Translates a sound profile into concrete push/in-app silence flags. */
export function resolveSoundProfileFlags(
  profile: NotificationSoundProfile,
): { pushSilent: boolean; inAppSilent: boolean } {
  switch (profile) {
    case 'silent_both':
      return { pushSilent: true, inAppSilent: true };
    case 'silent_inapp':
      return { pushSilent: false, inAppSilent: true };
    default:
      return { pushSilent: false, inAppSilent: false };
  }
}

/** Delivery fields to spread onto a notification document when creating it from a template. */
export function notificationDeliveryFields(
  adminSettings: Record<string, unknown> | null | undefined,
  key: string,
): NotificationDeliveryFields {
  const tpl = resolveNotificationTemplate(adminSettings, key);
  const { pushSilent, inAppSilent } = resolveSoundProfileFlags(tpl.soundProfile);
  return {
    sound: !pushSilent,
    inAppSound: !inAppSilent,
    soundProfile: tpl.soundProfile,
  };
}

/** Templates the admin Notification Center can manually trigger ("send now"). */
export function getSendableTemplateDefs(): NotificationTemplateDef[] {
  return NOTIFICATION_TEMPLATE_DEFS.filter((d) => !!d.sendable);
}

export function resolveOrderStatusText(
  adminSettings: Record<string, unknown> | null | undefined,
  status: string,
  reason?: string,
  lang?: AppLanguage,
): string {
  const map: Record<string, string> = {
    accepted: 'customer.status.accepted',
    preparing: 'customer.status.preparing',
    shipped: 'customer.status.shipped',
    delivered: 'customer.status.delivered',
    rejected: 'customer.status.rejected',
    returned: 'customer.status.returned',
    replaced: 'customer.status.replaced',
  };
  const key = map[status];
  if (!key) return status;
  const content = buildNotificationContent(
    adminSettings,
    key,
    { reason: reason || '' },
    { lang: resolveLang(lang) },
  );
  return content?.message ?? status;
}

export function getDefaultNotificationTemplatesMap(): Record<
  string,
  {
    title: string;
    body: string;
    titleCkb: string;
    bodyCkb: string;
    enabled: boolean;
    soundProfile: NotificationSoundProfile;
  }
> {
  return Object.fromEntries(
    NOTIFICATION_TEMPLATE_DEFS.map((d) => [
      d.key,
      {
        title: d.defaultTitle,
        body: d.defaultBody,
        titleCkb: defaultCkbTitle(d.key, d.defaultTitle),
        bodyCkb: defaultCkbBody(d.key, d.defaultBody),
        enabled: true,
        soundProfile: d.defaultSoundProfile ?? DEFAULT_SOUND_PROFILE,
      },
    ]),
  );
}

export function resolveAllNotificationTemplates(
  adminSettings?: Record<string, unknown> | null,
): Record<string, ResolvedNotificationTemplate> {
  return Object.fromEntries(
    NOTIFICATION_TEMPLATE_KEYS.map((key) => [key, resolveNotificationTemplate(adminSettings, key)]),
  );
}
