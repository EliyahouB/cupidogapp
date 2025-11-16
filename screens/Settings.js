import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import ScreenLayout from "../components/ScreenLayout";
import { auth, db } from "../config/firebase";
import { deleteUser } from "firebase/auth";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

export default function Settings() {
  const navigation = useNavigation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [nomadMode, setNomadMode] = useState(false);
  const [hideProfile, setHideProfile] = useState(false);
  const [profileId, setProfileId] = useState(null);

  useEffect(() => {
    const loadProfileSettings = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(collection(db, "profiles"), where("uid", "==", user.uid));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        const data = docData.data();
        setProfileId(docData.id);
        setNomadMode(data.nomadMode || false);
        setHideProfile(data.hideProfile || false);
      }
    };

    loadProfileSettings();
  }, []);

  const updateSetting = async (field, value) => {
    const user = auth.currentUser;
    if (!user || !profileId) return;

    try {
      const ref = doc(db, "profiles", profileId);
      await updateDoc(ref, { [field]: value });
    } catch {
      Alert.alert("Erreur", "Impossible de mettre à jour les réglages.");
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Supprimer mon compte",
      "Cette action est irréversible. Es-tu sûr de vouloir supprimer ton compte ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (user) {
                await deleteUser(user);
              }
            } catch {
              Alert.alert("Erreur", "Impossible de supprimer le compte.");
            }
          },
        },
      ]
    );
  };

  const handleSuspendAccount = () => {
    Alert.alert(
      "Suspendre mon compte",
      "Ton profil sera temporairement désactivé. Tu pourras le réactiver plus tard.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Suspendre",
          onPress: async () => {
            try {
              const ref = doc(db, "profiles", profileId);
              await updateDoc(ref, { status: "suspendu" });
              Alert.alert("Compte suspendu", "Ton compte est maintenant en pause.");
            } catch {
              Alert.alert("Erreur", "Impossible de suspendre le compte.");
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenLayout title="Réglages" navigation={navigation} showBack>
      <ScrollView contentContainerStyle={styles.container}>
        <SettingSwitch
          label="Notifications"
          description="Active les notifications pour recevoir les mises à jour de tes conversations et des likes."
          value={notificationsEnabled}
          onValueChange={(value) => setNotificationsEnabled(value)}
        />

        <SettingSwitch
          label="Mode nomade"
          description="Rencontrez les personnes proches de vous même en déplacement."
          value={nomadMode}
          onValueChange={(value) => {
            setNomadMode(value);
            updateSetting("nomadMode", value);
          }}
        />

        <SettingSwitch
          label="Masquer mon profil"
          description="Ton profil ne sera plus visible par les autres utilisateurs."
          value={hideProfile}
          onValueChange={(value) => {
            setHideProfile(value);
            updateSetting("hideProfile", value);
          }}
        />

        <SettingButton
          label="Liste rouge"
          description="Bloquer un utilisateur de tes contacts (réservé aux abonnés)."
          onPress={() => navigation.navigate("BlockedUsers")}
        />

        <SettingButton
          label="Conditions générales d'utilisation"
          onPress={() => navigation.navigate("Terms")}
        />

        <SettingButton
          label="Suspendre mon compte"
          onPress={handleSuspendAccount}
        />

        <SettingButton
          label="Supprimer mon compte"
          onPress={handleDeleteAccount}
          destructive
        />
      </ScrollView>
    </ScreenLayout>
  );
}

function SettingSwitch({ label, description, value, onValueChange }) {
  return (
    <View style={styles.settingBlock}>
      <View style={styles.settingText}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function SettingButton({ label, description, onPress, destructive }) {
  return (
    <TouchableOpacity style={styles.settingBlock} onPress={onPress}>
      <View style={styles.settingText}>
        <Text style={[styles.label, destructive && { color: "#d00" }]}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  settingBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  settingText: {
    flex: 1,
    paddingRight: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#003366",
  },
  description: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
});
