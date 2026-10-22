import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase } from "firebase/database";

// Web app's Firebase configuration
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCdt_1sz2qMzpDLNwe5I9oR0_7HgiLjGv0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mister-irham.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mister-irham",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mister-irham.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "392465554867",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:392465554867:web:c5da507fe9e0b418a13fc6",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-2HTWTGZRN0",
  // Ganti databaseURL jika Realtime Database Anda berada di region selain US (misal asia-southeast1)
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://mister-irham-default-rtdb.firebaseio.com"
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Realtime Database
export const database = getDatabase(app);

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
