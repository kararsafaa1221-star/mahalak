import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, setDoc } from 'firebase/firestore';
import { app, auth, db } from './firebase';
import { requestAndroidNotificationPermission } from './permissions';
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
  logout: () => Promise<void>;
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

type OneSignalNativeModule = {
  default: {
    initialize: (appId: string) => void;
    login: (externalId: string) => void;
    logout: () => void;
    Debug: { setLogLevel: (level: number) => void };
    Notifications: {
      requestPermission: (fallback: boolean) => Promise<boolean>;
      addEventListener: (event: string, handler: (event: unknown) => void) => void;
    };
    User: {
      pushSubscription: {
        addEventListener: (event: string, handler: (event: { current?: { id?: string } }) => void) => void;
        getIdAsync: () => Promise<string | null>;
      };
    };
  };
};

let activePushSetupKey: string | null = null;
let initPromise: Promise<boolean> | null = null;
let nativeOneSignalInitialized = false;
let nativeListenersKey: string | null = null;
let webListenersKey: string | null = null;
let notificationChannelsCreated = false;

type PushNotificationHandler = (
  notification: { title?: string; body?: string; data?: unknown },
) => void;
type PushActionHandler = (action: unknown) => void;

let onNotificationHandler: PushNotificationHandler | null = null;
let onActionHandler: PushActionHandler | null = null;

export function resetPushNotificationSetup() {
  activePushSetupKey = null;
  nativeListenersKey = null;
  webListenersKey = null;
  onNotificationHandler = null;
  onActionHandler = null;
}

export async function logoutOneSignalSession(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !nativeOneSignalInitialized) return;
  try {
    const module = (await import('onesignal-cordova-plugin')) as OneSignalNativeModule;
    module.default.logout();
  } catch {
    // best-effort
  }
}

type ForegroundDisplayEvent = {
  notification?: { title?: string; body?: string; additionalData?: unknown; data?: unknown; getNotification?: () => unknown };
  getNotification?: () => { display?: () => void; title?: string; body?: string; additionalData?: unknown };
  preventDefault?: (discard?: boolean) => void;
};

function showForegroundNotificationInTray(event: ForegroundDisplayEvent) {
  const notification = event.getNotification?.() ?? event.notification;
  notification?.display?.();
}

function readForegroundNotification(event: ForegroundDisplayEvent) {
  const notification = event.getNotification?.() ?? event.notification;
  if (!notification) return null;
  const note = typeof notification.getNotification === 'function'
    ? (notification.getNotification() as { title?: string; body?: string; additionalData?: unknown; data?: unknown })
    : notification;
  return {
    title: note.title,
    body: note.body,
    data: note.additionalData ?? note.data,
  };
}

async function loadOneSignalNative(): Promise<OneSignalNativeModule['default'] | null> {
  try {
    const module = (await import('onesignal-cordova-plugin')) as OneSignalNativeModule;
    return module.default;
  } catch {
    return null;
  }
}

async function ensureNativeOneSignalInitialized(appId: string): Promise<boolean> {
  if (nativeOneSignalInitialized) return true;
  const OneSignalNative = await loadOneSignalNative();
  if (!OneSignalNative) return false;
  try {
    if (import.meta.env.DEV) {
      OneSignalNative.Debug.setLogLevel(6);
    }
    OneSignalNative.initialize(appId);
    nativeOneSignalInitialized = true;
    return true;
  } catch {
    return false;
  }
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

async function loadOneSignalWebSdk(): Promise<void> {
  if (typeof document === 'undefined') return;
  if (window.OneSignal) return;
  const existing = document.querySelector('script[data-onesignal-sdk]');
  if (existing) return;

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer = true;
    script.dataset.onesignalSdk = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('OneSignal web SDK failed to load'));
    document.head.appendChild(script);
  });
}

export async function ensureOneSignalInitialized(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) return isOneSignalConfigured();
  if (window._oneSignalInitFailed) return false;
  if (window._oneSignalInitialized) return true;
  if (!isOneSignalConfigured()) return false;

  if (!initPromise) {
    initPromise = (async () => {
      try {
        await loadOneSignalWebSdk();
      } catch {
        window._oneSignalInitFailed = true;
        return false;
      }

      return new Promise<boolean>((resolve) => {
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
    })();
  }

  return initPromise;
}

/** Web only — native OneSignal initializes on login / permission request. */
export function preloadOneSignal() {
  if (!isOneSignalConfigured() || Capacitor.isNativePlatform()) return;
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
  if (Capacitor.getPlatform() !== 'android' || notificationChannelsCreated) return;
  notificationChannelsCreated = true;

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
    notificationChannelsCreated = false;
  }
}

