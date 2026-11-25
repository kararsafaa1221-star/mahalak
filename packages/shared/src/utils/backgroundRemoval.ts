import { removeBackground, preload, type Config } from '@imgly/background-removal';
import { Capacitor } from '@capacitor/core';
import { isAndroidClient } from './platformVisuals';

/** Slightly below 896 for faster WASM inference without hurting product quality. */
export const BG_REMOVAL_MAX_SIZE = 640;

const IMGLY_BG_DATA_VERSION = '1.7.0';
/** Absolute CDN — required for Capacitor (`base: './'`) where relative asset paths break. */
const IMGLY_CDN_PUBLIC_PATH = `https://staticimgly.com/@imgly/background-removal-data/${IMGLY_BG_DATA_VERSION}/dist/`;

export interface FocusTransform {
  panX: number;
  panY: number;
  zoom: number;
  containerSize: number;
}

let preloadPromise: Promise<void> | null = null;
const progressListeners = new Set<(key: string, pct: number) => void>();

/** WASM CPU only — WebGPU hangs / corrupts on many Windows/Android setups. */
const BG_REMOVAL_DEVICE: Config['device'] = 'cpu';

function useMobileBgRemovalProfile(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform() || isAndroidClient();
}

/** Smaller input on phones — less RAM pressure in WebView + faster inference. */
export function getBgRemovalMaxSize(): number {
  return useMobileBgRemovalProfile() ? 512 : BG_REMOVAL_MAX_SIZE;
}

function getDefaultModel(): Config['model'] {
  return useMobileBgRemovalProfile() ? 'isnet_quint8' : 'isnet_fp16';
}

function getModelFallbackChain(): Config['model'][] {
  return useMobileBgRemovalProfile()
    ? ['isnet_quint8', 'isnet_fp16', 'isnet']
    : ['isnet_fp16', 'isnet'];
}

async function preloadModelAssets(
  model: Config['model'],
  onProgress?: (key: string, pct: number) => void,
): Promise<void> {
  resetBgRemovalPreload();
  preloadPromise = preload(
    getBgRemovalConfig((key, current, total) => {
      mapProgress(key, current, total, 0, 40, onProgress);
    }, { model }),
  ).catch((err) => {
    preloadPromise = null;
    throw err;
  });
  await preloadPromise;
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Invalid image blob'));
    el.src = url;
  });
}

function emitProgress(key: string, pct: number): void {
  progressListeners.forEach((listener) => {
    try {
      listener(key, pct);
    } catch {
      // ignore listener errors
    }
  });
}

export function getBgRemovalConfig(
  onProgress?: (key: string, current: number, total: number) => void,
  overrides?: Partial<Pick<Config, 'device' | 'model'>>,
): Config {
  return {
    publicPath: IMGLY_CDN_PUBLIC_PATH,
    device: overrides?.device ?? BG_REMOVAL_DEVICE,
    model: overrides?.model ?? getDefaultModel(),
    proxyToWorker: useMobileBgRemovalProfile(),
    debug: typeof import.meta !== 'undefined' && import.meta.env?.DEV === true,
    rescale: true,
    output: {
      format: 'image/png',
      quality: 1,
    },
    progress: onProgress,
  };
}

async function validateOutputBlob(blob: Blob): Promise<boolean> {
  if (!blob || blob.size < 512) return false;
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImageFromUrl(url);
    if (img.naturalWidth < 8 || img.naturalHeight < 8) return false;

    const sampleW = Math.min(img.naturalWidth, 128);
    const sampleH = Math.min(img.naturalHeight, 128);
    const canvas = document.createElement('canvas');
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.drawImage(img, 0, 0, sampleW, sampleH);
    const { data } = ctx.getImageData(0, 0, sampleW, sampleH);

    let opaqueCount = 0;
    let blueDominant = 0;
    const pixelCount = sampleW * sampleH;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a > 30) opaqueCount++;
      if (b > r + 40 && b > g + 40) blueDominant++;
    }

    if (opaqueCount < pixelCount * 0.03) return false;
    if (blueDominant > pixelCount * 0.85) return false;

    return true;
  } catch {
    return false;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function mapProgress(
  key: string,
  current: number,
  total: number,
  rangeStart: number,
  rangeEnd: number,
  extra?: (key: string, pct: number) => void,
): void {
  if (total <= 0) return;
  const pct = rangeStart + Math.round((current / total) * (rangeEnd - rangeStart));
  emitProgress(key, pct);
  extra?.(key, pct);
}

/** Warm up WASM + model cache (does not block processing if still loading). */
export function preloadBgRemovalModel(
  onProgress?: (key: string, pct: number) => void,
): Promise<void> {
  if (onProgress) progressListeners.add(onProgress);

  if (!preloadPromise) {
    preloadPromise = preload(
      getBgRemovalConfig((key, current, total) => {
        mapProgress(key, current, total, 0, 40);
      }),
    ).catch((err) => {
      preloadPromise = null;
      throw err;
    });
  }

  return preloadPromise;
}

export function resetBgRemovalPreload(): void {
  preloadPromise = null;
}

function blobToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (out) => (out ? resolve(out) : reject(new Error('Canvas export failed'))),
      'image/png',
    );
  });
}

