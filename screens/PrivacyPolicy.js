import React from "react";
import { ScrollView, Text, StyleSheet } from "react-native";
import ScreenLayout from "../components/ScreenLayout";

export default function PrivacyPolicy({ navigation }) {
  return (
    <ScreenLayout title="Confidentialité" navigation={navigation} showBack>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Politique de Confidentialité</Text>
        <Text style={styles.subtitle}>CupiDog</Text>

        <Text style={styles.section}>1. Collecte des données</Text>
        <Text style={styles.text}>Nous collectons votre adresse e-mail lors de l inscription.</Text>
        <Text style={styles.text}>Les informations de profil sont stockées de manière sécurisée.</Text>
        <Text style={styles.text}>Les données de localisation sont collectées uniquement si vous activez cette fonctionnalité.</Text>

        <Text style={styles.section}>2. Utilisation des données</Text>
        <Text style={styles.text}>Vos données servent à vous connecter avec d autres propriétaires de chiens.</Text>
        <Text style={styles.text}>Nous utilisons votre localisation pour vous proposer des rencontres à proximité.</Text>

        <Text style={styles.section}>3. Partage des données</Text>
        <Text style={styles.text}>Vos informations de profil sont visibles par les autres utilisateurs.</Text>
        <Text style={styles.text}>Nous pouvons partager des données anonymisées avec nos partenaires.</Text>

        <Text style={styles.section}>4. Conservation des données</Text>
        <Text style={styles.text}>Les messages sont conservés pendant 60 jours maximum.</Text>
        <Text style={styles.text}>Les données de localisation sont conservées pendant 60 jours.</Text>

        <Text style={styles.section}>5. Vos droits</Text>
        <Text style={styles.text}>Vous pouvez consulter, modifier ou supprimer vos données à tout moment.</Text>
        <Text style={styles.text}>Vous pouvez désactiver la collecte de localisation dans les paramètres.</Text>

        <Text style={styles.section}>6. Contact</Text>
        <Text style={styles.text}>Pour toute question, contactez-nous via le support.</Text>
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
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ff914d",
    marginBottom: 20,
  },
  section: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 16,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: "#e0e0e0",
    marginBottom: 6,
    lineHeight: 20,
  },
});