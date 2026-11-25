/** Server-side notification templates — keep aligned with packages/shared/src/constants/notificationTemplates.ts */

const DEFAULTS = {
  "customer.newProduct": {
    title: "منتج جديد من {storeName} ✨",
    body: "تمت إضافة منتج جديد: {productName}. سارع بالشراء الآن!",
  },
  "customer.platformPromo": {
    title: "محلك 🎁",
    body: "عرض جديد بمناسبة العيد أو الفعاليات الخاصة! كود الخصم: {code}",
  },
  "customer.orderStatus": {
    title: "تحديث حالة الطلب",
    body: "طلب رقم {orderLabel}: {statusText}",
  },
  "customer.status.accepted": { title: "", body: "تم قبول طلبك بنجاح" },
  "customer.status.preparing": { title: "", body: "طلبك قيد التجهيز" },
  "customer.status.shipped": {
    title: "",
    body: "طلبك في الطريق إليك ومندوب التوصيل في طريقه",
  },
  "customer.status.delivered": { title: "", body: "تم توصيل طلبك بنجاح. شكراً لك!" },
  "customer.status.rejected": { title: "", body: "تم رفض الطلب: {reason}" },
  "customer.status.returned": { title: "", body: "تم إرجاع الطلب: {reason}" },
  "customer.status.replaced": { title: "", body: "تم استبدال الطلب: {reason}" },
  "customer.loyaltyOrderReward": {
    title: "🎁 تم شحن محفظة نقاطك!",
    body: "حصلت تلقائياً على +{points} نقطة كمكافأة استلام طلبك!",
  },
  "customer.storeReviewReward": {
    title: "🎁 شكرًا على التقييم!",
    body: "تمت إضافة {points} نقطة ولاء إلى محفظتك لتقييمك المتجر بنجاح!",
  },
  "customer.merchantGiftPromo": {
    title: "هدية خاصة من المتجر! 🎁🎟️",
    body: "أرسل لك متجر {shopName} كود خصم خاص بقيمة {valueLabel}! الرمز: {code} (صالح للاستخدام لمرة واحدة خلال {days} أيام).",
  },
  "customer.merchantGiftProduct": {
    title: "لقد تلقيت هديّة منتج! 🎁🎉",
    body: 'مبروك! لقد أهداك متجر {shopName} منتج: "{productName}" مجاناً كرمز تقدير لولائك! تواصل مع المتجر لتنسيق الاستلام.',
  },
  "customer.flashSaleActive": {
    title: "محلك",
    body: 'بدأت الآن الفعالية الكبرى "{saleTitle}"! تصفح أفضل العروض والخصومات.',
  },
  "customer.promoCreatedPush": {
    title: "كود خصم جديد",
    body: "{code} — خصم {discountLabel}",
  },
  "merchant.newOrder": {
    title: "طلب جديد",
    body: "لديك طلب جديد برقم {orderLabel} من {customerName}",
  },
  "merchant.reelsOrder": {
    title: "طلب ريلز جديد! 🎬🛍️",
    body: "طلب زبون جديد من مقطع الفيديو الخاص بـ: {productName}. بقيمة إجمالية {totalCost} د.ع.",
  },
  "merchant.newFollower": {
    title: "متابع جديد!",
    body: "{customerName} قام بمتابعة متجرك.",
  },
  "merchant.storeReview": {
    title: "تقييم جديد!",
    body: "حصلت على استعراض {rating} نجوم من {customerName}",
  },
  "merchant.productReview": {
    title: "تقييم منتج جديد",
    body: "تقييم {rating} نجوم على {productId}",
  },
  "merchant.storeActivated": {
    title: "تحديث حالة المتجر",
    body: "تم تفعيل حساب متجرك بنجاح. يمكنك الآن استقبال الطلبات!",
  },
  "merchant.storeSuspended": {
    title: "تحديث حالة المتجر",
    body: "تم إيقاف حساب متجرك مؤقتاً. يرجى التواصل مع الدعم الفني.",
  },
  "merchant.platformPromo": {
    title: "محلك 🎁",
    body: "تم إطلاق كود خصم جديد لزيادة مبيعاتك! كود الخصم: {code}",
  },
  "merchant.flashSaleCreated": {
    title: "محلك",
    body: 'فعالية جديدة معلنة! "{saleTitle}"، يمكنك الآن طلب المشاركة بمنتجاتك!',
  },
  "merchant.subscription.7days": {
    title: "⚠️ اقتراب انتهاء الاشتراك (7 أيام)",
    body: 'مرحباً {ownerName}، ينتهي اشتراك متجرك المميز "{shopName}" خلال 7 أيام بتاريخ {expiryDate}. يرجى التجديد الآن لضمان بقاء المتجر مفعلاً واستمرار تلقي الطلبات.',
  },
  "merchant.subscription.3days": {
    title: "تنبيه الاشتراك ⚠️",
    body: "اشتراكك ينتهي خلال {diffDays} يوم. يرجى التجديد لضمان استمرارية الخدمة وعدم تقييد المبيعات.",
  },
  "merchant.subscription.2days": {
    title: "🚨 تنبيه هام: يومين فقط لانتهاء الاشتراك!",
    body: "عزيزي التاجر، اشتراكك سينتهي بعد 48 ساعة فقط ({expiryDate}). لم يتلقى المتجر أي تجديد بعد. يرجى تجديد اشتراكك فوراً تلافياً لتعليق المتجر أو إخفاء منتجاتك عن زبائنك.",
  },
  "merchant.subscription.1day": {
    title: "🔥 تنبيه حرج جداً: اشتراكك ينتهي غداً!",
    body: 'انتباه! غداً سيتم وقف اشتراك متجر "{shopName}" تلقائياً. الموعد النهائي هو {expiryDate}. يرجى تجديد الباقة فوراً لمنع تعليق المتجر.',
  },
  "merchant.subscription.expired": {
    title: "انتهى الاشتراك ⚠️",
    body: "لقد انتهت صلاحية اشتراكك! متجرك الآن مخفي عن الزبائن، بادر بتجديد الاشتراك للعودة لحركة المبيعات.",
  },
  "merchant.bannerOn": {
    title: "تم تفعيل البانر",
    body: "تم تفعيل عرض البانر في متجرك",
  },
  "merchant.bannerOff": {
    title: "تم إيقاف البانر",
    body: "تم إيقاف عرض البانر مؤقتاً",
  },
  "merchant.flashSaleActive": {
    title: "🚀 انطلقت الفعالية!",
    body: 'انطلقت الآن فعالية "{saleTitle}"! منتجاتك المعتمدة ظاهرة الآن للزبائن، تابع مبيعاتك.',
  },
  "merchant.verificationGranted": {
    title: "✅ تم توثيق متجرك!",
    body: 'مبروك! حصل متجرك "{shopName}" على شارة التوثيق الرسمية.',
  },
  "merchant.verificationGift": {
    title: "🎁 هدية توثيق من محلك!",
    body: 'مبروك! حصلت على هدية توثيق مجانية لمتجرك "{shopName}" ({planLabel}). صلاحية التوثيق حتى: {expiryDate}.',
  },
  "merchant.verificationRevoked": {
    title: "تحديث حالة التوثيق",
    body: 'تم إلغاء شارة التوثيق عن متجرك "{shopName}".',
  },
  "merchant.verificationExpired": {
    title: "انتهت صلاحية التوثيق ⚠️",
    body: 'انتهت صلاحية شارة التوثيق لمتجرك "{shopName}". يمكنك التواصل مع الدعم للتجديد.',
  },
  "merchant.subscriptionGift": {
    title: "🎁 هدية اشتراك من محلك!",
    body: 'مبروك! حصلت على هدية اشتراك مجانية لمتجرك "{shopName}" ({planLabel}). صلاحية الاشتراك حتى: {expiryDate}.',
  },
  "customer.tierUpgrade": {
    title: "🏆 ترقية مستوى!",
    body: "مبروك! أصبحت الآن بمستوى {tierLabel} وحصلت على +{bonusPoints} نقطة مكافأة ترقية!",
  },
  "customer.productReviewReward": {
    title: "🎁 شكرًا على تقييم المنتج!",
    body: "تمت إضافة {points} نقطة ولاء إلى محفظتك لتقييمك المنتج بنجاح!",
  },
  "customer.storeWideSale": {
    title: "🔥 خصم شامل من {storeName}!",
    body: "أعلن متجر {storeName} عن خصم {percent}% على كل منتجاته! تصفح العروض الآن.",
  },
  "customer.merchantFollowerPromo": {
    title: "كود خصم جديد من {storeName} 🎉",
    body: "كود الخصم: {code} — خصم {discountLabel}. سارع بالاستخدام قبل النفاد!",
  },
  "customer.accountSuspended": {
    title: "تحديث حالة الحساب",
    body: "تم توقيف حسابك مؤقتاً. يرجى التواصل مع الدعم الفني لمعرفة السبب.",
  },
};

