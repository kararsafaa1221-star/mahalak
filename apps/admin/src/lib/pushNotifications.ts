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
  Notifications?: {
    requestPermission: () => Promise<boolean>;
    permission?: boolean;
  };
  User?: {
    PushSubscription?: {
      id?: string | null;
      getIdAsync?: () => Promise<string | null>;
    };
  };
}

let activePushSetupKey: string | null = null;
let webListenersKey: string | null = null;

export function sendExternalPush(
  targetUserId: string | string[],
  title: string,
  message: string,
  channelId: string,
  targetRole?: 'customer' | 'merchant' | 'admin',
) {
  if (!auth.currentUser) return;
  const externalIds = Array.isArray(targetUserId) ? targetUserId : [targetUserId];
  if (!externalIds.length) return;

  const fn = httpsCallable(getFunctions(app), 'dispatchOneSignalPush');
  void fn({ title, message, channelId, externalIds, targetRole }).catch(() => {});
}

export async function setupPushNotifications(
  userId: string,
  targetCollection: 'customers' | 'stores' | 'admins',
) {
  const setupKey = `${targetCollection}:${userId}`;
  if (activePushSetupKey === setupKey) return;
  activePushSetupKey = setupKey;

  const appId = getOneSignalAppId();
  if (!isOneSignalConfigured()) return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
    if (window._oneSignalInitFailed) return;
    if (!window._oneSignalInitialized) {
      try {
        await OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          serviceWorkerParam: { scope: '/' },
          notifyButtonEnable: false,
        });
        window._oneSignalInitialized = true;
      } catch {
        window._oneSignalInitFailed = true;
        return;
      }
    }

    try {
      await OneSignal.login(userId);
      try {
        const granted = await OneSignal.Notifications?.requestPermission?.();
        if (granted !== true && OneSignal.Notifications?.permission !== true) {
          // Admin may dismiss; web push still works if permission granted later.
        }
      } catch {
        // ignore permission errors
      }

      // Guard: register event listeners at most once per (collection:userId) pair.
      // Without this, each call accumulates duplicate foreground handlers.
      if (webListenersKey !== setupKey) {
        webListenersKey = setupKey;
        if (OneSignal.User?.PushSubscription) {
          (OneSignal.User.PushSubscription as unknown as EventTarget)
            .addEventListener?.('change', async () => {
              const newId =
                OneSignal.User?.PushSubscription?.id ??
                (await OneSignal.User?.PushSubscription?.getIdAsync?.());
              if (newId) {
                await setDoc(
                  doc(db, targetCollection, userId),
                  { fcmToken: newId, oneSignalId: newId, pushEnabled: true },
                  { merge: true },
                );
              }
            });
        }
      }

      const osId =
        OneSignal.User?.PushSubscription?.id ??
        (await OneSignal.User?.PushSubscription?.getIdAsync?.());
      if (osId) {
        await setDoc(doc(db, targetCollection, userId), { fcmToken: osId, oneSignalId: osId, pushEnabled: true }, { merge: true });
      }
    } catch {
      // ignore
    }
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
