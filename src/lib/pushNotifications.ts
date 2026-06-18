import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, setDoc } from 'firebase/firestore';
import { app, auth, db } from './firebase';
import { getOneSignalAppId, isOneSignalConfigured } from './onesignalConfig';

declare global {
  interface Window {
    OneSignalDeferred: Array<(oneSignal: OneSignalClient) => void | Promise<void>>;
    OneSignal: OneSignalClient;
    _oneSignalInitialized?: boolean;
    _oneSignalInitFailed?: boolean;
  }
}

interface OneSignalClient {
  init: (options: Record<string, unknown>) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  Notifications: {
    requestPermission: () => Promise<boolean>;
    permission: boolean;
    addEventListener: (event: string, handler: (event: unknown) => void) => void;
  };
  User: {
    PushSubscription: {
      id?: string | null;
      addEventListener: (event: string, handler: (event: { current?: { id?: string } }) => void) => void;
      getIdAsync?: () => Promise<string | null>;
    };
  };
}

let activePushSetupKey: string | null = null;
let initPromise: Promise<boolean> | null = null;

export function resetPushNotificationSetup() {
  activePushSetupKey = null;
}

async function persistOneSignalIds(
  targetCollection: 'customers' | 'stores' | 'admins',
  userId: string,
  subscriptionId: string | null | undefined,
) {
  if (!subscriptionId) return;
  try {
    await setDoc(
      doc(db, targetCollection, userId),
      { fcmToken: subscriptionId, oneSignalId: subscriptionId, pushEnabled: true },
      { merge: true },
    );
  } catch {
    // best-effort
  }
}

export async function ensureOneSignalInitialized(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) return isOneSignalConfigured();
  if (window._oneSignalInitFailed) return false;
  if (window._oneSignalInitialized) return true;
  if (!isOneSignalConfigured()) return false;

  if (!initPromise) {
    initPromise = new Promise<boolean>((resolve) => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal) => {
        if (window._oneSignalInitialized) {
          resolve(true);
          return;
        }
        if (window._oneSignalInitFailed) {
          resolve(false);
          return;
        }
        try {
          await OneSignal.init({
            appId: getOneSignalAppId(),
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerPath: 'OneSignalSDKWorker.js',
            notifyButtonEnable: false,
          });
          window._oneSignalInitialized = true;
          resolve(true);
        } catch {
          window._oneSignalInitFailed = true;
          resolve(false);
        }
      });
    });
  }

  return initPromise;
}

/** Load OneSignal SDK early (call once from App mount). */
export function preloadOneSignal() {
  if (Capacitor.isNativePlatform() || !isOneSignalConfigured()) return;
  void ensureOneSignalInitialized();
}

export async function registerServiceWorker() {
  if (Capacitor.isNativePlatform() || isOneSignalConfigured()) {
    return null;
  }
  if ('serviceWorker' in navigator) {
    try {
      return await navigator.serviceWorker.register('/sw.js');
    } catch {
      return null;
    }
  }
  return null;
}

export async function createNotificationChannels() {
  if (Capacitor.getPlatform() === 'android') {
    try {
      await PushNotifications.createChannel({
        id: 'customer_order_updates_sound',
        name: 'تحديثات الطلبات (صوتي)',
        description: 'إشعارات قبول أو رفض الطلبات',
        importance: 5,
        visibility: 1,
        vibration: true,
      });
      await PushNotifications.createChannel({
        id: 'customer_order_updates_silent',
        name: 'حالة الطلب (صامت)',
        description: 'تغير حالة الطلب إلى قيد التجهيز أو مع المندوب',
        importance: 2,
        visibility: 1,
        vibration: false,
      });
      await PushNotifications.createChannel({
        id: 'customer_promos_sound',
        name: 'العروض ورموز الخصم',
        description: 'عند إطلاق كود خصم جديد',
        importance: 4,
        visibility: 1,
        vibration: true,
      });
      await PushNotifications.createChannel({
        id: 'customer_products_sound',
        name: 'المنتجات الجديدة',
        description: 'إشعارات من المتاجر التي تتابعها',
        importance: 4,
        visibility: 1,
        vibration: true,
      });
      await PushNotifications.createChannel({
        id: 'merchant_orders_sound',
        name: 'طلبات جديدة',
        description: 'تصلك طلبات جديدة من الزبائن',
        importance: 5,
        visibility: 1,
        vibration: true,
      });
      await PushNotifications.createChannel({
        id: 'merchant_activity_silent',
        name: 'نشاط الزبائن (صامت)',
        description: 'تصفح وإضافة للسلة',
        importance: 2,
        visibility: 1,
        vibration: false,
      });
      await PushNotifications.createChannel({
        id: 'merchant_social_silent',
        name: 'المتابعين الجدد',
        description: 'إشعارات بالمتابعين الجدد للمتجر',
        importance: 2,
        visibility: 1,
        vibration: false,
      });
      await PushNotifications.createChannel({
        id: 'admin_broadcasts_sound',
        name: 'إشعارات الإدارة',
        description: 'إعلانات وإشعارات عامة من لوحة الأدمن',
        importance: 5,
        visibility: 1,
        vibration: true,
      });
    } catch {
      // ignore
    }
  }
}

