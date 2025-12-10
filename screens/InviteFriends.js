import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../components/ScreenLayout";

export default function InviteFriends({ navigation }) {
  const handleShare = async () => {
    try {
      await Share.share({
        message:
          "Rejoins-moi sur CupiDog 🐶 ! L'app pour connecter les amoureux des chiens. Télécharge-la ici : https://cupidog.app",
      });
    } catch (error) {
      console.error("Erreur lors du partage :", error);
    }
  };

  return (
    <ScreenLayout title="Inviter des amis" navigation={navigation} showBack>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.header}>
          <MaterialCommunityIcons name="account-multiple-plus" size={60} color="#FF6B35" />
          <Text style={styles.title}>Invitez vos amis sur CupiDog</Text>
          <Text style={styles.description}>
            Partagez CupiDog avec vos amis et aidez-les à trouver le compagnon idéal pour leur chien.
          </Text>
        </View>

        <View style={styles.benefitsBox}>
          <View style={styles.benefitItem}>
            <MaterialCommunityIcons name="dog" size={24} color="#FF6B35" />
            <Text style={styles.benefitText}>Plus de matchs pour votre chien</Text>
          </View>
          <View style={styles.benefitItem}>
            <MaterialCommunityIcons name="account-group" size={24} color="#FF6B35" />
            <Text style={styles.benefitText}>Agrandissez votre communauté</Text>
          </View>
          <View style={styles.benefitItem}>
            <MaterialCommunityIcons name="heart" size={24} color="#FF6B35" />
            <Text style={styles.benefitText}>Partagez votre passion</Text>
          </View>
        </View>

        {/* BOUTON PARTAGER */}
        <TouchableOpacity
          style={styles.shareButtonContainer}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#FFA85C", "#FF6A3D", "#F15156", "#E91E63"]}
            style={styles.shareButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons name="share-variant" size={20} color="#FFF" />
            <Text style={styles.shareButtonText}>Partager l'application</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#003366",
    marginTop: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  benefitsBox: {
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  benefitText: {
    fontSize: 15,
    color: "#003366",
    fontWeight: "500",
    flex: 1,
  },
  shareButtonContainer: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  shareButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});