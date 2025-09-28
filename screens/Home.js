// screens/Home.js
import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import ScreenLayout from "../components/ScreenLayout";

function Card({ title, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.cardText}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function Home({ navigation }) {
  const items = [
    { id: "mes-chiens", title: "Mes chiens", route: "MesChiens" },
    { id: "rencontre", title: "Rencontre / Parc", route: "Chat" },
    { id: "eleveur", title: "Éleveur / Saillie", route: "Likes" },
    { id: "achat", title: "Achat / Vente", route: "Likes" }
  ];

  return (
    <ScreenLayout title="Accueil" navigation={navigation}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.welcome}>Bonjour, bienvenue sur CupiDog</Text>

        <View style={styles.grid}>
          {items.map(it => (
            <Card key={it.id} title={it.title} onPress={() => navigation.navigate(it.route)} />
          ))}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 30 },
  welcome: { fontSize: 16, color: "#fff", marginBottom: 12, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: { width: "48%", height: 140, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  cardText: { color: "#fff", fontWeight: "700", textAlign: "center" }
});
