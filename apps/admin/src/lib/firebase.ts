/**
 * Admin uses the shared Firebase singleton so Firestore is never initialized twice
 * with conflicting options (persistent cache vs plain long-polling).
 */
export {
  app,
  auth,
  db,
  storage,
  mahalakFunctions,
  base64ToBlob,
  uploadProductImageStorage,
  uploadSpinWheelImageStorage,
} from '@shared/lib/firebase';
