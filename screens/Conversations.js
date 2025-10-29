import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { auth, db } from "../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import ScreenLayout from "../components/ScreenLayout";

export default function Conversations({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const messagesRef = collection(db, "messages");
        const sentQuery = query(messagesRef, where("fromUserId", "==", user.uid));
        const receivedQuery = query(messagesRef, where("toUserId", "==", user.uid));

        const [sentSnap, receivedSnap] = await Promise.all([
          getDocs(sentQuery),
          getDocs(receivedQuery),
        ]);

        const userMap = new Map();

        sentSnap.docs.forEach((doc) => {
          const data = doc.data();
          userMap.set(data.toUserId, {
            userId: data.toUserId,
            lastMessage: data.text,
            dogName: data.dogName || "Chien",
          });
        });

        receivedSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (!userMap.has(data.fromUserId)) {
            userMap.set(data.fromUserId, {
              userId: data.fromUserId,
              lastMessage: data.text,
              dogName: data.dogName || "Chien",
            });
          }
        });

        setConversations(Array.from(userMap.values()));
      } catch (error) {
        alert("Erreur lors du chargement des conversations.");
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("Chat", {
          ownerId: item.userId,
          dogName: item.dogName,
        })
      }
    >
      <Text style={styles.name}>👤 Utilisateur : {item.userId}</Text>
      <Text style={styles.dog}>🐶 Chien : {item.dogName}</Text>
      <Text style={styles.message}>💬 Dernier message : {item.lastMessage}</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenLayout title="Mes Conversations" navigation={navigation}>
      {loading ? (
        <Text style={styles.loading}>Chargement...</Text>
      ) : conversations.length === 0 ? (
        <Text style={styles.loading}>Aucune conversation trouvée</Text>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.userId}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  loading: {
    color: "#fff",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  list: {
    padding: 12,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#333",
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  dog: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: "#aaa",
  },
});
