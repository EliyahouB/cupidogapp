import * as SecureStore from "expo-secure-store";
import { GoogleSignin, isSuccessResponse } from "@react-native-google-signin/google-signin";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

GoogleSignin.configure({
  webClientId: "1012348553481-53k6enjkiasq48r7qn2m805m6t6f3ivn.apps.googleusercontent.com",
});

export async function signInWithGoogle({ userType, providerType }) {
  console.log("Google sign-in démarré");
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  console.log("Google compte choisi");
  const { idToken, user: googleUser } = response.data || {};
  console.log("idToken reçu:", !!idToken);
  if (!isSuccessResponse(response)) return null;

  if (!idToken) {
    throw new Error("Google Sign-In did not return an ID token.");
  }

  const user = (await signInWithCredential(
    auth,
    GoogleAuthProvider.credential(idToken)
  )).user;

  try {
    await SecureStore.setItemAsync("userId", user.uid);
  } catch (error) {
    console.log("Erreur stockage userId", error);
  }

  const profileRef = doc(db, "profiles", user.uid);
  const profileSnapshot = await getDoc(profileRef);
  if (profileSnapshot.exists()) {
    return { user, profileCreated: false };
  }

  const name = user.displayName || (googleUser && googleUser.name) || "";
  await setDoc(profileRef, {
    uid: user.uid,
    email: user.email || (googleUser && googleUser.email) || "",
    createdAt: new Date(),
    authProvider: "google",
    userType,
    ...(userType === "professionnel" && {
      providerType,
      providerStatus: "pending",
      subscription: "none",
    }),
    name,
    displayName: name,
    photoUrl: user.photoURL || (googleUser && googleUser.photo) || null,
    city: "",
    bio: "",
    phone: "",
    hideProfile: false,
    nomadMode: true,
    emailVerified: user.emailVerified,
    onboardingCompleted: false,
    purpose: "",
    gender: "",
    abonnement: "gratuit",
  });

  return { user, profileCreated: true };
}