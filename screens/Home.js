import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import ScreenLayout from "../components/ScreenLayout";
import i18n from "../utils/i18n";
import { removeUserId } from "../utils/authStorage";

function VignetteImage({ source, title, onPress }) {
  return (
    <TouchableOpacity style={styles.vignetteImage} onPress={onPress}>
      <Image source={source} style={styles.iconImage} />
      <Text style={styles.iconText}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function Home({ navigation }) {
  const handleLogout = async () => {
    await removeUserId();
    navigation.replace("SignIn");
  };

  return (
    <ScreenLayout
      title="Accueil"
      navigation={navigation}
      active="home"
      onProfile={() => navigation.navigate("ProfileMenu")}
      onChat={() => navigation.navigate("Conversations")}
    >
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
            onPress={() => navigation.navigate("ChiensParBut", { purpose: "Rencontre" })}
          />
          <VignetteImage
            source={require("../assets/achat-vente.png")}
            title="Achat / Vente"
            onPress={() => navigation.navigate("ChiensParBut", { purpose: "Vente" })}
          />
          <VignetteImage
            source={require("../assets/eleveur.png")}
            title="Éleveur / Saillie"
            onPress={() => navigation.navigate("ChiensParBut", { purpose: "Saillie" })}
          />
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.logoutWrapper} onPress={handleLogout}>
        <LinearGradient
          colors={["#007AFF", "#0051A8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>{i18n.t("logout")}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
    alignItems: "center",
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
  logoutWrapper: {
    position: "absolute",
    bottom: 20,
    right: 20,
    zIndex: 10,
  },
  logoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    elevation: 3,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
