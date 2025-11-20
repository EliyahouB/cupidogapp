import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import ScreenLayout from "../components/ScreenLayout";

export default function HelpCenter({ navigation }) {
  return (
    <ScreenLayout title="Centre d'aide" navigation={navigation} showBack>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Centre d'aide</Text>
        <Text style={styles.description}>
          Bienvenue dans le centre d'aide de CupiDog. Retrouvez ici les réponses aux questions
          fréquentes, des conseils d'utilisation, et des ressources pour vous accompagner.
        </Text>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate("Support")}
        >
          <Text style={styles.buttonText}>💬 Contacter le support</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate("Terms")}
        >
          <Text style={styles.buttonText}>📄 Conditions générales d'utilisation</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate("PrivacyPolicy")}
        >
          <Text style={styles.buttonText}>🔐 Politique de confidentialité</Text>
        </TouchableOpacity>

        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>❓ Questions fréquentes</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Comment ajouter mon chien ?</Text>
            <Text style={styles.faqAnswer}>
              Cliquez sur l'icône patte 🐾 dans la barre de navigation, puis remplissez les informations de votre chien.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Comment fonctionne le système de match ?</Text>
            <Text style={styles.faqAnswer}>
              Lorsque vous likez un chien et que son propriétaire vous like en retour, c'est un match ! Vous pouvez alors discuter.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Comment contacter un autre utilisateur ?</Text>
            <Text style={styles.faqAnswer}>
              Après un match, utilisez l'icône message 💬 pour ouvrir une conversation.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Comment changer mes paramètres ?</Text>
            <Text style={styles.faqAnswer}>
              Allez dans Profil › Réglages pour personnaliser vos préférences.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: "#ccc",
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: "#ff914d",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  faqSection: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: "#444",
    paddingTop: 24,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  faqItem: {
    marginBottom: 20,
    backgroundColor: "#2a2a2a",
    padding: 16,
    borderRadius: 8,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ff914d",
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
  },
});