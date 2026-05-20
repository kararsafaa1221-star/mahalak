import axios from 'axios';

/**
 * فحص حالة الاتصال بالإنترنت قبل إرسال الطلب
 */
const checkConnectivity = (): boolean => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.error('❌ لا يوجد اتصال بالإنترنت');
    return false;
  }
  return true;
};

export const sendWhatsAppMessage = async (phoneNumber: string, message: string): Promise<boolean> => {
  if (!checkConnectivity()) {
    throw new Error('يرجى التأكد من اتصالك بالإنترنت والمحاولة مرة أخرى.');
  }

  try {
    console.log('🚀 إرسال طلب OTP عبر Wasender...');

    // Clean and format phone number for Wasender
    const cleaned = phoneNumber.replace(/\D/g, '');
    let formattedNumber = cleaned;
    
    if (cleaned.startsWith('07')) {
      formattedNumber = '964' + cleaned.substring(1);
    } else if (cleaned.startsWith('7')) {
      formattedNumber = '964' + cleaned;
    } else if (!cleaned.startsWith('964')) {
      formattedNumber = '964' + cleaned;
    }

    const WAS_API_KEY = "61af7f2a07544f59a208444cf80d5ce717be01ad0b571a13a4f9c3ab5209af21";
    // If you have a different instance ID, update this environment variable or fallback
    const WAS_INSTANCE_ID = import.meta.env.VITE_WASENDER_INSTANCE_ID || "83337";
    const API_URL = 'https://wasenderapi.com/api/send-message';

    console.log(`🔗 Connecting to Wasender API for number: ${formattedNumber}`);

    const response = await axios.post(API_URL, {
      whatsapp_session: WAS_INSTANCE_ID,
      to: formattedNumber,
      text: message
    }, {
      timeout: 20000, // 20 seconds timeout
      headers: {
        'Authorization': `Bearer ${WAS_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ رد سيرفر Wasender:', response.data);
    
    return true;
  } catch (error: any) {
    let errorMessage = error.message;
    let detail = '';
    
    if (error.response) {
      console.error('❌ خطأ من Wasender:', error.response.data);
      errorMessage = `خطأ من Wasender: ${error.response.status}`;
      detail = JSON.stringify(error.response.data);
    } else if (error.request) {
      console.error('❌ لا يوجد رد من Wasender.');
      errorMessage = 'تعذر الوصول لـ Wasender (Network Error)';
      detail = 'تأكد من وجود اتصال ناجح بالإنترنت.';
    }

    console.log('📝 تفاصيل الخطأ الكاملة:', {
      config: error.config,
      code: error.code,
      message: error.message
    });
    
    throw new Error(`${errorMessage} | ${detail} | Reason: ${String(error)}`, { cause: error });
  }
};

/**
 * دالة لاختبار الاتصال بالسيرفر مباشرة
 * مفيدة جداً لتشخيص مشاكل الـ APK
 */
export const testServerConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const isCapacitor = typeof window !== 'undefined' && 
      (window.location.origin.startsWith('capacitor://') || 
       window.location.origin.startsWith('https://localhost') ||
       window.location.origin.startsWith('http://localhost') && !window.location.hostname.includes('ais-dev') && !window.location.hostname.includes('.run.app'));
    
    const isAIStudio = typeof window !== 'undefined' && 
      (window.location.hostname.includes('ais-dev') || window.location.hostname.includes('.run.app'));

    let baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    if (isAIStudio || !isCapacitor) {
      baseUrl = window.location.origin;
    } else if (!baseUrl) {
      baseUrl = 'https://ais-pre-tkhmcgz4pe6ic7vkqoe5zy-601066631097.europe-west2.run.app';
    }

    if (baseUrl.includes('back4app')) {
      baseUrl = window.location.origin;
    }

    const testUrl = `${baseUrl.replace(/\/$/, '')}/api/otp/health`; // افترضنا وجود مسار للصحة
    
    console.log(`🔍 Testing connection to: ${testUrl}`);
    
    const startTime = Date.now();
    await axios.get(testUrl, { timeout: 5000 });
    const duration = Date.now() - startTime;
    
    return { 
      success: true, 
      message: `اتصال ناجح! (الاستجابة في ${duration}ms)` 
    };
  } catch (error: any) {
    console.error('❌ Quick connection test failed:', error.message);
    return { 
      success: false, 
      message: `فشل الاتصال: ${error.message}. تأكد من صحة VITE_API_BASE_URL في ملف .env` 
    };
  }
};

export const sendOTP = async (phoneNumber: string, code: string, type: 'signup' | 'forgot' = 'signup'): Promise<boolean> => {
  const templates = {
    signup: `مرحباً بك في منصة محلك! رمز التحقق الخاص بك هو: ${code}. لا تشارك هذا الرمز مع أي شخص.`,
    forgot: `مرحباً! رمز إعادة تعيين كلمة المرور في منصة محلك هو: ${code}. هذا الرمز صالح لمدة 10 دقائق فقط.`
  };
  return await sendWhatsAppMessage(phoneNumber, templates[type]);
};

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
