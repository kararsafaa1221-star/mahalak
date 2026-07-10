export const CUSTOMER_APP_BASE_URL = 'https://mahallak.app';

export type ShareTargetType = 'store' | 'product';

export interface StoreShareInput {
  id: string;
  shopName: string;
  area?: string;
  province?: string;
}

export interface ProductShareInput {
  id: string;
  storeId: string;
  name: string;
  shopName?: string;
  price?: number;
  finalPrice?: number;
}

export interface SharePayload {
  type: ShareTargetType;
  title: string;
  text: string;
  url: string;
}

export function buildStoreShareUrl(storeId: string): string {
  return `${CUSTOMER_APP_BASE_URL}/#/dashboard/store/${storeId}`;
}

export function buildProductShareUrl(storeId: string, productId: string): string {
  return `${CUSTOMER_APP_BASE_URL}/#/dashboard/store/${storeId}/product/${productId}`;
}

function formatSharePrice(product: ProductShareInput): string {
  const price = product.finalPrice ?? product.price ?? 0;
  return price.toLocaleString('ar-IQ');
}

export function buildCustomerStoreSharePayload(store: StoreShareInput): SharePayload {
  const url = buildStoreShareUrl(store.id);
  const area = store.area || store.province || '';
  return {
    type: 'store',
    title: `متجر ${store.shopName}`,
    text: `ألق نظرة على متجر "${store.shopName}" في تطبيق محلك. المتجر يعرض منتجات رائعة في منطقة ${area}. يمكنك تصفح المتجر والطلب من خلال هذا الرابط: ${url}`,
    url,
  };
}

export function buildMerchantStoreSharePayload(store: StoreShareInput): SharePayload {
  const url = buildStoreShareUrl(store.id);
  return {
    type: 'store',
    title: `متجر ${store.shopName}`,
    text: `مرحبا بكم في متجرنا الرسمي "${store.shopName}". يمكنكم تصفح أحدث المنتجات والطلب مباشرة من خلال الرابط التالي: ${url}`,
    url,
  };
}

export function buildCustomerProductSharePayload(product: ProductShareInput): SharePayload {
  const url = buildProductShareUrl(product.storeId, product.id);
  return {
    type: 'product',
    title: product.name,
    text: `شاهد هذا المنتج: "${product.name}" بسعر ${formatSharePrice(product)} دينار عراقي في متجر "${product.shopName || 'المتجر'}". يمكنك مشاهدة تفاصيل المنتج والطلب من خلال هذا الرابط: ${url}`,
    url,
  };
}

export function buildMerchantProductSharePayload(product: ProductShareInput): SharePayload {
  const url = buildProductShareUrl(product.storeId, product.id);
  return {
    type: 'product',
    title: product.name,
    text: `يتوفر الآن في متجرنا: "${product.name}" بسعر ${formatSharePrice(product)} دينار عراقي. يمكنك الطلب الآن من خلال الرابط التالي: ${url}`,
    url,
  };
}

export type NativeShareResult = 'shared' | 'cancelled' | 'unavailable';

function isShareCancelled(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = 'name' in err ? String((err as { name?: string }).name) : '';
  return name === 'AbortError' || name === 'NotAllowedError';
}

export async function tryNativeShare(
  payload: Pick<SharePayload, 'title' | 'text' | 'url'>,
): Promise<NativeShareResult> {
  const { title, text, url } = payload;

  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title,
        text,
        url,
        dialogTitle: 'مشاركة',
      });
      return 'shared';
    }
  } catch (err) {
    if (isShareCancelled(err)) return 'cancelled';
  }

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title, text, url });
      return 'shared';
    }
  } catch (err) {
    if (isShareCancelled(err)) return 'cancelled';
  }

  return 'unavailable';
}

export type SharePlatform =
  | 'whatsapp'
  | 'messenger'
  | 'telegram'
  | 'instagram'
  | 'facebook'
  | 'copy';

export function buildPlatformShareAction(
  platform: SharePlatform,
  text: string,
  url: string,
): { kind: 'open'; shareUrl: string } | { kind: 'copy'; message: string } {
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);

  switch (platform) {
    case 'whatsapp':
      return { kind: 'open', shareUrl: `https://wa.me/?text=${encodedText}` };
    case 'telegram':
      return { kind: 'open', shareUrl: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}` };
    case 'facebook':
      return { kind: 'open', shareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` };
    case 'messenger':
      return { kind: 'open', shareUrl: `fb-messenger://share/?link=${encodedUrl}` };
    case 'instagram':
      return {
        kind: 'copy',
        message: 'تم نسخ نص المشاركة. يمكنك الآن لصقه في ستوري إنستقرام أو رسالة خاصة.',
      };
    case 'copy':
      return { kind: 'copy', message: 'تم نسخ رابط المشاركة بنجاح! ✅' };
  }
}

/** Redirect legacy pathname links (/store/:id) to hash routes used by the customer app. */
export function redirectLegacySharePath(): boolean {
  if (typeof window === 'undefined') return false;
  const { pathname, search, hash } = window.location;
  if (hash.startsWith('#/dashboard')) return false;

  const storeMatch = pathname.match(/^\/store\/([^/]+)\/?$/);
  if (storeMatch?.[1]) {
    window.location.replace(`${window.location.origin}/#/dashboard/store/${storeMatch[1]}${search}`);
    return true;
  }

  const productMatch = pathname.match(/^\/product\/([^/]+)\/?$/);
  if (productMatch?.[1]) {
    const query = search ? `${search}&` : '?';
    window.location.replace(
      `${window.location.origin}/#/dashboard/products${query}product=${productMatch[1]}`,
    );
    return true;
  }

  return false;
}
