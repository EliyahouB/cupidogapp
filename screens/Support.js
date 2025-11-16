import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function Support() {
  const navigation = useNavigation();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Support</Text>
      <Text style={styles.description}>
        Besoin d’aide ? Notre équipe est là pour vous accompagner. Vous pouvez nous contacter
        directement ou consulter les ressources ci-dessous.
      </Text>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Envoyer un message</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Historique des demandes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Chat en direct</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Retour</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#333",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#ff914d",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  backButton: {
    marginTop: 24,
    alignItems: "center",
  },
  backText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
