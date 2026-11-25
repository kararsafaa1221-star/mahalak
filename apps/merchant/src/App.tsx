import React, { Suspense, lazy, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppProvider } from '@shared/context/AppContext';
import { StorageService } from '@shared/services/storageService';
import { useAuthSession } from '@shared/context/AuthSessionContext';
import { NetworkStatusBanner } from '@shared/components/NetworkStatusBanner';
import { useAdaptivePlatform } from '@shared/hooks/useAdaptivePlatform';
import { WelcomeScreen } from './views/WelcomeScreen';
import { PrivacyPolicy } from './views/PrivacyPolicy';
import { AboutUs } from './views/AboutUs';
import { registerServiceWorker, setupPushNotifications, resetPushNotificationSetup, preloadOneSignal } from '@shared/lib/pushNotifications';
import { warnIfOneSignalNotConfigured } from '@shared/lib/onesignalConfig';
import { useAndroidBackButton } from '@shared/hooks/useAndroidBackButton';
import { UpdateManager } from '@shared/components/UpdateManager';
import { LocaleProvider } from '@shared/i18n/LocaleProvider';
import { Bell, Loader2 } from 'lucide-react';
import appVersions from '../../../config/app-versions.json';

const MERCHANT_ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=iq.mahalak.merchant';
// Replace this search URL with the direct listing after App Store Connect assigns its numeric app ID.
const MERCHANT_IOS_STORE_URL = 'https://apps.apple.com/iq/search?term=%D9%85%D8%AD%D9%84%D9%83%20%D8%AA%D8%A7%D8%AC%D8%B1';

const MerchantApp = lazy(() =>
  import('./views/MerchantApp').then((module) => ({ default: module.MerchantApp })),
);

const MerchantRoutes: React.FC = () => {
  const { currentMerchant, authInitialized } = useAuthSession();
  const { t } = useTranslation();
  const [foregroundNotification, setForegroundNotification] = useState<{ title: string; body: string } | null>(null);

  useAdaptivePlatform();
  useAndroidBackButton();

  useEffect(() => {
    warnIfOneSignalNotConfigured('merchant');
    preloadOneSignal();
    registerServiceWorker();

    if (currentMerchant) {
      const handleReceived = (notification: { title?: string; body?: string }) => {
        setForegroundNotification({
          title: notification.title || t('notifications.newNotification'),
          body: notification.body || '',
        });
      };
      setupPushNotifications(currentMerchant.id, 'stores', handleReceived);
    } else {
      resetPushNotificationSetup();
    }
  }, [currentMerchant, t]);

  return (
    <>
      <NetworkStatusBanner />
      {foregroundNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100000] w-[90%] max-w-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-4 border flex items-start gap-4">
            <Bell size={24} className="text-indigo-600 mt-1" />
            <div className="flex-1">
              <h4 className="text-base font-black text-slate-900 mb-1 leading-snug">{foregroundNotification.title}</h4>
              <p className="text-sm text-slate-500 font-normal leading-relaxed">{foregroundNotification.body}</p>
            </div>
          </div>
        </div>
      )}
      <Routes>
        <Route
          path="/"
          element={
            currentMerchant || (authInitialized && StorageService.get('LOGGED_IN_MERCHANT_ID'))
              ? <Navigate to="/dashboard" replace />
              : <WelcomeScreen />
          }
        />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route
          path="/dashboard/*"
          element={
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-mahalak-gradient">
                  <Loader2 size={32} className="text-white animate-spin" />
                </div>
              }
            >
              <MerchantApp />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default function App() {
  return (
    <LocaleProvider>
      <MerchantAppShell />
    </LocaleProvider>
  );
}

function MerchantAppShell() {
  const { t } = useTranslation();
  return (
    <UpdateManager
      appName={t('app.merchantName')}
      currentVersion={appVersions.merchant.versionName}
      androidStoreUrl={MERCHANT_ANDROID_STORE_URL}
      iosStoreUrl={MERCHANT_IOS_STORE_URL}
    >
      <HashRouter>
        <AppProvider>
          <MerchantRoutes />
        </AppProvider>
      </HashRouter>
    </UpdateManager>
  );
}
