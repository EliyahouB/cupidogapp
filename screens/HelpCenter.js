import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../components/ScreenLayout";

export default function HelpCenter({ navigation }) {
  return (
    <ScreenLayout title="Centre d'aide" navigation={navigation} showBack>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* MENU ACTIONS */}
        <MenuItem
          icon="message-text"
          label="Contacter le support"
          onPress={() => navigation.navigate("Support")}
        />

        <MenuItem
          icon="file-document"
          label="Conditions générales d'utilisation"
          onPress={() => navigation.navigate("Terms")}
        />

        <MenuItem
          icon="shield-lock"
          label="Politique de confidentialité"
          onPress={() => navigation.navigate("PrivacyPolicy")}
          hideBorder
        />

        {/* FAQ */}
        <Text style={styles.sectionTitle}>Questions fréquentes</Text>

        <FAQItem
          question="Comment ajouter mon chien ?"
          answer="Cliquez sur l'icône patte 🐾 dans la barre de navigation, puis remplissez les informations de votre chien."
        />

        <FAQItem
          question="Comment fonctionne le système de match ?"
          answer="Lorsque vous likez un chien et que son propriétaire vous like en retour, c'est un match ! Vous pouvez alors discuter."
        />

        <FAQItem
          question="Comment contacter un autre utilisateur ?"
          answer="Vous pouvez contacter n'importe quel utilisateur depuis la fiche de son chien. Sans réponse, vous êtes limité à 3 messages. Avec un compte gratuit, vous disposez de 10 conversations maximum."
        />

        <FAQItem
          question="Comment changer mes paramètres ?"
          answer="Allez dans Profil › Réglages pour personnaliser vos préférences."
        />

      </ScrollView>
    </ScreenLayout>
  );
}

function MenuItem({ icon, label, onPress, hideBorder }) {
  return (
    <>
      <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.menuLeft}>
          <MaterialCommunityIcons name={icon} size={24} color="#FF6B35" />
          <Text style={styles.menuLabel}>{label}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#9CA3AF" />
      </TouchableOpacity>
      {!hideBorder && <View style={styles.separator} />}
    </>
  );
}

function FAQItem({ question, answer }) {
  return (
    <View style={styles.faqItem}>
      <Text style={styles.faqQuestion}>{question}</Text>
      <Text style={styles.faqAnswer}>{answer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  menuLabel: {
    fontSize: 16,
    color: "#003366",
    fontWeight: "600",
  },
  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginLeft: 52,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#003366",
    paddingHorizontal: 16,
    marginTop: 32,
    marginBottom: 16,
  },
  faqItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: "600",
    color: "#003366",
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
});