const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const axios = require("axios");

setGlobalOptions({ region: "us-central1" });

admin.initializeApp();
// Client app uses named database "default" (not canonical "(default)")
const db = getFirestore(undefined, "default");

const OTP_COLLECTION = "otp_tokens";
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_ATTEMPTS_COLLECTION = "otp_attempts";
const OTP_REQUEST_WINDOW_MS = 60 * 1000;
const OTP_MAX_REQUESTS_PER_WINDOW = 3;
const OTP_VERIFY_WINDOW_MS = 10 * 60 * 1000;
const OTP_MAX_VERIFY_ATTEMPTS = 10;

function cors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

function normalizePhone(phoneNumber) {
  return String(phoneNumber || "").replace(/\D/g, "");
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
      timeout: 15000,
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

exports.otpRequest = onRequest({ cors: true }, async (req, res) => {
  cors(res);
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

  const key = normalizePhone(phoneNumber);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + OTP_TTL_MS;

  try {
    await assertOtpRateLimit(`req_${key}`, OTP_REQUEST_WINDOW_MS, OTP_MAX_REQUESTS_PER_WINDOW);
  } catch {
    res.status(429).json({ success: false, error: "Too many OTP requests. Please wait and try again." });
    return;
  }

  try {
    await db.collection(OTP_COLLECTION).doc(key).set({
      code,
      type,
      phoneNumber: key,
      expiresAt,
      createdAt: FieldValue.serverTimestamp(),
    });

    const data = await sendWasenderMessage(phoneNumber, otpMessage(type, code));
    res.json({ success: true, data });
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

exports.otpVerify = onRequest({ cors: true }, async (req, res) => {
  cors(res);
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

  const key = normalizePhone(phoneNumber);

  try {
    await assertOtpRateLimit(`verify_${key}`, OTP_VERIFY_WINDOW_MS, OTP_MAX_VERIFY_ATTEMPTS);
  } catch {
    res.status(429).json({ success: false, error: "Too many verification attempts. Please wait and try again." });
    return;
  }

  const snap = await db.collection(OTP_COLLECTION).doc(key).get();
  if (!snap.exists) {
    res.status(400).json({ success: false, error: "Invalid or expired OTP" });
    return;
  }

  const entry = snap.data();
  if (!entry || entry.expiresAt < Date.now() || entry.code !== String(code).trim()) {
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
  if (authToken?.role === "admin" || authToken?.admin === true) {
    return fetchAdminDoc(uid);
  }
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
  if (!doc) {
    if (authToken?.role === "admin" || authToken?.admin === true) return true;
    return false;
  }
  return resolveEffectivePermissions(doc).length > 0;
}

function resolveOneSignalCredentials() {
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

async function postOneSignalNotification(payload) {
  const { restApiKey } = resolveOneSignalCredentials();
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

  return payload;
}

/** Auto-send OneSignal push when a notification document is created. */
exports.onNotificationCreated = onDocumentCreated(
  { document: "notifications/{notificationId}", database: "default" },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    if (!data?.userId || !data?.message) return;

    let appId;
    try {
      ({ appId } = resolveOneSignalCredentials());
    } catch {
      return;
    }

    const channelId = resolveNotificationChannelId(data);
    const title = data.title || "محلك";

    try {
      await postOneSignalNotification(
        buildOneSignalPayload({
          appId,
          userId: data.userId,
          title,
          message: data.message,
          channelId,
          data: { ...data, notificationId: event.params.notificationId },
        }),
      );
    } catch (error) {
      console.error("[onNotificationCreated] OneSignal error:", error.response?.data || error.message);
    }
  },
);

/** App push dispatch — any signed-in user (order updates, promos, etc.). */
exports.dispatchOneSignalPush = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const { title, message, channelId, externalIds } = request.data || {};
  if (!title || !message || !channelId || !Array.isArray(externalIds) || !externalIds.length) {
    throw new HttpsError("invalid-argument", "title, message, channelId and externalIds are required");
  }

  if (externalIds.length > 2000) {
    throw new HttpsError("invalid-argument", "Too many recipients in one request");
  }

  let appId;
  try {
    ({ appId } = resolveOneSignalCredentials());
  } catch {
    throw new HttpsError("failed-precondition", "OneSignal credentials are not configured on the server");
  }

  const payload = buildOneSignalPayload({
    appId,
    userId: externalIds,
    title,
    message,
    channelId,
    data: { type: "app", role: "system" },
  });

  try {
    const data = await postOneSignalNotification(payload);
    return { success: true, data };
  } catch (error) {
    throw new HttpsError("internal", "Failed to send push notification");
  }
});

/** Secure push proxy — requires broadcast permission (owner bypasses via hasAdminPermission). */
exports.sendPushNotification = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  await assertDashboardPermission(request.auth.uid, request.auth.token, "broadcast");

  const { title, message, channelId, externalIds } = request.data || {};
  if (!title || !message || !channelId || !Array.isArray(externalIds) || !externalIds.length) {
    throw new HttpsError("invalid-argument", "title, message, channelId and externalIds are required");
  }

  const { appId } = resolveOneSignalCredentials();
  const payload = buildOneSignalPayload({
    appId,
    userId: externalIds,
    title,
    message,
    channelId,
    data: { type: "broadcast", role: "admin" },
  });

  try {
    const data = await postOneSignalNotification(payload);
    return { success: true, data };
  } catch (error) {
    const detail = error.response?.data || error.message;
    throw new HttpsError("internal", "Failed to send push notification");
  }
});

/** WhatsApp proxy for admin dashboard — requires whatsapp permission. */
exports.sendWhatsAppMessage = onCall({ cors: true }, async (request) => {
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
exports.redeemRechargeCode = onCall({ cors: true }, async (request) => {
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
exports.createUserAccount = onCall({ cors: true }, async (request) => {
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
exports.updateUserAccount = onCall({ cors: true }, async (request) => {
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

/** Delete admin Auth user + Firestore doc — owner only, cannot delete owner role. */
exports.deleteUserAccount = onCall({ cors: true }, async (request) => {
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

function iraqiPhoneVariants(phone) {
  const normalized = formatIraqiPhone(phone);
  const variants = new Set([normalized, String(phone || "").trim(), normalizePhone(phone)]);
  if (normalized.startsWith("964") && normalized.length === 13) {
    variants.add("0" + normalized.slice(3));
    variants.add(normalized.slice(3));
  }
  return [...variants].filter(Boolean);
}

/** Customer login: lookup by phone (Admin SDK bypasses client Firestore list rules). */
exports.lookupCustomerByPhone = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const phone = request.data?.phone;
  if (!phone || typeof phone !== "string") {
    throw new HttpsError("invalid-argument", "phone is required");
  }

  for (const variant of iraqiPhoneVariants(phone)) {
    const snap = await db.collection("customers").where("phone", "==", variant).limit(1).get();
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
    }
  }
  return null;
});

/** Admin dashboard: list all customers (Admin SDK + legacy users collection). */
exports.listDashboardCustomers = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const adminDoc = await fetchAdminDoc(request.auth.uid);
  if (!adminDoc) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

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

  return Array.from(byId.values());
});
