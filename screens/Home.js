// screens/Home.js
import React from "react";
import { SafeAreaView, View, Text, Button, StyleSheet, ImageBackground, ScrollView } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import Vignette from "../components/Vignette";

export default function Home({ navigation, user }) {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("signOut error", e?.message ?? e);
    }
  };

  const items = [
    { id: "rencontre-parc", title: "Rencontres", route: "Rencontres" },
    { id: "eleveur", title: "Éleveurs", route: "Eleveur" },
    { id: "achat-vente", title: "Achat / Vente", route: "AchatVente" },
    { id: "mes-chiens", title: "Mes Chiens", route: "MesChiens" }
  ];

  return (
    <ImageBackground source={require("../assets/bg.png")} style={styles.bg}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Accueil</Text>
          <Text style={styles.welcome}>Bonjour {user?.displayName ?? user?.email ?? "utilisateur"}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled">
          {items.map((it) => (
            <Vignette key={it.id} id={it.id} title={it.title} onPress={() => navigation.navigate(it.route)} />
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Se déconnecter" onPress={handleSignOut} />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, resizeMode: "cover" },
  container: { flex: 1, padding: 14 },
  header: { marginBottom: 6 },
  title: { fontSize: 26, fontWeight: "800", color: "#042A5B" },
  welcome: { fontSize: 14, color: "#223344", marginTop: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingTop: 12 },
  footer: { paddingVertical: 12 }
});
