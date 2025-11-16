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
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function ProfileMenu() {
  const navigation = useNavigation();
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
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#ff914d" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Profil introuvable</Text>
        <TouchableOpacity onPress={() => navigation.replace("Profile")}>
          <Text style={styles.link}>Créer mon profil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileHeader}>
        <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
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
        <MenuItem label="Centre d’aide" onPress={() => navigation.navigate("HelpCenter")} />
        <MenuItem label="Support" onPress={() => navigation.navigate("Support")} />
        <MenuItem label="Inviter des amis" onPress={() => navigation.navigate("InviteFriends")} />
      </View>
    </ScrollView>
  );
}

function MenuItem({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 12,
  },
  link: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "bold",
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#003366",
  },
  status: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  subscribeButton: {
    backgroundColor: "#ff914d",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  subscribeText: {
    color: "#fff",
    fontWeight: "bold",
  },
  banner: {
    backgroundColor: "#fce4ec",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#d81b60",
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  bannerButton: {
    backgroundColor: "#d81b60",
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
    borderTopColor: "#eee",
    paddingTop: 16,
  },
  menuItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  menuText: {
    fontSize: 16,
    color: "#003366",
  },
});
