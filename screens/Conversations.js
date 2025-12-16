import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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

    const loadUserSubscription = async () => {
      try {
        const profilesRef = collection(db, "profiles");
        const profileQuery = query(profilesRef, where("uid", "==", currentUser.uid));
        const profileSnap = await getDocs(profileQuery);
        
        if (!profileSnap.empty) {
          const userData = profileSnap.docs[0].data();
          setAbonnement(userData.abonnement || "gratuit");
        }
      } catch (error) {
        console.log("Erreur chargement abonnement:", error);
      }
    };

    loadUserSubscription();

    const conversationsRef = collection(db, "conversations");
    const q = query(
      conversationsRef,
      where("participants", "array-contains", currentUser.uid),
      orderBy("lastMessageTime", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const convs = [];
        const userIds = new Set();

        snapshot.forEach((doc) => {
          const data = doc.data();
          convs.push({
            id: doc.id,
            ...data,
          });

          const otherUserId = data.participants.find(
            (uid) => uid !== currentUser.uid
          );
          if (otherUserId) userIds.add(otherUserId);
        });

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
      },
      (error) => {
        console.error("Erreur conversations:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

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
        style={styles.cardContainer}
        onPress={() =>
          navigation.navigate("Chat", {
            conversationId: item.id,
            otherUserId: otherUserId,
            dogName: item.dogName || otherUserProfile.name,
          })
        }
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={unreadCount > 0 ? ['#FFF5F0', '#FFF'] : ['#FFF', '#FFF']}
          style={[styles.card, unreadCount > 0 && styles.cardUnread]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.leftSection}>
            {item.dogPhotoUrl ? (
              <Image
                source={{ uri: item.dogPhotoUrl }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <MaterialCommunityIcons name="dog" size={32} color="#9CA3AF" />
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
              <Text style={styles.name} numberOfLines={1}>
                {item.dogName}
              </Text>
              <Text style={styles.time}>{formatTime(item.lastMessageTime)}</Text>
            </View>
            <Text style={styles.userName} numberOfLines={1}>
              {otherUserProfile.name || "Utilisateur"}
            </Text>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage || "Nouvelle conversation"}
            </Text>
          </View>

          <MaterialCommunityIcons 
            name="chevron-right" 
            size={22} 
            color={unreadCount > 0 ? "#FF6B35" : "#D1D5DB"} 
          />
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const getConversationLimit = () => {
    if (abonnement === "premium" || abonnement === "premium+") return null;
    if (abonnement === "lite") return 20;
    return 10;
  };

  const limit = getConversationLimit();
  const remainingConversations = limit ? limit - conversations.length : null;

  return (
    <ScreenLayout title="Conversations" navigation={navigation} active="chat">
      <LinearGradient
        colors={['#F5D547', '#FF9966']}
        style={styles.gradientContainer}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFF" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : (
          <>
            {limit !== null && (
              <View style={styles.limitBanner}>
                <MaterialCommunityIcons
                  name="information"
                  size={18}
                  color="#92400E"
                />
                <Text style={styles.limitText}>
                  {remainingConversations > 0
                    ? `${remainingConversations} conversation(s) restante(s)`
                    : "Limite atteinte · Passez à Premium"}
                </Text>
              </View>
            )}

            {conversations.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIconContainer}>
                  <MaterialCommunityIcons
                    name="chat-outline"
                    size={64}
                    color="#FFF"
                  />
                </View>
                <Text style={styles.emptyText}>Aucune conversation</Text>
                <Text style={styles.emptySubtext}>
                  Commencez à discuter avec d'autres propriétaires
                </Text>
              </View>
            ) : (
              <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        )}
      </LinearGradient>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#FFF",
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  limitBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    padding: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F59E0B",
  },
  limitText: {
    flex: 1,
    color: "#92400E",
    fontSize: 13,
    fontWeight: "600",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: "#FFF",
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.9,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  cardContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B35",
  },
  leftSection: {
    marginRight: 14,
    position: "relative",
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#F3F4F6",
  },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF6B35",
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  unreadText: {
    color: "#FFF",
    fontSize: 11,
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
    fontSize: 17,
    fontWeight: "bold",
    color: "#1A1A1D",
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  userName: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});