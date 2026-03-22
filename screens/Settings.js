import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import ScreenLayout from "../components/ScreenLayout";
import { auth, db, storage } from "../config/firebase";
import { deleteUser, signOut } from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { ref, listAll, deleteObject } from "firebase/storage";
import { removeUserId } from "../utils/authStorage";

export default function Settings() {
  const navigation = useNavigation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [nomadMode, setNomadMode] = useState(false);
  const [hideProfile, setHideProfile] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      const refDoc = doc(db, "profiles", profileId);
      await updateDoc(refDoc, { [field]: value });
    } catch (error) {
      Alert.alert("Erreur", "Impossible de mettre à jour les réglages.");
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Oui",
          style: "destructive",
          onPress: async () => {
            try {
              await removeUserId();
              await signOut(auth);
            } catch (error) {
              Alert.alert("Erreur", "Impossible de se déconnecter.");
            }
          },
        },
      ]
    );
  };

  // =============================================
  // SUPPRESSION COMPLÈTE DU COMPTE (APPLE COMPLIANCE)
  // =============================================
  const handleDeleteAccount = () => {
    Alert.alert(
      "🛑 Action Irréversible",
      "Supprimer ton compte effacera définitivement :\n\n• Ton profil et tes photos\n• Tous tes chiens\n• Tes conversations et messages\n• Tes likes et matchs\n\nEs-tu sûr de vouloir continuer ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Tout supprimer",
          style: "destructive",
          onPress: () => confirmFinalDelete(),
        },
      ]
    );
  };

  const confirmFinalDelete = () => {
    Alert.alert(
      "⚠️ Dernière confirmation",
      "Cette action est DÉFINITIVE et ne peut pas être annulée.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer définitivement",
          style: "destructive",
          onPress: () => executeFullDeletion(),
        },
      ]
    );
  };

  const executeFullDeletion = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    const uid = user.uid;
    setIsDeleting(true);

    try {
      // 1. SUPPRESSION PHOTOS (Firebase Storage)
      console.log("🗑️ Suppression des photos...");
      try {
        const userFolderRef = ref(storage, `users/${uid}`);
        const list = await listAll(userFolderRef);
        const deletePromises = list.items.map((item) => deleteObject(item));
        await Promise.all(deletePromises);
      } catch (e) {
        console.log("⚠️ Pas de photos ou erreur storage");
      }

      // 2. SUPPRESSION DES CHIENS (sous-collection users/{uid}/dogs)
      console.log("🗑️ Suppression des chiens...");
      const dogsRef = collection(db, "users", uid, "dogs");
      const dogsSnap = await getDocs(dogsRef);
      const batch1 = writeBatch(db);
      dogsSnap.docs.forEach((dogDoc) => {
        batch1.delete(dogDoc.ref);
      });
      await batch1.commit();

      // 3. SUPPRESSION DES CONVERSATIONS ET MESSAGES
      console.log("🗑️ Suppression des conversations...");
      const convsRef = collection(db, "conversations");
      const convsQuery = query(convsRef, where("participants", "array-contains", uid));
      const convsSnap = await getDocs(convsQuery);
      
      for (const convDoc of convsSnap.docs) {
        // Supprimer tous les messages de cette conversation
        const messagesRef = collection(db, "conversations", convDoc.id, "messages");
        const messagesSnap = await getDocs(messagesRef);
        const batch2 = writeBatch(db);
        messagesSnap.docs.forEach((msgDoc) => {
          batch2.delete(msgDoc.ref);
        });
        await batch2.commit();
        // Supprimer la conversation
        await deleteDoc(convDoc.ref);
      }

      // 4. SUPPRESSION DES LIKES (envoyés ET reçus)
      console.log("🗑️ Suppression des likes...");
      const likesRef = collection(db, "likes");
      const likesSentQuery = query(likesRef, where("fromUserId", "==", uid));
      const likesSentSnap = await getDocs(likesSentQuery);
      const likesReceivedQuery = query(likesRef, where("toOwnerId", "==", uid));
      const likesReceivedSnap = await getDocs(likesReceivedQuery);
      
      const batch3 = writeBatch(db);
      likesSentSnap.docs.forEach((likeDoc) => batch3.delete(likeDoc.ref));
      likesReceivedSnap.docs.forEach((likeDoc) => batch3.delete(likeDoc.ref));
      await batch3.commit();

      // 5. SUPPRESSION DES MATCHS
      console.log("🗑️ Suppression des matchs...");
      const matchesRef = collection(db, "matches");
      const matches1Query = query(matchesRef, where("user1Id", "==", uid));
      const matches1Snap = await getDocs(matches1Query);
      const matches2Query = query(matchesRef, where("user2Id", "==", uid));
      const matches2Snap = await getDocs(matches2Query);
      
      const batch4 = writeBatch(db);
      matches1Snap.docs.forEach((matchDoc) => batch4.delete(matchDoc.ref));
      matches2Snap.docs.forEach((matchDoc) => batch4.delete(matchDoc.ref));
      await batch4.commit();

      // 6. SUPPRESSION PROFIL
      console.log("🗑️ Suppression du profil...");
      if (profileId) {
        await deleteDoc(doc(db, "profiles", profileId));
      }

      // 7. SUPPRESSION COMPTE PRO (si existe)
      try {
        await deleteDoc(doc(db, "professional_accounts", uid));
      } catch (e) {
        console.log("⚠️ Pas de compte pro");
      }

      // 8. SUPPRESSION DOCUMENT USERS & FCM TOKEN
      try {
        await deleteDoc(doc(db, "users", uid));
        await deleteDoc(doc(db, "fcm_tokens", uid));
      } catch (e) {
        console.log("⚠️ Document user inexistant");
      }

      // 9. SUPPRESSION AUTHENTIFICATION FIREBASE
      await deleteUser(user);
      await removeUserId();
      
      Alert.alert("Compte supprimé", "Toutes tes données ont été effacées. Au revoir !");
      
    } catch (error) {
      console.error("❌ Erreur suppression:", error);
      setIsDeleting(false);
      
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          "Sécurité", 
          "Pour supprimer ton compte, tu dois t'être connecté récemment.\n\nDéconnecte-toi, reconnecte-toi, puis réessaie.",
          [
            { text: "OK" },
            { text: "Me déconnecter", onPress: () => handleLogout() }
          ]
        );
      } else {
        Alert.alert("Erreur", "Une erreur est survenue lors de la suppression.");
      }
    }
  };

  const handleSuspendAccount = () => {
    Alert.alert(
      "Suspendre mon compte",
      "Ton profil sera temporairement désactivé.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Suspendre",
          onPress: async () => {
            try {
              const refDoc = doc(db, "profiles", profileId);
              await updateDoc(refDoc, { status: "suspendu" });
              Alert.alert("Compte suspendu", "Ton compte est maintenant en pause.");
            } catch {
              Alert.alert("Erreur", "Impossible de suspendre le compte.");
            }
          },
        },
      ]
    );
  };

  // Écran de chargement pendant la suppression
  if (isDeleting) {
    return (
      <ScreenLayout title="Suppression..." navigation={navigation}>
        <View style={styles.deletingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.deletingText}>Suppression en cours...</Text>
          <Text style={styles.deletingSubtext}>Ne ferme pas l'application</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Réglages" navigation={navigation} showBack>
      <ScrollView contentContainerStyle={styles.container}>
        
        <SettingSwitch
          label="Notifications"
          description="Active les notifications pour les conversations et les likes."
          value={notificationsEnabled}
          onValueChange={(value) => setNotificationsEnabled(value)}
        />

        <SettingSwitch
          label="Mode nomade"
          description="Rencontrez les personnes proches même en déplacement."
          value={nomadMode}
          onValueChange={(value) => {
            setNomadMode(value);
            updateSetting("nomadMode", value);
          }}
        />

        <SettingSwitch
          label="Masquer mon profil"
          description="Ton profil ne sera plus visible par les autres."
          value={hideProfile}
          onValueChange={(value) => {
            setHideProfile(value);
            updateSetting("hideProfile", value);
          }}
        />

        <SettingButton
          label="Liste rouge"
          description="Bloquer un utilisateur (réservé aux abonnés)."
          onPress={() => navigation.navigate("BlockedUsers")}
        />

        <SettingButton
          label="Conditions générales"
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

        <TouchableOpacity
          style={styles.logoutButtonContainer}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#007AFF", "#0051A8"]}
            style={styles.logoutButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons name="logout" size={22} color="#FFF" />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </LinearGradient>
        </TouchableOpacity>

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
  container: { padding: 16, paddingBottom: 40 },
  settingBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  settingText: { flex: 1, paddingRight: 12 },
  label: { fontSize: 16, fontWeight: "bold", color: "#003366" },
  description: { fontSize: 13, color: "#003366", marginTop: 4 },
  logoutButtonContainer: { borderRadius: 28, overflow: "hidden", marginTop: 24 },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8 },
  logoutText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  deletingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  deletingText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF6B6B",
    marginTop: 20,
  },
  deletingSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
});