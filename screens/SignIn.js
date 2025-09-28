// screens/SignIn.js
import React, { useState } from "react";
import { SafeAreaView, View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase";

export default function SignIn({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Remplis email et mot de passe");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      Alert.alert("Connexion échouée", e?.message ?? String(e));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Se connecter</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View style={{ width: "80%", marginTop: 12 }}>
        <Button title="Se connecter" onPress={handleSignIn} />
      </View>

      <View style={{ marginTop: 12 }}>
        <Button title="Retour" onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", paddingTop: 40, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 20 },
  input: { width: "85%", height: 48, borderColor: "#ddd", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginVertical: 8 }
});
