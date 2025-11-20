import React from "react";
import { ScrollView, Text, StyleSheet, View } from "react-native";
import ScreenLayout from "../components/ScreenLayout";

export default function Terms({ navigation }) {
  return (
    <ScreenLayout title="CGU" navigation={navigation} showBack>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📄 Conditions Générales d'Utilisation</Text>
        <Text style={styles.subtitle}>CupiDog</Text>

        <Text style={styles.section}>1. Données personnelles</Text>
        <Text style={styles.text}>• L'application collecte et conserve les adresses e-mail des utilisateurs à des fins d'identification et de sécurité.</Text>
        <Text style={styles.text}>• Les messages échangés entre utilisateurs sont conservés pendant une durée maximale de 60 jours.</Text>
        <Text style={styles.text}>• Les données de localisation (GPS) peuvent être utilisées pour améliorer l'expérience utilisateur et sont conservées pendant 60 jours.</Text>
        <Text style={styles.text}>• Certaines données anonymisées peuvent être partagées avec des partenaires (publicité, statistiques) pour une durée maximale de 60 jours.</Text>
        <Text style={styles.text}>• Les utilisateurs peuvent à tout moment demander la suppression de leur compte et de leurs données personnelles.</Text>

        <Text style={styles.section}>2. Contenu utilisateur</Text>
        <Text style={styles.text}>• Les photos de chiens partagées par les utilisateurs peuvent être utilisées par CupiDog à des fins de communication ou de promotion.</Text>
        <Text style={styles.text}>• Les profils des utilisateurs sont visibles par les autres membres de l'application.</Text>
        <Text style={styles.text}>• CupiDog se réserve le droit de modérer ou supprimer tout contenu jugé inapproprié.</Text>
        <Text style={styles.text}>• Les contenus violents, haineux, sexuels ou contraires à la loi sont strictement interdits.</Text>

        <Text style={styles.section}>3. Fonctionnement de l'application</Text>
        <Text style={styles.text}>• L'utilisation de l'application est réservée aux personnes âgées de 16 ans et plus, afin de garantir une certaine maturité dans les échanges.</Text>
        <Text style={styles.text}>• L'usage commercial est autorisé. Les vendeurs et acheteurs sont seuls responsables de leurs transactions. CupiDog ne garantit ni la véracité des annonces ni l'origine ou la race des chiens proposés.</Text>
        <Text style={styles.text}>• CupiDog peut suspendre ou supprimer un compte en cas de non-respect des règles ou comportement abusif.</Text>

        <Text style={styles.section}>4. Responsabilité</Text>
        <Text style={styles.text}>• CupiDog ne garantit aucun résultat, rencontre ou succès via l'application.</Text>
        <Text style={styles.text}>• En cas de litige entre utilisateurs, CupiDog décline toute responsabilité.</Text>
        <Text style={styles.text}>• Les présentes CGU peuvent être modifiées à tout moment. Les utilisateurs seront informés des changements via l'application.</Text>
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