import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function HelpCenter() {
  const navigation = useNavigation();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Centre d’aide</Text>
      <Text style={styles.description}>
        Bienvenue dans le centre d’aide de Cupidog. Retrouvez ici les réponses aux questions
        fréquentes, des conseils d’utilisation, et des ressources pour vous accompagner.
      </Text>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>FAQ</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Contacter le support</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Conditions d’utilisation</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Politique de confidentialité</Text>
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
