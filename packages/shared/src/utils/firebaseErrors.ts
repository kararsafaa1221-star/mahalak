/** Maps Cloud Function / Firebase errors to user-facing localized messages. */

import { tKey } from '../i18n/tKey';

export function getCallableErrorMessage(error: unknown, fallback?: string): string {
  const resolvedFallback = fallback ?? tKey('errors.fallback', 'تعذر إكمال العملية. حاول مرة أخرى.');
  const err = error as { code?: string; message?: string; details?: unknown };
  const code = err?.code ?? '';
  const message = String(err?.message ?? '');

  if (code === 'functions/unauthenticated' || code === 'unauthenticated') {
    return tKey('errors.unauthenticated', 'يجب تسجيل الدخول أولاً.');
  }
  if (
    code === 'functions/unavailable' ||
    code === 'unavailable' ||
    code === 'functions/deadline-exceeded' ||
    code === 'deadline-exceeded'
  ) {
    return tKey('errors.unavailable', 'الاتصال ضعيف أو بطيء. تحقق من الشبكة ثم أعد المحاولة.');
  }
  if (code === 'functions/permission-denied' || code === 'permission-denied') {
    return tKey('errors.permissionDenied', 'لا تملك صلاحية تنفيذ هذا الإجراء. سجّل الخروج ثم الدخول مرة أخرى.');
  }
  if (
    code === 'functions/not-found' ||
    code === 'not-found' ||
    code === 'functions/internal' ||
    code === 'internal' ||
    /cors|failed to fetch|ERR_FAILED|net::ERR/i.test(message)
  ) {
    return tKey(
      'errors.functionUnavailable',
      'الخدمة غير متاحة حالياً. إن كنت على بيئة تطوير فتأكد من نشر الدوال، ثم أعد المحاولة.',
    );
  }
  if (message.includes('Invalid promo code')) {
    return tKey('errors.invalidPromo', 'كود الخصم غير صالح أو منتهي. أزل الكود وحاول مجدداً.');
  }
  if (message.includes('Promo not valid for province')) {
    return tKey('errors.promoProvince', 'كود الخصم غير متاح لمحافظة عنوان التوصيل المختار.');
  }
  if (message.includes('Promo not valid for this store')) {
    return tKey('errors.promoStore', 'كود الخصم غير صالح لمتاجر سلتك الحالية.');
  }
  if (message.includes('Promo code exhausted') || message.includes('maxUsesPerUser')) {
    return tKey('errors.promoExhausted', 'تم استنفاد استخدامات كود الخصم.');
  }
  if (message.includes('Promo code expired') || message.includes('Promo code inactive')) {
    return tKey('errors.promoExpired', 'كود الخصم منتهي أو غير نشط.');
  }
  if (message.includes('Insufficient inventory')) {
    return tKey('errors.insufficientInventory', 'أحد المنتجات غير متوفر بالكمية المطلوبة.');
  }
  if (message.includes('Product not available') || message.includes('Invalid product')) {
    return tKey('errors.productUnavailable', 'أحد المنتجات في السلة لم يعد متاحاً. حدّث السلة وحاول مجدداً.');
  }
  if (message.includes('Store unavailable')) {
    return tKey('errors.storeUnavailable', 'المتجر غير متاح حالياً.');
  }
  if (message.includes('Invalid order payload') || message.includes('No valid products')) {
    return tKey('errors.invalidOrder', 'بيانات الطلب غير مكتملة. أعد تحميل الصفحة وحاول مجدداً.');
  }
  if (message.includes('linked to another session')) {
    return tKey('errors.linkedSession', 'الحساب مرتبط بجلسة أخرى. سجّل الخروج ثم الدخول مرة أخرى.');
  }
  if (message.includes('OTP expired') || message.includes('OTP expired or not requested')) {
    return tKey('errors.otpExpired', 'انتهت صلاحية رمز التحقق. اطلب رمزاً جديداً.');
  }
  if (message.includes('Invalid OTP')) {
    return tKey('errors.otpInvalid', 'رمز التحقق غير صحيح. تأكد من الرمز المرسل إلى هاتفك.');
  }
  if (message.includes('Promo audience restriction')) {
    return tKey('errors.promoAudience', 'عذراً، هذا الكود مخصص لشريحة محددة من زبائن المتجر ❌');
  }

  if (message && !message.startsWith('{')) {
    return message;
  }

  return resolvedFallback;
}