/** Admin broadcast only — app notifications are sent by Cloud Function on Firestore create. */
export async function sendExternalPush(
  targetUserId: string | string[],
  title: string,
  message: string,
  channelId: string,
  targetRole?: 'customer' | 'merchant' | 'admin',
) {
  if (!auth.currentUser) return;
  const externalIds = Array.isArray(targetUserId) ? targetUserId : [targetUserId];
  if (!externalIds.length) return;

  try {
    const fn = httpsCallable(getFunctions(app), 'dispatchOneSignalPush');
    await fn({ title, message, channelId, externalIds, targetRole });
  } catch {
    // best-effort
  }
}

export async function setupPushNotifications(
  userId: string,
  targetCollection: 'customers' | 'stores' | 'admins',
  onNotification?: PushNotificationHandler,
  onAction?: PushActionHandler,
) {
  if (onNotification) onNotificationHandler = onNotification;
  if (onAction) onActionHandler = onAction;

  const setupKey = `${targetCollection}:${userId}`;
  if (activePushSetupKey === setupKey) return;
  activePushSetupKey = setupKey;

  const appId = getOneSignalAppId();
  await createNotificationChannels();

  if (!appId || appId.length < 10) return;

  if (Capacitor.isNativePlatform()) {
    try {
      const ready = await ensureNativeOneSignalInitialized(appId);
      if (!ready) return;

      const OneSignalNative = await loadOneSignalNative();
      if (!OneSignalNative) return;

      OneSignalNative.logout();
      OneSignalNative.login(userId);

      if (nativeListenersKey !== setupKey) {
        nativeListenersKey = setupKey;

        OneSignalNative.Notifications.addEventListener('foregroundWillDisplay', (event: unknown) => {
          const e = event as ForegroundDisplayEvent;
          showForegroundNotificationInTray(e);
          const note = readForegroundNotification(e);
          if (onNotificationHandler && note) onNotificationHandler(note);
        });

        OneSignalNative.Notifications.addEventListener('click', (event: unknown) => {
          if (onActionHandler) onActionHandler(event);
        });

        OneSignalNative.User.pushSubscription.addEventListener('change', (event) => {
          void persistOneSignalIds(targetCollection, userId, event.current?.id);
        });
      }

      const osId = await OneSignalNative.User.pushSubscription.getIdAsync();
      await persistOneSignalIds(targetCollection, userId, osId);
    } catch {
      // best-effort
    }
    return;
  }

  const ready = await ensureOneSignalInitialized();
  if (!ready) return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
    try {
      await OneSignal.logout();
      await OneSignal.login(userId);

      // Guard: register event listeners only once per (collection:userId) pair.
      // Repeated calls (e.g. on re-render or session switch) must not stack
      // duplicate foreground/click/change handlers — those accumulate indefinitely
      // and cannot be removed because OneSignal's web SDK has no removeEventListener.
      if (webListenersKey !== setupKey) {
        webListenersKey = setupKey;

        OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: unknown) => {
          const e = event as ForegroundDisplayEvent;
          showForegroundNotificationInTray(e);
          const note = readForegroundNotification(e);
          if (onNotificationHandler && note) onNotificationHandler(note);
        });

        OneSignal.Notifications.addEventListener('click', (event: unknown) => {
          if (onActionHandler) onActionHandler(event);
        });

        if (OneSignal.User?.PushSubscription) {
          OneSignal.User.PushSubscription.addEventListener('change', (event) => {
            void persistOneSignalIds(targetCollection, userId, event.current?.id);
          });
        }
      }

      if (OneSignal.User?.PushSubscription) {
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
      if (Capacitor.getPlatform() === 'android') {
        await requestAndroidNotificationPermission();
      }

      const appId = getOneSignalAppId();
      const ready = await ensureNativeOneSignalInitialized(appId);
      if (!ready) {
        return Capacitor.getPlatform() === 'android'
          ? await requestAndroidNotificationPermission()
          : false;
      }
      const OneSignalNative = await loadOneSignalNative();
      if (!OneSignalNative) return false;
      const granted = await OneSignalNative.Notifications.requestPermission(true);
      return granted === true;
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
