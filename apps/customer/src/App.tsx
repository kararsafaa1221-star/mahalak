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

const CUSTOMER_ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=iq.mahalak.app';
// Replace this search URL with the direct listing after App Store Connect assigns its numeric app ID.
const CUSTOMER_IOS_STORE_URL = 'https://apps.apple.com/iq/search?term=%D9%85%D8%AD%D9%84%D9%83';

const CustomerApp = lazy(() =>
  import('./views/CustomerApp').then((module) => ({ default: module.CustomerApp })),
);

interface RootRouteProps {
  authInitialized: boolean;
  authLoading: boolean;
  currentCustomer: ReturnType<typeof useAuthSession>['currentCustomer'];
}

/**
 * Decides whether to show WelcomeScreen or redirect to /dashboard.
 *
 * We MUST wait for the session-restore cycle to finish (authLoading === false)
 * before trusting that currentCustomer is null — otherwise a stale
 * LOGGED_IN_CUSTOMER_ID in localStorage would briefly appear valid and
 * send the user to an empty dashboard shell.
 */
const RootRoute: React.FC<RootRouteProps> = ({ authInitialized, authLoading, currentCustomer }) => {
  useEffect(() => {
    // Once auth has fully settled and no customer was restored, prune any
    // stale storage entry so we don't re-enter this path on the next cold start.
    if (authInitialized && !authLoading && !currentCustomer) {
      StorageService.remove('LOGGED_IN_CUSTOMER_ID');
    }
  }, [authInitialized, authLoading, currentCustomer]);

  if (!authInitialized || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mahalak-gradient">
        <Loader2 size={32} className="text-white animate-spin" />
      </div>
    );
  }

  return currentCustomer ? <Navigate to="/dashboard" replace /> : <WelcomeScreen />;
};

const CustomerRoutes: React.FC = () => {
  const { currentCustomer, authInitialized, authLoading } = useAuthSession();
  const { t } = useTranslation();
  const [foregroundNotification, setForegroundNotification] = useState<{ title: string; body: string } | null>(null);

  useAdaptivePlatform();
  useAndroidBackButton();

  useEffect(() => {
    warnIfOneSignalNotConfigured('customer');
    preloadOneSignal();
    registerServiceWorker();

    if (currentCustomer) {
      const handleReceived = (notification: { title?: string; body?: string }) => {
        setForegroundNotification({
          title: notification.title || t('notifications.newNotification'),
          body: notification.body || '',
        });
      };
      setupPushNotifications(currentCustomer.id, 'customers', handleReceived);
    } else {
      resetPushNotificationSetup();
    }
  }, [currentCustomer, t]);

  useEffect(() => {
    if (!foregroundNotification) return;
    const timer = setTimeout(() => setForegroundNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [foregroundNotification]);

  return (
    <>
      <NetworkStatusBanner />
      {foregroundNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100000] w-[90%] max-w-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-4 border border-slate-100 flex items-start gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Bell size={24} />
            </div>
            <div className="flex-1 mt-1">
              <h4 className="text-base font-black text-slate-900 mb-1 leading-snug">{foregroundNotification.title}</h4>
              <p className="text-sm text-slate-500 font-normal leading-relaxed">{foregroundNotification.body}</p>
            </div>
            <button type="button" onClick={() => setForegroundNotification(null)} className="text-slate-400 p-1.5 touch-target-sm">✕</button>
          </div>
        </div>
      )}
      <Routes>
        <Route
          path="/"
          element={<RootRoute
            authInitialized={authInitialized}
            authLoading={authLoading}
            currentCustomer={currentCustomer}
          />}
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
              <CustomerApp />
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
      <CustomerAppShell />
    </LocaleProvider>
  );
}

function CustomerAppShell() {
  const { t } = useTranslation();
  return (
    <UpdateManager
      appName={t('app.customerName')}
      currentVersion={appVersions.customer.versionName}
      androidStoreUrl={CUSTOMER_ANDROID_STORE_URL}
      iosStoreUrl={CUSTOMER_IOS_STORE_URL}
    >
      <HashRouter>
        <AppProvider>
          <CustomerRoutes />
        </AppProvider>
      </HashRouter>
    </UpdateManager>
  );
}
