import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA-qQJhy6-MxX7daYZn58GDOnUr07r83Pw",
  authDomain: "administrador-ghc.firebaseapp.com",
  projectId: "administrador-ghc",
  storageBucket: "administrador-ghc.firebasestorage.app",
  messagingSenderId: "135502113821",
  appId: "1:135502113821:web:22ba57e0be4bdaf554eaf4",
  measurementId: "G-7HWLKQLTZ8"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
