/** Public merchant web app origin used in printable order QR codes. */
export const MERCHANT_APP_BASE_URL = 'https://mahalak-merchant.web.app';

/** Build a unique deep link that opens a specific order in the merchant app. */
export function buildMerchantOrderDeepLink(orderId: string): string {
  const id = String(orderId || '').trim();
  return `${MERCHANT_APP_BASE_URL}/#/dashboard/orders?orderId=${encodeURIComponent(id)}`;
}

/**
 * Extract an order id from a scanned QR / barcode / deep-link payload.
 * Supports merchant order links, legacy deliveryQR links, and compact tokens.
 */
export function extractOrderIdFromScanPayload(raw: string): string | null {
  const text = String(raw || '').trim();
  if (!text) return null;

  const compact =
    text.match(/^MAHALAK-ORDER[:#/]([A-Za-z0-9_-]+)$/i) ||
    text.match(/(?:mahalak-order|orderId|deliveryQR)[:#/=]([A-Za-z0-9_-]+)/i);
  if (compact?.[1]) return decodeURIComponent(compact[1]);

  try {
    const url = new URL(text);
    const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
    const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
    const params = new URLSearchParams(hashQuery || url.search);
    const fromQuery = params.get('orderId') || params.get('order');
    if (fromQuery) return fromQuery;

    const deliveryMatch = url.pathname.match(/\/deliveryQR\/([^/?#]+)/i);
    if (deliveryMatch?.[1]) return decodeURIComponent(deliveryMatch[1]);

    const orderPath = url.pathname.match(/\/(?:merchant\/)?order\/([^/?#]+)/i);
    if (orderPath?.[1]) return decodeURIComponent(orderPath[1]);

    const hashOrder = hash.match(/\/orders\/([^/?#]+)/i);
    if (hashOrder?.[1]) return decodeURIComponent(hashOrder[1]);
  } catch {
    // Not a URL — fall through.
  }

  return null;
}
