// screens/Welcome.js
import React from "react";
import { SafeAreaView, View, Text, TouchableOpacity, Image, ImageBackground, StyleSheet } from "react-native";

export default function Welcome({ navigation, onAuth = () => {} }) {
  const handleLocal = () => {
    const userObject = { uid: "localUser", displayName: "Invité" };
    if (typeof onAuth === "function") onAuth(userObject);
  };

  return (
    <ImageBackground source={require("../assets/bg.png")} style={styles.bg}>
      <SafeAreaView style={styles.container}>
        <View style={styles.top}>
          <Image source={require("../assets/logo.png")} style={styles.logo} />
          <Text style={styles.title}>Bienvenue</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate("SignIn")}>
            <Text style={styles.primaryTxt}>SE CONNECTER (ÉCRAN SIGNIN)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate("SignUp")}>
            <Text style={styles.primaryTxt}>S'INSCRIRE (ÉCRAN SIGNUP)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.outlineBtn} onPress={handleLocal}>
            <Text style={styles.outlineTxt}>CONNEXION LOCALE (TEST)</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, resizeMode: "cover" },
  container: { flex: 1, justifyContent: "space-between", alignItems: "center", paddingVertical: 36 },
  top: { alignItems: "center", marginTop: 8 },
  logo: { width: 160, height: 160, resizeMode: "contain", marginBottom: 8 },
  title: { fontSize: 34, fontWeight: "800", color: "#042A5B" },
  actions: { width: "100%", alignItems: "center", paddingBottom: 40 },
  primaryBtn: { width: "86%", backgroundColor: "#1E88E5", paddingVertical: 14, borderRadius: 30, alignItems: "center", marginVertical: 10, elevation: 3 },
  primaryTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
  outlineBtn: { width: "86%", borderColor: "#1E88E5", borderWidth: 2, paddingVertical: 12, borderRadius: 30, alignItems: "center", marginTop: 8, backgroundColor: "transparent" },
  outlineTxt: { color: "#1E88E5", fontSize: 15, fontWeight: "700" }
});
