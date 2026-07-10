import firebaseConfigJson from '../../../../config/firebase.config.json';

type MahalakAppTarget = 'customer' | 'merchant';

function getMahalakAppTarget(): MahalakAppTarget {
  const target = import.meta.env.VITE_MAHALAK_APP?.trim();
  return target === 'merchant' ? 'merchant' : 'customer';
}

/** OneSignal App ID — per-app via apps/customer/.env or apps/merchant/.env (VITE_ONESIGNAL_APP_ID). */
export function getOneSignalAppId(): string {
  const fromEnv = import.meta.env.VITE_ONESIGNAL_APP_ID?.trim();
  if (fromEnv && fromEnv.length >= 10 && !fromEnv.startsWith('YOUR_')) {
    return fromEnv;
  }

  const config = firebaseConfigJson as {
    oneSignalAppId?: string;
    merchantOneSignalAppId?: string;
  };
  const fallback =
    getMahalakAppTarget() === 'merchant'
      ? config.merchantOneSignalAppId?.trim()
      : config.oneSignalAppId?.trim();
  return fallback && fallback.length >= 10 ? fallback : '';
}

export function isOneSignalConfigured(): boolean {
  return getOneSignalAppId().length >= 10;
}

/** Logs a dev/build warning when VITE_ONESIGNAL_APP_ID is missing for native push. */
export function warnIfOneSignalNotConfigured(appLabel: 'customer' | 'merchant'): void {
  if (isOneSignalConfigured()) return;
  console.warn(
    `[Mahalak ${appLabel}] VITE_ONESIGNAL_APP_ID is not set. ` +
    `Add it to apps/${appLabel}/.env (see .env.example) before Android/iOS builds.`,
  );
}
