import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function PremiumBadge({ abonnement, size = "small" }) {
  // Si pas premium, ne rien afficher
  if (!abonnement || abonnement === "gratuit") {
    return null;
  }

  // Déterminer le style selon l'abonnement
  const isPremiumPlus = abonnement === "premium+";
  const icon = isPremiumPlus ? "crown" : "star";
  const label = isPremiumPlus ? "PREMIUM+" : "PRO";

  // Tailles selon le paramètre
  const sizes = {
    small: {
      container: { height: 20, paddingHorizontal: 8, borderRadius: 10 },
      icon: 12,
      text: 10,
    },
    medium: {
      container: { height: 28, paddingHorizontal: 12, borderRadius: 14 },
      icon: 16,
      text: 12,
    },
    large: {
      container: { height: 36, paddingHorizontal: 16, borderRadius: 18 },
      icon: 20,
      text: 14,
    },
  };

  const currentSize = sizes[size] || sizes.small;

  return (
    <LinearGradient
      colors={['#FFA85C', '#FF6A3D', '#F15156', '#E91E63']}
      style={[styles.badge, currentSize.container]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <MaterialCommunityIcons name={icon} size={currentSize.icon} color="#FFF" />
      <Text style={[styles.badgeText, { fontSize: currentSize.text }]}>
        {label}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: {
    color: "#FFF",
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});