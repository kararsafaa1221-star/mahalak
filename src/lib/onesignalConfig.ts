import firebaseConfigJson from '../../firebase.config.json';

/** OneSignal App ID — from Vite env at build time, or firebase.config.json. */
export function getOneSignalAppId(): string {
  const fromEnv = import.meta.env.VITE_ONESIGNAL_APP_ID?.trim();
  if (fromEnv && fromEnv.length >= 10 && fromEnv !== 'YOUR_ONESIGNAL_APP_ID_HERE') {
    return fromEnv;
  }
  const fromJson = (firebaseConfigJson as { oneSignalAppId?: string }).oneSignalAppId?.trim();
  return fromJson && fromJson.length >= 10 ? fromJson : '';
}

export function isOneSignalConfigured(): boolean {
  return getOneSignalAppId().length >= 10;
}
