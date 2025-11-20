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
import ScreenLayout from "./ScreenLayout";
import { auth, db } from "../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function ProfileMenu({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
        }
      } catch (error) {
        console.log("Erreur chargement profil :", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (loading) {
    return (
      <ScreenLayout title="Profil" navigation={navigation}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#ff914d" />
        </View>
      </ScreenLayout>
    );
  }

  if (!profile) {
    return (
      <ScreenLayout title="Profil" navigation={navigation}>
        <View style={styles.loading}>
          <Text style={styles.errorText}>Profil introuvable</Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => navigation.replace("Profile")}
          >
            <Text style={styles.createButtonText}>Créer mon profil</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Profil" navigation={navigation}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.profileHeader}>
          {profile.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {profile.name ? profile.name.charAt(0).toUpperCase() : "?"}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.status}>Statut : {profile.subscription || "Gratuit"}</Text>
          <TouchableOpacity style={styles.subscribeButton}>
            <Text style={styles.subscribeText}>Gérer mon abonnement</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Souscrire à Cupidog Premium</Text>
          <Text style={styles.bannerText}>
            Les membres Premium trouvent plus vite leur compagnon idéal 🐶
          </Text>
          <TouchableOpacity style={styles.bannerButton}>
            <Text style={styles.bannerButtonText}>Souscrire</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menu}>
          <MenuItem
            label="Modifier mon profil"
            onPress={() => navigation.navigate("Profile", { mode: "edit" })}
          />
          <MenuItem label="Réglages" onPress={() => navigation.navigate("Settings")} />
          <MenuItem label="Centre d'aide" onPress={() => navigation.navigate("HelpCenter")} />
          <MenuItem label="Support" onPress={() => navigation.navigate("Support")} />
          <MenuItem label="Inviter des amis" onPress={() => navigation.navigate("InviteFriends")} />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

function MenuItem({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuText}>{label}</Text>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
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
    color: "#fff",
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: "#ff914d",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#ff914d",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ff914d",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarPlaceholderText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#fff",
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 12,
  },
  subscribeButton: {
    backgroundColor: "#ff914d",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  subscribeText: {
    color: "#fff",
    fontWeight: "bold",
  },
  banner: {
    backgroundColor: "#2a2a2a",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#ff914d",
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ff914d",
    marginBottom: 8,
  },
  bannerText: {
    fontSize: 14,
    color: "#fff",
    marginBottom: 12,
    lineHeight: 20,
  },
  bannerButton: {
    backgroundColor: "#ff914d",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  bannerButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  menu: {
    borderTopWidth: 1,
    borderTopColor: "#444",
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  menuText: {
    fontSize: 16,
    color: "#fff",
  },
  arrow: {
    fontSize: 24,
    color: "#ff914d",
    fontWeight: "bold",
  },
});