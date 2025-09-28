// components/Vignette.js
import React from "react";
import { TouchableOpacity, View, Image, Text, StyleSheet } from "react-native";

const images = {
  "achat-vente": require("../assets/achat-vente.png"),
  "achat-vente-femme": require("../assets/achat-vente-femme.png"),
  eleveur: require("../assets/eleveur.png"),
  "eleveur-femme": require("../assets/eleveur-femme.png"),
  "rencontre-parc": require("../assets/rencontre-parc.png"),
  "rencontre-parc-femme": require("../assets/rencontre-parc-femme.png"),
  "mes-chiens": require("../assets/mes-chiens.png"),
  "mes-chiens-femme": require("../assets/mes-chiens-femme.png"),
};

export default function Vignette({ id, title, onPress }) {
  // Priorité : version sans "-femme" si elle existe, sinon fallback vers "-femme", sinon placeholder
  const source = images[id] ?? images[`${id}-femme`] ?? require("../assets/placeholder.png");

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.card}>
        <Image source={source} style={styles.image} />
        <Text style={styles.title}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { width: "48%", marginBottom: 12 },
  card: { backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", alignItems: "center", elevation: 3, paddingBottom: 12 },
  image: { width: "100%", height: 110, resizeMode: "cover" },
  title: { marginTop: 8, fontWeight: "700" }
});
