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
import i18n from "../../utils/i18n";

export default function ProviderTypeSelect({ navigation }) {
  const handleSelect = (providerType) => {
    navigation.navigate("AuthMethods", { 
      userType: "professionnel",
      providerType: providerType
    });
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
          <Text style={styles.title}>{i18n.t("what_type_professional")}</Text>

          <View style={styles.cardsContainer}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleSelect("prestataire")}
            >
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="medical-bag" size={44} color="#4CAF50" />
              </View>
              <Text style={styles.cardTitle}>{i18n.t("service_provider")}</Text>
              <Text style={styles.cardSubtitle}>{i18n.t("service_provider_examples")}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{i18n.t("receive_clients")}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => handleSelect("vendeur")}
            >
              <View style={[styles.iconContainer, { backgroundColor: "#FFF3E0" }]}>
                <MaterialCommunityIcons name="store" size={44} color="#FF9800" />
              </View>
              <Text style={styles.cardTitle}>{i18n.t("marketplace_seller")}</Text>
              <Text style={styles.cardSubtitle}>{i18n.t("seller_examples")}</Text>
              <View style={[styles.badge, { backgroundColor: "#FFF3E0" }]}>
                <Text style={[styles.badgeText, { color: "#FF9800" }]}>{i18n.t("sell_products")}</Text>
              </View>
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
    backgroundColor: "#E8F5E9",
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
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: "#4CAF50",
    fontWeight: "600",
    fontSize: 13,
  },
});