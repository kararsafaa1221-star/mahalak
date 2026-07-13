const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const crypto = require("crypto");
const { getFirestore, FieldValue, FieldPath, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const axios = require("axios");
const {
  getLoyaltySettings,
  applyTierPeriodReset,
  resolveTierFromOrders,
  calcTierBonus,
  calcRedemptionDiscount,
  isValidRedemptionPoints,
  calcOrderDeliveryPoints,
  buildOrderDeliveryRewardMessage,
  getOrderPointsEligibleAmount,
} = require("./loyaltySettings");

setGlobalOptions({
  region: "us-central1",
  // Lower per-function CPU so parallel deploys stay within Cloud Run regional quota.
  memory: "256MiB",
  cpu: 0.25,
  maxInstances: 15,
});

/** Bind Firebase secrets so process.env is populated in production (Firebase Functions v2). */
const WASENDER_SECRETS = ["WASENDER_ACCESS_TOKEN", "WASENDER_INSTANCE_ID"];
const ONESIGNAL_SECRETS = [
  "ONESIGNAL_APP_ID",
  "ONESIGNAL_REST_API_KEY",
  "MERCHANT_ONESIGNAL_APP_ID",
  "MERCHANT_ONESIGNAL_REST_API_KEY",
  "ADMIN_ONESIGNAL_APP_ID",
  "ADMIN_ONESIGNAL_REST_API_KEY",
];

admin.initializeApp();
// Client app uses named database "default" (not canonical "(default)")
const db = getFirestore(undefined, "default");

async function setMerchantStorageClaims(uid, storeId) {
  await getAuth().setCustomUserClaims(uid, { merchantStoreId: String(storeId) });
}

const OTP_COLLECTION = "otp_tokens";
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_ATTEMPTS_COLLECTION = "otp_attempts";
const OTP_REQUEST_WINDOW_MS = 60 * 1000;
const OTP_MAX_REQUESTS_PER_WINDOW = 3;
const OTP_VERIFY_WINDOW_MS = 10 * 60 * 1000;
const OTP_MAX_VERIFY_ATTEMPTS = 10;
// Stricter daily cap per phone — prevents sustained SMS abuse against one number.
const OTP_DAILY_CAP_PER_PHONE = 8;
const OTP_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
// Per-IP cap — slows down bulk cross-number flooding from one source.
const OTP_IP_MAX_PER_MINUTE = 8;
const OTP_IP_WINDOW_MS = 60 * 1000;
const UNIQUE_PHONES_COLLECTION = "unique_phones";
const UNIQUE_USERNAMES_COLLECTION = "unique_usernames";
const BLOCKED_PHONES_COLLECTION = "blocked_phones";
const LOGIN_ATTEMPTS_COLLECTION = "login_attempts";
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;

function applyCors(req, res) {
  const origin = String(req.get("Origin") || req.get("origin") || "").trim();
  const allowedOrigins = new Set([
    "https://mahalak-0.web.app",
    "https://mahalak-0.firebaseapp.com",
    "https://mahalak-merchant.web.app",
    "https://mahalak-merchant.firebaseapp.com",
    "https://mahalak-admin.web.app",
    "https://mahalak-admin.firebaseapp.com",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "https://localhost",
    "capacitor://localhost",
    "http://localhost",
  ]);
  if (allowedOrigins.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Vary", "Origin");
}

/** Explicit CORS origins for v2 callable functions (web + Capacitor). */
const ALLOWED_CALLABLE_CORS = [
  "https://mahalak-0.web.app",
  "https://mahalak-0.firebaseapp.com",
  "https://mahalak-merchant.web.app",
  "https://mahalak-merchant.firebaseapp.com",
  "https://mahalak-admin.web.app",
  "https://mahalak-admin.firebaseapp.com",
  "https://mahallak.app",
  "https://e-mahalak.com",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:5177",
  "http://localhost:5178",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5176",
  "http://127.0.0.1:5177",
  "http://127.0.0.1:5178",
  "https://localhost",
  "capacitor://localhost",
  "http://localhost",
];

/** @deprecated use applyCors(req, res) */
function cors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

function normalizePhone(phoneNumber) {
  return String(phoneNumber || "").replace(/\D/g, "");
}

function toAsciiDigits(value) {
  return String(value || "").replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    if (code >= 0x06F0 && code <= 0x06F9) return String(code - 0x06F0);
    return ch;
  });
}

function otpPhoneKey(phoneNumber) {
  return canonicalIraqiPhone(normalizePhone(toAsciiDigits(phoneNumber)));
}

function normalizeOtpCode(code) {
  return normalizePhone(toAsciiDigits(code));
}

async function findOtpEntry(phoneNumber) {
  const key = otpPhoneKey(phoneNumber);
  const variants = new Set([key, ...iraqiPhoneVariants(phoneNumber)]);
  const legacy = normalizePhone(toAsciiDigits(phoneNumber));
  variants.add(legacy);

  for (const variant of variants) {
    const snap = await db.collection(OTP_COLLECTION).doc(variant).get();
    if (snap.exists) return snap;
  }
  return null;
}

function formatIraqiPhone(phone) {
  const cleaned = normalizePhone(phone);
  if (cleaned.startsWith("07")) return "964" + cleaned.substring(1);
  if (cleaned.startsWith("7")) return "964" + cleaned;
  if (!cleaned.startsWith("964")) return "964" + cleaned;
  return cleaned;
}

function otpMessage(type, code) {
  if (type === "signup") {
    return `مرحباً بك في منصة محلك! رمز التحقق الخاص بك هو: ${code}. لا تشارك هذا الرمز مع أي شخص.`;
  }
  if (type === "forgot") {
    return `مرحباً! رمز إعادة تعيين كلمة المرور في منصة محلك هو: ${code}. هذا الرمز صالح لمدة 10 دقائق فقط.`;
  }
  return `رمز التحقق الخاص بك هو: ${code}`;
}

class WasenderNotConfiguredError extends Error {
  constructor() {
    super("WASENDER_NOT_CONFIGURED");
    this.code = "WASENDER_NOT_CONFIGURED";
  }
}

function resolveWasenderConfig() {
  const token = (process.env.WASENDER_ACCESS_TOKEN || "").trim();
  const instanceId = (process.env.WASENDER_INSTANCE_ID || "").trim();
  if (!token || !instanceId) {
    throw new WasenderNotConfiguredError();
  }
  return { token, instanceId };
}

async function sendWasenderMessage(phone, text) {
  const { token, instanceId } = resolveWasenderConfig();

  const response = await axios.post(
    "https://wasenderapi.com/api/send-message",
    {
      whatsapp_session: instanceId,
      to: formatIraqiPhone(phone),
      text,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: 45000,
    },
  );
  return response.data;
}

function respondWasenderError(res, error) {
  if (error?.code === "WASENDER_NOT_CONFIGURED") {
    res.status(503).json({
      success: false,
      code: "wasender_not_configured",
      error: "خدمة واتساب غير مهيأة على السيرفر. تواصل مع دعم محلك.",
    });
    return true;
  }
  return false;
}

async function assertLoginRateLimit(key) {
  const ref = db.collection(LOGIN_ATTEMPTS_COLLECTION).doc(String(key).replace(/\//g, "_"));
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : null;
    const windowStart = data?.windowStart || 0;
    const count = data?.count || 0;
    if (now - windowStart > LOGIN_ATTEMPT_WINDOW_MS) {
      tx.set(ref, { count: 1, windowStart: now });
      return;
    }
    if (count >= LOGIN_MAX_ATTEMPTS) {
      throw new Error("RATE_LIMITED");
    }
    tx.set(ref, { count: count + 1, windowStart }, { merge: true });
  });
}

async function assertOtpRateLimit(docId, windowMs, maxAttempts) {
  const ref = db.collection(OTP_ATTEMPTS_COLLECTION).doc(docId);
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : null;
    const windowStart = data?.windowStart || 0;
    const count = data?.count || 0;

    if (now - windowStart > windowMs) {
      tx.set(ref, { count: 1, windowStart: now });
      return;
    }

    if (count >= maxAttempts) {
      throw new Error("RATE_LIMITED");
    }

    tx.set(ref, { count: count + 1, windowStart }, { merge: true });
  });
}

exports.otpRequest = onRequest({ cors: false, secrets: WASENDER_SECRETS }, async (req, res) => {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  const { phoneNumber, type = "signup" } = req.body || {};
  if (!phoneNumber) {
    res.status(400).json({ success: false, error: "Phone number is required" });
    return;
  }

  const key = otpPhoneKey(phoneNumber);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + OTP_TTL_MS;

  // Layer 1: per-phone short-window cap (3 per minute — existing)
  try {
    await assertOtpRateLimit(`req_${key}`, OTP_REQUEST_WINDOW_MS, OTP_MAX_REQUESTS_PER_WINDOW);
  } catch {
    res.status(429).json({ success: false, error: "Too many OTP requests. Please wait and try again." });
    return;
  }

  // Layer 2: per-phone daily cap — prevents sustained abuse against one number
  try {
    await assertOtpRateLimit(`day_${key}`, OTP_DAILY_WINDOW_MS, OTP_DAILY_CAP_PER_PHONE);
  } catch {
    res.status(429).json({ success: false, error: "الحد اليومي لرسائل التحقق لهذا الرقم تجاوز. حاول غداً." });
    return;
  }

  // Layer 3: per-IP cap — throttles cross-number flooding from a single source
  const ip = String(
    req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown"
  ).split(",")[0].trim();
  if (ip && ip !== "unknown") {
    const ipKey = `ip_${ip.replace(/[^a-zA-Z0-9]/g, "_")}`;
    try {
      await assertOtpRateLimit(ipKey, OTP_IP_WINDOW_MS, OTP_IP_MAX_PER_MINUTE);
    } catch {
      res.status(429).json({ success: false, error: "Too many requests from this network. Please wait." });
      return;
    }
  }

  try {
    await db.collection(OTP_COLLECTION).doc(key).set({
      code,
      type,
      phoneNumber: key,
      expiresAt,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Respond immediately — slow WhatsApp API must not block the client UI.
    res.json({ success: true });

    sendWasenderMessage(phoneNumber, otpMessage(type, code)).catch((error) => {
      console.error("[otpRequest] Wasender delivery failed (OTP already stored):", error?.message || error);
    });
  } catch (error) {
    await db.collection(OTP_COLLECTION).doc(key).delete().catch(() => {});
    if (respondWasenderError(res, error)) return;
    const detail = error.response?.data || error.message;
    res.status(500).json({
      success: false,
      error: typeof detail === "string" ? detail : "فشل إرسال رمز التحقق عبر واتساب",
      hint: "تحقق من إعدادات Wasender على السيرفر",
    });
  }
});

exports.otpVerify = onRequest({ cors: false }, async (req, res) => {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  const { phoneNumber, code } = req.body || {};
  if (!phoneNumber || !code) {
    res.status(400).json({ success: false, error: "Phone number and code are required" });
    return;
  }

  const key = otpPhoneKey(phoneNumber);
  const normalizedCode = normalizeOtpCode(code);

  try {
    await assertOtpRateLimit(`verify_${key}`, OTP_VERIFY_WINDOW_MS, OTP_MAX_VERIFY_ATTEMPTS);
  } catch {
    res.status(429).json({ success: false, error: "Too many verification attempts. Please wait and try again." });
    return;
  }

  const snap = await findOtpEntry(phoneNumber);
  if (!snap) {
    res.status(400).json({ success: false, error: "Invalid or expired OTP" });
    return;
  }

  const entry = snap.data();
  if (!entry || entry.expiresAt < Date.now() || entry.code !== normalizedCode) {
    res.status(400).json({ success: false, error: "Invalid or expired OTP" });
    return;
  }

  await snap.ref.delete();
  res.json({ success: true });
});

const DASHBOARD_ADMIN_ROLES = new Set([
  "owner",
  "admin",
  "supervisor",
  "accountant",
  "support",
]);

const ALL_DASHBOARD_PERMISSIONS = [
  "overview",
  "stores",
  "customers",
  "orders",
  "products",
  "rechargeCodes",
  "promoCodes",
  "subscriptions",
  "payouts",
  "flashSales",
  "reviews",
  "broadcast",
  "whatsapp",
  "heatmap",
  "database",
  "ads",
  "settings",
  "activityLogs",
];

async function fetchAdminDoc(uid) {
  const snap = await db.collection("admins").doc(uid).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  if (data.status === "suspended" || data.isSuspended === true) return null;
  if (!DASHBOARD_ADMIN_ROLES.has(data.role)) return null;
  return data;
}

function resolveEffectivePermissions(adminDoc) {
  if (!adminDoc) return [];
  if (adminDoc.role === "owner") {
    return ALL_DASHBOARD_PERMISSIONS;
  }
  const explicit = Array.isArray(adminDoc.permissions)
    ? adminDoc.permissions.filter((p) => typeof p === "string")
    : [];
  if (explicit.length > 0) return explicit;
  if (adminDoc.role === "admin") return ALL_DASHBOARD_PERMISSIONS;
  return [];
}

function hasAdminPermission(adminDoc, permissionKey) {
  if (!adminDoc) return false;
  if (adminDoc.role === "owner") return true;
  return resolveEffectivePermissions(adminDoc).includes(permissionKey);
}

async function assertDashboardPermission(uid, authToken, permissionKey) {
  const adminDoc = await fetchAdminDoc(uid);
  if (!adminDoc) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
  if (!hasAdminPermission(adminDoc, permissionKey)) {
    throw new HttpsError(
      "permission-denied",
      `Missing required permission: ${permissionKey}`,
    );
  }
  return adminDoc;
}

/** @deprecated use assertDashboardPermission */
async function isDashboardAdmin(uid, authToken) {
  const doc = await fetchAdminDoc(uid);
  if (!doc) return false;
  return resolveEffectivePermissions(doc).length > 0;
}

const AUTH_SECRETS_COLLECTION = "auth_secrets";
const STORE_SECRETS_COLLECTION = "store_secrets";

function storeSecretsRef(storeId) {
  return db.collection(STORE_SECRETS_COLLECTION).doc(String(storeId));
}

/** Merge wallet / payout fields into store_secrets (Admin SDK). */
async function upsertStoreSecretsFields(storeId, fields) {
  const payload = {
    storeId: String(storeId),
    updatedAt: FieldValue.serverTimestamp(),
    ...fields,
  };
  await storeSecretsRef(storeId).set(payload, { merge: true });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !password) return false;
  const storedStr = String(stored);
  if (!storedStr.includes(":")) {
    return storedStr === String(password);
  }
  const [salt, hash] = storedStr.split(":");
  if (!salt || !hash) return false;
  const verify = crypto.scryptSync(String(password), salt, 64).toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(verify, "hex"));
  } catch {
    return false;
  }
}

async function resolveStoredPassword(entityType, entityId, docData) {
  const secretSnap = await db.collection(AUTH_SECRETS_COLLECTION).doc(`${entityType}_${entityId}`).get();
  if (secretSnap.exists) {
    const secret = secretSnap.data()?.passwordHash || secretSnap.data()?.password;
    if (secret) {
      return { value: secret, isHash: String(secret).includes(":") };
    }
  }
  if (docData?.password) {
    return { value: docData.password, isHash: false };
  }
  return { value: null, isHash: false };
}

