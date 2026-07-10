import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@shared/lib/firebase';

export const sendWhatsAppMessage = async (phoneNumber: string, message: string): Promise<boolean> => {
  const fn = httpsCallable(getFunctions(app), 'sendWhatsAppMessage');
  const result = await fn({ phoneNumber, message });
  return !!(result.data as { success?: boolean })?.success;
};
