import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../components/ScreenLayout";
import PremiumBadge from "../components/PremiumBadge";
import { db } from "../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import i18n from "../utils/i18n";

export default function ViewProfile({ route, navigation }) {
  const { profileId, userId } = route.params;
  const [profile, setProfile] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
    loadDogs();
  }, []);

  const loadProfile = async () => {
    try {
      const profilesRef = collection(db, "profiles");
      const q = query(profilesRef, where("uid", "==", userId));
      const profileSnap = await getDocs(q);

      if (!profileSnap.empty) {
        setProfile({
          id: profileSnap.docs[0].id,
          ...profileSnap.docs[0].data(),
        });
      }
    } catch (error) {
      console.log("Erreur chargement profil:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDogs = async () => {
    try {
      const dogsRef = collection(db, "users", userId, "dogs");
      const dogsSnap = await getDocs(dogsRef);
      const dogsData = dogsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDogs(dogsData);
    } catch (error) {
      console.log("Erreur chargement chiens:", error);
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    
    let birthDate;
    if (dateOfBirth.toDate) {
      birthDate = dateOfBirth.toDate();
    } else if (dateOfBirth.seconds) {
      birthDate = new Date(dateOfBirth.seconds * 1000);
    } else {
      birthDate = new Date(dateOfBirth);
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  if (loading) {
    return (
      <ScreenLayout title={i18n.t("profile")} navigation={navigation} showBack>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </ScreenLayout>
    );
  }

  if (!profile) {
    return (
      <ScreenLayout title={i18n.t("profile")} navigation={navigation} showBack>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="account-off" size={60} color="#9CA3AF" />
          <Text style={styles.errorText}>{i18n.t("profile_not_found")}</Text>
        </View>
      </ScreenLayout>
    );
  }

  const age = calculateAge(profile.dateOfBirth);

  return (
    <ScreenLayout title={i18n.t("profile")} navigation={navigation} showBack>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.profileHeader}>
          {profile.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons name="account" size={60} color="#FFF" />
            </View>
          )}

          <View style={styles.nameContainer}>
            <Text style={styles.name}>
              {profile.name || profile.displayName || i18n.t("user")}
            </Text>
            <PremiumBadge abonnement={profile.abonnement || "gratuit"} size="medium" />
          </View>

          <View style={styles.infoContainer}>
            {profile.city && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="map-marker" size={18} color="#FF6B35" />
                <Text style={styles.infoText}>{profile.city}</Text>
              </View>
            )}

            {age && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="cake-variant" size={18} color="#6B7280" />
                <Text style={styles.infoText}>{age} {i18n.t("years_old")}</Text>
              </View>
            )}

            {profile.gender && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons 
                  name={profile.gender === "Homme" ? "gender-male" : "gender-female"} 
                  size={18} 
                  color="#6B7280" 
                />
                <Text style={styles.infoText}>{profile.gender}</Text>
              </View>
            )}
          </View>

          {profile.bio && (
            <View style={styles.bioContainer}>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          )}
        </View>

        {dogs.length > 0 && (
          <View style={styles.dogsSection}>
            <Text style={styles.sectionTitle}>
              {dogs.length === 1 ? i18n.t("his_dog") : i18n.t("his_dogs")}
            </Text>

            {dogs.map((dog) => (
              <TouchableOpacity
                key={dog.id}
                style={styles.dogCard}
                onPress={() => navigation.navigate("DetailsChien", { dog: { ...dog, ownerId: userId } })}
                activeOpacity={0.7}
              >
                {dog.photoUrl ? (
                  <Image source={{ uri: dog.photoUrl }} style={styles.dogImage} />
                ) : (
                  <View style={styles.dogImagePlaceholder}>
                    <MaterialCommunityIcons name="dog" size={30} color="#9CA3AF" />
                  </View>
                )}

                <View style={styles.dogInfo}>
                  <Text style={styles.dogName}>{dog.dogName}</Text>
                  
                  <View style={styles.dogDetailRow}>
                    <MaterialCommunityIcons name="dog" size={14} color="#6B7280" />
                    <Text style={styles.dogDetail}>{dog.breed}</Text>
                  </View>
                  
                  <View style={styles.dogDetailRow}>
                    <MaterialCommunityIcons name="heart-outline" size={14} color="#FF6B35" />
                    <Text style={styles.dogPurpose}>{dog.purpose}</Text>
                  </View>
                </View>

                <MaterialCommunityIcons name="chevron-right" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {dogs.length === 0 && (
          <View style={styles.noDogsContainer}>
            <MaterialCommunityIcons name="dog-side-off" size={40} color="#D1D5DB" />
            <Text style={styles.noDogsText}>{i18n.t("no_dogs_registered")}</Text>
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 12,
  },
  profileHeader: {
    backgroundColor: "#F5F5F7",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "#FF6B35",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "#FF6B35",
  },
  nameContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1D",
    marginBottom: 8,
  },
  infoContainer: {
    width: "100%",
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
  },
  bioContainer: {
    width: "100%",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  bioText: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
    textAlign: "center",
  },
  dogsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1D",
    marginBottom: 12,
  },
  dogCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  dogImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
  },
  dogImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dogInfo: {
    flex: 1,
  },
  dogName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1D",
    marginBottom: 4,
  },
  dogDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  dogDetail: {
    fontSize: 13,
    color: "#6B7280",
  },
  dogPurpose: {
    fontSize: 13,
    color: "#FF6B35",
    fontWeight: "600",
  },
  noDogsContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noDogsText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
  },
});