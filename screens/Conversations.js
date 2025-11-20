import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
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
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const messagesRef = collection(db, "messages");
        const q = query(
          messagesRef,
          where("participants", "array-contains", currentUser.uid)
        );

        const snap = await getDocs(q);

        // Grouper par conversation (par paire d'utilisateurs)
        const convMap = {};

        snap.forEach((doc) => {
          const msg = doc.data();
          const otherUserId =
            msg.fromUserId === currentUser.uid
              ? msg.toUserId
              : msg.fromUserId;

          if (!convMap[otherUserId]) {
            convMap[otherUserId] = {
              otherUserId,
              dogName: msg.dogName,
              lastMessage: msg.text,
              lastMessageDate: msg.createdAt,
            };
          } else {
            // Garder le message le plus récent
            if (
              msg.createdAt.seconds >
              convMap[otherUserId].lastMessageDate.seconds
            ) {
              convMap[otherUserId].lastMessage = msg.text;
              convMap[otherUserId].lastMessageDate = msg.createdAt;
            }
          }
        });

        // Convertir en array et trier par date
        const convArray = Object.values(convMap).sort(
          (a, b) => b.lastMessageDate.seconds - a.lastMessageDate.seconds
        );

        setConversations(convArray);
      } catch (error) {
        console.error("Erreur chargement conversations :", error);
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
          ownerId: item.otherUserId,
          dogName: item.dogName,
        })
      }
    >
      <View style={styles.info}>
        <Text style={styles.name}>{item.dogName}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenLayout title="Conversations" navigation={navigation} active="chat">
      {loading ? (
        <Text style={styles.loading}>Chargement...</Text>
      ) : conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucune conversation</Text>
          <Text style={styles.emptySubtext}>
            Commencez à discuter avec d'autres propriétaires !
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.otherUserId}
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
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#222",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: "#ccc",
  },
  arrow: {
    fontSize: 24,
    color: "#ff914d",
  },
});