/** مدة إمهال إلغاء الزبون قبل وصول الطلب للتاجر (مطابقة للخلفية). */
export const CUSTOMER_ORDER_CANCEL_GRACE_MS = 30_000;

function toMillis(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  if (typeof value === 'object') {
    const v = value as {
      toMillis?: () => number;
      toDate?: () => Date;
      seconds?: number;
      _seconds?: number;
    };
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.toDate === 'function') return v.toDate().getTime();
    if (typeof v.seconds === 'number') return v.seconds * 1000;
    if (typeof v._seconds === 'number') return v._seconds * 1000;
  }
  return null;
}

/**
 * طلبات جديدة تُنشأ مع merchantNotified:false حتى تنتهي نافذة الـ 30 ثانية.
 * الطلبات القديمة بدون الحقل تبقى ظاهرة للتاجر.
 */
export function isOrderVisibleToMerchant(order: {
  status?: string;
  merchantNotified?: boolean;
  customerGraceUntil?: unknown;
  createdAt?: unknown;
}): boolean {
  if (order.merchantNotified !== false) return true;
  if (order.status !== 'pending') return true;

  const graceUntil = toMillis(order.customerGraceUntil);
  if (graceUntil != null) {
    return Date.now() >= graceUntil;
  }

  const createdAt = toMillis(order.createdAt);
  if (createdAt != null) {
    return Date.now() >= createdAt + CUSTOMER_ORDER_CANCEL_GRACE_MS;
  }

  return false;
}

/** حالات يُسمح فيها للتاجر بتصفير/إخفاء القائمة دون حذف الطلب من التقارير. */
export const MERCHANT_CLEARABLE_INBOX_STATUSES = [
  'delivered',
  'returned',
  'replaced',
  'rejected',
  'cancelled',
] as const;

export type MerchantClearableInboxStatus =
  (typeof MERCHANT_CLEARABLE_INBOX_STATUSES)[number];

export function isMerchantInboxClearableStatus(status?: string): boolean {
  return MERCHANT_CLEARABLE_INBOX_STATUSES.includes(
    status as MerchantClearableInboxStatus,
  );
}

/** يظهر في قائمة التاجر ما لم يُصفَّر من الواجهة. */
export function isOrderShownInMerchantInbox(
  order: {
    id?: string;
    merchantInboxCleared?: boolean;
  },
  clearedOrderIds?: string[] | null,
): boolean {
  if (order.merchantInboxCleared === true) return false;
  if (order.id && Array.isArray(clearedOrderIds) && clearedOrderIds.includes(order.id)) {
    return false;
  }
  return true;
}