async function migratePasswordToSecret(entityType, entityId, plainPassword) {
  const passwordHash = hashPassword(plainPassword);
  await db.collection(AUTH_SECRETS_COLLECTION).doc(`${entityType}_${entityId}`).set({
    type: entityType,
    passwordHash,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const collectionName = entityType === "customer" ? "customers" : "stores";
  await db.collection(collectionName).doc(entityId).update({ password: FieldValue.delete() });
}

function checkPassword(inputPassword, storedInfo) {
  if (!storedInfo?.value) return false;
  return verifyPassword(inputPassword, storedInfo.value);
}

function sanitizeCustomer(data, id) {
  const { password, ...safe } = data || {};
  return { id, ...safe };
}

function sanitizeStore(data, id) {
  const {
    password,
    walletBalance,
    payoutMethods,
    zainCashNumber,
    mastercardNumber,
    ...safe
  } = data || {};
  return { id, ...safe };
}

const STORES_PUBLIC_COLLECTION = "stores_public";

const STORE_PUBLIC_STRIP_KEYS = new Set([
  "password",
  "walletBalance",
  "payoutMethods",
  "mastercardNumber",
  "zainCashNumber",
  "ownerId",
  "fcmToken",
  "signature",
  "contractAgreedAt",
  "terms_accepted",
  "signed_at",
  "blockedCustomerIds",
  "inboxClearedOrderIds",
]);

/** Build a catalog-safe store document for stores_public (C1). */
function toPublicStoreDocument(data, id) {
  const storeId = id || data?.id || "";
  const safe = { id: storeId };
  for (const [key, value] of Object.entries(data || {})) {
    if (!STORE_PUBLIC_STRIP_KEYS.has(key)) {
      safe[key] = value;
    }
  }
  return safe;
}

async function syncStorePublicDocument(storeId, data) {
  const publicRef = db.collection(STORES_PUBLIC_COLLECTION).doc(String(storeId));
  if (!data || data.isDeleted === true) {
    await publicRef.delete().catch(() => {});
    return;
  }
  await publicRef.set(toPublicStoreDocument(data, storeId), { merge: true });
}

async function callerOwnsStore(callerUid, storeId) {
  if (!callerUid || !storeId) return false;
  const snap = await db.collection("stores").doc(storeId).get();
  if (!snap.exists) return false;
  const ownerId = snap.data()?.ownerId || "";
  if (ownerId && ownerId === callerUid) return true;
  const secretsSnap = await db.collection("store_secrets").doc(storeId).get();
  return secretsSnap.exists && secretsSnap.data()?.ownerId === callerUid;
}

async function callerOwnsCustomer(callerUid, customerId) {
  if (!callerUid || !customerId) return false;
  if (customerId === callerUid) return true;
  const snap = await db.collection("customers").doc(customerId).get();
  return snap.exists && snap.data()?.authUid === callerUid;
}

/**
 * Authorization guard for dispatchOneSignalPush.
 *
 * Dashboard admins:
 *   - Sending to multiple recipients OR using a targetRole other than their
 *     own app ("admin") requires the 'broadcast' permission.
 *   - Sending a single push to themselves (e.g. test) is always allowed.
 *
 * Non-admin callers (merchants / customers):
 *   - May only push to themselves or resources they own.
 */
async function assertCanDispatchPush(callerUid, externalIds, targetRole, authToken) {
  const adminDoc = await fetchAdminDoc(callerUid);

  if (adminDoc) {
    // A dashboard admin calling with targetRole other than "admin", or targeting
    // multiple external IDs, must hold the broadcast permission.
    const isCrossApp = targetRole && targetRole !== "admin";
    const isBulk = externalIds.length > 1;
    if (isCrossApp || isBulk) {
      await assertDashboardPermission(callerUid, authToken, "broadcast");
    }
    return;
  }

  // Non-admin: caller may only push to themselves or their own resources.
  for (const targetId of externalIds) {
    if (targetId === callerUid) continue;
    if (await callerOwnsCustomer(callerUid, targetId)) continue;
    if (await callerOwnsStore(callerUid, targetId)) continue;
    throw new HttpsError("permission-denied", "Cannot send push to unrelated recipients");
  }
}

function resolveOneSignalCredentials(role) {
  const normalized = String(role || "customer").toLowerCase();

  if (normalized === "admin") {
    const adminAppId = process.env.ADMIN_ONESIGNAL_APP_ID;
    const adminRestApiKey = process.env.ADMIN_ONESIGNAL_REST_API_KEY;
    if (adminAppId && adminRestApiKey) {
      return { appId: adminAppId, restApiKey: adminRestApiKey };
    }
    return null;
  }

  const useMerchant =
    normalized === "merchant" || normalized.startsWith("merchant");

  if (useMerchant) {
    const merchantAppId = process.env.MERCHANT_ONESIGNAL_APP_ID;
    const merchantRestApiKey = process.env.MERCHANT_ONESIGNAL_REST_API_KEY;
    if (merchantAppId && merchantRestApiKey) {
      return { appId: merchantAppId, restApiKey: merchantRestApiKey };
    }
    return null;
  }

  const appId = process.env.ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !restApiKey) {
    throw new HttpsError(
      "failed-precondition",
      "OneSignal credentials are not configured on the server",
    );
  }
  return { appId, restApiKey };
}

function resolveOneSignalCredentialsForChannel(channelId, targetRole) {
  if (targetRole === "admin") {
    return resolveOneSignalCredentials("admin");
  }
  if (targetRole === "merchant") {
    return resolveOneSignalCredentials("merchant");
  }
  if (typeof channelId === "string" && channelId.startsWith("merchant_")) {
    return resolveOneSignalCredentials("merchant");
  }
  return resolveOneSignalCredentials("customer");
}

function resolveOneSignalCredentialsForNotification(data) {
  if (data?.role === "admin") {
    return resolveOneSignalCredentials("admin");
  }
  if (data?.role === "merchant") {
    return resolveOneSignalCredentials("merchant");
  }
  return resolveOneSignalCredentials("customer");
}

async function postOneSignalNotification(payload, credentials) {
  const { restApiKey } = credentials || resolveOneSignalCredentials("customer");
  const response = await axios.post(
    "https://api.onesignal.com/notifications",
    payload,
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Key ${restApiKey}`,
      },
      timeout: 15000,
    },
  );
  return response.data;
}

function resolveNotificationChannelId(data) {
  const soundEnabled = data.sound !== false;
  const isFromAdmin =
    String(data.title || "").includes("محلك") ||
    !data.type ||
    String(data.title || "").includes("تحديث حالة المتجر");

  if (isFromAdmin) return "admin_broadcasts_sound";

  if (data.role === "customer") {
    if (data.type === "order") {
      return soundEnabled ? "customer_order_updates_sound" : "customer_order_updates_silent";
    }
    if (data.type === "promo") return "customer_promos_sound";
    if (data.type === "product") return "customer_products_sound";
    if (data.type === "system" && String(data.title || "").includes("شحن محفظة نقاطك")) {
      return "customer_promos_sound";
    }
    return soundEnabled ? "customer_order_updates_sound" : "customer_order_updates_silent";
  }

  if (data.role === "merchant") {
    if (data.type === "order") return "merchant_orders_sound";
    if (data.type === "activity" || data.type === "system") {
      return soundEnabled ? "merchant_orders_sound" : "merchant_activity_silent";
    }
    if (data.type === "social") return "merchant_social_silent";
    return soundEnabled ? "merchant_orders_sound" : "merchant_activity_silent";
  }

  return "admin_broadcasts_sound";
}

const MAHALAK_PUSH_ICON_URL =
  process.env.MAHALAK_PUSH_ICON_URL || "https://mahalak-0.web.app/icon.png";

function withAndroidPushBranding(payload) {
  return {
    ...payload,
    small_icon: "ic_stat_onesignal_default",
    large_icon: MAHALAK_PUSH_ICON_URL,
    huawei_large_icon: MAHALAK_PUSH_ICON_URL,
    adm_large_icon: MAHALAK_PUSH_ICON_URL,
  };
}

function buildOneSignalPayload({ appId, userId, title, message, channelId, data }) {
  const payload = {
    app_id: appId,
    include_aliases: { external_id: Array.isArray(userId) ? userId : [userId] },
    target_channel: "push",
    headings: { en: title, ar: title },
    contents: { en: message, ar: message },
    existing_android_channel_id: channelId,
    data: {
      type: data.type || "general",
      targetId: data.targetId || "",
      role: data.role || "",
      notificationId: data.notificationId || "",
    },
  };

  if (String(channelId).includes("silent")) {
    payload.android_sound = "nil";
    payload.ios_sound = "nil";
  } else {
    payload.ios_sound = "alert_sound.wav";
  }

  return withAndroidPushBranding(payload);
}

function formatPromoDiscountMessage(data) {
  const code = String(data.code || "").trim().toUpperCase();
  const discountType = String(data.discountType || "percent").toLowerCase();
  const value = Number(data.discountValue ?? data.discountAmount ?? data.amount ?? 0);
  const isPercent = discountType === "percent" || discountType === "percentage";
  const discountText = isPercent ? `${value}%` : `${value.toLocaleString("ar-IQ")} د.ع`;
  return { code, message: `${code} — خصم ${discountText}` };
}

function buildOneSignalBroadcastPayload({ appId, title, message, channelId, data }) {
  const payload = {
    app_id: appId,
    included_segments: ["Subscribed Users"],
    target_channel: "push",
    headings: { en: title, ar: title },
    contents: { en: message, ar: message },
    existing_android_channel_id: channelId,
    data: {
      type: data.type || "promo",
      role: data.role || "customer",
      targetId: data.targetId || "",
      promoCode: data.promoCode || "",
    },
  };

  if (String(channelId).includes("silent")) {
    payload.android_sound = "nil";
    payload.ios_sound = "nil";
  } else {
    payload.ios_sound = "alert_sound.wav";
  }

  return withAndroidPushBranding(payload);
}

/** Auto-send broadcast push when a new promo code is created. */
exports.onPromoCodeCreated = onDocumentCreated(
  { document: "promo_codes/{promoId}", database: "default", secrets: ONESIGNAL_SECRETS },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    if (!data) return;

    const promoId = event.params.promoId;
    if (String(promoId).startsWith("virtual-")) return;
    if (data.status && data.status !== "active") return;

    const { code, message } = formatPromoDiscountMessage(data);
    if (!code) return;

    let credentials;
    try {
      credentials = resolveOneSignalCredentials("customer");
    } catch {
      return;
    }

    try {
      await postOneSignalNotification(
        buildOneSignalBroadcastPayload({
          appId: credentials.appId,
          title: "كود خصم جديد",
          message,
          channelId: "customer_promos_sound",
          data: {
            type: "promo",
            role: "customer",
            targetId: promoId,
            promoCode: code,
          },
        }),
        credentials,
      );
    } catch (error) {
      console.error("[onPromoCodeCreated] OneSignal error:", error.response?.data || error.message);
    }
  },
);

/** Auto-send OneSignal push when a notification document is created. */
exports.onNotificationCreated = onDocumentCreated(
  { document: "notifications/{notificationId}", database: "default", secrets: ONESIGNAL_SECRETS },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    if (!data?.userId || !data?.message) return;

    let credentials;
    try {
      credentials = resolveOneSignalCredentialsForNotification(data);
    } catch {
      return;
    }
    if (!credentials) {
      console.warn(
        `[onNotificationCreated] Push skipped for role=${data.role || "unknown"} — OneSignal credentials missing`,
      );
      return;
    }

    const channelId = resolveNotificationChannelId(data);
    const title = data.title || "محلك";

    try {
      await postOneSignalNotification(
        buildOneSignalPayload({
          appId: credentials.appId,
          userId: data.userId,
          title,
          message: data.message,
          channelId,
          data: { ...data, notificationId: event.params.notificationId },
        }),
        credentials,
      );
    } catch (error) {
      console.error("[onNotificationCreated] OneSignal error:", error.response?.data || error.message);
    }
  },
);

/** App push dispatch — any signed-in user (order updates, promos, etc.). */
exports.dispatchOneSignalPush = onCall({ cors: ALLOWED_CALLABLE_CORS, secrets: ONESIGNAL_SECRETS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const { title, message, channelId, externalIds, targetRole } = request.data || {};
  if (!title || !message || !channelId || !Array.isArray(externalIds) || !externalIds.length) {
    throw new HttpsError("invalid-argument", "title, message, channelId and externalIds are required");
  }

  if (externalIds.length > 2000) {
    throw new HttpsError("invalid-argument", "Too many recipients in one request");
  }

  await assertCanDispatchPush(request.auth.uid, externalIds, targetRole, request.auth.token);

  let credentials;
  try {
    credentials = resolveOneSignalCredentialsForChannel(channelId, targetRole);
  } catch {
    throw new HttpsError("failed-precondition", "OneSignal credentials are not configured on the server");
  }
  if (!credentials) {
    throw new HttpsError(
      "failed-precondition",
      `OneSignal credentials are not configured for target role: ${targetRole || "customer"}`,
    );
  }

  const payload = buildOneSignalPayload({
    appId: credentials.appId,
    userId: externalIds,
    title,
    message,
    channelId,
    data: { type: "app", role: targetRole || "system" },
  });

  try {
    const data = await postOneSignalNotification(payload, credentials);
    return { success: true, data };
  } catch (error) {
    throw new HttpsError("internal", "Failed to send push notification");
  }
});

/** Secure push proxy — requires broadcast permission (owner bypasses via hasAdminPermission). */
exports.sendPushNotification = onCall({ cors: ALLOWED_CALLABLE_CORS, secrets: ONESIGNAL_SECRETS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  await assertDashboardPermission(request.auth.uid, request.auth.token, "broadcast");

  const { title, message, channelId, externalIds } = request.data || {};
  if (!title || !message || !channelId || !Array.isArray(externalIds) || !externalIds.length) {
    throw new HttpsError("invalid-argument", "title, message, channelId and externalIds are required");
  }

  const credentials = resolveOneSignalCredentialsForChannel(channelId, request.data?.targetRole);
  const payload = buildOneSignalPayload({
    appId: credentials.appId,
    userId: externalIds,
    title,
    message,
    channelId,
    data: { type: "broadcast", role: "admin" },
  });

  try {
    const data = await postOneSignalNotification(payload, credentials);
    return { success: true, data };
  } catch (error) {
    const detail = error.response?.data || error.message;
    throw new HttpsError("internal", "Failed to send push notification");
  }
});

/** WhatsApp proxy for admin dashboard — requires whatsapp permission. */
exports.sendWhatsAppMessage = onCall({ cors: ALLOWED_CALLABLE_CORS, secrets: WASENDER_SECRETS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  await assertDashboardPermission(request.auth.uid, request.auth.token, "whatsapp");

  const { phoneNumber, message } = request.data || {};
  if (!phoneNumber || !message) {
    throw new HttpsError("invalid-argument", "phoneNumber and message are required");
  }

  try {
    const data = await sendWasenderMessage(phoneNumber, message);
    return { success: true, data };
  } catch (error) {
    if (error?.code === "WASENDER_NOT_CONFIGURED") {
      throw new HttpsError("failed-precondition", "خدمة واتساب غير مهيأة على السيرفر");
    }
    throw new HttpsError("internal", "Failed to send WhatsApp message");
  }
});

const RECHARGE_ATTEMPTS_COLLECTION = "recharge_attempts";
const RECHARGE_ATTEMPT_WINDOW_MS = 60 * 1000;
const RECHARGE_MAX_ATTEMPTS = 5;
const RECHARGE_CODE_KEY_PATTERN = /^[A-Z0-9][A-Z0-9-]*[A-Z0-9]$|^[A-Z0-9]{4,32}$/;

function normalizeRechargeCodeKey(code) {
  return String(code || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

function isValidRechargeCodeKey(codeKey) {
  return RECHARGE_CODE_KEY_PATTERN.test(codeKey);
}

async function customerAuthOwnsId(customerDocId, authUid) {
  if (!authUid) return false;
  if (customerDocId === authUid) return true;
  const snap = await db.collection("customers").doc(customerDocId).get();
  if (!snap.exists) return false;
  return snap.data()?.authUid === authUid;
}

/** True when the caller signed in via Firebase Anonymous Auth (not phone/password verified). */
function isAnonymousSignIn(request) {
  return request.auth?.token?.firebase?.sign_in_provider === "anonymous";
}

async function storeAuthOwnsId(storeId, authUid) {
  if (!authUid || !storeId) return false;
  const snap = await db.collection("stores").doc(storeId).get();
  if (!snap.exists) return false;
  return (snap.data()?.ownerId || "") === authUid;
}

async function deleteAuthUserSafe(uid) {
  try {
    await getAuth().deleteUser(uid);
  } catch (authError) {
    if (authError?.code !== "auth/user-not-found") {
      throw authError;
    }
  }
}

async function scrubCustomerAccount(customerId, authUid) {
  const customerRef = db.collection("customers").doc(String(customerId));
  const snap = await customerRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Customer account not found");
  }
  if (snap.data()?.isDeleted === true) {
    throw new HttpsError("failed-precondition", "Account already deleted");
  }

  const phoneKey = snap.data()?.phone
    ? canonicalIraqiPhone(normalizePhone(snap.data().phone))
    : "";

  await customerRef.update({
    name: "مستخدم محذوف",
    phone: `deleted_${customerId}`,
    address: "",
    savedLocations: [],
    defaultLocationId: FieldValue.delete(),
    points: 0,
    followedStores: [],
    storeNotifications: [],
    fcmToken: FieldValue.delete(),
    authUid: FieldValue.delete(),
    password: FieldValue.delete(),
    lat: FieldValue.delete(),
    lng: FieldValue.delete(),
    isDeleted: true,
    deletedAt: FieldValue.serverTimestamp(),
  });

  await db.collection(AUTH_SECRETS_COLLECTION).doc(`customer_${customerId}`).delete().catch(() => {});
  if (phoneKey) {
    await db.collection(UNIQUE_PHONES_COLLECTION).doc(phoneKey).delete().catch(() => {});
  }

  await deleteAuthUserSafe(authUid);
}

async function scrubMerchantAccount(storeId, authUid) {
  const storeRef = db.collection("stores").doc(String(storeId));
  const snap = await storeRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Store account not found");
  }
  if (snap.data()?.isDeleted === true) {
    throw new HttpsError("failed-precondition", "Account already deleted");
  }

  const data = snap.data() || {};
  const phoneKey = data.phone ? canonicalIraqiPhone(normalizePhone(data.phone)) : "";
  const usernameKey = data.username ? normalizeUsernameKey(data.username) : "";

  await storeRef.update({
    ownerName: "محذوف",
    shopName: `متجر محذوف ${String(storeId).slice(-6)}`,
    phone: `deleted_${storeId}`,
    status: "suspended",
    ownerId: FieldValue.delete(),
    fcmToken: FieldValue.delete(),
    password: FieldValue.delete(),
    walletBalance: FieldValue.delete(),
    payoutMethods: FieldValue.delete(),
    signature: FieldValue.delete(),
    isDeleted: true,
    deletedAt: FieldValue.serverTimestamp(),
  });

  await storeSecretsRef(storeId).delete().catch(() => {});
  await db.collection(AUTH_SECRETS_COLLECTION).doc(`store_${storeId}`).delete().catch(() => {});
  if (phoneKey) {
    await db.collection(UNIQUE_PHONES_COLLECTION).doc(phoneKey).delete().catch(() => {});
  }
  if (usernameKey) {
    await db.collection(UNIQUE_USERNAMES_COLLECTION).doc(usernameKey).delete().catch(() => {});
  }

  try {
    await getAuth().setCustomUserClaims(authUid, { merchantStoreId: null });
  } catch {
    // non-fatal
  }

  await deleteAuthUserSafe(authUid);
}

async function assertRechargeRateLimit(uid) {
  const ref = db.collection(RECHARGE_ATTEMPTS_COLLECTION).doc(uid);
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : null;
    const windowStart = data?.windowStart || 0;
    const count = data?.count || 0;

    if (now - windowStart > RECHARGE_ATTEMPT_WINDOW_MS) {
      tx.set(ref, { count: 1, windowStart: now });
      return;
    }

    if (count >= RECHARGE_MAX_ATTEMPTS) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many recharge attempts. Please wait and try again.",
      );
    }

    tx.set(ref, { count: count + 1, windowStart }, { merge: true });
  });
}

/** Rate-limited recharge redemption — no collection queries, get-by-codeKey only. */
exports.redeemRechargeCode = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const { code, customerId } = request.data || {};
  if (!code || !customerId) {
    throw new HttpsError("invalid-argument", "code and customerId are required");
  }

  const ownsCustomer = await customerAuthOwnsId(customerId, request.auth.uid);
  if (!ownsCustomer) {
    throw new HttpsError("permission-denied", "Cannot redeem for this customer");
  }

  const codeKey = normalizeRechargeCodeKey(code);
  if (!isValidRechargeCodeKey(codeKey)) {
    throw new HttpsError("not-found", "Invalid or already used recharge code");
  }

  await assertRechargeRateLimit(request.auth.uid);

  const codeRef = db.collection("recharge_codes").doc(codeKey);
  const customerRef = db.collection("customers").doc(customerId);

  try {
    const points = await db.runTransaction(async (tx) => {
      const codeSnap = await tx.get(codeRef);
      if (!codeSnap.exists) {
        throw new HttpsError("not-found", "Invalid or already used recharge code");
      }

      const codeData = codeSnap.data() || {};
      if (codeData.codeKey && codeData.codeKey !== codeKey) {
        throw new HttpsError("not-found", "Invalid or already used recharge code");
      }
      if (codeData.status !== "active") {
        throw new HttpsError("not-found", "Invalid or already used recharge code");
      }

      const rewardPoints = Number(codeData.points) || 0;
      if (rewardPoints <= 0) {
        throw new HttpsError("failed-precondition", "Recharge code has no points");
      }

      tx.update(codeRef, {
        status: "used",
        usedBy: customerId,
        usedAt: FieldValue.serverTimestamp(),
      });
      tx.update(customerRef, {
        points: FieldValue.increment(rewardPoints),
      });

      return rewardPoints;
    });

    return { success: true, points };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to redeem recharge code");
  }
});

async function fetchAdminDocRaw(uid) {
  const snap = await db.collection("admins").doc(uid).get();
  if (!snap.exists) return null;
  return snap.data() || null;
}

async function assertAdminManagementAccess(uid) {
  const adminDoc = await fetchAdminDocRaw(uid);
  if (!adminDoc || !["owner", "supervisor"].includes(adminDoc.role)) {
    throw new HttpsError("permission-denied", "Admin management access required");
  }
  if (adminDoc.status === "suspended" || adminDoc.isSuspended === true) {
    throw new HttpsError("permission-denied", "Account suspended");
  }
  return adminDoc;
}

function assertCanModifyAdminTarget(callerDoc, callerUid, targetUid, targetDoc) {
  if (callerDoc.role === "owner") return;
  if (targetDoc?.role === "owner") {
    throw new HttpsError("permission-denied", "Cannot modify owner account");
  }
  if (targetUid === callerUid) {
    throw new HttpsError("permission-denied", "Cannot modify your own account");
  }
}

function resolvePermissionsForRole(role, permissions) {
  if (role === "owner" || role === "admin") {
    return ALL_DASHBOARD_PERMISSIONS;
  }
  return Array.isArray(permissions)
    ? permissions.filter((p) => typeof p === "string" && ALL_DASHBOARD_PERMISSIONS.includes(p))
    : [];
}

/** Secure admin account creation — owner/supervisor only; Auth user created server-side. */
exports.createUserAccount = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const callerDoc = await assertAdminManagementAccess(request.auth.uid);
  const { email, password, name, phone, province, area, role, permissions } = request.data || {};

  if (!email || !password || !role) {
    throw new HttpsError("invalid-argument", "email, password, and role are required");
  }
  if (!DASHBOARD_ADMIN_ROLES.has(role)) {
    throw new HttpsError("invalid-argument", "Invalid admin role");
  }
  if (role === "owner" && callerDoc.role !== "owner") {
    throw new HttpsError("permission-denied", "Only owner can assign owner role");
  }
  if (String(password).length < 6) {
    throw new HttpsError("invalid-argument", "Password must be at least 6 characters");
  }

  try {
    const userRecord = await admin.auth().createUser({
      email: String(email).trim().toLowerCase(),
      password: String(password),
      displayName: name ? String(name).trim() : undefined,
    });

    await db.collection("admins").doc(userRecord.uid).set({
      email: String(email).trim().toLowerCase(),
      name: name ? String(name).trim() : "",
      phone: phone ? String(phone).trim() : "",
      province: province ? String(province).trim() : "",
      area: area ? String(area).trim() : "",
      role,
      permissions: resolvePermissionsForRole(role, permissions),
      status: "active",
      isSuspended: false,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: request.auth.uid,
    });

    return { success: true, uid: userRecord.uid };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    const code = error?.code;
    if (code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "Email is already registered");
    }
    throw new HttpsError("internal", "Failed to create admin account");
  }
});

/** Update Firebase Auth credentials for an admin (password/email). */
exports.updateUserAccount = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const callerDoc = await assertAdminManagementAccess(request.auth.uid);
  const { uid, password, email } = request.data || {};
  if (!uid) {
    throw new HttpsError("invalid-argument", "uid is required");
  }

  const targetDoc = await fetchAdminDocRaw(uid);
  if (!targetDoc) {
    throw new HttpsError("not-found", "Admin account not found");
  }
  assertCanModifyAdminTarget(callerDoc, request.auth.uid, uid, targetDoc);

  const authUpdate = {};
  if (email) authUpdate.email = String(email).trim().toLowerCase();
  if (password) {
    if (String(password).length < 6) {
      throw new HttpsError("invalid-argument", "Password must be at least 6 characters");
    }
    authUpdate.password = String(password);
  }
  if (!Object.keys(authUpdate).length) {
    throw new HttpsError("invalid-argument", "Nothing to update");
  }

  try {
    await admin.auth().updateUser(uid, authUpdate);
    if (email) {
      await db.collection("admins").doc(uid).set(
        { email: String(email).trim().toLowerCase(), updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    }
    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to update admin credentials");
  }
});

/** Securely delete customer or merchant app account (Google Play compliance). */
exports.deleteUserAccountSecure = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const authUid = request.auth.uid;
  const { accountType, customerId, storeId } = request.data || {};

  if (accountType === "customer") {
    const targetId = String(customerId || authUid);
    if (!(await customerAuthOwnsId(targetId, authUid))) {
      throw new HttpsError("permission-denied", "Cannot delete this customer account");
    }
    await scrubCustomerAccount(targetId, authUid);
    return { success: true, accountType: "customer" };
  }

  if (accountType === "merchant") {
    const targetStoreId = String(storeId || "");
    if (!targetStoreId) {
      throw new HttpsError("invalid-argument", "storeId is required for merchant deletion");
    }
    if (!(await storeAuthOwnsId(targetStoreId, authUid))) {
      throw new HttpsError("permission-denied", "Cannot delete this merchant account");
    }
    await scrubMerchantAccount(targetStoreId, authUid);
    return { success: true, accountType: "merchant" };
  }

  throw new HttpsError("invalid-argument", "accountType must be 'customer' or 'merchant'");
});

/** Delete admin Auth user + Firestore doc — owner only, cannot delete owner role. */
exports.deleteUserAccount = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const callerDoc = await assertAdminManagementAccess(request.auth.uid);
  if (callerDoc.role !== "owner") {
    throw new HttpsError("permission-denied", "Only owner can delete admin accounts");
  }

  const { uid } = request.data || {};
  if (!uid) {
    throw new HttpsError("invalid-argument", "uid is required");
  }
  if (uid === request.auth.uid) {
    throw new HttpsError("permission-denied", "Cannot delete your own account");
  }

  const targetDoc = await fetchAdminDocRaw(uid);
  if (!targetDoc) {
    throw new HttpsError("not-found", "Admin account not found");
  }
  if (targetDoc.role === "owner") {
    throw new HttpsError("permission-denied", "Cannot delete owner account");
  }

  try {
    try {
      await admin.auth().deleteUser(uid);
    } catch (authError) {
      if (authError?.code !== "auth/user-not-found") {
        throw authError;
      }
    }
    await db.collection("admins").doc(uid).delete();
    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to delete admin account");
  }
});

function canonicalIraqiPhone(cleaned) {
  if (/^964(77|79|78|75)\d{8}$/.test(cleaned)) return cleaned;
  // +964 077XXXXXXXX — country code plus local leading zero
  if (/^9640(77|79|78|75)\d{8}$/.test(cleaned)) return `964${cleaned.slice(4)}`;
  if (/^0(77|79|78|75)\d{8}$/.test(cleaned)) return `964${cleaned.slice(1)}`;
  if (/^(77|79|78|75)\d{8}$/.test(cleaned)) return `964${cleaned}`;
  return cleaned;
}

function iraqiPhoneVariants(phone) {
  const cleaned = normalizePhone(phone);
  const canonical = canonicalIraqiPhone(cleaned);

  const variants = new Set([
    canonical,
    formatIraqiPhone(phone),
    String(phone || "").trim(),
    cleaned,
  ]);

  if (canonical.startsWith("964") && canonical.length === 13) {
    variants.add(`0${canonical.slice(3)}`);
    variants.add(canonical.slice(3));
    variants.add(`+${canonical}`);
  }

  return [...variants].filter(Boolean);
}

async function findCustomerDocByPhone(phone) {
  for (const variant of iraqiPhoneVariants(phone)) {
    const customerSnap = await db.collection("customers").where("phone", "==", variant).limit(1).get();
    if (!customerSnap.empty) return customerSnap.docs[0];

    const userSnap = await db.collection("users").where("phone", "==", variant).limit(1).get();
    if (!userSnap.empty) return userSnap.docs[0];
  }
  return null;
}

async function findStoreDocByPhone(phone) {
  for (const variant of iraqiPhoneVariants(phone)) {
    const storeSnap = await db.collection("stores").where("phone", "==", variant).limit(1).get();
    if (!storeSnap.empty) return storeSnap.docs[0];
  }
  return null;
}

function normalizeUsernameKey(username) {
  return String(username || "").trim().toLowerCase();
}

/** Check phone across registry + legacy collections. */
async function isPhoneBlockedOnServer(phone) {
  const phoneKey = canonicalIraqiPhone(normalizePhone(phone));
  if (!phoneKey) return false;
  const snap = await db.collection(BLOCKED_PHONES_COLLECTION).doc(phoneKey).get();
  return snap.exists && snap.data()?.blocked !== false;
}

async function registryEntityExists(entityType, entityId) {
  if (!entityId) return false;
  if (entityType === "customer") {
    const snap = await db.collection("customers").doc(entityId).get();
    return snap.exists;
  }
  if (entityType === "store") {
    const snap = await db.collection("stores").doc(entityId).get();
    return snap.exists;
  }
  return false;
}

/** Check phone across registry + legacy collections. */
async function resolvePhoneTaken(phone) {
  const phoneKey = canonicalIraqiPhone(normalizePhone(phone));
  if (!phoneKey) return { taken: false };

  if (await isPhoneBlockedOnServer(phone)) {
    return { taken: true, entityType: "blocked", blocked: true };
  }

  const regSnap = await db.collection(UNIQUE_PHONES_COLLECTION).doc(phoneKey).get();
  if (regSnap.exists) {
    const regData = regSnap.data() || {};
    const stillExists = await registryEntityExists(regData.entityType, regData.entityId);
    if (!stillExists) {
      await regSnap.ref.delete().catch(() => {});
    } else {
      return { taken: true, entityType: regData.entityType || "unknown", entityId: regData.entityId };
    }
  }

  const customerDoc = await findCustomerDocByPhone(phone);
  if (customerDoc) {
    return { taken: true, entityType: "customer", entityId: customerDoc.id };
  }

  const storeDoc = await findStoreDocByPhone(phone);
  if (storeDoc) {
    return { taken: true, entityType: "store", entityId: storeDoc.id };
  }

  return { taken: false };
}

/** Check username across registry + stores collection (case-insensitive). */
async function resolveUsernameTaken(username, exceptStoreId = "") {
  const usernameKey = normalizeUsernameKey(username);
  if (!usernameKey) return { taken: false };

  const regSnap = await db.collection(UNIQUE_USERNAMES_COLLECTION).doc(usernameKey).get();
  if (regSnap.exists) {
    const storeId = regSnap.data()?.storeId || "";
    if (!exceptStoreId || storeId !== exceptStoreId) {
      return { taken: true, storeId };
    }
  }

  const trimmed = String(username).trim();
  const storesSnap = await db.collection("stores").where("username", "==", trimmed).limit(1).get();
  if (!storesSnap.empty) {
    const storeId = storesSnap.docs[0].id;
    if (!exceptStoreId || storeId !== exceptStoreId) {
      return { taken: true, storeId };
    }
  }

  return { taken: false };
}

async function ensureStoreUniquenessOrDelete(storeId, data, storeRef) {
  const phone = data?.phone;
  const username = data?.username;
  if (!phone) return;

  const phoneKey = canonicalIraqiPhone(normalizePhone(phone));
  const usernameKey = username ? normalizeUsernameKey(username) : "";

  try {
    await db.runTransaction(async (tx) => {
      const phoneRef = db.collection(UNIQUE_PHONES_COLLECTION).doc(phoneKey);
      const phoneSnap = await tx.get(phoneRef);
      if (phoneSnap.exists && phoneSnap.data()?.entityId !== storeId) {
        throw new Error("DUPLICATE_PHONE");
      }

      if (usernameKey) {
        const usernameRef = db.collection(UNIQUE_USERNAMES_COLLECTION).doc(usernameKey);
        const usernameSnap = await tx.get(usernameRef);
        if (usernameSnap.exists && usernameSnap.data()?.storeId !== storeId) {
          throw new Error("DUPLICATE_USERNAME");
        }
        if (!usernameSnap.exists) {
          tx.set(usernameRef, {
            storeId,
            username: String(username).trim(),
            usernameKey,
            createdAt: FieldValue.serverTimestamp(),
          });
        }
      }

      if (!phoneSnap.exists) {
        tx.set(phoneRef, {
          entityType: "store",
          entityId: storeId,
          phone: phoneKey,
          phoneKey,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    });
  } catch (error) {
    if (error.message === "DUPLICATE_PHONE" || error.message === "DUPLICATE_USERNAME") {
      await storeRef.delete();
      console.error(`[onStoreCreated] Removed duplicate store ${storeId}: ${error.message}`);
    } else {
      throw error;
    }
  }
}

async function ensureCustomerUniquenessOrDelete(customerId, data, customerRef) {
  const phone = data?.phone;
  if (!phone) return;

  const phoneKey = canonicalIraqiPhone(normalizePhone(phone));

  try {
    await db.runTransaction(async (tx) => {
      const phoneRef = db.collection(UNIQUE_PHONES_COLLECTION).doc(phoneKey);
      const phoneSnap = await tx.get(phoneRef);
      if (phoneSnap.exists && phoneSnap.data()?.entityId !== customerId) {
        throw new Error("DUPLICATE_PHONE");
      }
      if (!phoneSnap.exists) {
        tx.set(phoneRef, {
          entityType: "customer",
          entityId: customerId,
          phone: phoneKey,
          phoneKey,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    });
  } catch (error) {
    if (error.message === "DUPLICATE_PHONE") {
      await customerRef.delete();
      console.error(`[onCustomerCreated] Removed duplicate customer ${customerId}`);
    } else {
      throw error;
    }
  }
}

async function syncPasswordSecret(entityType, entityId, password) {
  if (!password || typeof password !== "string") return;
  const passwordHash = hashPassword(password);
  await db.collection(AUTH_SECRETS_COLLECTION).doc(`${entityType}_${entityId}`).set({
    type: entityType,
    passwordHash,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const collectionName = entityType === "customer" ? "customers" : "stores";
  await db.collection(collectionName).doc(entityId).update({ password: FieldValue.delete() });
}

/** Hash plaintext passwords and move them to auth_secrets (server-only collection). */
exports.onCustomerPasswordSync = onDocumentWritten(
  { document: "customers/{customerId}", database: "default" },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;
    const password = after.data()?.password;
    const beforePassword = event.data?.before?.data()?.password;
    if (!password || password === beforePassword) return;
    try {
      await syncPasswordSecret("customer", event.params.customerId, password);
    } catch (error) {
      console.error("[onCustomerPasswordSync]", error.message);
    }
  },
);

exports.onStorePasswordSync = onDocumentWritten(
  { document: "stores/{storeId}", database: "default" },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;
    const password = after.data()?.password;
    const beforePassword = event.data?.before?.data()?.password;
    if (!password || password === beforePassword) return;
    try {
      await syncPasswordSecret("store", event.params.storeId, password);
    } catch (error) {
      console.error("[onStorePasswordSync]", error.message);
    }
  },
);

async function resolveAdminSponsoredOrder(order) {
  let isAdminSponsored = order?.discountSponsor === "ADMIN";
  if (!isAdminSponsored && order?.promoCode) {
    const promoSnap = await db.collection("promo_codes")
      .where("code", "==", order.promoCode)
      .limit(1)
      .get();
    if (!promoSnap.empty) {
      const promo = promoSnap.docs[0].data() || {};
      if (promo.source === "admin" || promo.source === "points") {
        isAdminSponsored = true;
      }
    }
  }
  return isAdminSponsored;
}

/** Apply loyalty points and merchant wallet credit when an order is delivered. */
exports.onOrderDelivered = onDocumentUpdated(
  { document: "orders/{orderId}", database: "default" },
  async (event) => {
    const after = event.data.after.data();
    if (!after) return;
    if (after.status !== "delivered") return;
    if (after.deliveryRewardsApplied) return;

    const orderId = event.params.orderId;
    const orderRef = db.collection("orders").doc(orderId);

    try {
      const loyalty = await getLoyaltySettings(db);
      const isAdminSponsored = await resolveAdminSponsoredOrder(after);
      const rewardMeta = {
        applied: false,
        customerId: null,
        totalPoints: 0,
      };

      await db.runTransaction(async (tx) => {
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists || orderSnap.data()?.status !== "delivered") return;
        if (orderSnap.data()?.deliveryRewardsApplied) return;

        const order = orderSnap.data();
        const customerId = order.customerId;
        const storeId = order.storeId;
        const custRef = customerId ? db.collection("customers").doc(customerId) : null;
        const custSnap = custRef ? await tx.get(custRef) : null;

        let totalPoints = 0;

        if (customerId && custSnap?.exists) {
          const customerData = custSnap.data() || {};
          const periodState = applyTierPeriodReset(customerData, loyalty);
          const oldOrdersCount = periodState.monthlyOrdersCount;
          const newOrdersCount = oldOrdersCount + 1;
          const purchaseTotal = getOrderPointsEligibleAmount(order);
          const orderPoints = calcOrderDeliveryPoints(purchaseTotal, loyalty);
          const oldTier = periodState.tier;
          const newTier = resolveTierFromOrders(newOrdersCount, loyalty.tiers);
          const tierBonus = calcTierBonus(oldTier, newTier, loyalty.tiers);
          totalPoints = orderPoints + tierBonus;

          tx.update(custRef, {
            points: FieldValue.increment(totalPoints),
            monthlyOrdersCount: newOrdersCount,
            tier: newTier,
            lastResetMonth: periodState.lastResetMonth,
          });
        }

        if (storeId && isAdminSponsored && Number(order.discountAmount) > 0) {
          tx.set(storeSecretsRef(storeId), {
            storeId,
            walletBalance: FieldValue.increment(Number(order.discountAmount)),
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        }

        tx.update(orderRef, {
          deliveryRewardsApplied: true,
          updatedAt: FieldValue.serverTimestamp(),
        });

        rewardMeta.applied = true;
        rewardMeta.customerId = customerId || null;
        rewardMeta.totalPoints = totalPoints;
      });

      if (rewardMeta.applied && rewardMeta.customerId && rewardMeta.totalPoints > 0) {
        await db.collection("notifications").add({
          userId: rewardMeta.customerId,
          role: "customer",
          type: "system",
          title: "🎁 تم شحن محفظة نقاطك!",
          message: buildOrderDeliveryRewardMessage(rewardMeta.totalPoints),
          targetId: orderId,
          read: false,
          sound: true,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("[onOrderDelivered]", error.message);
    }
  },
);

/**
 * Restore product inventory when an order is cancelled or rejected.
 * Inventory is only decremented in placeOrderSecure, so we must
 * mirror the restore here to avoid permanent ghost stock loss.
 */
exports.onOrderCancelled = onDocumentUpdated(
  { document: "orders/{orderId}", database: "default" },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!before || !after) return;

    const terminalStatuses = ["cancelled", "rejected"];
    const wasTerminal = terminalStatuses.includes(before.status);
    const isNowTerminal = terminalStatuses.includes(after.status);

    // Only act on the transition into a terminal state — not on re-updates.
    if (wasTerminal || !isNowTerminal) return;

    const items = after.items || [];
    if (!items.length) return;

    const orderId = event.params.orderId;
    try {
      await db.runTransaction(async (tx) => {
        // Re-read order inside the transaction to avoid stale snapshot races.
        const orderSnap = await tx.get(db.collection("orders").doc(orderId));
        if (!orderSnap.exists) return;
        const latestStatus = orderSnap.data()?.status;
        if (!terminalStatuses.includes(latestStatus)) return;

        for (const item of items) {
          const productId = item.productId;
          const qty = Number(item.quantity) || 0;
          if (!productId || qty <= 0) continue;

          const prodRef = db.collection("products").doc(productId);
          const prodSnap = await tx.get(prodRef);
          if (!prodSnap.exists) continue;

          const inventory = prodSnap.data()?.inventory;
          if (!hasTrackedProductInventory(inventory)) continue;

          tx.update(prodRef, { inventory: FieldValue.increment(qty) });
        }
      });
    } catch (err) {
      console.error("[onOrderCancelled] inventory restore failed:", err.message);
    }
  },
);

/** Customer login: verify password server-side; link authUid server-side. */
exports.verifyCustomerLogin = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const { phone, password } = request.data || {};
  if (!phone || !password) {
    throw new HttpsError("invalid-argument", "phone and password are required");
  }

  let docSnap = await findCustomerDocByPhone(phone);

  if (!docSnap) {
    return { success: false, error: "not_found" };
  }

  try {
    await assertLoginRateLimit(`customer:${docSnap.id}`);
  } catch {
    return { success: false, error: "rate_limited" };
  }

  const data = docSnap.data();
  const stored = await resolveStoredPassword("customer", docSnap.id, data);
  if (!checkPassword(password, stored)) {
    return { success: false, error: "wrong_password" };
  }

  if (!stored.isHash && data.password) {
    await migratePasswordToSecret("customer", docSnap.id, data.password);
  }

  await docSnap.ref.update({ authUid: request.auth.uid });

  return { success: true, customer: sanitizeCustomer({ ...data, authUid: request.auth.uid }, docSnap.id) };
});

/** Link customer doc to current Firebase Auth session (secure; replaces client-side authUid writes). */
async function linkCustomerAuthUidSecureHandler(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const { customerId, phone, password } = request.data || {};
  if (!customerId) {
    throw new HttpsError("invalid-argument", "customerId is required");
  }

  const customerRef = db.collection("customers").doc(String(customerId));
  const snap = await customerRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Customer not found");
  }

  const data = snap.data() || {};
  const existingAuthUid = data.authUid || "";

  if (existingAuthUid === request.auth.uid) {
    return {
      success: true,
      authUid: request.auth.uid,
      customer: sanitizeCustomer(data, snap.id),
    };
  }

  if (existingAuthUid && existingAuthUid !== request.auth.uid) {
    throw new HttpsError(
      "permission-denied",
      "Customer account linked to another session. Please log in again.",
    );
  }

  if (!phone || !password) {
    throw new HttpsError(
      "permission-denied",
      "Phone and password are required to link this customer session.",
    );
  }

  const phoneDoc = await findCustomerDocByPhone(phone);
  if (!phoneDoc || phoneDoc.id !== snap.id) {
    throw new HttpsError("permission-denied", "Invalid customer credentials");
  }

  const stored = await resolveStoredPassword("customer", snap.id, data);
  if (!checkPassword(password, stored)) {
    throw new HttpsError("permission-denied", "Invalid customer credentials");
  }

  if (!stored.isHash && data.password) {
    await migratePasswordToSecret("customer", snap.id, data.password);
  }

  await customerRef.update({ authUid: request.auth.uid });

  return {
    success: true,
    authUid: request.auth.uid,
    customer: sanitizeCustomer({ ...data, authUid: request.auth.uid }, snap.id),
  };
}

exports.linkCustomerAuthUidSecure = onCall({ cors: ALLOWED_CALLABLE_CORS }, linkCustomerAuthUidSecureHandler);

/** @deprecated Use linkCustomerAuthUidSecure — kept for existing clients. */
exports.syncCustomerAuthSession = onCall({ cors: ALLOWED_CALLABLE_CORS }, linkCustomerAuthUidSecureHandler);

/** Merchant login: verify password server-side; never return password hash/plaintext. */
exports.verifyMerchantLogin = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const { phone, username, password } = request.data || {};
  if (!password || (!phone && !username)) {
    throw new HttpsError("invalid-argument", "password and phone or username are required");
  }

  let docSnap = null;
  if (username) {
    const snap = await db.collection("stores").where("username", "==", String(username).trim()).limit(1).get();
    if (!snap.empty) docSnap = snap.docs[0];
  } else {
    for (const variant of iraqiPhoneVariants(phone)) {
      const snap = await db.collection("stores").where("phone", "==", variant).limit(1).get();
      if (!snap.empty) {
        docSnap = snap.docs[0];
        break;
      }
    }
  }

  if (!docSnap) {
    return { success: false, error: "not_found" };
  }

  try {
    await assertLoginRateLimit(`store:${docSnap.id}`);
  } catch {
    return { success: false, error: "rate_limited" };
  }

  const data = docSnap.data();
  const stored = await resolveStoredPassword("store", docSnap.id, data);
  if (!checkPassword(password, stored)) {
    return { success: false, error: "wrong_password" };
  }

  if (!stored.isHash && data.password) {
    await migratePasswordToSecret("store", docSnap.id, data.password);
  }

  // Bind store to this Firebase Auth session (Firestore ownerId + Storage custom claims).
  await docSnap.ref.update({ ownerId: request.auth.uid });
  await upsertStoreSecretsFields(docSnap.id, { ownerId: request.auth.uid });
  await setMerchantStorageClaims(request.auth.uid, docSnap.id);
  const linkedData = { ...data, ownerId: request.auth.uid };

  return { success: true, store: sanitizeStore(linkedData, docSnap.id) };
});

/** Link an unclaimed store (or same session) to the caller's Firebase Auth uid for Storage rules. */
exports.syncStoreOwnerSession = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const { storeId } = request.data || {};
  if (!storeId) {
    throw new HttpsError("invalid-argument", "storeId is required");
  }

  const storeRef = db.collection("stores").doc(String(storeId));
  const snap = await storeRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Store not found");
  }

  const existingOwner = snap.data()?.ownerId || "";
  if (existingOwner && existingOwner !== request.auth.uid) {
    throw new HttpsError(
      "permission-denied",
      "Store is linked to another session. Please log in again.",
    );
  }

  const isClaimingUnownedStore = !existingOwner;
  if (isClaimingUnownedStore && isAnonymousSignIn(request)) {
    throw new HttpsError(
      "permission-denied",
      "Full merchant authentication required before linking this store.",
    );
  }

  if (existingOwner !== request.auth.uid) {
    await storeRef.update({ ownerId: request.auth.uid });
    await upsertStoreSecretsFields(storeId, { ownerId: request.auth.uid });
  }

  await setMerchantStorageClaims(request.auth.uid, storeId);

  return { success: true, ownerId: request.auth.uid };
});

/** Set adminRole custom claim for Storage rules (named Firestore DB is not readable via cross-service rules). */
exports.syncAdminStorageSession = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const adminSnap = await db.collection("admins").doc(request.auth.uid).get();
  if (!adminSnap.exists) {
    throw new HttpsError("permission-denied", "Not an admin");
  }

  const data = adminSnap.data() || {};
  const role = data.role;
  if (!role) {
    throw new HttpsError("permission-denied", "Invalid admin role");
  }

  const isSuspended = data.status === "suspended" || data.isSuspended === true;
  if (isSuspended && role !== "owner") {
    throw new HttpsError("permission-denied", "Admin account suspended");
  }

  await getAuth().setCustomUserClaims(request.auth.uid, { adminRole: role });
  return { success: true, adminRole: role };
});

/** Reward reviewer with loyalty points (server-side only). */
exports.onStoreReviewCreated = onDocumentCreated(
  { document: "store_reviews/{reviewId}", database: "default" },
  async (event) => {
    const reviewId = event.params.reviewId;
    const data = event.data?.data();
    if (!data?.customerId) {
      console.warn("[onStoreReviewCreated] missing customerId for review", reviewId);
      return;
    }

    const customerId = String(data.customerId);
    const loyalty = await getLoyaltySettings(db);
    const rewardPoints = loyalty.storeReviewRewardPoints;

    try {
      await db.runTransaction(async (tx) => {
        const reviewRef = db.collection("store_reviews").doc(reviewId);
        const reviewSnap = await tx.get(reviewRef);
        if (!reviewSnap.exists) return;

        const reviewData = reviewSnap.data() || {};
        if (reviewData.pointsAwarded === true) return;

        const customerRef = db.collection("customers").doc(customerId);
        const customerSnap = await tx.get(customerRef);
        if (!customerSnap.exists) {
          console.warn("[onStoreReviewCreated] customer not found:", customerId);
          return;
        }

        tx.update(customerRef, {
          points: FieldValue.increment(rewardPoints),
        });
        tx.update(reviewRef, {
          pointsAwarded: true,
          pointsAwardedAmount: rewardPoints,
          pointsAwardedAt: FieldValue.serverTimestamp(),
        });
      });
    } catch (error) {
      console.error("[onStoreReviewCreated]", error?.message || error);
    }
  },
);

function addDurationToDate(base, value, unit) {
  const result = new Date(base);
  const n = Number(value) || 1;
  if (unit === "days") result.setDate(result.getDate() + n);
  else if (unit === "months") result.setMonth(result.getMonth() + n);
  else if (unit === "years") result.setFullYear(result.getFullYear() + n);
  return result;
}

function formatSubscriptionExpiryDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildAutoSubscriptionPatch(durationValue, durationUnit, baseDate = new Date()) {
  const expiryDate = addDurationToDate(baseDate, durationValue, durationUnit);
  const expiryStr = formatSubscriptionExpiryDate(expiryDate);
  return {
    subscriptionStatus: "active",
    subscriptionExpiry: expiryStr,
    subscriptionExpiryDate: expiryStr,
    subscriptionValidUntil: expiryDate.toISOString(),
    subscriptionId: "sub_auto",
    autoSubscriptionDuration: { value: Number(durationValue) || 1, unit: durationUnit },
  };
}

/** Keep stores_public in sync whenever a store document changes (C1). */
exports.onStoreWritten = onDocumentWritten(
  { document: "stores/{storeId}", database: "default" },
  async (event) => {
    const storeId = event.params.storeId;
    const after = event.data?.after;
    try {
      if (!after?.exists) {
        await db.collection(STORES_PUBLIC_COLLECTION).doc(storeId).delete().catch(() => {});
        return;
      }
      await syncStorePublicDocument(storeId, after.data());
    } catch (error) {
      console.error("[onStoreWritten] stores_public sync failed:", storeId, error?.message || error);
    }
  },
);

/** Auto-assign subscription + approve new merchants based on admin settings. */
exports.onStoreCreated = onDocumentCreated(
  { document: "stores/{storeId}", database: "default" },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    if (!data) return;
    if (data.is_virtual) return;
    if (String(event.params.storeId).startsWith("virtual-")) return;

    await ensureStoreUniquenessOrDelete(event.params.storeId, data, snap.ref);

    // Re-read in case duplicate store was deleted
    const freshSnap = await snap.ref.get();
    if (!freshSnap.exists) return;
    const freshData = freshSnap.data();

    try {
      const settingsSnap = await db.doc("settings/global").get();
      const settings = settingsSnap.data() || {};
      const patch = {};

      const autoApprove = settings.autoApproveStores !== false;
      if (autoApprove && freshData.status !== "active" && freshData.status !== "suspended") {
        patch.status = "active";
      }

      if (
        freshData.autoSubscriptionDisabled !== true
        && freshData.subscriptionStatus !== "active"
        && settings.autoSubscriptionEnabled === true
      ) {
        const durationValue = Number(settings.autoSubscriptionDurationValue) || 1;
        const durationUnit = settings.autoSubscriptionDurationUnit || "months";
        if (["days", "months", "years"].includes(durationUnit)) {
          Object.assign(patch, buildAutoSubscriptionPatch(durationValue, durationUnit));
        }
      }

      if (Object.keys(patch).length === 0) return;

      await snap.ref.update(patch);
      console.log(`[onStoreCreated] Applied to ${event.params.storeId}:`, patch);
    } catch (error) {
      console.error("[onStoreCreated]", error.message);
    }
  },
);

/** Customer lookup by phone — existence only (no PII leak).
 *  Rate-limited per caller UID to prevent bulk phone enumeration. */
exports.lookupCustomerByPhone = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const phone = request.data?.phone;
  if (!phone || typeof phone !== "string") {
    throw new HttpsError("invalid-argument", "phone is required");
  }

  // 20 lookups per 10 minutes per caller — enough for legitimate one-time checks
  // but prevents a loop that enumerates thousands of numbers.
  const rateLimitKey = `lookup_phone_${request.auth.uid}`;
  try {
    await assertOtpRateLimit(rateLimitKey, 10 * 60 * 1000, 20);
  } catch {
    throw new HttpsError("resource-exhausted", "Too many lookups. Please wait before trying again.");
  }

  for (const variant of iraqiPhoneVariants(phone)) {
    const snap = await db.collection("customers").where("phone", "==", variant).limit(1).get();
    if (!snap.empty) {
      return { exists: true };
    }
    const userSnap = await db.collection("users").where("phone", "==", variant).limit(1).get();
    if (!userSnap.empty) {
      return { exists: true };
    }
  }
  return { exists: false };
});

/** Check if a phone is available for signup (customer or merchant). */
exports.checkPhoneAvailable = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const phone = request.data?.phone;
  if (!phone || typeof phone !== "string") {
    throw new HttpsError("invalid-argument", "phone is required");
  }

  const result = await resolvePhoneTaken(phone);
  return {
    available: !result.taken,
    entityType: result.taken ? result.entityType : null,
    blocked: !!result.blocked,
  };
});

/** Check if a merchant username is available. */
exports.checkUsernameAvailable = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const username = request.data?.username;
  const exceptStoreId = request.data?.exceptStoreId || "";
  if (!username || typeof username !== "string") {
    throw new HttpsError("invalid-argument", "username is required");
  }

  const result = await resolveUsernameTaken(username, exceptStoreId);
  return { available: !result.taken };
});

/** Register uniqueness when a customer is created (safety net + backfill). */
exports.onCustomerCreated = onDocumentCreated(
  { document: "customers/{customerId}", database: "default" },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    const customerId = event.params.customerId;

    if (data?.phone) {
      await ensureCustomerUniquenessOrDelete(customerId, data, snap.ref);
    }

    if (!data?.customerNumber) {
      try {
        const counterRef = db.collection("counters").doc("customers");
        await db.runTransaction(async (tx) => {
          const custRef = snap.ref;
          const freshSnap = await tx.get(custRef);
          if (!freshSnap.exists || freshSnap.data()?.customerNumber) return;

          const counterSnap = await tx.get(counterRef);
          const last = counterSnap.exists ? Number(counterSnap.data()?.lastNumber || 0) : 0;
          const next = last + 1;

          tx.set(
            counterRef,
            { lastNumber: next, updatedAt: FieldValue.serverTimestamp() },
            { merge: true },
          );

          const patch = { customerNumber: next };
          if (!freshSnap.data()?.joinedAt) {
            patch.joinedAt = new Date().toISOString();
          }
          tx.update(custRef, patch);
        });
      } catch (error) {
        console.error("[onCustomerCreated] customerNumber:", error?.message || error);
      }
    }
  },
);

/** Admin dashboard: list all customers (Admin SDK + legacy users collection). */
exports.listDashboardCustomers = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  await assertDashboardPermission(request.auth.uid, request.auth.token, "customers");

  const byId = new Map();
  const customersSnap = await db.collection("customers").get();
  customersSnap.docs.forEach((docSnap) => {
    byId.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
  });

  try {
    const usersSnap = await db.collection("users").get();
    usersSnap.docs.forEach((docSnap) => {
      if (byId.has(docSnap.id)) return;
      const data = docSnap.data() || {};
      if (typeof data.phone === "string" || typeof data.name === "string") {
        byId.set(docSnap.id, { id: docSnap.id, ...data, _source: "users" });
      }
    });
  } catch {
    // users collection may not exist
  }

  return Array.from(byId.values()).map((customer) => {
    const { password, ...safe } = customer;
    return safe;
  });
});

/** Admin: share-reward audit for customer points investigation. */
exports.getCustomerShareRewardsAudit = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  await assertDashboardPermission(request.auth.uid, request.auth.token, "customers");

  const customerId = String(request.data?.customerId || "").trim();
  if (!customerId) {
    throw new HttpsError("invalid-argument", "customerId is required");
  }

  const loyalty = await getLoyaltySettings(db);
  const prefix = `${customerId}_`;
  const snap = await db.collection(SHARE_REWARDS_COLLECTION)
    .where(FieldPath.documentId(), ">=", prefix)
    .where(FieldPath.documentId(), "<=", `${prefix}\uf8ff`)
    .get();

  const days = snap.docs
    .map((docSnap) => {
      const data = docSnap.data() || {};
      const count = Number(data.count) || 0;
      const date = docSnap.id.slice(customerId.length + 1);
      return {
        date,
        count,
        points: count * (loyalty.shareRewardPoints || 0),
      };
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalPoints = days.reduce((sum, row) => sum + row.points, 0);
  return { days, totalPoints };
});

/** Reset customer password after OTP verification (server-side). */
exports.resetCustomerPasswordSecure = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const { phone, otpCode, newPassword } = request.data || {};
  if (!phone || !otpCode || !newPassword || String(newPassword).length < 8) {
    throw new HttpsError("invalid-argument", "phone, otpCode and newPassword (8+) are required");
  }

  const key = otpPhoneKey(phone);
  let tokenSnap = await db.collection(OTP_COLLECTION).doc(key).get();
  if (!tokenSnap.exists) {
    const fallbackSnap = await findOtpEntry(phone);
    if (fallbackSnap?.exists) {
      tokenSnap = fallbackSnap;
    }
  }
  if (!tokenSnap.exists) {
    throw new HttpsError("not-found", "OTP expired or not requested");
  }
  const tokenRef = tokenSnap.ref;
  const tokenData = tokenSnap.data() || {};
  if (tokenData.type !== "forgot" || String(tokenData.code) !== String(otpCode)) {
    throw new HttpsError("permission-denied", "Invalid OTP");
  }
  if (Date.now() > Number(tokenData.expiresAt || 0)) {
    throw new HttpsError("deadline-exceeded", "OTP expired");
  }

  const docSnap = await findCustomerDocByPhone(phone);
  if (!docSnap) {
    throw new HttpsError("not-found", "Customer not found");
  }

  const passwordHash = hashPassword(String(newPassword));
  await db.collection(AUTH_SECRETS_COLLECTION).doc(`customer_${docSnap.id}`).set({
    type: "customer",
    passwordHash,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await docSnap.ref.update({
    password: FieldValue.delete(),
    authUid: request.auth.uid,
  });
  await tokenRef.delete();

  return {
    success: true,
    customer: sanitizeCustomer({ ...docSnap.data(), authUid: request.auth.uid }, docSnap.id),
  };
});

/** Reset store password after OTP verification (server-side). */
exports.resetStorePasswordSecure = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const { phone, otpCode, newPassword } = request.data || {};
  if (!phone || !otpCode || !newPassword || String(newPassword).length < 8) {
    throw new HttpsError("invalid-argument", "phone, otpCode and newPassword (8+) are required");
  }

  const key = otpPhoneKey(phone);
  let tokenSnap = await db.collection(OTP_COLLECTION).doc(key).get();
  if (!tokenSnap.exists) {
    const fallbackSnap = await findOtpEntry(phone);
    if (fallbackSnap?.exists) {
      tokenSnap = fallbackSnap;
    }
  }
  if (!tokenSnap.exists) {
    throw new HttpsError("not-found", "OTP expired or not requested");
  }
  const tokenRef = tokenSnap.ref;
  const tokenData = tokenSnap.data() || {};
  if (tokenData.type !== "forgot" || String(tokenData.code) !== String(otpCode)) {
    throw new HttpsError("permission-denied", "Invalid OTP");
  }
  if (Date.now() > Number(tokenData.expiresAt || 0)) {
    throw new HttpsError("deadline-exceeded", "OTP expired");
  }

  const docSnap = await findStoreDocByPhone(phone);
  if (!docSnap) {
    throw new HttpsError("not-found", "Store not found");
  }

  const passwordHash = hashPassword(String(newPassword));
  await db.collection(AUTH_SECRETS_COLLECTION).doc(`store_${docSnap.id}`).set({
    type: "store",
    passwordHash,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await docSnap.ref.update({
    password: FieldValue.delete(),
    authUid: request.auth.uid,
  });
  await tokenRef.delete();

  return { success: true, storeId: docSnap.id };
});

function sanitizePromoForClient(data, id) {
  return {
    id: id || data.id,
    code: data.code,
    discountType: data.discountType,
    discountValue: data.discountValue,
    discountAmount: data.discountAmount,
    amount: data.amount,
    storeId: data.storeId,
    sponsor: data.sponsor,
    source: data.source,
    status: data.status,
    expirationDate: data.expirationDate,
    expiresAt: data.expiresAt,
    createdAt: data.createdAt,
    ownerCustomerId: data.ownerCustomerId,
    merchantId: data.merchantId,
    objectId: data.objectId,
    targetAudience: data.targetAudience,
    usedCount: data.usedCount ?? 0,
    currentGlobalUses: data.currentGlobalUses ?? data.usedCount ?? 0,
    maxUses: data.maxUses ?? 0,
    maxGlobalUses: data.maxGlobalUses ?? data.maxUses ?? 0,
    maxUsesPerUser: data.maxUsesPerUser ?? 0,
  };
}

function promoListingStillValid(data, nowMs) {
  if (data.status && data.status !== "active") return false;
  const expiry = data.expirationDate || data.expiresAt;
  if (expiry && new Date(expiry).getTime() < nowMs) return false;
  const currentUses = data.currentGlobalUses ?? data.usedCount ?? 0;
  const maxUses = data.maxGlobalUses ?? data.maxUses ?? 0;
  if (maxUses > 0 && currentUses >= maxUses) return false;
  return true;
}

function merchantPromoVisibleToCustomer(data, followedSet, pastBuyerSet) {
  if (data.ownerCustomerId) return false;
  const storeId = data.merchantId || data.storeId;
  if (!storeId || storeId === "ALL_STORES") return false;
  const audience = data.targetAudience || "ALL";
  if (audience === "ALL") return true;
  const isFollower = followedSet.has(storeId);
  const isPastBuyer = pastBuyerSet.has(storeId);
  if (audience === "FOLLOWERS") return isFollower;
  if (audience === "PAST_BUYERS") return isPastBuyer;
  if (audience === "FOLLOWERS_AND_PAST_BUYERS") return isFollower || isPastBuyer;
  return true;
}

function promoErrorMessageAr(code) {
  const map = {
    "Invalid promo code": "الكود غير صحيح أو منتهي الصلاحية ❌",
    "Promo code inactive": "الكود غير نشط ❌",
    "Promo code expired": "الكود منتهي الصلاحية ❌",
    "Promo code not started": "هذا الكود لم يبدأ بعد ⏳",
    "Promo code exhausted": "الكود منتهي — تم استنفاد عدد الاستخدامات ❌",
    "Promo maxUsesPerUser exceeded": "لقد استخدمت هذا الكود الحد الأقصى المسموح ❌",
    "Promo not valid for this store": "هذا الكود غير مخصص لمتاجر سلتك الحالية ❌",
    "Promo not valid for province": "هذا الكود غير متاح في محافظتك ❌",
    "Promo audience restriction": "عذراً، هذا الكود مخصص لشريحة محددة من زبائن المتجر ❌",
  };
  return map[code] || code;
}

async function validatePromoAudience(promo, customerId) {
  const audience = promo.targetAudience || "ALL";
  if (audience === "ALL" || promo.sponsor !== "MERCHANT" || !promo.merchantId || !customerId) {
    return;
  }

  const customerSnap = await db.collection("customers").doc(customerId).get();
  const customer = customerSnap.exists ? customerSnap.data() || {} : {};
  const isFollower = (customer.followedStores || []).includes(promo.merchantId);

  const ordersSnap = await db.collection("orders")
    .where("customerId", "==", customerId)
    .where("storeId", "==", promo.merchantId)
    .where("status", "==", "delivered")
    .limit(1)
    .get();
  const isPastBuyer = !ordersSnap.empty;

  let valid = true;
  if (audience === "FOLLOWERS") valid = isFollower;
  else if (audience === "PAST_BUYERS") valid = isPastBuyer;
  else if (audience === "FOLLOWERS_AND_PAST_BUYERS") valid = isFollower || isPastBuyer;

  if (!valid) {
    throw new HttpsError("failed-precondition", "Promo audience restriction");
  }
}

async function resolveValidatedPromoForCart({
  promoCode,
  storeIds,
  customerId,
  customerProvince,
  subtotal,
}) {
  const ids = Array.isArray(storeIds) ? storeIds.filter(Boolean) : [];
  if (ids.length === 0) {
    throw new HttpsError("invalid-argument", "No stores in cart");
  }

  let lastError = null;
  for (const storeId of ids) {
    try {
      return await resolveValidatedPromoDiscount({
        promoCode,
        storeId,
        customerId,
        customerProvince,
        subtotal,
      });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new HttpsError("invalid-argument", "Invalid promo code");
}

/** Validate promo code server-side for cart apply (customers cannot read promo_codes). */
exports.validatePromoCode = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const { code, customerId, storeIdsInCart, customerProvince, subtotal } = request.data || {};
  if (!code || !customerId) {
    throw new HttpsError("invalid-argument", "code and customerId are required");
  }
  if (!(await customerAuthOwnsId(customerId, request.auth.uid))) {
    throw new HttpsError("permission-denied", "Cannot validate promo for this customer");
  }

  try {
    const { discount, promoRef } = await resolveValidatedPromoForCart({
      promoCode: code,
      storeIds: storeIdsInCart,
      customerId,
      customerProvince,
      subtotal: Number(subtotal) || 0,
    });
    return {
      valid: true,
      code: normalizePromoCode(code),
      discount,
      id: promoRef.id,
    };
  } catch (err) {
    if (err instanceof HttpsError) {
      return { valid: false, message: promoErrorMessageAr(err.message) };
    }
    throw err;
  }
});

/** List wallet/gift promos visible to a customer without exposing the full collection. */
exports.listCustomerWalletPromos = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const { customerId } = request.data || {};
  if (!customerId) {
    throw new HttpsError("invalid-argument", "customerId is required");
  }
  if (!(await customerAuthOwnsId(customerId, request.auth.uid))) {
    throw new HttpsError("permission-denied", "Cannot list promos for this customer");
  }

  const customerSnap = await db.collection("customers").doc(customerId).get();
  if (!customerSnap.exists) {
    throw new HttpsError("not-found", "Customer not found");
  }
  const customer = customerSnap.data() || {};
  const followedStores = Array.isArray(customer.followedStores) ? customer.followedStores : [];
  const storeNotifications = Array.isArray(customer.storeNotifications) ? customer.storeNotifications : [];
  const followedSet = new Set([...followedStores, ...storeNotifications]);
  const pastBuyerSet = new Set();
  const promosById = new Map();
  const now = Date.now();

  const deliveredOrdersSnap = await db.collection("orders")
    .where("customerId", "==", customerId)
    .where("status", "==", "delivered")
    .limit(200)
    .get();
  deliveredOrdersSnap.docs.forEach((docSnap) => {
    const sid = docSnap.data()?.storeId;
    if (sid) pastBuyerSet.add(sid);
  });

  const pointSnap = await db.collection("promo_codes")
    .where("ownerCustomerId", "==", customerId)
    .where("source", "==", "points")
    .where("status", "==", "active")
    .get();
  pointSnap.docs.forEach((docSnap) => {
    const data = docSnap.data() || {};
    if (!promoListingStillValid(data, now)) return;
    promosById.set(docSnap.id, sanitizePromoForClient(data, docSnap.id));
  });

  const storeIds = [...followedSet].slice(0, 30);
  for (const storeId of storeIds) {
    const snap = await db.collection("promo_codes")
      .where("storeId", "==", storeId)
      .where("status", "==", "active")
      .limit(30)
      .get();
    snap.docs.forEach((docSnap) => {
      const data = docSnap.data() || {};
      if (data.source === "points") return;
      if (!promoListingStillValid(data, now)) return;
      if (data.sponsor === "MERCHANT" && !merchantPromoVisibleToCustomer(data, followedSet, pastBuyerSet)) return;
      promosById.set(docSnap.id, sanitizePromoForClient(data, docSnap.id));
    });
  }

  const merchantSnap = await db.collection("promo_codes")
    .where("source", "==", "merchant")
    .where("status", "==", "active")
    .limit(100)
    .get();
  merchantSnap.docs.forEach((docSnap) => {
    const data = docSnap.data() || {};
    if (!promoListingStillValid(data, now)) return;
    if (!merchantPromoVisibleToCustomer(data, followedSet, pastBuyerSet)) return;
    promosById.set(docSnap.id, sanitizePromoForClient(data, docSnap.id));
  });

  const adminSnap = await db.collection("promo_codes")
    .where("storeId", "==", "ALL_STORES")
    .where("status", "==", "active")
    .limit(30)
    .get();
  adminSnap.docs.forEach((docSnap) => {
    promosById.set(docSnap.id, sanitizePromoForClient(docSnap.data(), docSnap.id));
  });

  return { promos: Array.from(promosById.values()) };
});

const SHARE_REWARDS_COLLECTION = "share_rewards";

/** Award loyalty points server-side with rate limits. */
exports.awardCustomerPoints = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const loyalty = await getLoyaltySettings(db);
  const { customerId, points, reason } = request.data || {};
  const pts = Number(points);
  if (!customerId || !Number.isFinite(pts) || pts <= 0 || pts > loyalty.shareRewardPoints * 2) {
    throw new HttpsError("invalid-argument", "Invalid points payload");
  }
  if (!(await customerAuthOwnsId(customerId, request.auth.uid))) {
    throw new HttpsError("permission-denied", "Cannot award points for this customer");
  }

  const rewardReason = typeof reason === "string" ? reason : "share";
  if (rewardReason !== "share") {
    throw new HttpsError(
      "invalid-argument",
      "Only share rewards can be requested from the client",
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const rewardRef = db.collection(SHARE_REWARDS_COLLECTION).doc(`${customerId}_${today}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(rewardRef);
    const count = snap.exists ? Number(snap.data()?.count || 0) : 0;
    if (count >= loyalty.shareDailyLimit) {
      throw new HttpsError("resource-exhausted", "Daily share reward limit reached");
    }
    tx.set(rewardRef, { count: count + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.update(db.collection("customers").doc(customerId), {
      points: FieldValue.increment(loyalty.shareRewardPoints),
    });
  });
  return { pointsAwarded: loyalty.shareRewardPoints };
});

/** Convert loyalty points to promo code (server-side transaction). */
exports.convertPointsToPromoSecure = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const { customerId, pointsRequired } = request.data || {};
  const required = Number(pointsRequired);
  const loyalty = await getLoyaltySettings(db);
  if (!customerId || !Number.isFinite(required) || !isValidRedemptionPoints(required, loyalty)) {
    throw new HttpsError("invalid-argument", "Invalid conversion request");
  }
  if (!(await customerAuthOwnsId(customerId, request.auth.uid))) {
    throw new HttpsError("permission-denied", "Cannot convert points for this customer");
  }

  const discount = calcRedemptionDiscount(required, loyalty);
  const newCode = `LP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const promoId = `promo_${Date.now()}`;
  const customerRef = db.collection("customers").doc(customerId);
  const promoRef = db.collection("promo_codes").doc(promoId);

  await db.runTransaction(async (tx) => {
    const custSnap = await tx.get(customerRef);
    if (!custSnap.exists) throw new HttpsError("not-found", "Customer not found");
    const custData = custSnap.data() || {};
    const currentPoints = Number(custData.points || 0);
    if (currentPoints < required) {
      throw new HttpsError("failed-precondition", "Insufficient points");
    }

    const lastRedeemAt = custData.lastPointsRedemptionAt;
    if (lastRedeemAt) {
      const lastMs = typeof lastRedeemAt.toMillis === "function"
        ? lastRedeemAt.toMillis()
        : new Date(lastRedeemAt).getTime();
      if (Number.isFinite(lastMs) && Date.now() - lastMs < 4000) {
        throw new HttpsError("failed-precondition", "Redemption already in progress");
      }
    }

    tx.update(customerRef, {
      points: FieldValue.increment(-required),
      lastPointsRedemptionAt: FieldValue.serverTimestamp(),
    });
    tx.set(promoRef, {
      id: promoId,
      storeId: "ALL_STORES",
      code: newCode,
      discountType: "amount",
      discountValue: discount,
      amount: discount,
      maxUses: 1,
      usedCount: 0,
      status: "active",
      source: "points",
      ownerCustomerId: customerId,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { success: true, code: newCode, discount };
});

function productFinalPrice(product) {
  const storedFinal = Number(product.finalPrice);
  if (Number.isFinite(storedFinal) && storedFinal >= 0) {
    return storedFinal;
  }
  const price = Number(product.price) || 0;
  const discountValue = Number(product.discountValue) || 0;
  if (product.discountType === "percent") {
    return Math.max(0, price - (price * discountValue) / 100);
  }
  return Math.max(0, price - discountValue);
}

function normalizePromoCode(code) {
  return String(code || "").trim().toUpperCase().replace(/\s+/g, "");
}

function calculatePromoDiscountAmount(promo, subtotal) {
  const discountType = String(promo.discountType || "").toLowerCase();
  const isPercent = discountType === "percent" || discountType === "percentage";
  const value = Number(
    isPercent
      ? promo.discountValue
      : (promo.discountAmount ?? promo.amount ?? promo.discountValue),
  ) || 0;
  if (isPercent) {
    return (subtotal * value) / 100;
  }
  return value;
}

function getStoreDeliveryPrice(store, customerProvince) {
  const province = customerProvince || "بغداد";
  const storeProvince = store.province || "بغداد";

  if (store.isFreeDelivery) {
    return 0;
  }

  const provinceFreeDelivery = store.provinceFreeDelivery || {};
  if (provinceFreeDelivery[province] !== undefined) {
    if (provinceFreeDelivery[province]) return 0;
  } else if (province === storeProvince) {
    if (store.localProvinceFreeDelivery) return 0;
  } else if (store.otherProvincesFreeDelivery) {
    return 0;
  }

  let price = Number(store.deliveryPrice) || 0;
  const provinceDeliveryPrices = store.provinceDeliveryPrices || {};
  if (provinceDeliveryPrices[province] !== undefined) {
    price = Number(provinceDeliveryPrices[province]);
  } else if (province === storeProvince && store.localProvinceDeliveryPrice !== undefined) {
    price = Number(store.localProvinceDeliveryPrice);
  } else if (province !== storeProvince && store.otherProvincesDeliveryPrice !== undefined) {
    price = Number(store.otherProvincesDeliveryPrice);
  }

  return Math.max(0, price);
}

async function resolveValidatedPromoDiscount({
  promoCode,
  storeId,
  customerId,
  customerProvince,
  subtotal,
}) {
  if (!promoCode) {
    return { discount: 0, promoRef: null };
  }

  const normalized = normalizePromoCode(promoCode);
  const promoSnap = await db.collection("promo_codes")
    .where("code", "==", normalized)
    .limit(1)
    .get();
  if (promoSnap.empty) {
    throw new HttpsError("invalid-argument", "Invalid promo code");
  }

  const promoDoc = promoSnap.docs[0];
  const promo = promoDoc.data() || {};

  if (promo.status && promo.status !== "active") {
    throw new HttpsError("failed-precondition", "Promo code inactive");
  }

  const expDateStr = promo.expirationDate || promo.expiresAt;
  if (expDateStr && Date.now() > new Date(expDateStr).getTime()) {
    throw new HttpsError("failed-precondition", "Promo code expired");
  }

  if (promo.startDate && new Date(promo.startDate) > new Date()) {
    throw new HttpsError("failed-precondition", "Promo code not started");
  }

  const currentGlobalUses = promo.currentGlobalUses ?? promo.usedCount ?? 0;
  const maxGlobalUses = promo.maxGlobalUses ?? promo.maxUses ?? 0;
  if (maxGlobalUses > 0 && currentGlobalUses >= maxGlobalUses) {
    throw new HttpsError("failed-precondition", "Promo code exhausted");
  }

  if (promo.maxUsesPerUser && customerId) {
    // Query by both customerId AND promoCode directly in Firestore to avoid
    // the old limit(100) approach that missed usage beyond the first 100 orders.
    const priorUsesSnap = await db.collection("orders")
      .where("customerId", "==", customerId)
      .where("promoCode", "==", normalized)
      .get();
    const priorUses = priorUsesSnap.docs.filter((docSnap) => {
      const status = (docSnap.data() || {}).status;
      return status !== "cancelled" && status !== "rejected";
    }).length;
    if (priorUses >= promo.maxUsesPerUser) {
      throw new HttpsError("failed-precondition", "Promo maxUsesPerUser exceeded");
    }
  }

  if (
    promo.storeId &&
    promo.storeId !== "ALL_STORES" &&
    promo.storeId !== storeId &&
    promo.source !== "points"
  ) {
    throw new HttpsError("failed-precondition", "Promo not valid for this store");
  }

  if (
    promo.targetStores &&
    promo.targetStores !== "ALL" &&
    Array.isArray(promo.targetStores) &&
    promo.targetStores.length > 0 &&
    !promo.targetStores.includes(storeId)
  ) {
    throw new HttpsError("failed-precondition", "Promo not valid for this store");
  }

  if (
    promo.targetProvinces?.length &&
    customerProvince &&
    !promo.targetProvinces.includes(customerProvince)
  ) {
    throw new HttpsError("failed-precondition", "Promo not valid for province");
  }

  if (customerId) {
    await validatePromoAudience(promo, customerId);
  }

  const rawDiscount = calculatePromoDiscountAmount(promo, subtotal);
  const discount = Math.min(subtotal, Math.max(0, rawDiscount));
  return { discount, promoRef: promoDoc.ref };
}

function hasTrackedProductInventory(inventory) {
  return typeof inventory === "number" && Number.isFinite(inventory);
}

/** Place order with server-side price validation. */
exports.placeOrderSecure = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const payload = request.data || {};
  const {
    storeId,
    storeName,
    customerId,
    customerName,
    customerPhone,
    customerAddress,
    customerProvince,
    customerLat,
    customerLng,
    items,
    promoCode,
  } = payload;

  if (!storeId || !customerId || !Array.isArray(items) || items.length === 0) {
    throw new HttpsError("invalid-argument", "Invalid order payload");
  }
  if (!(await customerAuthOwnsId(customerId, request.auth.uid))) {
    throw new HttpsError("permission-denied", "Cannot place order for this customer");
  }

  const storeSnap = await db.collection("stores").doc(storeId).get();
  if (!storeSnap.exists || storeSnap.data()?.isBanned) {
    throw new HttpsError("failed-precondition", "Store unavailable");
  }

  const customerSnap = await db.collection("customers").doc(customerId).get();
  if (!customerSnap.exists) {
    throw new HttpsError("not-found", "Customer not found");
  }
  const customerData = customerSnap.data() || {};
  if (customerData.isBlocked) {
    throw new HttpsError("permission-denied", "Customer account is blocked");
  }
  const storeBlockedList = Array.isArray(storeSnap.data()?.blockedCustomerIds)
    ? storeSnap.data().blockedCustomerIds
    : [];
  if (storeBlockedList.includes(customerId)) {
    throw new HttpsError("permission-denied", "You are blocked from this store");
  }

  // Batch-fetch all products in a single round-trip instead of N sequential reads.
  const productIds = items.map(item => item.productId || item.id).filter(Boolean);
  if (productIds.length === 0) {
    throw new HttpsError("invalid-argument", "No valid products in order");
  }
  const productSnaps = await Promise.all(
    productIds.map(id => db.collection("products").doc(id).get())
  );
  const productSnapMap = new Map(productSnaps.map(s => [s.id, s]));

  let subtotal = 0;
  const normalizedItems = [];
  for (const item of items) {
    const productId = item.productId || item.id;
    if (!productId) continue;
    const prodSnap = productSnapMap.get(productId);
    if (!prodSnap || !prodSnap.exists || prodSnap.data()?.storeId !== storeId) {
      throw new HttpsError("failed-precondition", "Invalid product in order");
    }
    const prod = prodSnap.data();
    const productStatus = String(prod.status || "published").toLowerCase();
    if (productStatus === "draft" || productStatus === "archived") {
      throw new HttpsError("failed-precondition", "Product not available");
    }
    const qty = Math.max(1, Number(item.quantity) || 1);
    const unitPrice = productFinalPrice(prod);
    subtotal += unitPrice * qty;
    normalizedItems.push({
      productId,
      productName: item.productName || prod.name,
      price: unitPrice,
      quantity: qty,
      image: item.image || prod.image || "",
    });
    if (hasTrackedProductInventory(prod.inventory) && prod.inventory < qty) {
      throw new HttpsError("failed-precondition", "Insufficient inventory");
    }
  }

  if (normalizedItems.length === 0) {
    throw new HttpsError("invalid-argument", "No valid products in order");
  }

  const storeData = storeSnap.data() || {};
  const delivery = getStoreDeliveryPrice(storeData, customerProvince);
  const { discount, promoRef } = await resolveValidatedPromoDiscount({
    promoCode,
    storeId,
    customerId,
    customerProvince,
    subtotal,
  });
  const total = Math.max(0, subtotal + delivery - discount);
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const orderCounterRef = db.collection("counters").doc("orders");

  // One-time (or migration from per-store): seed a GLOBAL order counter and
  // backfill orderNumber across ALL stores so numbers stay platform-wide.
  const counterSnap = await orderCounterRef.get();
  const counterData = counterSnap.exists ? counterSnap.data() || {} : {};
  if (counterData.version !== "global-v1") {
    const existingOrders = await db.collection("orders").get();
    const orderMillis = (d) => {
      const t = d.data()?.createdAt;
      if (t && typeof t.toMillis === "function") return t.toMillis();
      if (t && typeof t.seconds === "number") return t.seconds * 1000;
      if (t) return new Date(t).getTime() || 0;
      return 0;
    };
    const sorted = [...existingOrders.docs].sort((a, b) => {
      const diff = orderMillis(a) - orderMillis(b);
      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    });
    const CHUNK = 400;
    for (let i = 0; i < sorted.length; i += CHUNK) {
      const batch = db.batch();
      const slice = sorted.slice(i, i + CHUNK);
      slice.forEach((d, localIdx) => {
        batch.update(d.ref, { orderNumber: i + localIdx + 1 });
      });
      await batch.commit();
    }
    await orderCounterRef.set(
      {
        lastNumber: sorted.length,
        version: "global-v1",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await db.runTransaction(async (tx) => {
    // ── Phase 1: ALL reads first (Firestore Admin SDK requires reads before writes) ──

    const storeRef = db.collection("stores").doc(storeId);
    const storeTxnSnap = await tx.get(storeRef);
    if (!storeTxnSnap.exists) {
      throw new HttpsError("failed-precondition", "Store unavailable");
    }

    const orderCounterTxnSnap = await tx.get(orderCounterRef);

    // Re-read the promo to prevent race conditions on usage limits.
    let promoData = null;
    if (promoRef) {
      const promoSnap = await tx.get(promoRef);
      if (!promoSnap.exists) {
        throw new HttpsError("failed-precondition", "Promo code no longer valid");
      }
      promoData = promoSnap.data() || {};
    }

    // Re-read all product inventory docs in a single parallel batch.
    const prodRefs = normalizedItems.map(item => db.collection("products").doc(item.productId));
    const prodSnaps = await Promise.all(prodRefs.map(ref => tx.get(ref)));

    // ── Phase 2: Validate (no Firestore I/O, pure logic) ──

    if (promoData) {
      const currentUses = promoData.currentGlobalUses ?? promoData.usedCount ?? 0;
      const maxUses = promoData.maxGlobalUses ?? promoData.maxUses ?? 0;
      if (maxUses > 0 && currentUses >= maxUses) {
        throw new HttpsError("failed-precondition", "Promo code exhausted");
      }
      if (promoData.status && promoData.status !== "active") {
        throw new HttpsError("failed-precondition", "Promo code no longer active");
      }
    }

    const inventoryUpdates = [];
    for (let i = 0; i < normalizedItems.length; i++) {
      const item = normalizedItems[i];
      const rawInventory = prodSnaps[i].data()?.inventory;
      if (hasTrackedProductInventory(rawInventory)) {
        if (rawInventory < item.quantity) {
          throw new HttpsError("failed-precondition", "Insufficient inventory");
        }
        inventoryUpdates.push({ ref: prodRefs[i], qty: item.quantity });
      }
    }

    const storeTxnData = storeTxnSnap.data() || {};
    const nextOrderNumber = Math.max(
      1,
      (Number(orderCounterTxnSnap.exists ? orderCounterTxnSnap.data()?.lastNumber : 0) || 0) + 1,
    );

    // ── Phase 3: ALL writes (no more reads after this point) ──

    if (promoRef && promoData) {
      const newUsedCount = (promoData.currentGlobalUses ?? promoData.usedCount ?? 0) + 1;
      const maxUses = promoData.maxGlobalUses ?? promoData.maxUses ?? 0;
      const isExhausted = maxUses > 0 && newUsedCount >= maxUses;
      tx.update(promoRef, {
        usedCount: FieldValue.increment(1),
        currentGlobalUses: FieldValue.increment(1),
        ...(isExhausted ? { status: "used" } : {}),
      });
    }

    for (const { ref, qty } of inventoryUpdates) {
      tx.update(ref, { inventory: FieldValue.increment(-qty) });
    }

    const discountSponsor = promoData
      ? (promoData.sponsor === "MERCHANT" ? "MERCHANT" : "ADMIN")
      : null;

    tx.set(
      orderCounterRef,
      {
        lastNumber: nextOrderNumber,
        version: "global-v1",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    tx.set(db.collection("orders").doc(orderId), {
      id: orderId,
      storeId,
      storeName: storeName || storeTxnData.shopName || "",
      customerId,
      customerName: customerName || "",
      customerPhone: customerPhone || "",
      customerAddress: customerAddress || "",
      customerProvince: customerProvince || "",
      customerLat: customerLat ?? null,
      customerLng: customerLng ?? null,
      items: normalizedItems,
      subtotal,
      deliveryPrice: delivery,
      discountAmount: discount,
      discountSponsor,
      total,
      promoCode: promoCode || null,
      status: "pending",
      orderNumber: nextOrderNumber,
      createdAt: FieldValue.serverTimestamp(),
      // Hold from merchant for 30s so the customer can cancel before the store is notified.
      customerGraceUntil: Timestamp.fromMillis(Date.now() + 30000),
      merchantNotified: false,
    });
  });

  // Merchant notification is deferred to onOrderCreatedNotifyMerchantAfterGrace.

  return { orderId, total, subtotal };
});

/**
 * After the customer 30s cancel window, reveal the order to the merchant and send notification.
 * If the customer cancelled during the window, do nothing.
 */
exports.onOrderCreatedNotifyMerchantAfterGrace = onDocumentCreated(
  { document: "orders/{orderId}", database: "default", timeoutSeconds: 70 },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data() || {};
    // Only grace-period orders; legacy orders without the flag are ignored here
    // (they already used immediate notify in older placeOrderSecure).
    if (data.merchantNotified !== false) return;

    let waitMs = 30000;
    const graceUntil = data.customerGraceUntil;
    if (graceUntil && typeof graceUntil.toMillis === "function") {
      waitMs = Math.max(0, graceUntil.toMillis() - Date.now());
    }
    waitMs = Math.min(waitMs, 60000);

    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    const orderRef = snap.ref;
    const fresh = await orderRef.get();
    if (!fresh.exists) return;

    const latest = fresh.data() || {};
    if (latest.status !== "pending") return;
    if (latest.merchantNotified === true) return;

    await orderRef.update({
      merchantNotified: true,
      merchantNotifiedAt: FieldValue.serverTimestamp(),
    });

    const orderLabel =
      latest.orderNumber != null ? `#${latest.orderNumber}` : fresh.id;
    await db.collection("notifications").add({
      userId: latest.storeId,
      role: "merchant",
      type: "order",
      title: "طلب جديد",
      message: `لديك طلب جديد برقم ${orderLabel} من ${latest.customerName || "زبون"}`,
      targetId: fresh.id,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  },
);

function serializeAudienceTimestamp(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.toDate === "function") {
    try {
      return value.toDate().toISOString();
    } catch {
      return "";
    }
  }
  return String(value);
}

