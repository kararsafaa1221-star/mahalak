import { getFunctions } from 'firebase/functions';
import { httpsCallable } from '@shared/lib/callMahalakFunction';
import { app } from '@shared/lib/firebase';

export const sendWhatsAppMessage = async (phoneNumber: string, message: string): Promise<boolean> => {
  const fn = httpsCallable(getFunctions(app, 'us-central1'), 'sendWhatsAppMessage', {
    timeoutMs: 45_000,
    retries: 2,
  });
  const result = await fn({ phoneNumber, message });
  return !!(result.data as { success?: boolean })?.success;
};
