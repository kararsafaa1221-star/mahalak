import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
const app = initializeApp({ projectId: "test", apiKey: "dummy" });
const auth = getAuth(app);
console.log("Listening...");
const t = setTimeout(() => console.log("Timed out"), 3000);
onAuthStateChanged(auth, (user) => {
  console.log("Auth fired", user);
  clearTimeout(t);
});
