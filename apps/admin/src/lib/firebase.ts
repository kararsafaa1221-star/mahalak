import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { buildMahalakFirebaseOptions, initMahalakFirestore } from './firebaseConfig';

const { firebaseConfig } = buildMahalakFirebaseOptions();

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = initMahalakFirestore(app);

export const auth = getAuth(app);

export const storage = getStorage(app);

export const base64ToBlob = (base64String: string): Blob => {
  const parts = base64String.split(';base64,');
  const contentType = parts[0].includes(':') ? parts[0].split(':')[1] : 'image/jpeg';
  const base64Data = parts[1] || parts[0];
  const raw = window.atob(base64Data);
  const uInt8Array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
};

export const uploadProductImageStorage = async (
  base64String: string,
  productId: string,
  storeId: string,
): Promise<string> => {
  if (!base64String) throw new Error('Base64 string data is required.');
  if (!storeId) throw new Error('storeId is required for product image uploads.');
  const fileBlob = base64ToBlob(base64String);
  const storageRef = ref(storage, `products/images/${storeId}/${productId}.jpg`);
  await uploadBytes(storageRef, fileBlob);
  return getDownloadURL(storageRef);
};
