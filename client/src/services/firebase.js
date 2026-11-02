import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";

// Web app's Firebase configuration
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCdt_1sz2qMzpDLNwe5I9oR0_7HgiLjGv0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mister-irham.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mister-irham",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mister-irham.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "392465554867",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:392465554867:web:c5da507fe9e0b418a13fc6",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-2HTWTGZRN0",
  // Realtime Database URL di region asia-southeast1
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://mister-irham-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Realtime Database
export const database = getDatabase(app);

// Initialize Firebase Auth (Transparent Anonymous Sign-In for Security Rules)
export const auth = getAuth(app);
if (typeof window !== "undefined") {
  signInAnonymously(auth).catch((err) => {
    // Graceful fallback if anonymous auth is not yet toggled on Firebase Console
    console.info("Firebase Auth info:", err?.code || err?.message);
  });
}

// Initialize Analytics safely
export let analytics = null;
if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch((err) => {
      console.warn("Firebase Analytics initialization skipped:", err);
    });
}

export default app;
