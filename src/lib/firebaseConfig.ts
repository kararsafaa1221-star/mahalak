import type { FirebaseApp } from 'firebase/app';
import { initializeFirestore, type Firestore } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase.config.json';

/** Canonical Firebase project — do not change without updating Firebase Console. */
export const MAHALAK_PROJECT_ID = 'mahalak-0';

/** Named Firestore database on mahalak-0 (firebase.json → "database": "default"). */
export const FIRESTORE_DATABASE_ID = 'default';

export const MAHALAK_FIREBASE_APP_NAME = firebaseConfigJson.appNickname || 'mahalak-web';

/**
 * Mahalak production Firebase web config (mahalak-0).
 * Values are sourced from firebase.config.json at build time — not from Vite env vars.
 */
export const MAHALAK_FIREBASE_CONFIG = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: MAHALAK_PROJECT_ID,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
  measurementId: firebaseConfigJson.measurementId || '',
  databaseURL: firebaseConfigJson.databaseURL || '',
} as const;

export interface MahalakFirebaseOptions {
  firebaseConfig: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
    databaseURL: string;
  };
  projectId: string;
  firestoreDatabaseId: string;
  appName: string;
}

function normalizeDatabaseId(id: string): string {
  const trimmed = id.trim();
  return trimmed === '(default)' ? FIRESTORE_DATABASE_ID : trimmed;
}

function assertMahalakConfig(): void {
  if (firebaseConfigJson.projectId !== MAHALAK_PROJECT_ID) {
    throw new Error(
      `[Firebase] firebase.config.json projectId must be "${MAHALAK_PROJECT_ID}", ` +
        `found "${firebaseConfigJson.projectId}".`,
    );
  }

  const blocked = [firebaseConfigJson.projectId, firebaseConfigJson.appId, firebaseConfigJson.authDomain]
    .filter(Boolean)
    .some((value) => /ai-studio|aistudio|c89a3582|dbc0c011/i.test(String(value)));

  if (blocked) {
    throw new Error(
      '[Firebase] Legacy AI Studio configuration detected in firebase.config.json. ' +
        'Replace it with the mahalak-0 credentials from Firebase Console.',
    );
  }
}

export function buildMahalakFirebaseOptions(): MahalakFirebaseOptions {
  assertMahalakConfig();

  const firestoreDatabaseId = normalizeDatabaseId(
    firebaseConfigJson.firestoreDatabaseId || FIRESTORE_DATABASE_ID,
  );

  if (/ai-studio|aistudio|c89a3582|dbc0c011/i.test(firestoreDatabaseId)) {
    throw new Error(
      `[Firebase] Invalid Firestore database id "${firestoreDatabaseId}". ` +
        `Use "${FIRESTORE_DATABASE_ID}" for mahalak-0.`,
    );
  }

  return {
    firebaseConfig: { ...MAHALAK_FIREBASE_CONFIG },
    projectId: MAHALAK_PROJECT_ID,
    firestoreDatabaseId,
    appName: MAHALAK_FIREBASE_APP_NAME,
  };
}

const FIRESTORE_SETTINGS = { experimentalAutoDetectLongPolling: true } as const;

/** Connect to the mahalak-0 Firestore database (named "default" in firebase.json). */
export function initMahalakFirestore(app: FirebaseApp): Firestore {
  const { firestoreDatabaseId } = buildMahalakFirebaseOptions();
  if (!firestoreDatabaseId || firestoreDatabaseId === '(default)') {
    return initializeFirestore(app, FIRESTORE_SETTINGS);
  }
  return initializeFirestore(app, FIRESTORE_SETTINGS, firestoreDatabaseId);
}
