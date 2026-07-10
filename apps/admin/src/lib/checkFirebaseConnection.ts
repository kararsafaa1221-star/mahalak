import { getDocFromServer, doc } from 'firebase/firestore';
import { db } from './firebase';

export async function checkFirebaseConnection() {
  try {
    await new Promise(resolve => setTimeout(resolve, 3000));
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
  }
}
