import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Joyride,
  CallBackProps,
  STATUS,
  EVENTS,
  type BeaconRenderProps,
  type Step,
} from 'react-joyride';
import { useTranslation } from 'react-i18next';
import type { Store } from '@shared/types';
import { StorageService } from '@shared/services/storageService';
import { getTimestampMillis } from '@shared/utils/date';

const TOUR_STORAGE_PREFIX = 'MERCHANT_TOUR_DONE_';
const TOUR_ELIGIBLE_PREFIX = 'mahalak_tour_eligible_';
/** نافذة قصيرة بعد إنشاء الحساب فقط — بعدها لا تُعرض الجولة أبداً حتى لو لم تُكمل */
const FIRST_ACCOUNT_TOUR_WINDOW_MS = 48 * 60 * 60 * 1000;

const STORE_FONT = 'var(--font-ui), Vazirmatn, Cairo, sans-serif';

function tourDoneStorageKey(storeId: string) {
  return `${TOUR_STORAGE_PREFIX}${storeId}`;
}

export function markMerchantTourEligible(storeId: string) {
  if (!storeId || typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(`${TOUR_ELIGIBLE_PREFIX}${storeId}`, '1');
  } catch {
    // ignore quota / private mode
  }
}

function isTourEligibleSession(storeId: string) {
  try {
    return sessionStorage.getItem(`${TOUR_ELIGIBLE_PREFIX}${storeId}`) === '1';
  } catch {
    return false;
  }
}

function clearTourEligibleSession(storeId: string) {
  try {
    sessionStorage.removeItem(`${TOUR_ELIGIBLE_PREFIX}${storeId}`);
  } catch {
    // ignore
  }
}

function isBrandNewMerchantAccount(merchant: Store) {
  const createdMs = getTimestampMillis((merchant as { createdAt?: unknown }).createdAt);
  if (!createdMs) return false;
  return Date.now() - createdMs <= FIRST_ACCOUNT_TOUR_WINDOW_MS;
}

function isTourMarkedDone(storeId: string, completedAt?: string) {
  if (completedAt) return true;
  if (StorageService.get(tourDoneStorageKey(storeId)) === true) return true;
  if (localStorage.getItem(`mahalak_merchant_tour_done_${storeId}`) === 'true') return true;
  if (localStorage.getItem(`tour_seen_${storeId}`) === 'true') return true;
  return false;
}

/** تظهر الجولة فقط لحساب جديد لأول مرة ولم تُكمَل بعد */
function shouldShowFirstTimeTour(merchant: Store) {
  if (isTourMarkedDone(merchant.id, merchant.dashboardTourCompletedAt)) return false;
  if (isTourEligibleSession(merchant.id)) return true;
  return isBrandNewMerchantAccount(merchant);
}

function MerchantTourBeacon(_props: BeaconRenderProps) {
  return (
    <span className="relative inline-flex h-9 w-9 items-center justify-center" aria-hidden>
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
    overlayColor: 'rgba(11, 19, 32, 0.78)',
    spotlightShadow: '0 0 0 3px rgba(123, 61, 255, 0.4)',
    beaconSize: 36,
    width: 300,
  },
  tooltip: {
    fontFamily: STORE_FONT,
    borderRadius: '1.25rem',
    backgroundColor: '#0B1320',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    boxShadow: '0 16px 40px rgba(11, 19, 32, 0.55), 0 0 24px -6px rgba(123, 61, 255, 0.35)',
    padding: '6px',
  },
  tooltipContainer: {
    textAlign: 'right' as const,
  },
  tooltipTitle: {
    fontFamily: STORE_FONT,
    fontWeight: 800,
    color: '#FFFFFF',
    fontSize: '15px',
    lineHeight: 1.45,
    textAlign: 'right' as const,
    letterSpacing: '0',
  },
  tooltipContent: {
    fontFamily: STORE_FONT,
    padding: '10px 14px 2px',
    color: 'rgba(232, 236, 244, 0.78)',
    fontSize: '12.5px',
    fontWeight: 600,
    lineHeight: 1.7,
    textAlign: 'right' as const,
  },
  tooltipFooter: {
    marginTop: '10px',
  },
  buttonNext: {
    backgroundColor: '#7B3DFF',
    fontFamily: STORE_FONT,
    fontWeight: 800,
    borderRadius: '12px',
    padding: '9px 18px',
    fontSize: '12px',
    border: '1px solid rgba(255,255,255,0.25)',
  },
  buttonPrimary: {
    backgroundColor: '#7B3DFF',
    fontFamily: STORE_FONT,
    fontWeight: 800,
    borderRadius: '12px',
    padding: '9px 18px',
    fontSize: '12px',
    border: '1px solid rgba(255,255,255,0.25)',
  },
  buttonBack: {
    color: '#B18CFF',
    marginRight: 8,
    fontFamily: STORE_FONT,
    fontWeight: 700,
    fontSize: '12px',
  },
  buttonSkip: {
    color: 'rgba(232, 236, 244, 0.55)',
    fontFamily: STORE_FONT,
    fontWeight: 700,
    fontSize: '12px',
  },
  spotlight: {
    borderRadius: '16px',
  },
};