const VALID_SOUND_PROFILES = new Set(["sound_both", "silent_both", "silent_inapp"]);
const DEFAULT_SOUND_PROFILE = "sound_both";
/** Per-key default sound profile overrides — mirrors defaultSoundProfile in the shared TS template defs. */
const DEFAULT_SOUND_PROFILES = {
  "merchant.newFollower": "silent_both",
};

let templatesCache = { data: null, fetchedAt: 0 };
const CACHE_MS = 60_000;

function fillTemplate(template, vars = {}) {
  return String(template ?? "").replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    if (v === undefined || v === null) return "";
    return String(v);
  });
}

function resolveNotificationTemplate(stored, key) {
  const fallback = DEFAULTS[key] || { title: "", body: "" };
  const defaultSoundProfile = DEFAULT_SOUND_PROFILES[key] || DEFAULT_SOUND_PROFILE;
  const raw = stored && typeof stored === "object" ? stored[key] : null;
  if (!raw || typeof raw !== "object") {
    return { key, title: fallback.title, body: fallback.body, enabled: true, soundProfile: defaultSoundProfile };
  }
  return {
    key,
    title:
      typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : fallback.title,
    body: typeof raw.body === "string" && raw.body.trim() ? raw.body.trim() : fallback.body,
    enabled: raw.enabled !== false,
    soundProfile: VALID_SOUND_PROFILES.has(raw.soundProfile) ? raw.soundProfile : defaultSoundProfile,
  };
}