function sanitizeStoreAudienceCustomer(docSnap, storeBlockedIds = []) {
  const data = docSnap.data() || {};
  const { password: _password, authUid: _authUid, ...safe } = data;
  const id = docSnap.id;
  return {
    id,
    name: safe.name || "",
    phone: safe.phone || "",
    province: safe.province || "",
    tier: safe.tier || "Silver",
    followedStores: Array.isArray(safe.followedStores) ? safe.followedStores : [],
    storeNotifications: Array.isArray(safe.storeNotifications) ? safe.storeNotifications : [],
    points: Number(safe.points) || 0,
    /** Store-scoped block (merchant audience UI) */
    isBlocked: storeBlockedIds.includes(id),
    platformBlocked: Boolean(safe.isBlocked),
    joinedAt: serializeAudienceTimestamp(safe.joinedAt || safe.createdAt),
  };
}

async function syncStoreAudienceMember(storeId, customerId, customerData) {
  const followed = (customerData.followedStores || []).includes(storeId);
  const notifications = (customerData.storeNotifications || []).includes(storeId);
  const blocked = Boolean(customerData.isBlocked) || Boolean(customerData.blocked);
  const ref = db.collection("store_audience").doc(storeId).collection("members").doc(customerId);
  if (followed || notifications || blocked) {
    await ref.set(
      {
        customerId,
        name: customerData.name || "",
        phone: customerData.phone || "",
        province: customerData.province || "",
        tier: customerData.tier || "Silver",
        followed,
        notifications,
        blocked,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } else {
    try {
      await ref.delete();
    } catch {
      // ignore missing doc
    }
  }
}

/** Customer toggles follow / store notifications (server-side, updates audience mirror). */
exports.toggleStoreEngagement = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const { customerId, storeId, action } = request.data || {};
  const validActions = new Set(["follow", "unfollow", "notify_on", "notify_off"]);
  if (!customerId || !storeId || !validActions.has(action)) {
    throw new HttpsError("invalid-argument", "customerId, storeId and valid action are required");
  }
  if (!(await customerAuthOwnsId(customerId, request.auth.uid))) {
    throw new HttpsError("permission-denied", "Cannot update engagement for this customer");
  }

  const storeSnap = await db.collection("stores").doc(storeId).get();
  if (!storeSnap.exists) {
    throw new HttpsError("not-found", "Store not found");
  }

  const customerRef = db.collection("customers").doc(customerId);
  const customerSnap = await customerRef.get();
  if (!customerSnap.exists) {
    throw new HttpsError("not-found", "Customer not found");
  }

  const customerData = customerSnap.data() || {};
  let followedStores = [...(customerData.followedStores || [])];
  let storeNotifications = [...(customerData.storeNotifications || [])];
  const wasFollowing = followedStores.includes(storeId);

  switch (action) {
    case "follow":
      if (!followedStores.includes(storeId)) followedStores.push(storeId);
      break;
    case "unfollow":
      followedStores = followedStores.filter((id) => id !== storeId);
      break;
    case "notify_on":
      if (!storeNotifications.includes(storeId)) storeNotifications.push(storeId);
      break;
    case "notify_off":
      storeNotifications = storeNotifications.filter((id) => id !== storeId);
      break;
    default:
      break;
  }

  await customerRef.update({ followedStores, storeNotifications });
  const updatedCustomer = { ...customerData, followedStores, storeNotifications };
  await syncStoreAudienceMember(storeId, customerId, updatedCustomer);

  if (action === "follow" && !wasFollowing) {
    await db.collection("notifications").add({
      userId: storeId,
      role: "merchant",
      type: "social",
      title: "متابع جديد!",
      message: `${updatedCustomer.name || "زبون"} قام بمتابعة متجرك.`,
      read: false,
      sound: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return { followedStores, storeNotifications };
});

/** Merchant: list followers, notification subscribers, and past buyers for audience UI. */
exports.getStoreAudience = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }
    const storeId = String(request.data?.storeId || "").trim();
    if (!storeId) {
      throw new HttpsError("invalid-argument", "storeId is required");
    }
    if (!(await callerOwnsStore(request.auth.uid, storeId))) {
      throw new HttpsError("permission-denied", "Not your store");
    }

    const storeSnap = await db.collection("stores").doc(storeId).get();
    const storeBlockedIds = Array.isArray(storeSnap.data()?.blockedCustomerIds)
      ? storeSnap.data().blockedCustomerIds.map(String)
      : [];

    const [followersSnap, notifSnap, orderedSnap] = await Promise.all([
      db.collection("customers").where("followedStores", "array-contains", storeId).limit(500).get(),
      db.collection("customers").where("storeNotifications", "array-contains", storeId).limit(500).get(),
      db.collection("orders").where("storeId", "==", storeId).select("customerId").limit(2000).get(),
    ]);

    const byId = new Map();
    followersSnap.docs.forEach((docSnap) => byId.set(docSnap.id, sanitizeStoreAudienceCustomer(docSnap, storeBlockedIds)));
    notifSnap.docs.forEach((docSnap) => {
      if (!byId.has(docSnap.id)) {
        byId.set(docSnap.id, sanitizeStoreAudienceCustomer(docSnap, storeBlockedIds));
      }
    });

    const orderedCustomerIds = [
      ...new Set(
        orderedSnap.docs
          .map((docSnap) => String((docSnap.data() || {}).customerId || ""))
          .filter(Boolean),
      ),
    ].filter((id) => !byId.has(id)).slice(0, 200);

    for (let i = 0; i < orderedCustomerIds.length; i += 30) {
      const chunk = orderedCustomerIds.slice(i, i + 30);
      const refs = chunk.map((id) => db.collection("customers").doc(id));
      const snaps = await db.getAll(...refs);
      snaps.forEach((docSnap) => {
        if (docSnap.exists) {
          byId.set(docSnap.id, sanitizeStoreAudienceCustomer(docSnap, storeBlockedIds));
        }
      });
    }

    // Include customers blocked by the store even if they have no follow/order history
    for (let i = 0; i < storeBlockedIds.length; i += 30) {
      const chunk = storeBlockedIds.slice(i, i + 30).filter((id) => !byId.has(id));
      if (chunk.length === 0) continue;
      const refs = chunk.map((id) => db.collection("customers").doc(id));
      const snaps = await db.getAll(...refs);
      snaps.forEach((docSnap) => {
        if (docSnap.exists) {
          byId.set(docSnap.id, sanitizeStoreAudienceCustomer(docSnap, storeBlockedIds));
        }
      });
    }

    const customers = Array.from(byId.values());
    await Promise.all(
      customers.map((customer) => syncStoreAudienceMember(storeId, customer.id, customer)),
    );

    return { customers };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    console.error("[getStoreAudience]", err);
    throw new HttpsError("internal", "Failed to load store audience");
  }
});

