import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

const app = initializeApp({ projectId: "test" });
try {
  const db = initializeFirestore(app, {
    experimentalForceLongPolling: true
  }, '(default)');
  console.log("OK 1", db ? "YES" : "NO");
} catch (e) {
  console.log("ERROR 1", e);
}
