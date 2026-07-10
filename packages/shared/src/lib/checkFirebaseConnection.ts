import { collection, getDocs, limit, query } from "firebase/firestore";
import { buildMahalakFirebaseOptions } from "./firebaseConfig";
import { db } from "./firebase";

export async function checkFirebaseConnection() {
  buildMahalakFirebaseOptions();

  try {
    const testCollection = collection(db, "health_check_ping");
    const q = query(testCollection, limit(1));
    await getDocs(q);
  } catch {
    /* connection probe — failures are non-fatal */
  }
}
