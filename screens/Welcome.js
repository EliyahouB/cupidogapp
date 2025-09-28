// screens/Welcome.js
import React from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import ScreenLayout from "../components/ScreenLayout";

export default function Welcome({ navigation }) {
  return (
    <ScreenLayout title="Bienvenue" navigation={navigation} showToolbar={false}>
      <View style={styles.hero}>
        <Text style={styles.title}>Bienvenue sur CupiDog</Text>
        <Text style={styles.subtitle}>Connecte-toi pour commencer</Text>
        <View style={{ marginTop: 20 }}>
          <Button title="Aller à l'accueil" onPress={() => navigation.replace("Home")} />
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "700", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 16, color: "#fff", marginTop: 8, textAlign: "center" }
});
