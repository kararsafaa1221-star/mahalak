import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

declare global {
  interface Window {
    OneSignalDeferred: any[];
    OneSignal: any;
  }
}

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', registration);
      return registration;
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  }
}

export async function createNotificationChannels() {
  if (Capacitor.getPlatform() === 'android') {
    try {
      // ==== 1. قنوات تطبيق الزبون ====
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
        description: 'إشعارات من M المتاجر التي تتابعها',
        importance: 4,
        visibility: 1,
        vibration: true,
      });

      // ==== 2. قنوات مركز التجارة ====
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

      // ==== 3. قناة لوحة الإدارة العامة (محلك) ====
      await PushNotifications.createChannel({
        id: 'admin_broadcasts_sound',
        name: 'إشعارات الإدارة',
        description: 'إعلانات وإشعارات عامة من لوحة الأدمن',
        importance: 5,
        visibility: 1,
        vibration: true,
      });

      console.log('Push notification channels created successfully');
    } catch (e) {
      console.error('Error creating notification channels', e);
    }
  }
}

export async function sendExternalPush(
  targetUserId: string | string[],
  title: string,
  message: string,
  channelId: string
) {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  const restApiKey = import.meta.env.VITE_ONESIGNAL_REST_API_KEY;

  if (!appId || !restApiKey) {
    console.warn("OneSignal API credentials missing. Push not sent.");
    return;
  }

  const externalIds = Array.isArray(targetUserId) ? targetUserId : [targetUserId];

  try {
    const payload = {
      app_id: appId,
      include_aliases: { external_id: externalIds },
      target_channel: "push",
      headings: { en: title, ar: title },
      contents: { en: message, ar: message },
      existing_android_channel_id: channelId,
    };

    if (channelId.includes('silent')) {
      (payload as any).android_sound = "nil";
      (payload as any).ios_sound = "nil";
    } else {
      (payload as any).ios_sound = "alert_sound.wav";
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${restApiKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("OneSignal push sent successfully", data);
  } catch (error) {
    console.error("Error sending OneSignal push:", error);
  }
}

export async function setupPushNotifications(
  userId: string,
  targetCollection: 'customers' | 'stores' | 'admins',
  onNotification?: (notification: any) => void,
  onAction?: (action: any) => void
) {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID || "";

  await createNotificationChannels();

  if (Capacitor.isNativePlatform()) {
    try {
      if (!appId || appId === "YOUR_ONESIGNAL_APP_ID_HERE" || appId.length < 10) {
        console.warn("OneSignal App ID is missing or invalid. Skipping native initialization.");
        return;
      }

      let OneSignalNative;
      try {
        const module = await import('onesignal-cordova-plugin');
        OneSignalNative = module.default;
      } catch (err) {
        console.error("Failed to load onesignal-cordova-plugin", err);
        return;
      }

      OneSignalNative.initialize(appId);

      OneSignalNative.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
        if (onNotification && event.notification) {
          try {
            onNotification(event.notification.getNotification ? event.notification.getNotification() : event.notification);
          } catch(e) {
            console.error("Error processing foreground notification", e);
          }
        }
      });

      OneSignalNative.Notifications.addEventListener('click', (event: any) => {
        if (onAction) onAction(event.notification);
      });

      OneSignalNative.login(userId);

      OneSignalNative.User.pushSubscription.addEventListener('change', (event: any) => {
        if (event.current && event.current.id) {
           setDoc(doc(db, targetCollection, userId), {
             fcmToken: event.current.id,
             oneSignalId: event.current.id
           }, { merge: true }).catch(e => console.error("Failed to save OneSignal ID", e));
        }
      });

      OneSignalNative.User.pushSubscription.getIdAsync().then((osId: string | null) => {
        if(osId) {
          setDoc(doc(db, targetCollection, userId), {
            fcmToken: osId,
            oneSignalId: osId
          }, { merge: true }).catch(e => console.error("Failed to save OneSignal ID", e));
        }
      });

    } catch (e) {
      console.error("Native OneSignal setup error:", e);
    }
  } else {
    try {
      if (!appId || appId.length < 10) {
        console.warn("OneSignal (Web) App ID missing.");
        return;
      }

      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        await OneSignal.init({
          appId: appId,
          allowLocalhostAsSecureOrigin: true,
        });

        await OneSignal.login(userId);

        OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
           if (onNotification) onNotification(event.notification);
        });

        OneSignal.Notifications.addEventListener('click', (event: any) => {
           if (onAction) onAction(event.notification);
        });

        if (OneSignal.User && OneSignal.User.PushSubscription) {
           const osId = OneSignal.User.PushSubscription.id;
           if (osId) {
              setDoc(doc(db, targetCollection, userId), {
                fcmToken: osId,
                oneSignalId: osId
              }, { merge: true }).catch(e => console.error("Failed to save OneSignal ID", e));
           }
        }
      });
    } catch (error) {
      console.error("Web OneSignal setup error:", error);
    }
  }
}

export async function requestNotificationPermission() {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID || "";

  if (Capacitor.isNativePlatform()) {
    if (!appId || appId.length < 10) return false;

    return import('onesignal-cordova-plugin')
      .then(module => {
        const OneSignalNative = module.default;
        return OneSignalNative.Notifications.requestPermission(true)
          .then((accepted: any) => accepted === true)
          .catch(() => false);
      })
      .catch((err) => {
        console.error("Failed to load onesignal-cordova-plugin for permission", err);
        return false;
      });
  } else {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        Notification.requestPermission().then(perm => {
          console.log("Native notification permission state:", perm);
        }).catch(err => {
          console.warn("Native notification permission request failed:", err);
        });
      } catch (e) {
        console.warn("Notification.requestPermission exception:", e);
      }
    }
    return new Promise<boolean>((resolve) => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        if (OneSignal.Notifications) {
          await OneSignal.Notifications.requestPermission();
          resolve(OneSignal.Notifications.permission === true);
        } else {
          resolve(false);
        }
      });
    });
  }
}

export async function showLocalNotification(title: string, body: string, data?: any) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    const registration = await navigator.serviceWorker.ready;
    registration.showNotification(title, {
      body,
      icon: '/icon.png',
      data: data,
      dir: 'rtl',
      lang: 'ar-IQ'
    });
  }
}