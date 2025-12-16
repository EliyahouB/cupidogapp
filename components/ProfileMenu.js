import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "./ScreenLayout";
import { auth, db } from "../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import PremiumBadge from "./PremiumBadge";

export default function ProfileMenu({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [abonnement, setAbonnement] = useState("gratuit");

  useEffect(() => {
    const loadProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const q = query(collection(db, "profiles"), where("uid", "==", user.uid));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setProfile(data);
          setAbonnement(data.abonnement || "gratuit");
        }
      } catch (error) {
        console.log("Erreur chargement profil :", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const hasSubscription = () => {
    return ["essentiel", "premium"].includes(abonnement);
  };

  if (loading) {
    return (
      <ScreenLayout title="Profil" navigation={navigation} active="profile">
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </ScreenLayout>
    );
  }

  if (!profile) {
    return (
      <ScreenLayout title="Profil" navigation={navigation} active="profile">
        <View style={styles.loading}>
          <MaterialCommunityIcons name="account-off" size={80} color="#9CA3AF" />
          <Text style={styles.errorText}>Profil introuvable</Text>
          <TouchableOpacity 
            style={styles.createButtonContainer}
            onPress={() => navigation.navigate("Profile")}
          >
            <LinearGradient
              colors={["#FF6B35", "#FF5722"]}
              style={styles.createButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.createButtonText}>Créer mon profil</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Profil" navigation={navigation} active="profile">
      <ScrollView contentContainerStyle={styles.container}>
        {/* HEADER PHOTO + NOM */}
        <View style={styles.profileHeader}>
          {profile.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons name="account" size={40} color="#FFF" />
            </View>
          )}
          <Text style={styles.name}>{profile.name}</Text>
          <PremiumBadge abonnement={abonnement} size="medium" />
        </View>

        {/* VIGNETTES BOOSTS (DÉGRADÉS IDENTIQUES AUX ICÔNES) */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickActionCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Abonnements")}
          >
            <LinearGradient
              colors={["#FF1493", "#DA70D6"]}
              style={styles.quickActionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="rocket-launch" size={22} color="#FFF" />
              <Text style={styles.quickActionTitle}>Boost Saillie</Text>
              <Text style={styles.quickActionPrice}>
                {hasSubscription() ? "49₪" : "99₪"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Abonnements")}
          >
            <LinearGradient
              colors={["#1E90FF", "#0066CC"]}
              style={styles.quickActionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="flash" size={22} color="#FFF" />
              <Text style={styles.quickActionTitle}>Boost Vente</Text>
              <Text style={styles.quickActionPrice}>
                {hasSubscription() ? "39₪" : "69₪"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* VIGNETTE SAILLIE - TAILLE RÉDUITE */}
        <TouchableOpacity
          style={styles.featuredCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Abonnements")}
        >
          <LinearGradient
            colors={["#E91E63", "#9C27B0"]}
            style={styles.featuredGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>⭐ PLUS VENDU</Text>
            </View>
            <View style={styles.featuredContent}>
              <View style={styles.featuredLeft}>
                <MaterialCommunityIcons name="heart-multiple" size={28} color="#FFF" />
                <View style={styles.featuredText}>
                  <Text style={styles.featuredTitle}>Saillie 30j</Text>
                  <Text style={styles.featuredSubtitle}>Géoloc • Urgent</Text>
                </View>
              </View>
              <View style={styles.featuredRight}>
                <Text style={styles.featuredPrice}>149₪</Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#FFF" />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* MENU ACTIONS */}
        <View style={styles.menu}>
          <MenuItem
            icon="account-edit"
            label="Modifier mon profil"
            onPress={() => navigation.navigate("Profile")}
          />
          <MenuItem 
            icon="cog" 
            label="Réglages" 
            onPress={() => navigation.navigate("Settings")} 
          />
          <MenuItem 
            icon="help-circle" 
            label="Centre d'aide" 
            onPress={() => navigation.navigate("HelpCenter")} 
          />
          <MenuItem 
            icon="email" 
            label="Support" 
            onPress={() => navigation.navigate("Support")} 
          />
          <MenuItem 
            icon="account-multiple-plus" 
            label="Inviter des amis" 
            onPress={() => navigation.navigate("InviteFriends")} 
            hideBorder
          />
        </View>
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
          <Text style={styles.menuText}>{label}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#9CA3AF" />
      </TouchableOpacity>
      {!hideBorder && <View style={styles.separator} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 100,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 16,
  },
  createButtonContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  createButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  createButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: "#FF6B35",
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 3,
    borderColor: "#FF6B35",
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 6,
  },
  quickActionsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionGradient: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 90,
  },
  quickActionTitle: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 6,
    textAlign: "center",
  },
  quickActionPrice: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
  },
  featuredCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  featuredGradient: {
    padding: 16,
  },
  featuredBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
  },
  featuredBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  featuredContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  featuredLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  featuredText: {
    flex: 1,
  },
  featuredTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  featuredSubtitle: {
    color: "#FFF",
    fontSize: 12,
    opacity: 0.95,
  },
  featuredRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  featuredPrice: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
  },
  menu: {
    paddingTop: 8,
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
    gap: 12,
  },
  menuText: {
    fontSize: 16,
    color: "#003366",
    fontWeight: "500",
  },
  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginLeft: 52,
  },
});