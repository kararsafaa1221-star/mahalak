import React, { useEffect, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';

interface OnlineGateProps {
  children: React.ReactNode;
}

// يمنع استخدام التطبيق بدون انترنت حتى تكون النسخة Online بالكامل.
export const OnlineGate: React.FC<OnlineGateProps> = ({ children }) => {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // navigator.onLine وحده غير كاف داخل Android WebView، لذلك نعمل طلب حقيقي للانترنت.
  const checkRealConnection = async () => {
    if (!navigator.onLine) {
      setStatus('offline');
      return false;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6000);

    try {
      await fetch(`https://www.gstatic.com/generate_204?t=${Date.now()}`, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });
      setStatus('online');
      return true;
    } catch {
      setStatus('offline');
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  useEffect(() => {
    const initConnection = async () => {
      await checkRealConnection();
    };
    initConnection();

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
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center" dir="rtl">
      <div className="w-full max-w-sm bg-white/10 border border-white/10 rounded-3xl p-7 shadow-2xl backdrop-blur">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-300 flex items-center justify-center mx-auto mb-5">
          <WifiOff size={34} />
        </div>
        <h1 className="text-2xl font-black mb-2">لا يوجد اتصال بالانترنت</h1>
        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          {status === 'checking'
            ? 'جار التحقق من الاتصال بالخادم...'
            : 'تطبيق محلك يعمل Online بالكامل ويحتاج اتصال انترنت حقيقي حتى يتم تحميل البيانات وحفظها في قاعدة البيانات.'}
        </p>
        <button
          onClick={recheckConnection}
          disabled={status === 'checking'}
          className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2 transition"
        >
          <RefreshCw size={18} className={status === 'checking' ? 'animate-spin' : ''} />
          <span>{status === 'checking' ? 'جار التحقق...' : 'إعادة المحاولة'}</span>
        </button>
      </div>
    </div>
  );
};