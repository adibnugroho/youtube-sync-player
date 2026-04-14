import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Konfigurasi Firebase dari environment variables
// Anda dapat memasukkan API Key secara langsung jika tidak menggunakan file .env
// Atau buat file .env di root project dan isi variabel berikut.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "MASUKKAN_API_KEY_ANDA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "MASUKKAN_AUTH_DOMAIN_ANDA",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://MASUKKAN_DB_NAMA_ANDA.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "MASUKKAN_PROJECT_ID_ANDA",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "MASUKKAN_STORAGE_BUCKET_ANDA",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "MASUKKAN_SENDER_ID_ANDA",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "MASUKKAN_APP_ID_ANDA"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Inisialisasi Realtime Database dan ekspor
export const db = getDatabase(app);
