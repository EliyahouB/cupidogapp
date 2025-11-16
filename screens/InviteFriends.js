import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function InviteFriends() {
  const navigation = useNavigation();

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          "Rejoins-moi sur Cupidog 🐶 ! L'app pour connecter les amoureux des chiens. Télécharge-la ici : https://cupidog.app",
      });
    } catch (error) {
      console.error("Erreur lors du partage :", error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Inviter des amis</Text>
      <Text style={styles.description}>
        Partage Cupidog avec tes amis et aide-les à trouver le compagnon idéal pour leur chien.
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleShare}>
        <Text style={styles.buttonText}>Partager l’application</Text>
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
