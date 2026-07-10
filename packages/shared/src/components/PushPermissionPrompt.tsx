import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapPin } from 'lucide-react';
import { App } from '@capacitor/app';
import { isOneSignalConfigured } from '@shared/lib/onesignalConfig';
import { requestNotificationPermission } from '@shared/lib/pushNotifications';
import {
  markLocationPromptHandled,
  markLocationOsGranted,
  markNotificationPromptDismissed,
  requestLocationPermission,
  shouldShowLocationPrompt,
  shouldShowNotificationPrompt,
  wasLocationPromptHandled,
} from '@shared/lib/permissions';
import { Capacitor } from '@capacitor/core';

interface PushPermissionPromptProps {
  userType: 'customer' | 'merchant';
  onComplete: () => void;
  onLocationGranted?: (coords: { lat: number; lng: number }) => void;
}

type Step =
  | 'location'
  | 'location-denied'
  | 'notifications'
  | 'notifications-denied';

export const PushPermissionPrompt: React.FC<PushPermissionPromptProps> = ({
  userType,
  onComplete,
  onLocationGranted,
}) => {
  const [step, setStep] = useState<Step | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const stepRef = useRef<Step | null>(null);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const resolveInitialStep = useCallback(async () => {
    const needsLocationNative = Capacitor.isNativePlatform() && await shouldShowLocationPrompt();
    const needsLocationWeb = userType === 'customer' && !Capacitor.isNativePlatform() && !wasLocationPromptHandled();
    const needsLocation = needsLocationNative || needsLocationWeb;
    const needsNotifications = isOneSignalConfigured() && await shouldShowNotificationPrompt();

    if (!needsLocation && !needsNotifications) {
      if (stepRef.current) {
        setStep(null);
        onComplete();
      }
      return;
    }

    const current = stepRef.current;
    if (current === 'location' && !needsLocation) {
      if (needsNotifications) {
        setStep('notifications');
      } else {
        setStep(null);
        onComplete();
      }
      return;
    }
    if (current === 'location-denied' || current === 'notifications' || current === 'notifications-denied') {
      return;
    }

    if (needsLocation) {
      setStep('location');
      return;
    }

    if (needsNotifications) {
      setStep('notifications');
    }
  }, [userType, onComplete]);

  useEffect(() => {
    void resolveInitialStep();
  }, [resolveInitialStep]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return;
      void resolveInitialStep();
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [resolveInitialStep]);

  const finish = () => {
    setStep(null);
    onComplete();
  };

  const goToNotificationsStep = () => {
    void (async () => {
      if (isOneSignalConfigured() && await shouldShowNotificationPrompt()) {
        setStep('notifications');
        return;
      }
      finish();
    })();
  };

  const handleLocationEnable = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const result = await requestLocationPermission();
      markLocationPromptHandled();

      if (result.outcome === 'granted') {
        markLocationOsGranted();
        if (result.coords) {
          try {
            await onLocationGranted?.(result.coords);
          } catch {
            // Saving coords is optional — do not block notification permission.
          }
        }
        goToNotificationsStep();
        return;
      }

      if (result.outcome === 'denied') {
        setStep('location-denied');
        return;
      }

      goToNotificationsStep();
    } catch {
      markLocationPromptHandled();
      setStep('location-denied');
    } finally {
      setIsBusy(false);
    }
  };

  const handleLocationSkip = () => {
    markLocationPromptHandled();
    goToNotificationsStep();
  };

  const handleNotificationEnable = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const granted = await requestNotificationPermission();
      if (!granted) {
        markNotificationPromptDismissed();
        setStep('notifications-denied');
        return;
      }
      finish();
    } catch {
      markNotificationPromptDismissed();
      setStep('notifications-denied');
    } finally {
      setIsBusy(false);
    }
  };

  const handleNotificationSkip = () => {
    markNotificationPromptDismissed();
    finish();
  };

  if (!step) return null;

  if (step === 'location') {
    const locationBody = userType === 'merchant'
      ? 'يرجى السماح بالوصول لموقعك لتحديد موقع متجرك على الخريطة وتسهيل التوصيل للزبائن.'
      : 'يرجى السماح بالوصول لموقعك لعرض المتاجر الأقرب إليك وحساب مسافات التوصيل بدقة.';
    return (
      <PermissionModal
        icon={<MapPin size={32} className="text-vibrant-purple animate-bounce" />}
        iconBg="bg-violet/10"
        title="تفعيل الموقع الجغرافي"
        body={locationBody}
        primaryLabel={isBusy ? 'جاري الطلب...' : 'حسناً، تفعيل الموقع'}
        onPrimary={handleLocationEnable}
        secondaryLabel="ليس الآن"
        onSecondary={handleLocationSkip}
        primaryDisabled={isBusy}
      />
    );
  }

  if (step === 'location-denied') {
    const deniedBody = userType === 'merchant'
      ? 'يمكنك المتابعة بدون الموقع. لاحقاً فعّله من إعدادات الهاتف إذا أردت تحديث موقع المتجر على الخريطة.'
      : 'يمكنك المتابعة بدون الموقع. لاحقاً فعّله من إعدادات المتصفح أو الهاتف إذا أردت عرض المتاجر الأقرب إليك.';
    return (
      <PermissionModal
        icon={<MapPin size={32} className="text-amber-500" />}
        iconBg="bg-amber-50"
        title="لم يُفعَّل الموقع"
        body={deniedBody}
        primaryLabel="متابعة"
        onPrimary={goToNotificationsStep}
        secondaryLabel="إعادة المحاولة"
        onSecondary={() => setStep('location')}
      />
    );
  }

  const notificationContent =
    userType === 'customer'
      ? {
          title: 'لا تفوتك التحديثات! 🔔',
          body: 'فعل الإشعارات حتى يصلك إشعار فوري عند تغيّر حالة طلبك، وتكون أول من يعلم بالعروض والخصومات.',
        }
      : {
          title: 'تابع مبيعاتك أول بأول! 📈',
          body: 'فعّل الإشعارات لتصلك تنبيهات فورية عند دخول طلب جديد أو أي نشاط في متجرك.',
        };

  if (step === 'notifications') {
    return (
      <PermissionModal
        icon={
          <svg className="w-8 h-8 text-blue-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        }
        iconBg="bg-blue-50"
        title={notificationContent.title}
        body={notificationContent.body}
        primaryLabel={isBusy ? 'جاري الطلب...' : 'تفعيل الآن'}
        onPrimary={handleNotificationEnable}
        secondaryLabel="ليس الآن"
        onSecondary={handleNotificationSkip}
        primaryDisabled={isBusy}
      />
    );
  }

  return (
    <PermissionModal
      icon={
        <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      }
      iconBg="bg-rose-50"
      title="لم تُفعَّل الإشعارات"
      body="يمكنك المتابعة بدون إشعارات. لتفعيلها لاحقاً، افتح إعدادات المتصفح أو الهاتف واسمح بالإشعارات لتطبيق محلك."
      primaryLabel="حسناً"
      onPrimary={finish}
    />
  );
};

