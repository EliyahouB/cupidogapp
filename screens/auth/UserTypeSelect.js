// screens/auth/UserTypeSelect.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserTypeSelect({ navigation }) {
  const handleSelect = (userType) => {
    if (userType === "particulier") {
      navigation.navigate("AuthMethods", { userType: "particulier" });
    } else {
      navigation.navigate("ProviderTypeSelect");
    }
  };

  return (
    <LinearGradient colors={["#F5D547", "#FF9966"]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={28} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.container}>
          <Text style={styles.title}>Comment souhaitez-vous{"\n"}utiliser CupiDog ?</Text>

          <View style={styles.cardsContainer}>
            {/* Particulier */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleSelect("particulier")}
            >
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="dog" size={48} color="#FF6B6B" />
              </View>
              <Text style={styles.cardTitle}>Je suis propriétaire</Text>
              <Text style={styles.cardSubtitle}>
                Rencontres, saillie, vente{"\n"}de mon chien
              </Text>
            </TouchableOpacity>

            {/* Professionnel */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleSelect("professionnel")}
            >
              <View style={[styles.iconContainer, { backgroundColor: "#E3F2FD" }]}>
                <MaterialCommunityIcons name="star" size={48} color="#1976D2" />
              </View>
              <Text style={styles.cardTitle}>Je suis professionnel</Text>
              <Text style={styles.cardSubtitle}>
                Vétérinaire, toiletteur,{"\n"}vendeur de produits...
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  backButton: {
    padding: 16,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 36,
  },
  cardsContainer: {
    gap: 20,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFE5E5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
});