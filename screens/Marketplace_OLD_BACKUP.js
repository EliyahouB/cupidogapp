import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import ScreenLayout from "../components/ScreenLayout";

export default function Marketplace({ navigation }) {
  const categories = [
    {
      id: 1,
      title: "Nourriture",
      icon: "🍖",
      color: "#FF6B6B",
    },
    {
      id: 2,
      title: "Accessoires",
      icon: "🦴",
      color: "#4ECDC4",
    },
    {
      id: 3,
      title: "Services",
      icon: "💉",
      color: "#45B7D1",
    },
    {
      id: 4,
      title: "Autres",
      icon: "🏠",
      color: "#FFA07A",
    },
  ];

  const handleCategoryPress = (category) => {
    console.log("Catégorie sélectionnée:", category.title);
  };

  return (
    <ScreenLayout title="CupiDog Shop" navigation={navigation} active="shop">
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🛒 Bienvenue au CupiDog Shop</Text>
          <Text style={styles.subtitle}>
            Tout pour votre compagnon à quatre pattes
          </Text>
        </View>

        <View style={styles.grid}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryCard, { backgroundColor: category.color }]}
              onPress={() => handleCategoryPress(category)}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={styles.categoryTitle}>{category.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonTitle}>🚀 Bientôt disponible</Text>
          <Text style={styles.comingSoonText}>
            Le marketplace complet arrive très prochainement avec des centaines
            de produits pour votre chien !
          </Text>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#ccc",
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  categoryCard: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  categoryIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  comingSoon: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
    lineHeight: 20,
  },
});