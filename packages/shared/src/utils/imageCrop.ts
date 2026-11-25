/** Cover-fit dimensions: image fills the crop viewport with no empty gaps. */
export function computeCoverDimensions(
  imgWidth: number,
  imgHeight: number,
  viewWidth: number,
  viewHeight: number,
): { width: number; height: number } {
  if (!imgWidth || !imgHeight) {
    return { width: viewWidth, height: viewHeight };
  }
  const imgRatio = imgWidth / imgHeight;
  const viewRatio = viewWidth / viewHeight;
  if (imgRatio > viewRatio) {
    return { width: viewHeight * imgRatio, height: viewHeight };
  }
  return { width: viewWidth, height: viewWidth / imgRatio };
}

/** Caps decoded dimensions so huge camera photos (e.g. 48MP) don't blow up memory. */
const NORMALIZE_MAX_DIMENSION = 2000;

function capDimensions(width: number, height: number, maxDimension: number): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) return { width, height };
  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

/**
 * Normalizes EXIF orientation (common on mobile photos) so preview matches export.
 * Also downsizes very large photos so decoding/encoding stays fast and memory-safe,
 * independent of the original file size.
 */
export async function normalizeImageForEditing(
  file: File,
): Promise<{ dataUrl: string; width: number; height: number }> {
  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      try {
        const { width, height } = capDimensions(bitmap.width, bitmap.height, NORMALIZE_MAX_DIMENSION);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No canvas context');
        ctx.drawImage(bitmap, 0, 0, width, height);
        return {
          dataUrl: canvas.toDataURL('image/jpeg', 0.9),
          width: canvas.width,
          height: canvas.height,
        };
      } finally {
        bitmap.close();
      }
    } catch {
      // fall through to legacy path
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const { width, height } = capDimensions(img.width, img.height, NORMALIZE_MAX_DIMENSION);
        if (width === img.width && height === img.height) {
          resolve({ dataUrl, width, height });
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl, width: img.width, height: img.height });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.9), width, height });
      };
      img.onerror = () => reject(new Error('Failed to read image dimensions'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
