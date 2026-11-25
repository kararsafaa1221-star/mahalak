/**
 * Re-export shared Firebase config helpers so admin never drifts into a second
 * Firestore initialization path with different settings.
 */
export {
  MAHALAK_PROJECT_ID,
  FIRESTORE_DATABASE_ID,
  MAHALAK_FIREBASE_APP_NAME,
  MAHALAK_FIREBASE_CONFIG,
  buildMahalakFirebaseOptions,
  initMahalakFirestore,
  type MahalakFirebaseOptions,
} from '@shared/lib/firebaseConfig';
