import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";
import { useNavigation } from "@react-navigation/native";
import ScreenLayout from "../components/ScreenLayout";
import PremiumBadge from "../components/PremiumBadge";
import i18n from "../utils/i18n";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState(null);
  const [abonnement, setAbonnement] = useState("gratuit");
  const [nomadMode, setNomadMode] = useState(false);
  const [hideProfile, setHideProfile] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadProfile();
    });
    return unsubscribe;
  }, [navigation]);

  const loadProfile = async () => {
    const user = auth.currentUser;
    
    if (!user) {
      setLoading(false);
      Alert.alert(i18n.t("error"), i18n.t("must_be_logged_in"));
      return;
    }

    try {
      const q = query(collection(db, "profiles"), where("uid", "==", user.uid));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        const data = docData.data();
        setProfileId(docData.id);
        setProfile(data);
        setAbonnement(data.abonnement || "gratuit");
        setNomadMode(data.nomadMode || false);
        setHideProfile(data.hideProfile || false);
      }
    } catch (error) {
      console.error("Erreur chargement profil :", error);
      Alert.alert(i18n.t("error"), i18n.t("error_loading_profile"));
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (field, value) => {
    if (!profileId) return;

    try {
      const profileRef = doc(db, "profiles", profileId);
      await updateDoc(profileRef, { [field]: value });
    } catch (error) {
      console.error("Erreur de mise a jour :", error);
      Alert.alert(i18n.t("error"), i18n.t("error_updating"));
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return i18n.t("not_specified");
    
    try {
      let date;
      if (dateValue.toDate) {
        date = dateValue.toDate();
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else {
        return i18n.t("not_specified");
      }

      const locale = i18n.locale === "he" ? "he-IL" : i18n.locale === "ru" ? "ru-RU" : i18n.locale === "en" ? "en-US" : "fr-FR";
      return date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return i18n.t("not_specified");
    }
  };

  const calculateAge = (dateValue) => {
    if (!dateValue) return null;
    
    try {
      let birthDate;
      if (dateValue.toDate) {
        birthDate = dateValue.toDate();
      } else if (dateValue instanceof Date) {
        birthDate = dateValue;
      } else if (typeof dateValue === 'string') {
        birthDate = new Date(dateValue);
      } else {
        return null;
      }

      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch {
      return null;
    }
  };

  const getAbonnementLabel = () => {
    if (abonnement === "gratuit") return i18n.t("free");
    if (abonnement === "vente") return i18n.t("sale");
    if (abonnement === "saillie") return i18n.t("stud");
    if (abonnement === "essentiel") return i18n.t("essential");
    if (abonnement === "premium") return "Premium";
    return i18n.t("free");
  };

  const getTranslatedGender = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "homme" || normalized === "male" || normalized === "mâle" || normalized === "זכר") return i18n.t("male_dog");
    if (normalized === "femme" || normalized === "female" || normalized === "femelle" || normalized === "נקבה") return i18n.t("female_dog");
    return value || i18n.t("not_specified");
  };

  const getTranslatedPurpose = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "rencontre" || normalized === "meetup" || normalized === "מפגש") return i18n.t("meetup");
    if (normalized === "vente" || normalized === "sale" || normalized === "מכירה") return i18n.t("sale");
    if (normalized === "saillie" || normalized === "stud" || normalized === "הרבעה") return i18n.t("stud");
    if (normalized === "achat" || normalized === "buy") return i18n.t("buy_dog");
    if (normalized === "achat" || normalized === "sell") return i18n.t("sell_dog");
    return value || i18n.t("not_specified");
  };

  if (loading) {
    return (
      <ScreenLayout title={i18n.t("my_profile")} navigation={navigation} active="profile">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff914d" />
          <Text style={styles.loadingText}>{i18n.t("loading_profile")}</Text>
        </View>
      </ScreenLayout>
    );
  }

  if (!profile) {
    return (
      <ScreenLayout title={i18n.t("my_profile")} navigation={navigation} active="profile">
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="account-off" size={80} color="#999" />
          <Text style={styles.emptyText}>{i18n.t("profile_not_found")}</Text>
        </View>
      </ScreenLayout>
    );
  }

  const age = calculateAge(profile.dateOfBirth);

  return (
    <ScreenLayout title={i18n.t("my_profile")} navigation={navigation} active="profile">
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.photoContainer}
            onPress={() => navigation.navigate("EditField", {
              field: "photo",
              title: i18n.t("profile_photo"),
              currentValue: profile.photoUrl,
              profileId: profileId
            })}
          >
            {profile.photoUrl ? (
              <Image source={{ uri: profile.photoUrl }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialCommunityIcons name="camera-plus" size={40} color="#1A1A1D" />
              </View>
            )}
            <View style={styles.photoEditIcon}>
              <MaterialCommunityIcons name="pencil" size={16} color="#FFF" />
            </View>
          </TouchableOpacity>

          <Text style={styles.name}>{profile.name || i18n.t("not_specified")}</Text>
          <View style={styles.badgeContainer}>
            <PremiumBadge abonnement={abonnement} size="medium" />
          </View>
        </View>

        <TouchableOpacity
          style={styles.abonnementButtonContainer}
          onPress={() => navigation.navigate("Abonnements")}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#FFA85C", "#FF6A3D", "#F15156", "#E91E63"]}
            style={styles.abonnementButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons name="crown" size={20} color="#FFF" />
            <Text style={styles.abonnementText}>{i18n.t("manage_subscription")}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mesDemandesButton}
          onPress={() => navigation.navigate("MyLeads")}
          activeOpacity={0.8}
        >
          <View style={styles.mesDemandesContent}>
            <MaterialCommunityIcons name="clipboard-list" size={20} color="#1976D2" />
            <Text style={styles.mesDemandesText}>{i18n.t("my_service_requests")}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#1976D2" />
        </TouchableOpacity>

        <View style={styles.menuList}>
          <MenuItem
            icon="star-circle"
            label={i18n.t("subscription")}
            value={getAbonnementLabel()}
            onPress={() => navigation.navigate("Abonnements")}
          />

          <MenuItem
            icon="account"
            label={i18n.t("identity")}
            value={profile.name}
            onPress={() => navigation.navigate("EditField", {
              field: "name",
              title: i18n.t("identity"),
              currentValue: profile.name,
              profileId: profileId
            })}
          />

          <MenuItem
            icon="map-marker"
            label={i18n.t("city")}
            value={profile.city}
            onPress={() => navigation.navigate("EditField", {
              field: "city",
              title: i18n.t("city"),
              currentValue: profile.city,
              profileId: profileId
            })}
          />

          <MenuItem
            icon="cake-variant"
            label={i18n.t("date_of_birth")}
            value={formatDate(profile.dateOfBirth) + (age ? " (" + age + " " + i18n.t("years_old") + ")" : "")}
            onPress={() => navigation.navigate("EditField", {
              field: "dateOfBirth",
              title: i18n.t("date_of_birth"),
              currentValue: profile.dateOfBirth,
              profileId: profileId
            })}
          />

          <MenuItem
            icon="gender-male-female"
            label={i18n.t("gender")}
            value={getTranslatedGender(profile.gender)}
            onPress={() => navigation.navigate("EditField", {
              field: "gender",
              title: i18n.t("gender"),
              currentValue: profile.gender,
              profileId: profileId
            })}
          />

          <MenuItem
            icon="text"
            label="Bio"
            value={profile.bio}
            onPress={() => navigation.navigate("EditField", {
              field: "bio",
              title: i18n.t("bio_description"),
              currentValue: profile.bio,
              profileId: profileId
            })}
          />

          <MenuItem
            icon="target"
            label={i18n.t("registration_purpose")}
            value={getTranslatedPurpose(profile.purpose)}
            onPress={() => navigation.navigate("EditField", {
              field: "purpose",
              title: i18n.t("registration_purpose"),
              currentValue: profile.purpose,
              profileId: profileId
            })}
            hideBorder
          />
        </View>

        <View style={styles.switchSection}>
          <View style={styles.switchItem}>
            <View style={styles.switchContent}>
              <MaterialCommunityIcons name="map-marker-multiple" size={24} color="#FF6B35" />
              <View style={styles.switchText}>
                <Text style={styles.switchLabel}>{i18n.t("nomad_mode")}</Text>
                <Text style={styles.switchDescription}>{i18n.t("nomad_mode_description")}</Text>
              </View>
            </View>
            <Switch
              value={nomadMode}
              onValueChange={(value) => {
                setNomadMode(value);
                updateSetting("nomadMode", value);
              }}
              trackColor={{ false: "#E5E7EB", true: "#FF6B35" }}
              thumbColor="#FFF"
            />
          </View>
          <View style={styles.separator} />

          <View style={styles.switchItem}>
            <View style={styles.switchContent}>
              <MaterialCommunityIcons name="eye-off" size={24} color="#FF6B35" />
              <View style={styles.switchText}>
                <Text style={styles.switchLabel}>{i18n.t("hide_profile")}</Text>
                <Text style={styles.switchDescription}>{i18n.t("hide_profile_description")}</Text>
              </View>
            </View>
            <Switch
              value={hideProfile}
              onValueChange={(value) => {
                setHideProfile(value);
                updateSetting("hideProfile", value);
              }}
              trackColor={{ false: "#E5E7EB", true: "#FF6B35" }}
              thumbColor="#FFF"
            />
          </View>
        </View>

      </ScrollView>
    </ScreenLayout>
  );
}

