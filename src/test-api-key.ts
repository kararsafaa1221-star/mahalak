import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";

const config = {
  apiKey: "AIzaSyAnx_mRGGnbzKICKdh6qqrfL3jYRMGXZfI",
  authDomain: "mahalak-0.firebaseapp.com",
  projectId: "mahalak-0",
  storageBucket: "mahalak-0.firebasestorage.app",
  messagingSenderId: "405501753361",
  appId: "461ffa4c1e8ebb6e98d9b01:405501753361"
};

const app = initializeApp(config);
const auth = getAuth(app);

signInAnonymously(auth).then(() => {
  console.log("Success");
  process.exit(0);
}).catch(e => {
  console.error("Failed:", e.message);
  process.exit(1);
});
