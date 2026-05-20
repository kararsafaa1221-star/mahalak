import { Capacitor } from '@capacitor/core';
import OneSignalNative from 'onesignal-cordova-plugin';
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
      // ==== Customer App Channels ====
      
      // 1. Order Updates (Sound)
      await PushNotifications.createChannel({
        id: 'customer_order_updates_sound',
        name: 'تحديثات الطلبات (عالي)',
        description: 'إشعارات قبول أو رفض الطلبات',
        importance: 5, // High
        visibility: 1, // Public
        vibration: true,
      });

      // 2. Order Updates (Silent)
      await PushNotifications.createChannel({
        id: 'customer_order_updates_silent',
        name: 'حالة الطلب (صامت)',
        description: 'تغير حالة الطلب إلى قيد التجهيز أو مع المندوب',
        importance: 2, // Low (Silent)
        visibility: 1,
        vibration: false,
      });

      // 3. Promo Codes
      await PushNotifications.createChannel({
        id: 'customer_promos_sound',
        name: 'العروض ورموز الخصم',
        description: 'عند إطلاق كود خصم جديد',
        importance: 4, // Default (Sound)
        visibility: 1,
        vibration: true,
      });

      // 4. Store Products
      await PushNotifications.createChannel({
        id: 'customer_products_sound',
        name: 'المنتجات الجديدة',
        description: 'إشعارات من المتاجر التي تتابعها',
        importance: 4,
        visibility: 1,
        vibration: true,
      });

      // ==== Merchant App Channels ====
      
      // 5. New Orders (Sound)
      await PushNotifications.createChannel({
        id: 'merchant_orders_sound',
        name: 'طلبات جديدة',
        description: 'تصلك طلبات جديدة من الزبائن',
        importance: 5, // High
        visibility: 1,
        vibration: true,
      });

      // 6. Customer Activity (Silent)
      await PushNotifications.createChannel({
        id: 'merchant_activity_silent',
        name: 'نشاط الزبائن (صامت)',
        description: 'تصفح وإضافة للسلة',
        importance: 2, // Low
        visibility: 1,
        vibration: false,
      });

      // 7. Social / Follows (Silent)
      await PushNotifications.createChannel({
        id: 'merchant_social_silent',
        name: 'المتابعين الجدد',
        description: 'إشعارات بالمتابعين الجدد للمتجر',
        importance: 2,
        visibility: 1,
        vibration: false,
      });

      // ==== Shared Admin Panel Channel ====
      
      // 8. Admin Broadcasts
      await PushNotifications.createChannel({
        id: 'admin_broadcasts_sound',
        name: 'إشعارات الإدارة',
        description: 'إعلانات وإشعارات عامة',
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
  targetUserId: string,
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

  try {
    const payload = {
      app_id: appId,
      include_aliases: { external_id: [targetUserId] },
      target_channel: "push",
      headings: { en: title, ar: title },
      contents: { en: message, ar: message },
      existing_android_channel_id: channelId,
      // We can also target "android_sound": "nil" dynamically if needed, 
      // but Android 8+ relies primarily on the channel config.
    };

    if (channelId.includes('silent')) {
      (payload as any).android_sound = "nil";
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

/*
1. Customer App: Order Accepted (Sound)
--------------------------------------
{
  "app_id": "YOUR_ONESIGNAL_APP_ID",
  "include_external_user_ids": ["customer_123"],
  "headings": {"en": "محلك", "ar": "محلك"},
  "contents": {"en": "Your order has been accepted!", "ar": "تم قبول طلبك!"},
  "existing_android_channel_id": "customer_order_updates_sound"
}

2. Customer App: Order Processing / With Driver (Silent)
------------------------------------------------------
{
  "app_id": "YOUR_ONESIGNAL_APP_ID",
  "include_external_user_ids": ["customer_123"],
  "headings": {"en": "محلك", "ar": "محلك"},
  "contents": {"en": "Your order is now on the way.", "ar": "طلبك الآن مع سائق التوصيل."},
  "existing_android_channel_id": "customer_order_updates_silent",
  "android_sound": "nil"
}

3. Merchant App: New Order Received (Sound)
-----------------------------------------
{
  "app_id": "YOUR_ONESIGNAL_APP_ID",
  "include_external_user_ids": ["merchant_456"],
  "headings": {"en": "محلك", "ar": "محلك"},
  "contents": {"en": "New Order Received!", "ar": "لقد استلمت طلباً جديداً!"},
  "existing_android_channel_id": "merchant_orders_sound"
}

4. General: Admin Broadcast (Target all or specific users)
--------------------------------------------------------
{
  "app_id": "YOUR_ONESIGNAL_APP_ID",
  "included_segments": ["All"],
  "headings": {"en": "محلك", "ar": "محلك"},
  "contents": {"en": "Big Sale Today!", "ar": "عرض كبير اليوم بمناسبة العيد!"},
  "existing_android_channel_id": "admin_broadcasts_sound"
}

* NOTE: The requirement strictly stating that the sender/app name must be "محلك" 
  is fulfilled by setting the "headings" object (which corresponds to the Notification Title) 
  to "محلك".
===========================================================================
*/

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
      
      // try to catch existing subscription immediately
      OneSignalNative.User.pushSubscription.getIdAsync().then((osId) => {
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
        
        // Save push subscription if available
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
    
    return new Promise<boolean>((resolve) => {
      OneSignalNative.Notifications.requestPermission(true)
        .then((accepted) => resolve(accepted === true))
        .catch(() => resolve(false));
    });
  } else {
    // Web Push
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
  if (Notification.permission === 'granted') {
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



