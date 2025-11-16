import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from "react-native";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import * as SecureStore from "expo-secure-store";
import { auth } from "../config/firebase";
import i18n from "../utils/i18n";

export default function SignIn({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const storeUserId = async (uid) => {
    try {
      await SecureStore.setItemAsync("userId", uid);
    } catch (e) {
      console.log("Erreur stockage userId", e);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert(i18n.t("error"), i18n.t("fillEmailPassword"));
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      await storeUserId(uid);
      navigation.replace("Home");
    } catch (e) {
      let message = i18n.t("loginFailed");
      if (e.code === "auth/invalid-email") message = i18n.t("invalidEmail");
      if (e.code === "auth/user-not-found") message = i18n.t("userNotFound");
      if (e.code === "auth/wrong-password") message = i18n.t("wrongPassword");
      Alert.alert(i18n.t("error"), message);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert(i18n.t("error"), i18n.t("enterEmailToReset"));
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(i18n.t("success"), i18n.t("resetEmailSent"));
    } catch (e) {
      Alert.alert(i18n.t("error"), i18n.t("resetFailed"));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{i18n.t("signin")}</Text>

      <TextInput
        style={styles.input}
        placeholder={i18n.t("email")}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder={i18n.t("password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <MaterialCommunityIcons
            name={showPassword ? "eye-off" : "eye"}
            size={24}
            color="#888"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleResetPassword}>
        <Text style={styles.forgotText}>{i18n.t("forgotPassword")}</Text>
      </TouchableOpacity>

      <View style={{ width: "80%", marginTop: 12 }}>
        <Button title={i18n.t("login")} onPress={handleSignIn} />
      </View>

      <View style={{ marginTop: 12 }}>
        <Button title={i18n.t("back")} onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", paddingTop: 40, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 20 },
  input: {
    width: "85%",
    height: 48,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginVertical: 8,
  },
  passwordContainer: {
    width: "85%",
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginVertical: 8,
  },
  passwordInput: {
    flex: 1,
    height: 48,
  },
  forgotText: {
    marginTop: 8,
    color: "#007AFF",
    fontSize: 14,
  },
});
