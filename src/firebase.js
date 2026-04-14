import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAxMFLUe8hwgt-dbeaj27V4jjqASHol7hs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sync-player-2023e.firebaseapp.com",
  // GANTI LINK DI BAWAH INI dengan link dari menu Realtime Database Anda
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://sync-player-2023e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sync-player-2023e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sync-player-2023e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "342357728162",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:342357728162:web:159271a20737dda39fb8fb", // Sudah ditambah koma
  measurementId: "G-CGD1EC6VG4"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Inisialisasi Realtime Database dan ekspor
export const db = getDatabase(app);