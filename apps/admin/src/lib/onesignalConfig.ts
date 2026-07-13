import firebaseConfigJson from '../../../../config/firebase.config.json';

export function getOneSignalAppId(): string {
  const fromEnv = import.meta.env.VITE_ONESIGNAL_APP_ID?.trim();
  if (fromEnv && fromEnv.length >= 10 && !fromEnv.startsWith('YOUR_')) {
    return fromEnv;
  }
  const fromJson = (firebaseConfigJson as { adminOneSignalAppId?: string }).adminOneSignalAppId?.trim();
  return fromJson && fromJson.length >= 10 ? fromJson : '';
}

export function isOneSignalConfigured(): boolean {
  return getOneSignalAppId().length >= 10;
}

export function warnIfOneSignalNotConfigured(): void {
  if (isOneSignalConfigured()) return;
  console.warn(
    '[Mahalak Admin] VITE_ONESIGNAL_APP_ID is not set. ' +
      'Add Mahalak Admin App ID to apps/admin/.env (see .env.example).',
  );
}