/** Merchant: block / unblock a customer from this store only (not platform-wide). */
exports.setStoreCustomerBlock = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const storeId = String(request.data?.storeId || "").trim();
  const customerId = String(request.data?.customerId || "").trim();
  const blocked = Boolean(request.data?.blocked);
  if (!storeId || !customerId) {
    throw new HttpsError("invalid-argument", "storeId and customerId are required");
  }
  if (!(await callerOwnsStore(request.auth.uid, storeId))) {
    throw new HttpsError("permission-denied", "Not your store");
  }

  const storeRef = db.collection("stores").doc(storeId);
  const customerRef = db.collection("customers").doc(customerId);
  const memberRef = db.collection("store_audience").doc(storeId).collection("members").doc(customerId);

  const [storeSnap, customerSnap] = await Promise.all([storeRef.get(), customerRef.get()]);
  if (!storeSnap.exists) throw new HttpsError("not-found", "Store not found");
  if (!customerSnap.exists) throw new HttpsError("not-found", "Customer not found");

  const batch = db.batch();
  if (blocked) {
    batch.update(storeRef, { blockedCustomerIds: FieldValue.arrayUnion(customerId) });
    batch.update(customerRef, { blockedStoreIds: FieldValue.arrayUnion(storeId) });
  } else {
    batch.update(storeRef, { blockedCustomerIds: FieldValue.arrayRemove(customerId) });
    batch.update(customerRef, { blockedStoreIds: FieldValue.arrayRemove(storeId) });
  }

  const cData = customerSnap.data() || {};
  batch.set(
    memberRef,
    {
      customerId,
      name: cData.name || "",
      phone: cData.phone || "",
      province: cData.province || "",
      tier: cData.tier || "Silver",
      followed: Array.isArray(cData.followedStores) && cData.followedStores.includes(storeId),
      notifications: Array.isArray(cData.storeNotifications) && cData.storeNotifications.includes(storeId),
      blocked,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
  return { success: true, storeId, customerId, blocked };
});

