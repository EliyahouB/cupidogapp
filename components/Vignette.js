import React from "react";
import { TouchableOpacity, View, Image, Text, StyleSheet } from "react-native";

const images = {
  "achat-vente": require("../assets/achat-vente.png"),
  eleveur: require("../assets/eleveur.png"),
  "rencontre-parc": require("../assets/rencontre-parc.png"),
  "mes-chiens": require("../assets/mes-chiens.png"),
};

export default function Vignette({ id, title, onPress }) {
  const source = images[id] ?? require("../assets/placeholder.png");

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
  container: {
    width: "42%",
    marginBottom: 12,
    marginHorizontal: 6,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    elevation: 3,
    paddingBottom: 12,
  },
  image: {
    width: "95%", // ✅ Réduction de l’image à l’intérieur
    height: 100,
    resizeMode: "contain",
    marginTop: 12,
  },
  title: {
    marginTop: 8,
    fontWeight: "700",
    textAlign: "center",
  },
});
