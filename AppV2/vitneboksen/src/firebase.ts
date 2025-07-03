// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyBIbR4IZz_hHDdLzFXsXXOE_AzkUwAwAow",
  authDomain: "vitneboksen.firebaseapp.com",
  databaseURL: "https://vitneboksen-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "vitneboksen",
  storageBucket: "vitneboksen.firebasestorage.app",
  messagingSenderId: "164808336530",
  appId: "1:164808336530:web:277d9236961ab00ab4f24b",
  measurementId: "G-PMQT161CEZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);

export default app;