import axios from 'axios';

function functionsBaseUrl(): string {
  const configured = import.meta.env.VITE_FUNCTIONS_BASE_URL?.replace(/\/$/, '');
  if (configured) return configured;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mahalak-0';
  return `https://us-central1-${projectId}.cloudfunctions.net`;
}

function extractOtpError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; code?: string } | undefined;
    if (data?.code === 'wasender_not_configured') {
      return 'خدمة واتساب غير مهيأة على السيرفر. تواصل مع دعم محلك.';
    }
    if (typeof data?.error === 'string' && data.error.trim()) {
      return data.error;
    }
    if (error.response?.status === 429) {
      return 'طلبات كثيرة. انتظر دقيقة ثم حاول مجدداً.';
    }
    if (error.response?.status === 503) {
      return 'خدمة إرسال الرمز غير متاحة حالياً. حاول لاحقاً.';
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return 'حدث خطأ أثناء طلب رمز التحقق.';
}

export const authService = {
  async requestOTP(phoneNumber: string, type: 'signup' | 'forgot' | 'login' = 'signup'): Promise<boolean> {
    try {
      const response = await axios.post(
        `${functionsBaseUrl()}/otpRequest`,
        { phoneNumber, type },
        { timeout: 20000 },
      );
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'حدث خطأ أثناء طلب رمز التحقق.');
      }
      return true;
    } catch (error) {
      throw new Error(extractOtpError(error));
    }
  },

  async verifyOTP(phoneNumber: string, code: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${functionsBaseUrl()}/otpVerify`,
        { phoneNumber, code },
        { timeout: 15000 },
      );
      return !!response.data?.success;
    } catch (error) {
      throw new Error(extractOtpError(error));
    }
  },
};