/** Admin/staff: platform-wide customer block toggle (CF-only field). */
exports.setCustomerPlatformBlock = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  await assertDashboardPermission(request.auth.uid, request.auth.token, "customers");
  const customerId = String(request.data?.customerId || "").trim();
  const blocked = Boolean(request.data?.blocked);
  if (!customerId) {
    throw new HttpsError("invalid-argument", "customerId is required");
  }
  const customerRef = db.collection("customers").doc(customerId);
  const snap = await customerRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Customer not found");
  await customerRef.update({ isBlocked: blocked, updatedAt: FieldValue.serverTimestamp() });
  return { success: true, customerId, blocked };
});

/** Merchant: hide closed orders from inbox UI only (no status/finance changes). */
exports.clearMerchantOrderInbox = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const storeId = String(request.data?.storeId || "").trim();
  const orderIds = Array.isArray(request.data?.orderIds)
    ? [...new Set(request.data.orderIds.map((id) => String(id || "").trim()).filter(Boolean))]
    : [];
  if (!storeId || orderIds.length === 0) {
    throw new HttpsError("invalid-argument", "storeId and orderIds are required");
  }
  if (orderIds.length > 200) {
    throw new HttpsError("invalid-argument", "Too many orders (max 200)");
  }
  if (!(await callerOwnsStore(request.auth.uid, storeId))) {
    throw new HttpsError("permission-denied", "Not your store");
  }

  const CLEARABLE = new Set(["delivered", "returned", "replaced", "rejected", "cancelled"]);
  const clearedAt = new Date().toISOString();
  let cleared = 0;

  for (let i = 0; i < orderIds.length; i += 40) {
    const chunk = orderIds.slice(i, i + 40);
    const refs = chunk.map((id) => db.collection("orders").doc(id));
    const snaps = await db.getAll(...refs);
    const batch = db.batch();
    let ops = 0;
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const data = snap.data() || {};
      if (String(data.storeId || "") !== storeId) continue;
      if (!CLEARABLE.has(String(data.status || ""))) continue;
      if (data.merchantInboxCleared === true) continue;
      batch.update(snap.ref, {
        merchantInboxCleared: true,
        merchantInboxClearedAt: clearedAt,
      });
      ops += 1;
      cleared += 1;
    }
    if (ops > 0) await batch.commit();
  }

  return { success: true, cleared };
});

