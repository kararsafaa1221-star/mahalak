import firebaseConfigJson from '../../../../config/firebase.config.json';

export function getOneSignalAppId(): string {
  const fromEnv = import.meta.env.VITE_ONESIGNAL_APP_ID?.trim();
  if (fromEnv && fromEnv.length >= 10) return fromEnv;
  const fromJson = (firebaseConfigJson as { oneSignalAppId?: string }).oneSignalAppId?.trim();
  return fromJson && fromJson.length >= 10 ? fromJson : '';
}

export function isOneSignalConfigured(): boolean {
  return getOneSignalAppId().length >= 10;
}
