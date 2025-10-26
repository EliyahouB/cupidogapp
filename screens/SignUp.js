import React, { useState } from "react";
import { SafeAreaView, View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../config/firebase";
import i18n from "../utils/i18n";

export default function SignUp({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert(i18n.t("error"), i18n.t("fillEmailPassword"));
      return;
    }
    if (password.length < 6) {
      Alert.alert(i18n.t("error"), i18n.t("passwordTooShort"));
      return;
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      navigation.replace("Home"); // Redirection après inscription
    } catch (e) {
      let message = i18n.t("signupFailed");
      if (e.code === "auth/email-already-in-use") message = i18n.t("emailInUse");
      if (e.code === "auth/invalid-email") message = i18n.t("invalidEmail");
      Alert.alert(i18n.t("error"), message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{i18n.t("signup")}</Text>

      <TextInput
        style={styles.input}
        placeholder={i18n.t("displayName")}
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
      />
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
        <Button title={i18n.t("signup")} onPress={handleSignUp} />
      </View>

      <View style={{ marginTop: 12 }}>
        <Button title={i18n.t("back")} onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", paddingTop: 30, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  input: { width: "85%", height: 48, borderColor: "#ddd", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginVertical: 8 }
});