/**
 * Merchant order replacement: swap line items + mark status "replaced".
 * Client cannot write items/totals (rules allow only status fields).
 */
exports.replaceOrderItems = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const orderId = String(request.data?.orderId || "").trim();
  const productId = String(request.data?.productId || "").trim();
  const quantity = Math.floor(Number(request.data?.quantity || 0));
  if (!orderId || !productId || !Number.isFinite(quantity) || quantity < 1 || quantity > 999) {
    throw new HttpsError("invalid-argument", "orderId, productId and valid quantity are required");
  }

  const orderRef = db.collection("orders").doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new HttpsError("not-found", "Order not found");
  const order = orderSnap.data() || {};
  const storeId = String(order.storeId || "");
  if (!(await callerOwnsStore(request.auth.uid, storeId))) {
    throw new HttpsError("permission-denied", "Not your store");
  }

  const fromStatus = String(order.status || "");
  if (fromStatus !== "shipped" && fromStatus !== "delivered") {
    throw new HttpsError("failed-precondition", "Order cannot be replaced in current status");
  }

  const productSnap = await db.collection("products").doc(productId).get();
  if (!productSnap.exists) throw new HttpsError("not-found", "Product not found");
  const product = productSnap.data() || {};
  if (String(product.storeId || "") !== storeId) {
    throw new HttpsError("permission-denied", "Product does not belong to this store");
  }

  let price = Number(product.finalPrice);
  if (!Number.isFinite(price) || price < 0) {
    const base = Number(product.price) || 0;
    const dtype = String(product.discountType || "none");
    const dval = Number(product.discountValue) || 0;
    if (dtype === "percentage" && dval > 0) price = Math.max(0, base - (base * dval) / 100);
    else if (dtype === "fixed" && dval > 0) price = Math.max(0, base - dval);
    else price = base;
  }
  price = Math.round(price);

  const productName = String(product.name || "منتج");
  const subtotal = price * quantity;
  const deliveryPrice = Number(order.deliveryPrice) || 0;
  const total = Math.max(0, subtotal + deliveryPrice);

  await orderRef.update({
    items: [{
      productId,
      productName: `${productName} (استبدال)`,
      quantity,
      price,
      image: product.image || null,
    }],
    subtotal,
    discountAmount: 0,
    total,
    status: "replaced",
    returnReason: "استبدال بمنتج جديد",
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true, orderId, total, subtotal };
});