function MenuItem({ icon, label, value, onPress, hideBorder }) {
  return (
    <View>
      <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.menuLeft}>
          <MaterialCommunityIcons name={icon} size={24} color="#FF6B35" />
          <View style={styles.menuText}>
            <Text style={styles.menuLabel}>{label}</Text>
            <Text style={styles.menuValue} numberOfLines={1}>
              {value || i18n.t("not_specified")}
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#9CA3AF" />
      </TouchableOpacity>
      {!hideBorder && <View style={styles.separator} />}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#6B7280",
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 16,
    marginTop: 16,
  },
  container: {
    paddingBottom: 100,
  },
  header: {
    alignItems: "center",
    paddingVertical: 24,
  },
  photoContainer: {
    position: "relative",
    marginBottom: 16,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#FF6B35",
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FF6B35",
  },
  photoEditIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FF6B35",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 8,
  },
  badgeContainer: {
    marginTop: 4,
  },
  abonnementButtonContainer: {
    borderRadius: 12,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  abonnementButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  abonnementText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 15,
  },
  mesDemandesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E3F2FD",
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  mesDemandesContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mesDemandesText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1976D2",
  },
  menuList: {
    marginBottom: 24,
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
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  menuValue: {
    fontSize: 16,
    color: "#003366",
    fontWeight: "500",
  },
  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginLeft: 52,
  },
  switchSection: {
    paddingTop: 8,
  },
  switchItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  switchContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  switchText: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    color: "#003366",
    fontWeight: "600",
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 12,
    color: "#6B7280",
  },
});