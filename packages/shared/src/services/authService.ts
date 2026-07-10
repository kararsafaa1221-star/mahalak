import axios from 'axios';
import { normalizeIraqiPhone, normalizeOtpCode } from '../utils/phone';

function functionsBaseUrl(): string {
  const configured = import.meta.env.VITE_FUNCTIONS_BASE_URL?.replace(/\/$/, '');
  if (configured) return configured;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mahalak-0';
  return `https://us-central1-${projectId}.cloudfunctions.net`;
}

function extractOtpError(error: unknown, phase: 'request' | 'verify' = 'request'): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return phase === 'verify'
        ? 'استغرق التحقق وقتاً أطول. إن نجح تسجيل الدخول فتجاهل هذه الرسالة.'
        : 'استغرق الإرسال وقتاً أطول. تحقق من واتساب — إن وصلك الرمز أدخله.';
    }
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
  return phase === 'verify'
    ? 'حدث خطأ أثناء التحقق من الرمز.'
    : 'حدث خطأ أثناء طلب رمز التحقق.';
}

export const authService = {
  async requestOTP(phoneNumber: string, type: 'signup' | 'forgot' | 'login' = 'signup'): Promise<boolean> {
    const normalizedPhone = normalizeIraqiPhone(phoneNumber);
    try {
      const response = await axios.post(
        `${functionsBaseUrl()}/otpRequest`,
        { phoneNumber: normalizedPhone, type },
        { timeout: 45000 },
      );
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'حدث خطأ أثناء طلب رمز التحقق.');
      }
      return true;
    } catch (error) {
      throw new Error(extractOtpError(error, 'request'));
    }
  },

  async verifyOTP(phoneNumber: string, code: string): Promise<boolean> {
    const normalizedPhone = normalizeIraqiPhone(phoneNumber);
    const normalizedCode = normalizeOtpCode(code);
    try {
      const response = await axios.post(
        `${functionsBaseUrl()}/otpVerify`,
        { phoneNumber: normalizedPhone, code: normalizedCode },
        { timeout: 30000 },
      );
      return !!response.data?.success;
    } catch (error) {
      throw new Error(extractOtpError(error, 'verify'));
    }
  },
};