interface PermissionModalProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  primaryDisabled?: boolean;
}

function PermissionModal({
  icon,
  iconBg,
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  primaryDisabled,
}: PermissionModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] isolate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="permission-modal-title"
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden />

      <div className="relative z-[1] flex h-full w-full items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="space-y-4 p-8 text-center">
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${iconBg}`}>
              {icon}
            </div>
            <h3 id="permission-modal-title" className="text-2xl font-black tracking-tight text-slate-900">
              {title}
            </h3>
            <p className="px-2 text-[15px] font-medium leading-relaxed text-slate-500">{body}</p>
          </div>
          <div className="space-y-3 border-t border-slate-100 bg-slate-50/80 p-5">
            <button
              type="button"
              onClick={onPrimary}
              disabled={primaryDisabled}
              className="w-full rounded-2xl bg-vibrant-purple py-4 text-base font-black text-white shadow-xl shadow-vibrant-purple/25/20 transition-all hover:bg-violet active:scale-[0.98] disabled:opacity-60"
            >
              {primaryLabel}
            </button>
            {secondaryLabel && onSecondary && (
              <button
                type="button"
                onClick={onSecondary}
                disabled={primaryDisabled}
                className="w-full rounded-2xl py-3 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-200/50 disabled:opacity-60"
              >
                {secondaryLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
