import { removeBackground, preload, type Config } from '@imgly/background-removal';

/** Balance between edge quality and single-thread WASM speed. */
export const BG_REMOVAL_MAX_SIZE = 896;

export interface FocusTransform {
  panX: number;
  panY: number;
  zoom: number;
  containerSize: number;
}

let preloadPromise: Promise<void> | null = null;

/** WASM CPU only — WebGPU causes corrupted output on many Windows/GPU setups. */
const BG_REMOVAL_DEVICE: Config['device'] = 'cpu';

/** fp16: best speed/quality trade-off on CPU WASM (isnet full model is very slow single-threaded). */
const BG_REMOVAL_MODEL: Config['model'] = 'isnet_fp16';

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Invalid image blob'));
    el.src = url;
  });
}

export function getBgRemovalConfig(
  onProgress?: (key: string, current: number, total: number) => void,
  overrides?: Partial<Pick<Config, 'device' | 'model'>>,
): Config {
  return {
    device: overrides?.device ?? BG_REMOVAL_DEVICE,
    model: overrides?.model ?? BG_REMOVAL_MODEL,
    proxyToWorker: false,
    rescale: true,
    output: {
      format: 'image/png',
      quality: 1,
      type: 'foreground',
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
    if (blueDominant > pixelCount * 0.6) return false;

    return true;
  } catch {
    return false;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function mapProgress(
  onProgress: ((key: string, pct: number) => void) | undefined,
  key: string,
  current: number,
  total: number,
  rangeStart: number,
  rangeEnd: number,
): void {
  if (!onProgress || total <= 0) return;
  const pct = rangeStart + Math.round((current / total) * (rangeEnd - rangeStart));
  onProgress(key, pct);
}

/** Warm up WASM + model cache so the first removal feels instant. */
export function preloadBgRemovalModel(
  onProgress?: (key: string, pct: number) => void,
): Promise<void> {
  if (!preloadPromise) {
    preloadPromise = preload(
      getBgRemovalConfig((key, current, total) => {
        mapProgress(onProgress, key, current, total, 0, 40);
      }),
    ).catch(() => {
      preloadPromise = null;
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
  maxSize = BG_REMOVAL_MAX_SIZE,
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
  outputSize = BG_REMOVAL_MAX_SIZE,
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

async function runRemoval(
  input: Blob,
  onProgress: ((key: string, pct: number) => void) | undefined,
  model: Config['model'],
  rangeStart: number,
  rangeEnd: number,
): Promise<Blob> {
  return removeBackground(
    input,
    getBgRemovalConfig((key, current, total) => {
      mapProgress(onProgress, key, current, total, rangeStart, rangeEnd);
    }, { device: BG_REMOVAL_DEVICE, model }),
  );
}

const PROGRESS_LABELS: Record<string, string> = {
  'fetch:model': 'تحميل نموذج الذكاء الاصطناعي',
  'fetch:wasm': 'تحميل محرك المعالجة',
  'compute:inference': 'تحليل الصورة وتفريغ الخلفية',
  'prepare': 'تحضير الصورة',
};

export function getProgressLabel(key: string): string {
  if (PROGRESS_LABELS[key]) return PROGRESS_LABELS[key];
  if (key.startsWith('fetch:')) return 'تحميل الملفات...';
  if (key.startsWith('compute:')) return 'معالجة الصورة...';
  return 'جاري العمل...';
}

export async function removeBackgroundOptimized(
  input: Blob,
  onProgress?: (key: string, pct: number) => void,
): Promise<Blob> {
  onProgress?.('prepare', 1);

  await preloadBgRemovalModel(onProgress);

  onProgress?.('prepare', 42);
  const resized = await resizeImageBlob(input, BG_REMOVAL_MAX_SIZE);
  onProgress?.('prepare', 45);

  const models: Config['model'][] = ['isnet_fp16', 'isnet'];
  let lastError: unknown;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const rangeStart = 45 + i * 25;
    const rangeEnd = rangeStart + 50;
    try {
      const output = await runRemoval(resized, onProgress, model, rangeStart, rangeEnd);
      if (await validateOutputBlob(output)) {
        onProgress?.('done', 100);
        return output;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error('Background removal produced a corrupt or empty image');
}