/** Admin broadcast only — app notifications are sent by Cloud Function on Firestore create. */
export async function sendExternalPush(
  targetUserId: string | string[],
  title: string,
  message: string,
  channelId: string,
) {
  if (!auth.currentUser) return;
  const externalIds = Array.isArray(targetUserId) ? targetUserId : [targetUserId];
  if (!externalIds.length) return;

  try {
    const fn = httpsCallable(getFunctions(app), 'dispatchOneSignalPush');
    await fn({ title, message, channelId, externalIds });
  } catch {
    // best-effort
  }
}

export async function setupPushNotifications(
  userId: string,
  targetCollection: 'customers' | 'stores' | 'admins',
  onNotification?: (notification: { title?: string; body?: string; data?: unknown }) => void,
  onAction?: (action: unknown) => void,
) {
  const setupKey = `${targetCollection}:${userId}`;
  if (activePushSetupKey === setupKey) return;
  activePushSetupKey = setupKey;

  const appId = getOneSignalAppId();
  await createNotificationChannels();

  if (!appId || appId.length < 10) return;

  if (Capacitor.isNativePlatform()) {
    try {
      let OneSignalNative: {
        initialize: (id: string) => void;
        login: (id: string) => void;
        Notifications: {
          addEventListener: (event: string, handler: (event: unknown) => void) => void;
          requestPermission: (fallback: boolean) => Promise<boolean>;
        };
        User: {
          pushSubscription: {
            addEventListener: (event: string, handler: (event: { current?: { id?: string } }) => void) => void;
            getIdAsync: () => Promise<string | null>;
          };
        };
      };
      try {
        const module = await import('onesignal-cordova-plugin');
        OneSignalNative = module.default;
      } catch {
        return;
      }

      OneSignalNative.initialize(appId);
      OneSignalNative.login(userId);

      OneSignalNative.Notifications.addEventListener('foregroundWillDisplay', (event: unknown) => {
        const e = event as { notification?: { title?: string; body?: string; additionalData?: unknown; getNotification?: () => unknown } };
        if (onNotification && e.notification) {
          const n = e.notification.getNotification?.() ?? e.notification;
          const note = n as { title?: string; body?: string; additionalData?: unknown };
          onNotification({ title: note.title, body: note.body, data: note.additionalData });
        }
      });

      OneSignalNative.Notifications.addEventListener('click', (event: unknown) => {
        if (onAction) onAction(event);
      });

      OneSignalNative.User.pushSubscription.addEventListener('change', (event) => {
        void persistOneSignalIds(targetCollection, userId, event.current?.id);
      });

      const osId = await OneSignalNative.User.pushSubscription.getIdAsync();
      await persistOneSignalIds(targetCollection, userId, osId);
    } catch {
      // ignore
    }
    return;
  }

  const ready = await ensureOneSignalInitialized();
  if (!ready) return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
    try {
      await OneSignal.login(userId);

      OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: unknown) => {
        const e = event as { notification?: { title?: string; body?: string; data?: unknown } };
        if (onNotification && e.notification) onNotification(e.notification);
      });

      OneSignal.Notifications.addEventListener('click', (event: unknown) => {
        if (onAction) onAction(event);
      });

      if (OneSignal.User?.PushSubscription) {
        OneSignal.User.PushSubscription.addEventListener('change', (event) => {
          void persistOneSignalIds(targetCollection, userId, event.current?.id);
        });
        const osId =
          OneSignal.User.PushSubscription.id ??
          (await OneSignal.User.PushSubscription.getIdAsync?.());
        await persistOneSignalIds(targetCollection, userId, osId ?? null);
      }
    } catch {
      // ignore
    }
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isOneSignalConfigured()) return false;

  if (Capacitor.isNativePlatform()) {
    try {
      const module = await import('onesignal-cordova-plugin');
      const OneSignalNative = module.default;
      return OneSignalNative.Notifications.requestPermission(true);
    } catch {
      return false;
    }
  }

  const ready = await ensureOneSignalInitialized();
  if (!ready) return false;

  return new Promise<boolean>((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        const granted = await OneSignal.Notifications.requestPermission();
        resolve(granted === true || OneSignal.Notifications.permission === true);
      } catch {
        resolve(false);
      }
    });
  });
}

export async function showLocalNotification(title: string, body: string, data?: unknown) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: '/icon.png',
        data,
        dir: 'rtl',
        lang: 'ar-IQ',
      });
    } catch {
      // ignore
    }
  }
}
