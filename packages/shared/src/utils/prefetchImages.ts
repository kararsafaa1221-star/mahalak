const loadedImageUrls = new Set<string>();
const inflightLoads = new Map<string, Promise<boolean>>();

function normalizeImageUrl(url?: string | null): string {
  return String(url || '').trim();
}

/** هل الصورة محمّلة مسبقاً في ذاكرة المتصفح؟ */
export function isImageCached(url?: string | null): boolean {
  const trimmed = normalizeImageUrl(url);
  return trimmed !== '' && loadedImageUrls.has(trimmed);
}

/** تسجيل صورة كمحمّلة (بعد onLoad) */
export function markImageLoaded(url?: string | null): void {
  const trimmed = normalizeImageUrl(url);
  if (trimmed) loadedImageUrls.add(trimmed);
}

/** تحميل رابط صورة واحد — يُعاد نفس الـ Promise للطلبات المتكررة */
export function prefetchImageUrl(url?: string | null): Promise<boolean> {
  const trimmed = normalizeImageUrl(url);
  if (!trimmed) return Promise.resolve(false);
  if (loadedImageUrls.has(trimmed)) return Promise.resolve(true);

  const existing = inflightLoads.get(trimmed);
  if (existing) return existing;

  const promise = new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => {
      loadedImageUrls.add(trimmed);
      inflightLoads.delete(trimmed);
      resolve(true);
    };
    img.onerror = () => {
      inflightLoads.delete(trimmed);
      resolve(false);
    };
    img.referrerPolicy = 'no-referrer';
    img.src = trimmed;
  });

  inflightLoads.set(trimmed, promise);
  return promise;
}

/** تحميل مسبق لمجموعة روابط صور */
export function prefetchImageUrls(urls: Array<string | undefined | null | ''>): void {
  const seen = new Set<string>();
  for (const url of urls) {
    const trimmed = normalizeImageUrl(url);
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    void prefetchImageUrl(trimmed);
  }
}
