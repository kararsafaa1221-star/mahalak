import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, limit, query } from "firebase/firestore";
import firebaseConfigData from "../../firebase-applet-config.json";
import { db } from "./firebase";

export async function checkFirebaseConnection() {
  console.log("=== Starting Firebase Connection Check ===");

  // 1. Check Initialization
  let app;
  try {
    const firebaseConfig = {
      apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigData.apiKey || "dummy-api-key").trim(),
      authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigData.authDomain || "dummy-auth-domain").trim(),
      projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigData.projectId || "dummy-project-id").trim(),
      storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigData.storageBucket || "dummy-storage-bucket").trim(),
      messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigData.messagingSenderId || "dummy-sender-id").trim(),
      appId: (import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigData.appId || "dummy-app-id").trim(),
    };

    if (!getApps().length) {
      console.log("[INIT] Firebase not initialized. Initializing now...");
      app = initializeApp(firebaseConfig);
    } else {
      console.log("[INIT] Firebase already initialized.");
      app = getApp();
    }
    console.log("[INIT] ✅ Firebase initialized successfully.");
  } catch (error) {
    console.error("[INIT] ❌ Failed to initialize Firebase:", error);
    return;
  }

  // 2. Check Auth Status / Anonymous Sign-In
  try {
    console.log("[AUTH] Checking Authentication status...");
    const auth = getAuth(app);
    
    await new Promise<void>((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        async (user) => {
          unsubscribe();
          if (user) {
            console.log("[AUTH] ✅ User is already signed in. UID:", user.uid);
            resolve();
          } else {
            console.log("[AUTH] No user signed in. Attempting anonymous sign-in...");
            try {
              const userCredential = await signInAnonymously(auth);
              console.log("[AUTH] ✅ Signed in anonymously successfully. UID:", userCredential.user.uid);
              resolve();
            } catch (signInError) {
              console.error("[AUTH] ❌ Failed to sign in anonymously:", signInError);
              reject(signInError);
            }
          }
        },
        (error) => {
          console.error("[AUTH] ❌ Auth state error:", error);
          unsubscribe();
          reject(error);
        }
      );
    });
  } catch (error) {
    console.error("[AUTH] ❌ Auth check failed:", error);
  }

  // 3. Check Firestore Connection
  try {
    console.log("[FIRESTORE] Checking local Firestore connection...");
    const testCollection = collection(db, "health_check_ping");
    const q = query(testCollection, limit(1));
    
    try {
      await getDocs(q);
      console.log("[FIRESTORE] ✅ Firestore connection successful (Read OK).");
    } catch (fsError: any) {
      if (fsError.code === "permission-denied") {
        console.log("[FIRESTORE] ✅ Firestore connection successful (Contacted server, but got permission-denied as expected).");
      } else {
        console.error("[FIRESTORE] ❌ Firestore read failed with error:", fsError);
      }
    }
  } catch (error) {
    console.error("[FIRESTORE] ❌ Failed to initialize Firestore:", error);
  }

  console.log("=== Finished Firebase Connection Check ===");
}
