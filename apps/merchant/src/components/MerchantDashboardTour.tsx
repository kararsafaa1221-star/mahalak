import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Joyride,
  CallBackProps,
  STATUS,
  EVENTS,
  type BeaconRenderProps,
  type Step,
} from 'react-joyride';
import type { Store } from '@shared/types';
import { StorageService } from '@shared/services/storageService';

const TOUR_STORAGE_PREFIX = 'MERCHANT_TOUR_DONE_';

function tourDoneStorageKey(storeId: string) {
  return `${TOUR_STORAGE_PREFIX}${storeId}`;
}

function MerchantTourBeacon(_props: BeaconRenderProps) {
  return (
    <span className="relative inline-flex h-9 w-9 items-center justify-center">
      <span className="absolute inset-0 rounded-full border-2 border-[#7B3DFF] bg-[#7B3DFF]/20 animate-ping" />
      <span className="relative h-3.5 w-3.5 rounded-full bg-[#7B3DFF] shadow-[0_0_12px_rgba(123,61,255,0.65)]" />
    </span>
  );
}

const tourStyles = {
  options: {
    zIndex: 10000,
    primaryColor: '#7B3DFF',
    textColor: '#E8ECF4',
    backgroundColor: '#0B1320',
    arrowColor: '#0B1320',
    overlayColor: 'rgba(11, 19, 32, 0.72)',
    spotlightShadow: '0 0 0 4px rgba(123, 61, 255, 0.35)',
    beaconSize: 36,
    width: 320,
  },
  beaconInner: {
    backgroundColor: '#7B3DFF',
  },
  beaconOuter: {
    border: '2px solid #7B3DFF',
    backgroundColor: 'rgba(123, 61, 255, 0.22)',
  },
  tooltip: {
    fontFamily: 'Tajawal, sans-serif',
    borderRadius: '1rem',
    backgroundColor: '#0B1320',
    border: '1px solid rgba(123, 61, 255, 0.35)',
    boxShadow: '0 16px 40px rgba(11, 19, 32, 0.45)',
    padding: '4px',
  },
  tooltipTitle: {
    fontFamily: 'Tajawal, sans-serif',
    fontWeight: 800,
    color: '#FFFFFF',
    fontSize: '15px',
    textAlign: 'right' as const,
  },
  tooltipContent: {
    fontFamily: 'Tajawal, sans-serif',
    padding: '12px 16px 4px',
    color: '#CBD5E1',
    fontSize: '13px',
    lineHeight: 1.6,
    textAlign: 'right' as const,
  },
  tooltipFooter: {
    marginTop: '8px',
  },
  buttonPrimary: {
    backgroundColor: '#7B3DFF',
    fontFamily: 'Tajawal, sans-serif',
    fontWeight: 700,
    borderRadius: '10px',
    padding: '8px 16px',
  },
  buttonBack: {
    color: '#A78BFA',
    marginRight: 10,
    fontFamily: 'Tajawal, sans-serif',
    fontWeight: 700,
  },
  buttonSkip: {
    color: '#94A3B8',
    fontFamily: 'Tajawal, sans-serif',
    fontWeight: 600,
  },
  spotlight: {
    stroke: 'rgba(123, 61, 255, 0.55)',
    strokeWidth: 2,
  },
};

function isTourMarkedDone(storeId: string, completedAt?: string) {
  if (completedAt) return true;
  if (StorageService.get(tourDoneStorageKey(storeId)) === true) return true;
  if (localStorage.getItem(`mahalak_merchant_tour_done_${storeId}`) === 'true') return true;
  if (localStorage.getItem(`tour_seen_${storeId}`) === 'true') return true;
  return false;
}

export const MerchantDashboardTour: React.FC<{
  merchant: Store;
  onTourComplete: () => Promise<void>;
}> = ({ merchant, onTourComplete }) => {
  const [run, setRun] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const storageKey = tourDoneStorageKey(merchant.id);

  const hasCompletedTour = useMemo(
    () => isTourMarkedDone(merchant.id, merchant.dashboardTourCompletedAt),
    [merchant.id, merchant.dashboardTourCompletedAt],
  );

  const markTourComplete = useCallback(async () => {
    StorageService.save(storageKey, true);
    localStorage.setItem(`mahalak_merchant_tour_done_${merchant.id}`, 'true');
    localStorage.setItem(`tour_seen_${merchant.id}`, 'true');
    setRun(false);
    try {
      await onTourComplete();
    } catch {
      // local + StorageService still prevent repeat on this device
    }
  }, [merchant.id, onTourComplete, storageKey]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (hasCompletedTour) {
      setRun(false);
      return;
    }

    const timer = window.setTimeout(() => setRun(true), 900);
    return () => window.clearTimeout(timer);
  }, [hasCompletedTour, merchant.id]);

  const prefix = isMobile ? '.tour-step-mobile-' : '.tour-step-desktop-';
  const sidePlacement = isMobile ? 'top' : 'right';

  const steps: Step[] = useMemo(() => {
    const base: Step[] = [
      {
        target: `${prefix}home`,
        title: 'مرحباً بك في محلك!',
        content:
          'لوحة التحكم الرئيسية — راقب مبيعاتك، الطلبات، التقييمات، والتنبيهات المهمة من نظرة واحدة.',
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: `${prefix}products`,
        title: 'المنتجات',
        content:
          'أضف منتجاتك بصور واضحة، حدّد الأسعار والخصومات، وتابع المخزون والحالة من هذا القسم.',
        placement: sidePlacement,
      },
      {
        target: `${prefix}orders`,
        title: 'الطلبات',
        content:
          'استقبل الطلبات الجديدة، حدّث حالاتها (تحضير، توصيل، تسليم)، وتواصل مع الزبائن حتى إتمام الطلب.',
        placement: sidePlacement,
      },
      {
        target: `${prefix}mystore`,
        title: 'متجري',
        content:
          'من هنا تفتح التقارير، التسويق، أكواد الخصم، وإعدادات التوصيل — كل أدوات تطوير المتجر في مكان واحد.',
        placement: sidePlacement,
      },
      {
        target: `${prefix}profile`,
        title: 'حسابي',
        content:
          'أكمل بيانات متجرك، المحفظة المالية، طرق استلام الأرباح، وإعدادات الحساب والاشتراك.',
        placement: sidePlacement,
      },
    ];

    // Skip customers card when not mounted (e.g. expired subscription forces non-home tab).
    if (typeof document !== 'undefined' && document.querySelector('.tour-step-customers-card')) {
      base.push({
        target: '.tour-step-customers-card',
        title: 'قائمة زبائني',
        content:
          'تعرّف على متابعيك وزبائنك السابقين، ابحث عنهم، أرسل هدايا وخصومات مخصصة، وتواصل معهم مباشرة.',
        placement: isMobile ? 'top' : 'bottom',
      });
    }

    return base;
  }, [prefix, sidePlacement, isMobile, run]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type } = data;
    const finished =
      status === STATUS.FINISHED ||
      status === STATUS.SKIPPED ||
      type === EVENTS.TOUR_END;
    if (finished) {
      void markTourComplete();
    }
  };

  if (hasCompletedTour) {
    return null;
  }

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      disableScrolling={false}
      spotlightPadding={10}
      beaconComponent={MerchantTourBeacon}
      steps={steps}
      styles={tourStyles}
      locale={{
        back: 'السابق',
        close: 'إغلاق',
        last: 'ابدأ الآن',
        next: 'التالي',
        skip: 'تخطي',
      }}
    />
  );
};