export function resizeImageBlob(
  blob: Blob,
  maxSize = getBgRemovalMaxSize(),
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = async () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxSize && height <= maxSize) {
        resolve(blob);
        return;
      }
      const ratio = Math.min(maxSize / width, maxSize / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not create canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        resolve(await blobToPng(canvas));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for resize'));
    };
    img.src = url;
  });
}

/** Crops the visible focus frame (pan/zoom) into a square PNG for the model. */
export function extractFocusedRegion(
  imageSrc: string,
  transform: FocusTransform,
  outputSize = getBgRemovalMaxSize(),
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not create canvas context'));
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outputSize, outputSize);

      const paddingRatio = 0.92;
      const avail = outputSize * paddingRatio;
      const scaleFit = Math.min(avail / img.width, avail / img.height);
      const baseW = img.width * scaleFit;
      const baseH = img.height * scaleFit;

      ctx.translate(outputSize / 2, outputSize / 2);
      const scaleFactor = outputSize / transform.containerSize;
      ctx.translate(transform.panX * scaleFactor, transform.panY * scaleFactor);
      ctx.scale(transform.zoom, transform.zoom);
      ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);

      try {
        resolve(await blobToPng(canvas));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load source image'));
    img.src = imageSrc;
  });
}

const PROGRESS_LABELS: Record<string, string> = {
  'fetch:model': 'تحميل نموذج الذكاء الاصطناعي',
  'fetch:wasm': 'تحميل محرك المعالجة',
  'compute:inference': 'تحليل الصورة وتفريغ الخلفية',
  prepare: 'تحضير الصورة',
  done: 'اكتمل',
};

export function getProgressLabel(key: string): string {
  if (PROGRESS_LABELS[key]) return PROGRESS_LABELS[key];
  if (key.startsWith('fetch:')) return 'تحميل الملفات...';
  if (key.startsWith('compute:')) return 'معالجة الصورة...';
  return 'جاري العمل...';
}

/**
 * Remove background with live download/inference progress.
 *
 * IMPORTANT: never call preload() and removeBackground() at the same time —
 * both fetch the same large model/wasm files and race on the library's
 * internal IndexedDB cache, which can deadlock the tab indefinitely.
 * If a preload is already in flight (started when the modal opened), we
 * simply wait for it to finish, then removeBackground() reuses the cache
 * and starts inference immediately.
 */
export async function removeBackgroundOptimized(
  input: Blob,
  onProgress?: (key: string, pct: number) => void,
  options?: { skipResize?: boolean },
): Promise<Blob> {
  if (onProgress) progressListeners.add(onProgress);

  try {
    onProgress?.('prepare', 3);

    const maxSize = getBgRemovalMaxSize();
    const resized = options?.skipResize
      ? input
      : await resizeImageBlob(input, maxSize);

    onProgress?.('prepare', 8);

    const models = getModelFallbackChain();
    let lastError: unknown = new Error('Background removal failed');

    for (let attempt = 0; attempt < models.length; attempt++) {
      const model = models[attempt];
      try {
        if (attempt === 0 && preloadPromise) {
          await preloadPromise;
        } else {
          await preloadModelAssets(model, onProgress);
        }

        const output = await removeBackground(
          resized,
          getBgRemovalConfig((key, current, total) => {
            mapProgress(key, current, total, 8, 98, onProgress);
          }, { model }),
        );

        if (await validateOutputBlob(output)) {
          onProgress?.('done', 100);
          return output;
        }

        lastError = new Error('Background removal produced a corrupt or empty image');
      } catch (err) {
        lastError = err;
        resetBgRemovalPreload();
      }
    }

    throw lastError;
  } finally {
    if (onProgress) progressListeners.delete(onProgress);
  }
}
