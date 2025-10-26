import React, { useState } from "react";
import { SafeAreaView, View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase";
import i18n from "../utils/i18n";

export default function SignIn({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert(i18n.t("error"), i18n.t("fillEmailPassword"));
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigation.replace("Home"); // Redirection après connexion
    } catch (e) {
      let message = i18n.t("loginFailed");
      if (e.code === "auth/invalid-email") message = i18n.t("invalidEmail");
      if (e.code === "auth/user-not-found") message = i18n.t("userNotFound");
      if (e.code === "auth/wrong-password") message = i18n.t("wrongPassword");
      Alert.alert(i18n.t("error"), message);
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
      <TextInput
        style={styles.input}
        placeholder={i18n.t("password")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

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
  input: { width: "85%", height: 48, borderColor: "#ddd", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginVertical: 8 }
});
