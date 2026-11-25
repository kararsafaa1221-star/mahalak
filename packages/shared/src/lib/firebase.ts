import { Capacitor } from '@capacitor/core';
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { buildMahalakFirebaseOptions, initMahalakFirestore } from './firebaseConfig';

const { firebaseConfig } = buildMahalakFirebaseOptions();

function initMahalakAuth(firebaseApp: FirebaseApp) {
  if (Capacitor.isNativePlatform()) {
    try {
      return initializeAuth(firebaseApp, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      });
    } catch {
      return getAuth(firebaseApp);
    }
  }
  return getAuth(firebaseApp);
}

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = initMahalakFirestore(app);
export const auth = initMahalakAuth(app);
/** Cloud Functions region — must match functions/index.js setGlobalOptions */
export const mahalakFunctions = getFunctions(app, 'us-central1');

export const storage = getStorage(app);

/**
 * Converts a Base64 string / Data URI to a Blob object.
 * Supports various MIME types (image/jpeg, image/png, etc.)
 */
export const base64ToBlob = (base64String: string): Blob => {
  const parts = base64String.split(';base64,');
  const contentType = parts[0].includes(':') ? parts[0].split(':')[1] : 'image/jpeg';
  const base64Data = parts[1] || parts[0];
  const raw = window.atob(base64Data);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
};

const MAX_PRODUCT_IMAGE_EDGE = 1200;
/** Stay under Storage rules limit (8 MiB) with headroom. */
const MAX_PRODUCT_IMAGE_BYTES = 7.5 * 1024 * 1024;

/** Resize + JPEG-encode product photos before Storage upload (handles large PNG from BG removal). */
export function dataUrlToProductUploadBlob(dataUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const maxEdge = MAX_PRODUCT_IMAGE_EDGE;
      if (width > maxEdge || height > maxEdge) {
        const ratio = Math.min(maxEdge / width, maxEdge / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not prepare image for upload.'));
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const encode = (quality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not encode image for upload.'));
              return;
            }
            if (blob.size > MAX_PRODUCT_IMAGE_BYTES && quality > 0.55) {
              encode(quality - 0.08);
              return;
            }
            resolve(blob);
          },
          'image/jpeg',
          quality,
        );
      };
      encode(0.88);
    };
    img.onerror = () => reject(new Error('Invalid product image data.'));
    img.src = dataUrl;
  });
}

/**
 * Uploads a base64 image (either raw base64 or complete data URL) directly to Firebase Storage.
 */
export const uploadProductImageStorage = async (
  base64String: string,
  productId: string,
  storeId: string,
): Promise<string> => {
  if (!base64String) {
    throw new Error('Base64 string data is required.');
  }
  if (!storeId) {
    throw new Error('storeId is required for product image uploads.');
  }
  if (!auth.currentUser) {
    throw new Error('Firebase Auth session required for Storage uploads.');
  }

  const fileBlob = await dataUrlToProductUploadBlob(base64String);
  const storageRef = ref(storage, `products/images/${storeId}/${productId}.jpg`);
  const metadata = { contentType: 'image/jpeg' };

  try {
    await uploadBytes(storageRef, fileBlob, metadata);
  } catch (error) {
    const code = String((error as { code?: string })?.code ?? '');
    if (code === 'storage/unauthorized') {
      throw new Error(
        'رفض الخادم رفع الصورة. سجّل الخروج ثم ادخل مجدداً بكلمة المرور، أو تحقق من اتصال الإنترنت.',
      );
    }
    if (code === 'storage/quota-exceeded' || code === 'storage/unauthenticated') {
      throw new Error('تعذر رفع الصورة إلى Firebase Storage. تحقق من تسجيل الدخول ومساحة التخزين.');
    }
    throw error;
  }
  return getDownloadURL(storageRef);
};

/** Admin spin-wheel images (center hub + slice art). */
export const uploadSpinWheelImageStorage = async (
  base64String: string,
  fileKey: string,
): Promise<string> => {
  if (!base64String) {
    throw new Error('Base64 string data is required.');
  }
  if (!auth.currentUser) {
    throw new Error('Firebase Auth session required for Storage uploads.');
  }

  const safeKey = String(fileKey || 'img')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 80);
  const fileBlob = base64ToBlob(base64String);
  const storageRef = ref(storage, `spinWheel/${safeKey}_${Date.now()}.jpg`);
  const metadata = { contentType: fileBlob.type || 'image/jpeg' };

  await uploadBytes(storageRef, fileBlob, metadata);
  return getDownloadURL(storageRef);
};
