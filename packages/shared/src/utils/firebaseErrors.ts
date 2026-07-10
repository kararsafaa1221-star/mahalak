/** Maps Cloud Function / Firebase errors to user-facing Arabic messages. */
export function getCallableErrorMessage(error: unknown, fallback = 'تعذر إكمال العملية. حاول مرة أخرى.'): string {
  const err = error as { code?: string; message?: string; details?: unknown };
  const code = err?.code ?? '';
  const message = String(err?.message ?? '');

  if (code === 'functions/unauthenticated' || code === 'unauthenticated') {
    return 'يجب تسجيل الدخول أولاً.';
  }
  if (code === 'functions/permission-denied' || code === 'permission-denied') {
    return 'لا تملك صلاحية تنفيذ هذا الإجراء. سجّل الخروج ثم الدخول مرة أخرى.';
  }
  if (message.includes('Invalid promo code')) {
    return 'كود الخصم غير صالح أو منتهي. أزل الكود وحاول مجدداً.';
  }
  if (message.includes('Promo not valid for province')) {
    return 'كود الخصم غير متاح لمحافظة عنوان التوصيل المختار.';
  }
  if (message.includes('Promo not valid for this store')) {
    return 'كود الخصم غير صالح لمتاجر سلتك الحالية.';
  }
  if (message.includes('Promo code exhausted') || message.includes('maxUsesPerUser')) {
    return 'تم استنفاد استخدامات كود الخصم.';
  }
  if (message.includes('Promo code expired') || message.includes('Promo code inactive')) {
    return 'كود الخصم منتهي أو غير نشط.';
  }
  if (message.includes('Insufficient inventory')) {
    return 'أحد المنتجات غير متوفر بالكمية المطلوبة.';
  }
  if (message.includes('Product not available') || message.includes('Invalid product')) {
    return 'أحد المنتجات في السلة لم يعد متاحاً. حدّث السلة وحاول مجدداً.';
  }
  if (message.includes('Store unavailable')) {
    return 'المتجر غير متاح حالياً.';
  }
  if (message.includes('Invalid order payload') || message.includes('No valid products')) {
    return 'بيانات الطلب غير مكتملة. أعد تحميل الصفحة وحاول مجدداً.';
  }
  if (message.includes('linked to another session')) {
    return 'الحساب مرتبط بجلسة أخرى. سجّل الخروج ثم الدخول مرة أخرى.';
  }
  if (message.includes('OTP expired') || message.includes('OTP expired or not requested')) {
    return 'انتهت صلاحية رمز التحقق. اطلب رمزاً جديداً.';
  }
  if (message.includes('Invalid OTP')) {
    return 'رمز التحقق غير صحيح. تأكد من الرمز المرسل إلى هاتفك.';
  }
  if (message.includes('Promo audience restriction')) {
    return 'عذراً، هذا الكود مخصص لشريحة محددة من زبائن المتجر ❌';
  }

  if (message && !message.startsWith('{')) {
    return message;
  }

  return fallback;
}
