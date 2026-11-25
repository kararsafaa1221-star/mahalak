import React from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

/**
 * Soft offline banner with retry — does not hard-block the app so cached
 * Firestore / local cart data remain usable on weak networks.
 */
export const NetworkStatusBanner: React.FC = () => {
  const { status, isOffline, recheck } = useNetworkStatus();
  const { t } = useTranslation();

  if (status === 'online') return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[10000] bg-rose-600/95 text-white text-[10px] sm:text-[11px] font-bold py-1.5 px-3 flex items-center justify-center gap-2 safe-area-top"
      role="status"
      aria-live="polite"
      dir="rtl"
    >
      <WifiOff size={14} className="shrink-0" />
      <span className="truncate">
        {status === 'checking' ? t('network.checking') : t('network.weak')}
      </span>
      {isOffline && (
        <button
          type="button"
          onClick={() => void recheck()}
          className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/25 px-2.5 py-0.5 touch-target-sm hover:bg-white/25 transition"
        >
          <RefreshCw size={12} />
          {t('common.retry')}
        </button>
      )}
    </div>
  );
};
