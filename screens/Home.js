import React from "react";
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity } from "react-native";
import ScreenLayout from "../components/ScreenLayout";

// 🔹 Vignette personnalisée avec image + texte + navigation
function VignetteImage({ source, title, onPress }) {
  return (
    <TouchableOpacity style={styles.vignetteImage} onPress={onPress}>
      <Image source={source} style={styles.iconImage} />
      <Text style={styles.iconText}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function Home({ navigation }) {
  return (
    <ScreenLayout title="Accueil" navigation={navigation}>
      <ScrollView contentContainerStyle={styles.container}>

        <Image
          source={require("../assets/placeholder.png")}
          style={styles.logo}
        />

        <View style={styles.grid}>
          <VignetteImage
            source={require("../assets/mes-chiens.png")}
            title="Mes chiens"
            onPress={() => navigation.navigate("MesChiens")}
          />
          <VignetteImage
            source={require("../assets/rencontre-parc.png")}
            title="Rencontre / Parc"
            onPress={() => navigation.navigate("Chat")}
          />
          <VignetteImage
            source={require("../assets/achat-vente.png")}
            title="Achat / Vente"
            onPress={() => navigation.navigate("Likes")}
          />
          <VignetteImage
            source={require("../assets/eleveur.png")}
            title="Éleveur / Saillie"
            onPress={() => navigation.navigate("Likes")}
          />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
    alignItems: "center",
  },
  welcome: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 12,
    textAlign: "center",
  },
  logo: {
    width: 260,
    height: 260,
    resizeMode: "contain",
    marginBottom: 1,
    marginTop: -44,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: -44,
  },

  // 🔹 Styles pour les vignettes avec image
  vignetteImage: {
    width: "42%",
    alignItems: "center",
    margin: 8,
  },
  iconImage: {
    width: 140,
    height: 140,
    borderRadius: 20,
    marginBottom: 6,
  },
  iconText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
});
