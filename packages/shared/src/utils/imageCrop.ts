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

/**
 * Normalizes EXIF orientation (common on mobile photos) so preview matches export.
 */
export async function normalizeImageForEditing(
  file: File,
): Promise<{ dataUrl: string; width: number; height: number }> {
  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas context');
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      return {
        dataUrl: canvas.toDataURL('image/jpeg', 0.92),
        width: canvas.width,
        height: canvas.height,
      };
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
        resolve({ dataUrl, width: img.width, height: img.height });
      };
      img.onerror = () => reject(new Error('Failed to read image dimensions'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
