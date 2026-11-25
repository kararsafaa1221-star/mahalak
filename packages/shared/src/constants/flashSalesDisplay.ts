/** نصوص واجهة فلاش سيلز الظاهرة للزبون — تُدار من لوحة التحكم (settings/global). */

import { tKey } from '../i18n/tKey';

export interface FlashSalesCustomerDisplaySettings {
  /** العنوان الرئيسي أعلى القسم */
  sectionTitle: string;
  /** تسمية العدّاد الحي */
  countdownLabel: string;
  /** شارة العرض على صورة المنتج */
  offerBadge: string;
  /** رسالة عند عدم وجود منتجات معتمدة */
  emptyProductsText: string;
  /** إظهار عدّاد الانتهاء */
  showCountdown: boolean;
  /** عدد المنتجات لكل صفحة تقليب */
  productsPerPage: number;
}

export const DEFAULT_FLASH_SALES_CUSTOMER_DISPLAY: FlashSalesCustomerDisplaySettings = {
  sectionTitle: 'فلاش سيلز - خصومات لفترة محدودة!',
  countdownLabel: 'ينتهي خلال',
  offerBadge: 'عرض',
  emptyProductsText: 'لا توجد منتجات مشاركة ومعتمدة في هذه الفعالية بعد.',
  showCountdown: true,
  productsPerPage: 3,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asPositiveInt(value: unknown, fallback: number, min = 1, max = 12): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function localizedDefault(key: string, arabicDefault: string): string {
  return tKey(`flashSale.display.${key}`, arabicDefault);
}

/** Resolve display strings; admin overrides win, otherwise active UI language defaults. */
export function resolveFlashSalesCustomerDisplay(
  adminSettings?: Record<string, unknown> | null,
): FlashSalesCustomerDisplaySettings {
  const raw = asRecord(adminSettings?.flashSalesCustomerDisplay);
  const d = DEFAULT_FLASH_SALES_CUSTOMER_DISPLAY;

  const pick = (field: 'sectionTitle' | 'countdownLabel' | 'offerBadge' | 'emptyProductsText'): string => {
    const adminVal = raw ? asString(raw[field], '') : '';
    // Custom admin text (different from Arabic default) stays as stored
    if (adminVal && adminVal !== d[field]) return adminVal;
    return localizedDefault(field, d[field]);
  };

  return {
    sectionTitle: pick('sectionTitle'),
    countdownLabel: pick('countdownLabel'),
    offerBadge: pick('offerBadge'),
    emptyProductsText: pick('emptyProductsText'),
    showCountdown: asBool(raw?.showCountdown, d.showCountdown),
    productsPerPage: asPositiveInt(raw?.productsPerPage, d.productsPerPage, 1, 6),
  };
}
