import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA7m-ekyU4nDT4bUjsxDHaL6e00782USb8",
  authDomain: "lakeshorelegends-d4c1b.firebaseapp.com",
  projectId: "lakeshorelegends-d4c1b",
  storageBucket: "lakeshorelegends-d4c1b.firebasestorage.app",
  messagingSenderId: "1035203765520",
  appId: "1:1035203765520:web:25a77437430fb64b09f195",
  measurementId: "G-6HZE2MY5KY",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);