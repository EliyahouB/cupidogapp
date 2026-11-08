// config/firebase.js
import { initializeApp } from "firebase/app";
import { Platform } from "react-native";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

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
export const functions = getFunctions(app);

if (__DEV__ && process.env.EXPO_PUBLIC_USE_FUNCTIONS_EMULATOR === "true") {
  const emulatorHost = process.env.EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST ||
    (Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1");
  connectFunctionsEmulator(functions, emulatorHost, 5001);
}

export default app;
