import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import ScreenLayout from "../components/ScreenLayout";
import { auth, db } from "../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

export default function BlockedUsers({ navigation }) {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const q = query(
        collection(db, "blockedUsers"),
        where("userId", "==", user.uid)
      );
      const snapshot = await getDocs(q);

      const blocked = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));

      setBlockedUsers(blocked);
    } catch (error) {
      console.log("Erreur chargement utilisateurs bloques:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockId, blockedUserName) => {
    Alert.alert(
      "Debloquer",
      "Debloquer " + blockedUserName + " ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Debloquer",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "blockedUsers", blockId));
              setBlockedUsers((prev) => prev.filter((b) => b.id !== blockId));
              Alert.alert("Succes", "Utilisateur debloque.");
            } catch (error) {
              Alert.alert("Erreur", "Impossible de debloquer cet utilisateur.");
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.blockedUserName || "Utilisateur"}</Text>
        <Text style={styles.userDate}>
          Bloque le {item.blockedAt ? new Date(item.blockedAt.toDate()).toLocaleDateString() : ""}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.unblockButton}
        onPress={() => handleUnblock(item.id, item.blockedUserName)}
      >
        <Text style={styles.unblockText}>Debloquer</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenLayout title="Liste rouge" navigation={navigation} showBack>
      <View style={styles.container}>
        {loading ? (
          <Text style={styles.loading}>Chargement...</Text>
        ) : blockedUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Aucun utilisateur bloque</Text>
            <Text style={styles.emptySubtext}>
              Les utilisateurs que vous bloquez apparaitront ici.
            </Text>
          </View>
        ) : (
          <FlatList
            data={blockedUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loading: {
    color: "#fff",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
  },
  list: {
    paddingBottom: 100,
  },
  userCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  userDate: {
    fontSize: 12,
    color: "#aaa",
  },
  unblockButton: {
    backgroundColor: "#ff914d",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  unblockText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});