/** Merchant sends notifications to followers (server-side validation). */
exports.sendMerchantFollowerNotifications = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const { storeId, title, message, type } = request.data || {};
  if (!storeId || !title || !message) {
    throw new HttpsError("invalid-argument", "storeId, title and message are required");
  }
  if (!(await callerOwnsStore(request.auth.uid, storeId))) {
    throw new HttpsError("permission-denied", "Not your store");
  }

  const storeSnap = await db.collection("stores").doc(storeId).get();
  if (!storeSnap.exists) {
    throw new HttpsError("not-found", "Store not found");
  }

  const [followersSnap, notifSnap] = await Promise.all([
    db.collection("customers").where("followedStores", "array-contains", storeId).limit(500).get(),
    db.collection("customers").where("storeNotifications", "array-contains", storeId).limit(500).get(),
  ]);
  const followerIds = [
    ...new Set([
      ...followersSnap.docs.map((docSnap) => docSnap.id),
      ...notifSnap.docs.map((docSnap) => docSnap.id),
    ]),
  ].slice(0, 500);

  const batch = db.batch();
  followerIds.forEach((customerId) => {
    const ref = db.collection("notifications").doc();
    batch.set(ref, {
      userId: customerId,
      role: "customer",
      type: type || "promo",
      title,
      message,
      senderStoreId: storeId,
      read: false,
      sound: true,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
  return { sent: followerIds.length };
});

/** Merchant sends a personal gift (promo code or product notification) to one customer. */
exports.sendMerchantCustomerGift = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const {
    storeId,
    customerId,
    giftType,
    discountType,
    discountValue,
    expiryDays,
    productId,
  } = request.data || {};

  const normalizedStoreId = String(storeId || "").trim();
  const normalizedCustomerId = String(customerId || "").trim();
  const normalizedGiftType = String(giftType || "").trim();

  if (!normalizedStoreId || !normalizedCustomerId || !normalizedGiftType) {
    throw new HttpsError("invalid-argument", "storeId, customerId and giftType are required");
  }
  if (!(await callerOwnsStore(request.auth.uid, normalizedStoreId))) {
    throw new HttpsError("permission-denied", "Not your store");
  }

  const [storeSnap, customerSnap] = await Promise.all([
    db.collection("stores").doc(normalizedStoreId).get(),
    db.collection("customers").doc(normalizedCustomerId).get(),
  ]);
  if (!storeSnap.exists) {
    throw new HttpsError("not-found", "Store not found");
  }
  if (!customerSnap.exists) {
    throw new HttpsError("not-found", "Customer not found");
  }

  const shopName = storeSnap.data()?.shopName || "المتجر";

  if (normalizedGiftType === "promo") {
    const type = discountType === "percent" ? "percent" : "amount";
    const value = Math.max(0, Number(discountValue) || 0);
    const days = Math.max(1, Math.min(365, Number(expiryDays) || 30));
    if (value <= 0) {
      throw new HttpsError("invalid-argument", "discountValue must be greater than zero");
    }

    const code = `GIFT-${Math.floor(100000 + Math.random() * 900000)}`;
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + days);
    const expiresAt = expDate.toISOString().split("T")[0];
    const startDate = new Date().toISOString().split("T")[0];
    const promoId = `promo_${Date.now()}`;

    await db.collection("promo_codes").doc(promoId).set({
      id: promoId,
      storeId: normalizedStoreId,
      code: normalizePromoCode(code),
      discountType: type,
      discountValue: value,
      maxUses: 1,
      maxUsesPerUser: 1,
      startDate,
      expiresAt,
      expirationDate: expiresAt,
      source: "points",
      ownerCustomerId: normalizedCustomerId,
      status: "active",
      usedCount: 0,
      currentGlobalUses: 0,
      createdAt: FieldValue.serverTimestamp(),
    });

    const notifRef = db.collection("notifications").doc();
    const valueLabel = type === "amount" ? `${value.toLocaleString("en-US")} د.ع` : `${value}%`;
    await notifRef.set({
      userId: normalizedCustomerId,
      role: "customer",
      title: "هدية خاصة من المتجر! 🎁🎟️",
      message: `أرسل لك متجر ${shopName} كود خصم خاص بقيمة ${valueLabel}! الرمز: ${code} (صالح للاستخدام لمرة واحدة خلال ${days} أيام).`,
      type: "promo",
      targetId: promoId,
      senderStoreId: normalizedStoreId,
      read: false,
      sound: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, promoCode: code, notificationId: notifRef.id };
  }

  if (normalizedGiftType === "product") {
    const normalizedProductId = String(productId || "").trim();
    if (!normalizedProductId) {
      throw new HttpsError("invalid-argument", "productId is required for product gifts");
    }

    const productSnap = await db.collection("products").doc(normalizedProductId).get();
    if (!productSnap.exists) {
      throw new HttpsError("not-found", "Product not found");
    }
    const productData = productSnap.data() || {};
    if (String(productData.storeId || "") !== normalizedStoreId) {
      throw new HttpsError("permission-denied", "Product does not belong to this store");
    }

    const productName = String(productData.name || "منتج");
    const notifRef = db.collection("notifications").doc();
    await notifRef.set({
      userId: normalizedCustomerId,
      role: "customer",
      title: "لقد تلقيت هديّة منتج! 🎁🎉",
      message: `مبروك! لقد أهداك متجر ${shopName} منتج: "${productName}" مجاناً كرمز تقدير لولائك! تواصل مع المتجر لتنسيق الاستلام.`,
      type: "product",
      targetId: normalizedProductId,
      senderStoreId: normalizedStoreId,
      read: false,
      sound: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, productName, notificationId: notifRef.id };
  }

  throw new HttpsError("invalid-argument", "giftType must be promo or product");
});

/** Store hashed password in auth_secrets after signup (never in customer doc). */
exports.initializeCustomerPassword = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const { customerId, password } = request.data || {};
  if (!customerId || !password || String(password).length < 8) {
    throw new HttpsError("invalid-argument", "customerId and password (8+) required");
  }
  if (!(await customerAuthOwnsId(customerId, request.auth.uid))) {
    throw new HttpsError("permission-denied", "Cannot set password for this customer");
  }
  await migratePasswordToSecret("customer", customerId, String(password));
  return { success: true };
});

