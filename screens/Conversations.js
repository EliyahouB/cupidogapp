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
  onSnapshot,
  getDocs,
  orderBy,
} from "firebase/firestore";
import ScreenLayout from "../components/ScreenLayout";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function Conversations({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfiles, setUserProfiles] = useState({});
  const [abonnement, setAbonnement] = useState("gratuit");

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    console.log("=== CHARGEMENT CONVERSATIONS ===");

    // Charge l'abonnement de l'utilisateur
    const loadUserSubscription = async () => {
      try {
        const profilesRef = collection(db, "profiles");
        const profileQuery = query(profilesRef, where("uid", "==", currentUser.uid));
        const profileSnap = await getDocs(profileQuery);
        
        if (!profileSnap.empty) {
          const userData = profileSnap.docs[0].data();
          setAbonnement(userData.abonnement || "gratuit");
          console.log("Abonnement utilisateur:", userData.abonnement || "gratuit");
        }
      } catch (error) {
        console.log("Erreur chargement abonnement:", error);
      }
    };

    loadUserSubscription();

    // Query conversations où l'utilisateur est participant
    const conversationsRef = collection(db, "conversations");
    const q = query(
      conversationsRef,
      where("participants", "array-contains", currentUser.uid),
      orderBy("lastMessageTime", "desc")
    );

    // Écoute en temps réel
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      console.log("Conversations reçues:", snapshot.size);

      const convs = [];
      const userIds = new Set();

      snapshot.forEach((doc) => {
        const data = doc.data();
        convs.push({
          id: doc.id,
          ...data,
        });

        // Récupère l'ID de l'autre utilisateur
        const otherUserId = data.participants.find(
          (uid) => uid !== currentUser.uid
        );
        if (otherUserId) userIds.add(otherUserId);
      });

      // Charge les profils des autres utilisateurs
      const profiles = {};
      for (const uid of userIds) {
        if (!userProfiles[uid]) {
          const profilesRef = collection(db, "profiles");
          const profileQuery = query(profilesRef, where("uid", "==", uid));
          const profileSnap = await getDocs(profileQuery);

          if (!profileSnap.empty) {
            profiles[uid] = profileSnap.docs[0].data();
          } else {
            profiles[uid] = { name: "Utilisateur", photoUrl: null };
          }
        } else {
          profiles[uid] = userProfiles[uid];
        }
      }

      setUserProfiles((prev) => ({ ...prev, ...profiles }));
      setConversations(convs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      // Refresh conversations quand on revient sur l'écran
      setLoading(true);
    });
    return unsubscribe;
  }, [navigation]);

  const getConversationLimit = () => {
    if (abonnement === "premium") return null; // Illimité
    if (abonnement === "lite") return 20;
    return 10; // Gratuit
  };

  const canStartNewConversation = () => {
    const limit = getConversationLimit();
    if (limit === null) return true; // Premium = illimité
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

  const renderItem = ({ item }) => {
    const currentUser = auth.currentUser;
    const otherUserId = item.participants.find((uid) => uid !== currentUser.uid);
    const otherUserProfile = userProfiles[otherUserId] || {};
    const unreadCount = item.unreadCount?.[currentUser.uid] || 0;

    return (
      <TouchableOpacity
        style={[styles.card, unreadCount > 0 && styles.cardUnread]}
        onPress={() =>
          navigation.navigate("Chat", {
            conversationId: item.id,
            otherUserId: otherUserId,
            dogName: item.dogName,
            dogPhotoUrl: item.dogPhotoUrl,
          })
        }
      >
        <View style={styles.leftSection}>
          {item.dogPhotoUrl ? (
            <Image
              source={{ uri: item.dogPhotoUrl }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons name="dog" size={30} color="#aaa" />
            </View>
          )}
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {item.dogName} • {otherUserProfile.name || "Utilisateur"}
            </Text>
            <Text style={styles.time}>{formatTime(item.lastMessageTime)}</Text>
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || "Nouvelle conversation"}
          </Text>
        </View>

        <MaterialCommunityIcons name="chevron-right" size={24} color="#ff914d" />
      </TouchableOpacity>
    );
  };

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
                  ? `Encore ${remainingConversations} conversation(s) disponible(s)`
                  : "Limite atteinte. Passez à Lite ou Premium pour plus."}
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
                Commencez à discuter avec d'autres propriétaires !
              </Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
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
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ff914d",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
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
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: "#aaa",
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: "#ccc",
  },
});