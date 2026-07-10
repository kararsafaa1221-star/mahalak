import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@shared/context/AppContext';
import { useApp } from '@shared/context/useApp';
import { MerchantApp } from './views/MerchantApp';
import { WelcomeScreen } from './views/WelcomeScreen';
import { PrivacyPolicy } from './views/PrivacyPolicy';
import { AboutUs } from './views/AboutUs';
import { registerServiceWorker, setupPushNotifications, resetPushNotificationSetup, preloadOneSignal } from '@shared/lib/pushNotifications';
import { warnIfOneSignalNotConfigured } from '@shared/lib/onesignalConfig';
import { useAndroidBackButton } from '@shared/hooks/useAndroidBackButton';
import { Bell, WifiOff } from 'lucide-react';

const StatusIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] bg-red-600 text-white text-[10px] font-bold py-1 px-4 flex items-center justify-center gap-2">
      <WifiOff size={14} />
      <span>فقدت الاتصال بالإنترنت</span>
    </div>
  );
};

const MerchantRoutes: React.FC = () => {
  const { currentMerchant } = useApp();
  const [foregroundNotification, setForegroundNotification] = useState<{ title: string; body: string } | null>(null);

  useAndroidBackButton();

  useEffect(() => {
    warnIfOneSignalNotConfigured('merchant');
    preloadOneSignal();
    registerServiceWorker();

    if (currentMerchant) {
      const handleReceived = (notification: { title?: string; body?: string }) => {
        setForegroundNotification({
          title: notification.title || 'إشعار جديد',
          body: notification.body || '',
        });
      };
      setupPushNotifications(currentMerchant.id, 'stores', handleReceived);
    } else {
      resetPushNotificationSetup();
    }
  }, [currentMerchant]);

  return (
    <>
      <StatusIndicator />
      {foregroundNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100000] w-[90%] max-w-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-4 border flex items-start gap-4">
            <Bell size={24} className="text-indigo-600 mt-1" />
            <div className="flex-1">
              <h4 className="font-black text-sm">{foregroundNotification.title}</h4>
              <p className="text-xs text-slate-500">{foregroundNotification.body}</p>
            </div>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/" element={currentMerchant ? <Navigate to="/dashboard" replace /> : <WelcomeScreen />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/dashboard/*" element={<MerchantApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <MerchantRoutes />
      </AppProvider>
    </HashRouter>
  );
}
