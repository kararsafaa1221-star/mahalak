import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { buildMahalakFirebaseOptions, initMahalakFirestore } from './firebaseConfig';

const { firebaseConfig } = buildMahalakFirebaseOptions();

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = initMahalakFirestore(app);
export const auth = getAuth(app);

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

/**
 * Uploads a base64 image (either raw base64 or complete data URL) directly to Firebase Storage.
 */
export const uploadProductImageStorage = async (base64String: string, productId: string): Promise<string> => {
  if (!base64String) {
    throw new Error('Base64 string data is required.');
  }

  const fileBlob = base64ToBlob(base64String);
  const storageRef = ref(storage, `products/images/${productId}.jpg`);
  const metadata = { contentType: fileBlob.type || 'image/jpeg' };

  await uploadBytes(storageRef, fileBlob, metadata);
  return getDownloadURL(storageRef);
};
