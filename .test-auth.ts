import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
const app = initializeApp({ projectId: "test", apiKey: "dummy" });
try {
  const auth = getAuth(app);
  console.log("Auth works");
} catch(e) {
  console.log("Auth error", e);
}
