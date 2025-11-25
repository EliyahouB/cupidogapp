import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import { auth, db } from "../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import ScreenLayout from "../components/ScreenLayout";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function Conversations({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [abonnement, setAbonnement] = useState("gratuit");

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setAbonnement(userSnap.data().abonnement || "gratuit");
      }

      const messagesRef = collection(db, "messages");
      const q = query(
        messagesRef,
        where("participants", "array-contains", currentUser.uid)
      );

      const snap = await getDocs(q);

      const convMap = {};

      for (const msgDoc of snap.docs) {
        const msg = msgDoc.data();
        const otherUserId =
          msg.fromUserId === currentUser.uid
            ? msg.toUserId
            : msg.fromUserId;

        if (!convMap[otherUserId]) {
          const profilesRef = collection(db, "profiles");
          const profileQuery = query(
            profilesRef,
            where("uid", "==", otherUserId)
          );
          const profileSnap = await getDocs(profileQuery);

          let otherUserName = "Utilisateur";
          let otherUserPhoto = null;

          if (!profileSnap.empty) {
            const profileData = profileSnap.docs[0].data();
            otherUserName = profileData.name || "Utilisateur";
            otherUserPhoto = profileData.photoUrl || null;
          }

          convMap[otherUserId] = {
            otherUserId,
            otherUserName,
            otherUserPhoto,
            dogName: msg.dogName,
            lastMessage: msg.text,
            lastMessageDate: msg.createdAt,
            isRead: msg.isRead !== false,
          };
        } else {
          if (
            msg.createdAt.seconds >
            convMap[otherUserId].lastMessageDate.seconds
          ) {
            convMap[otherUserId].lastMessage = msg.text;
            convMap[otherUserId].lastMessageDate = msg.createdAt;
            convMap[otherUserId].isRead = msg.isRead !== false;
          }
        }
      }

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

  const getConversationLimit = () => {
    if (abonnement === "premium") return null;
    if (abonnement === "lite") return 20;
    return 10;
  };

  const canStartNewConversation = () => {
    const limit = getConversationLimit();
    if (limit === null) return true;
    return conversations.length < limit;
  };

  const formatTime = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return "";

    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffInMs = now - date;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInMs / (1000 * 60));
      return minutes + " min";
    } else if (diffInHours < 24) {
      return Math.floor(diffInHours) + " h";
    } else if (diffInDays < 7) {
      return Math.floor(diffInDays) + " j";
    } else {
      return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      });
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, !item.isRead && styles.cardUnread]}
      onPress={() =>
        navigation.navigate("Chat", {
          ownerId: item.otherUserId,
          dogName: item.otherUserName,
        })
      }
    >
      <View style={styles.leftSection}>
        {item.otherUserPhoto ? (
          <Image
            source={{ uri: item.otherUserPhoto }}
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <MaterialCommunityIcons name="account" size={30} color="#aaa" />
          </View>
        )}
        {!item.isRead && <View style={styles.unreadIndicator} />}
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.otherUserName}</Text>
          <Text style={styles.time}>{formatTime(item.lastMessageDate)}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>

      <MaterialCommunityIcons name="chevron-right" size={24} color="#ff914d" />
    </TouchableOpacity>
  );

  const limit = getConversationLimit();
  const remainingConversations = limit ? limit - conversations.length : null;

  return (
    <ScreenLayout title="Conversations" navigation={navigation} active="chat">
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loading}>Chargement...</Text>
        </View>
      ) : (
        <>
          {limit !== null && (
            <View style={styles.limitBanner}>
              <MaterialCommunityIcons
                name="information"
                size={20}
                color="#ff914d"
              />
              <Text style={styles.limitText}>
                {remainingConversations > 0
                  ? "Encore " +
                    remainingConversations +
                    " conversation(s) disponible(s)"
                  : "Limite atteinte. Passez a Lite ou Premium pour plus."}
              </Text>
            </View>
          )}

          {conversations.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons
                name="chat-outline"
                size={80}
                color="#444"
              />
              <Text style={styles.emptyText}>Aucune conversation</Text>
              <Text style={styles.emptySubtext}>
                Commencez a discuter avec d autres proprietaires !
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
        </>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loading: {
    color: "#fff",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  limitBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    padding: 12,
    gap: 8,
  },
  limitText: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
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
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: "#ff914d",
  },
  leftSection: {
    marginRight: 12,
    position: "relative",
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#444",
    justifyContent: "center",
    alignItems: "center",
  },
  unreadIndicator: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ff914d",
    borderWidth: 2,
    borderColor: "#222",
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  time: {
    fontSize: 12,
    color: "#aaa",
  },
  lastMessage: {
    fontSize: 14,
    color: "#ccc",
  },
});