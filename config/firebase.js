// config/firebase.js
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCcoAzHUihZCk8XWWrf2tJIxZZ7jERxtzA",
  authDomain: "cupidog-3d60d.firebaseapp.com",
  projectId: "cupidog-3d60d",
  storageBucket: "cupidog-3d60d.firebasestorage.app",
  messagingSenderId: "1012348553481",
  appId: "1:1012348553481:web:94b00c0c56210e41842bd8",
  measurementId: "G-D0B8NKKGTM"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
