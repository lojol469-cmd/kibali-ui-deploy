// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Vérifie que les variables sont bien chargées (très utile pour debug)
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;

// Debug temporaire (à supprimer plus tard)
console.log("Firebase Config chargée :", {
  apiKey: apiKey ? "OK (cachée)" : "MANQUANTE !",
  authDomain,
  projectId,
  appId
});

if (!apiKey || !authDomain || !projectId || !appId) {
  throw new Error("Variables Firebase manquantes dans .env ! Vérifie ton fichier .env à la racine.");
}

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();