function buildNotificationContent(stored, key, vars = {}) {
  const tpl = resolveNotificationTemplate(stored, key);
  if (!tpl.enabled) return null;
  return {
    title: fillTemplate(tpl.title, vars),
    message: fillTemplate(tpl.body, vars),
  };
}

/** Translates a sound profile into concrete push/in-app silence flags. */
function resolveSoundProfileFlags(profile) {
  if (profile === "silent_both") return { pushSilent: true, inAppSilent: true };
  if (profile === "silent_inapp") return { pushSilent: false, inAppSilent: true };
  return { pushSilent: false, inAppSilent: false };
}

/** Delivery fields to spread onto a notification document, resolved from the (already-fetched) template map. */
function notificationDeliveryFields(stored, key) {
  const tpl = resolveNotificationTemplate(stored, key);
  const { pushSilent, inAppSilent } = resolveSoundProfileFlags(tpl.soundProfile);
  return { sound: !pushSilent, inAppSound: !inAppSilent, soundProfile: tpl.soundProfile };
}

/** Same as notificationDeliveryFields but fetches settings/global itself (async, cached). */
async function buildNotificationDeliveryFields(dbRef, key) {
  const stored = await getNotificationTemplatesMap(dbRef);
  return notificationDeliveryFields(stored, key);
}

async function getNotificationTemplatesMap(dbRef) {
  const now = Date.now();
  if (templatesCache.data && now - templatesCache.fetchedAt < CACHE_MS) {
    return templatesCache.data;
  }
  try {
    const snap = await dbRef.doc("settings/global").get();
    const data = snap.exists ? snap.data() || {} : {};
    const map =
      data.notificationTemplates && typeof data.notificationTemplates === "object"
        ? data.notificationTemplates
        : {};
    templatesCache = { data: map, fetchedAt: now };
    return map;
  } catch {
    return {};
  }
}

async function buildNotificationFromSettings(dbRef, key, vars = {}) {
  const stored = await getNotificationTemplatesMap(dbRef);
  return buildNotificationContent(stored, key, vars);
}

function resolveOrderStatusText(stored, status, reason) {
  const map = {
    accepted: "customer.status.accepted",
    preparing: "customer.status.preparing",
    shipped: "customer.status.shipped",
    delivered: "customer.status.delivered",
    rejected: "customer.status.rejected",
    returned: "customer.status.returned",
    replaced: "customer.status.replaced",
  };
  const key = map[status];
  if (!key) return status;
  const content = buildNotificationContent(stored, key, { reason: reason || "" });
  return content?.message ?? status;
}

module.exports = {
  DEFAULTS,
  fillTemplate,
  resolveNotificationTemplate,
  buildNotificationContent,
  getNotificationTemplatesMap,
  buildNotificationFromSettings,
  resolveOrderStatusText,
  resolveSoundProfileFlags,
  notificationDeliveryFields,
  buildNotificationDeliveryFields,
};
