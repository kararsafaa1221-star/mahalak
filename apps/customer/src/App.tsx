import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@shared/context/AppContext';
import { useApp } from '@shared/context/useApp';
import { CustomerApp } from './views/CustomerApp';
import { WelcomeScreen } from './views/WelcomeScreen';
import { PrivacyPolicy } from './views/PrivacyPolicy';
import { AboutUs } from './views/AboutUs';
import { registerServiceWorker, setupPushNotifications, resetPushNotificationSetup, preloadOneSignal } from '@shared/lib/pushNotifications';
import { warnIfOneSignalNotConfigured } from '@shared/lib/onesignalConfig';
import { auth } from '@shared/lib/firebase';
import { useAndroidBackButton } from '@shared/hooks/useAndroidBackButton';
import { Bell, WifiOff, Loader2 } from 'lucide-react';

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
    <div className="fixed top-0 left-0 right-0 z-[10000] bg-red-600 text-white text-[10px] font-bold py-1 px-4 flex items-center justify-center gap-2 animate-pulse">
      <WifiOff size={14} />
      <span>فقدت الاتصال بالإنترنت</span>
    </div>
  );
};

const CustomerRoutes: React.FC = () => {
  const { currentCustomer } = useApp();
  const [foregroundNotification, setForegroundNotification] = useState<{ title: string; body: string } | null>(null);

  useAndroidBackButton();

  useEffect(() => {
    warnIfOneSignalNotConfigured('customer');
    preloadOneSignal();
    registerServiceWorker();

    if (currentCustomer) {
      const handleReceived = (notification: { title?: string; body?: string }) => {
        setForegroundNotification({
          title: notification.title || 'إشعار جديد',
          body: notification.body || '',
        });
      };
      setupPushNotifications(currentCustomer.id, 'customers', handleReceived);
    } else {
      resetPushNotificationSetup();
    }
  }, [currentCustomer]);

  useEffect(() => {
    if (!foregroundNotification) return;
    const timer = setTimeout(() => setForegroundNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [foregroundNotification]);

  return (
    <>
      <StatusIndicator />
      {foregroundNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100000] w-[90%] max-w-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-4 border border-slate-100 flex items-start gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Bell size={24} />
            </div>
            <div className="flex-1 mt-1">
              <h4 className="font-black text-slate-800 text-sm mb-1">{foregroundNotification.title}</h4>
              <p className="text-xs text-slate-500 font-semibold">{foregroundNotification.body}</p>
            </div>
            <button type="button" onClick={() => setForegroundNotification(null)} className="text-slate-400 p-1.5">✕</button>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/" element={currentCustomer ? <Navigate to="/dashboard" replace /> : <WelcomeScreen />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/dashboard/*" element={<CustomerApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <CustomerRoutes />
      </AppProvider>
    </HashRouter>
  );
}
