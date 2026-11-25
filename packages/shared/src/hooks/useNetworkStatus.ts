import { useCallback, useEffect, useState } from 'react';

export type NetworkStatus = 'online' | 'offline' | 'checking';

/**
 * Real connectivity probe — `navigator.onLine` alone is unreliable in
 * Android/iOS WebViews on weak networks.
 */
export async function probeNetwork(timeoutMs = 6000): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(`https://www.gstatic.com/generate_204?t=${Date.now()}`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function useNetworkStatus(pollIntervalMs = 12_000) {
  const [status, setStatus] = useState<NetworkStatus>(() =>
    typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'checking',
  );

  const recheck = useCallback(async () => {
    setStatus((prev) => (prev === 'offline' ? 'checking' : prev));
    const online = await probeNetwork();
    setStatus(online ? 'online' : 'offline');
    return online;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const online = await probeNetwork();
      if (!cancelled) setStatus(online ? 'online' : 'offline');
    };

    void run();

    const handleOnline = () => {
      setStatus('checking');
      void run();
    };
    const handleOffline = () => setStatus('offline');
    const handleVisibility = () => {
      if (!document.hidden) void run();
    };

    const interval = window.setInterval(() => {
      void run();
    }, pollIntervalMs);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [pollIntervalMs]);

  return { status, isOnline: status === 'online', isOffline: status === 'offline', recheck };
}
