import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenLayout from "../components/ScreenLayout";
import { db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";

function VignetteImage({ source, title, onPress }) {
  return (
    <TouchableOpacity style={styles.vignetteImage} onPress={onPress}>
      <Image source={source} style={styles.iconImage} />
      <Text style={styles.iconText}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function Home({ navigation }) {
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  useEffect(() => {
    checkWelcomePopup();
  }, []);

  const checkWelcomePopup = async () => {
    try {
      // Verifier si on a deja vu le popup aujourd'hui
      const lastSeen = await AsyncStorage.getItem("welcomePopupLastSeen");
      const today = new Date().toDateString();
      
      if (lastSeen === today) {
        return; // Deja vu aujourd'hui
      }

      // Verifier le flag Firebase
      const configRef = doc(db, "app_config", "settings");
      const configSnap = await getDoc(configRef);
      
      if (configSnap.exists()) {
        const config = configSnap.data();
        if (config.showWelcomePopup === false) {
          return; // Popup desactive par admin
        }
      }

      // Afficher le popup
      setShowWelcomePopup(true);
    } catch (error) {
      console.log("Erreur checkWelcomePopup:", error);
    }
  };

  const closeWelcomePopup = async () => {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem("welcomePopupLastSeen", today);
    } catch (error) {
      console.log("Erreur save popup date:", error);
    }
    setShowWelcomePopup(false);
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
            source={require("../assets/cupidogshop.png")}
            title="CupiDog Shop"
            onPress={() => navigation.navigate("Marketplace")}
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

      {/* POPUP BIENVENUE */}
      <Modal
        visible={showWelcomePopup}
        transparent={true}
        animationType="fade"
        onRequestClose={closeWelcomePopup}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <LinearGradient
                colors={["#FFD700", "#FFA500", "#FF6B35"]}
                style={styles.modalIconGradient}
              >
                <MaterialCommunityIcons name="star-circle" size={50} color="#FFF" />
              </LinearGradient>
            </View>

            <Text style={styles.modalTitle}>Bienvenue sur CupiDog !</Text>
            
            <View style={styles.modalBadge}>
              <MaterialCommunityIcons name="account-star" size={16} color="#FFD700" />
              <Text style={styles.modalBadgeText}>Vous etes parmi nos premiers membres !</Text>
            </View>

            <Text style={styles.modalText}>
              Nous avons cree cette app pour changer la facon dont les proprietaires de chiens se rencontrent.
            </Text>

            <Text style={styles.modalText}>
              En tant que nouvelle communaute, les profils continuent de croitre. Gardez l'app installee - de nouveaux membres nous rejoignent chaque jour !
            </Text>

            <View style={styles.modalHighlight}>
              <MaterialCommunityIcons name="heart" size={20} color="#E91E63" />
              <Text style={styles.modalHighlightText}>
                Votre patience nous aide a construire quelque chose de special
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={closeWelcomePopup}
            >
              <LinearGradient
                colors={["#FF6B35", "#FF8C42"]}
                style={styles.modalButtonGradient}
              >
                <Text style={styles.modalButtonText}>C'est parti !</Text>
                <MaterialCommunityIcons name="paw" size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 12,
    textAlign: "center",
  },
  modalBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    gap: 8,
  },
  modalBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#B8860B",
  },
  modalText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 22,
  },
  modalHighlight: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FCE4EC",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 20,
    gap: 10,
  },
  modalHighlightText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#C2185B",
    lineHeight: 20,
  },
  modalButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  modalButtonGradient: {
    flexDirection: "row",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  modalButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});