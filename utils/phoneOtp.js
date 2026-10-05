import { signInWithCustomToken } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { auth } from "../config/firebase";

const functions = getFunctions(app, "us-central1");

export async function sendPhoneOtp({ phoneNumber, purpose, userType, providerType }) {
  const sendOTP = httpsCallable(functions, "sendOTP");
  await sendOTP({ phoneNumber, purpose, userType, providerType });
}

export async function verifyPhoneOtp(phoneNumber, code) {
  const verifyOTP = httpsCallable(functions, "verifyOTP");
  const result = await verifyOTP({ phoneNumber, code });
  return signInWithCustomToken(auth, result.data.customToken);
}