export const MerchantDashboardTour: React.FC<{
  merchant: Store;
  onTourComplete: () => Promise<void>;
}> = ({ merchant, onTourComplete }) => {
  const { t } = useTranslation();
  const [run, setRun] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const storageKey = tourDoneStorageKey(merchant.id);

  const canShowTour = shouldShowFirstTimeTour(merchant);

  const markTourComplete = useCallback(async () => {
    StorageService.save(storageKey, true);
    localStorage.setItem(`mahalak_merchant_tour_done_${merchant.id}`, 'true');
    localStorage.setItem(`tour_seen_${merchant.id}`, 'true');
    clearTourEligibleSession(merchant.id);
    setRun(false);
    try {
      await onTourComplete();
    } catch {
      // التخزين المحلي يمنع التكرار على هذا الجهاز
    }
  }, [merchant.id, onTourComplete, storageKey]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!canShowTour) {
      setRun(false);
      return;
    }

    const timer = window.setTimeout(() => setRun(true), 1000);
    return () => window.clearTimeout(timer);
  }, [canShowTour, merchant.id]);

  const prefix = isMobile ? '.tour-step-mobile-' : '.tour-step-desktop-';
  const sidePlacement = isMobile ? 'top' : 'right';

  const steps: Step[] = useMemo(() => {
    const base: Step[] = [
      {
        target: `${prefix}home`,
        title: t('merchant.tour.welcomeTitle'),
        content: t('merchant.tour.welcomeBody'),
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: `${prefix}products`,
        title: t('merchant.tour.productsTitle'),
        content: t('merchant.tour.productsBody'),
        placement: sidePlacement,
      },
      {
        target: `${prefix}orders`,
        title: t('merchant.tour.ordersTitle'),
        content: t('merchant.tour.ordersBody'),
        placement: sidePlacement,
      },
      {
        target: `${prefix}mystore`,
        title: t('merchant.tour.myStoreTitle'),
        content: t('merchant.tour.myStoreBody'),
        placement: sidePlacement,
      },
      {
        target: `${prefix}profile`,
        title: t('merchant.tour.profileTitle'),
        content: t('merchant.tour.profileBody'),
        placement: sidePlacement,
      },
    ];

    return base;
  }, [prefix, sidePlacement, t]);

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

  if (!canShowTour) {
    return null;
  }

  return (
    <>
      <style>{`
        .react-joyride__tooltip,
        .react-joyride__tooltip * {
          font-family: ${STORE_FONT} !important;
        }
        .react-joyride__tooltip {
          direction: rtl;
        }
      `}</style>
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
          back: t('merchant.tour.back'),
          close: t('common.close'),
          last: t('merchant.tour.last'),
          next: t('merchant.tour.next'),
          skip: t('merchant.tour.skip'),
        }}
      />
    </>
  );
};
