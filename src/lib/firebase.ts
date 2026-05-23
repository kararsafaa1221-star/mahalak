import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfigData from '../../firebase-applet-config.json';

// Configuration from applet config or environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigData.apiKey || "dummy-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigData.authDomain || "dummy-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigData.projectId || "dummy-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigData.storageBucket || "dummy-storage-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigData.messagingSenderId || "dummy-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigData.appId || "dummy-app-id",
};

// Use the database ID from config or env
// In AI Studio preview, '(default)' is usually the most reliable unless a custom DB was explicitly provisioned and ready.
const databaseId = '(default)';

console.log("Configuring Firestore for project:", firebaseConfig.projectId, "using database:", databaseId);

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Use initializeFirestore with settings optimized for proxy environments
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalForceLongPolling: true
  });
} catch (e) {
  firestoreDb = getFirestore(app);
}
export const db = firestoreDb;

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
 * @param base64String Base64 image string from Webcam, file, or image-editor.
 * @param productId Unique ID of the product.
 * @returns {Promise<string>} Direct download URL of the uploaded image file.
 */
export const uploadProductImageStorage = async (base64String: string, productId: string): Promise<string> => {
  if (!base64String) {
    throw new Error("Base64 string data is required.");
  }
  
  try {
    const fileBlob = base64ToBlob(base64String);
    
    // Path inside Cloud Storage: products/images/{productId}.jpg
    // Consistent extension is jpg as requested, but we can set contentType correctly from blob's type
    const storageRef = ref(storage, `products/images/${productId}.jpg`);
    
    const metadata = {
      contentType: fileBlob.type || 'image/jpeg',
    };
    
    await uploadBytes(storageRef, fileBlob, metadata);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.error("Firebase Storage Upload Error:", error);
    throw error;
  }
};