/** Store hashed password in auth_secrets after merchant signup (never in store doc). */
exports.initializeStorePassword = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const { storeId, password } = request.data || {};
  if (!storeId || !password || String(password).length < 8) {
    throw new HttpsError("invalid-argument", "storeId and password (8+) required");
  }
  if (!(await storeAuthOwnsId(storeId, request.auth.uid))) {
    throw new HttpsError("permission-denied", "Cannot set password for this store");
  }
  await migratePasswordToSecret("store", storeId, String(password));
  return { success: true };
});

/**
 * One-time admin migration: strip password from stores and move financial fields
 * to store_secrets/{storeId}. Callable by dashboard owner only.
 */
exports.migrateStoreSensitiveData = onCall({ cors: ALLOWED_CALLABLE_CORS }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const adminDoc = await assertDashboardPermission(
    request.auth.uid,
    request.auth.token,
    "stores",
  );
  if (adminDoc.role !== "owner") {
    throw new HttpsError("permission-denied", "Only the platform owner can run this migration");
  }

  const storesSnap = await db.collection("stores").get();
  let migrated = 0;
  let secretsWritten = 0;
  let passwordsRemoved = 0;

  const BATCH_SIZE = 400;
  let batch = db.batch();
  let batchOps = 0;

  const commitBatch = async () => {
    if (batchOps === 0) return;
    await batch.commit();
    batch = db.batch();
    batchOps = 0;
  };

  for (const storeDoc of storesSnap.docs) {
    const data = storeDoc.data() || {};
    const storeId = storeDoc.id;
    const storeUpdate = {};
    let hasStoreUpdate = false;

    if (Object.prototype.hasOwnProperty.call(data, "password")) {
      storeUpdate.password = FieldValue.delete();
      hasStoreUpdate = true;
      passwordsRemoved += 1;
    }

    const secretsPayload = {
      storeId,
      ownerId: data.ownerId || "",
      updatedAt: FieldValue.serverTimestamp(),
    };
    let hasSecrets = false;

    if (Object.prototype.hasOwnProperty.call(data, "walletBalance")) {
      secretsPayload.walletBalance = data.walletBalance ?? 0;
      storeUpdate.walletBalance = FieldValue.delete();
      hasStoreUpdate = true;
      hasSecrets = true;
    }

    if (data.payoutMethods && typeof data.payoutMethods === "object") {
      secretsPayload.payoutMethods = data.payoutMethods;
      storeUpdate.payoutMethods = FieldValue.delete();
      hasStoreUpdate = true;
      hasSecrets = true;
    }

    if (hasSecrets) {
      batch.set(storeSecretsRef(storeId), secretsPayload, { merge: true });
      batchOps += 1;
      secretsWritten += 1;
    }

    if (hasStoreUpdate) {
      batch.update(storeDoc.ref, storeUpdate);
      batchOps += 1;
    }

    if (hasStoreUpdate || hasSecrets) {
      migrated += 1;
    }

    if (batchOps >= BATCH_SIZE) {
      await commitBatch();
    }
  }

  await commitBatch();

  const freshStoresSnap = await db.collection("stores").get();
  let publicSynced = 0;
  for (const storeDoc of freshStoresSnap.docs) {
    await syncStorePublicDocument(storeDoc.id, storeDoc.data());
    publicSynced += 1;
  }

  return {
    success: true,
    totalStores: storesSnap.size,
    migrated,
    secretsWritten,
    passwordsRemoved,
    publicSynced,
  };
});

/**
 * Daily scheduled job — scans all active promo_codes and marks any whose
 * expirationDate or expiresAt has passed as "expired". Runs at 00:05 UTC.
 * Because the Admin SDK bypasses Firestore security rules, no rule change
 * is needed — clients can never trigger this path.
 */
exports.expirePromoCodesDaily = onSchedule(
  { schedule: "5 0 * * *", timeZone: "UTC", region: "us-central1" },
  async () => {
    const now = new Date();
    const nowIso = now.toISOString();
    const BATCH_SIZE = 400;

    const toExpire = new Map();

    // Codes that store expiry in "expirationDate"
    const snap1 = await db.collection("promo_codes")
      .where("status", "==", "active")
      .where("expirationDate", "<", nowIso)
      .get();
    snap1.docs.forEach((d) => toExpire.set(d.id, d.ref));

    // Codes that store expiry in "expiresAt"
    const snap2 = await db.collection("promo_codes")
      .where("status", "==", "active")
      .where("expiresAt", "<", nowIso)
      .get();
    snap2.docs.forEach((d) => toExpire.set(d.id, d.ref));

    if (toExpire.size === 0) {
      console.log("[expirePromoCodesDaily] No expired promo codes found.");
      return;
    }

    let batch = db.batch();
    let ops = 0;
    let total = 0;

    for (const ref of toExpire.values()) {
      batch.update(ref, { status: "expired" });
      ops++;
      total++;
      if (ops >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }
    if (ops > 0) {
      await batch.commit();
    }

    console.log(`[expirePromoCodesDaily] Marked ${total} promo code(s) as expired.`);
  }
);
