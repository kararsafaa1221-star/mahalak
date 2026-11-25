import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { probeNetwork } from '../hooks/useNetworkStatus';

interface OnlineGateProps {
  children: React.ReactNode;
}

/** Optional hard gate — production apps use NetworkStatusBanner (soft) instead. */
export const OnlineGate: React.FC<OnlineGateProps> = ({ children }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const checkRealConnection = async () => {
    const online = await probeNetwork(6000);
    setStatus(online ? 'online' : 'offline');
    return online;
  };

  useEffect(() => {
    void checkRealConnection();

    const handleOnline = () => {
      setStatus('checking');
      void checkRealConnection();
    };
    const handleOffline = () => setStatus('offline');
    const handleVisibility = () => {
      if (!document.hidden) void checkRealConnection();
    };

    const interval = window.setInterval(() => {
      void checkRealConnection();
    }, 10000);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const recheckConnection = async () => {
    setStatus('checking');
    await checkRealConnection();
  };

  if (status === 'online') return <>{children}</>;

  return (
    <div className="min-h-screen bg-deep-navy text-white flex items-center justify-center p-6 text-center" dir="rtl">
      <div className="w-full max-w-sm bg-white/10 border border-white/10 rounded-3xl p-7 shadow-2xl backdrop-blur">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-300 flex items-center justify-center mx-auto mb-5">
          <WifiOff size={34} />
        </div>
        <h1 className="text-2xl font-black mb-2">{t('network.offline')}</h1>
        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          {status === 'checking' ? t('network.checking') : t('network.weak')}
        </p>
        <button
          onClick={recheckConnection}
          disabled={status === 'checking'}
          className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2 transition touch-target"
        >
          <RefreshCw size={18} className={status === 'checking' ? 'animate-spin' : ''} />
          <span>{status === 'checking' ? t('network.checking') : t('common.retry')}</span>
        </button>
      </div>
    </div>
  );
};
