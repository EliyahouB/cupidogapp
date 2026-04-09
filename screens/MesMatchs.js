import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { auth, db } from "../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import ScreenLayout from "../components/ScreenLayout";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import PremiumBadge from "../components/PremiumBadge";
import i18n from "../utils/i18n";

export default function MesMatchs({ navigation, embedded = false }) {
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list");
  const [filter, setFilter] = useState("all");
  const [usersAbonnements, setUsersAbonnements] = useState({});

  useEffect(() => {
    fetchLikes();
  }, []);

  const fetchLikes = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const myDogsRef = collection(db, "users", currentUser.uid, "dogs");
      const myDogsSnap = await getDocs(myDogsRef);

      const myDogIds = myDogsSnap.docs.map((doc) => doc.id);
      const myDogsData = {};
      myDogsSnap.docs.forEach((doc) => {
        myDogsData[doc.id] = doc.data();
      });

      if (myDogIds.length === 0) {
        setLoading(false);
        return;
      }

      const allLikes = [];
      const userIds = new Set();

      for (const dogId of myDogIds) {
        const likesRef = collection(db, "likes");
        const likesQuery = query(likesRef, where("toDogId", "==", dogId));
        const likesSnap = await getDocs(likesQuery);

        for (const likeDoc of likesSnap.docs) {
          const likeData = likeDoc.data();

          const profilesRef = collection(db, "profiles");
          const profileQuery = query(
            profilesRef,
            where("uid", "==", likeData.fromUserId)
          );
          const profileSnap = await getDocs(profileQuery);

          if (!profileSnap.empty) {
            const profileData = profileSnap.docs[0].data();
            userIds.add(likeData.fromUserId);

            const fromUserDogsRef = collection(db, "users", likeData.fromUserId, "dogs");
            const fromUserDogsSnap = await getDocs(fromUserDogsRef);
            const fromUserDogIds = fromUserDogsSnap.docs.map((doc) => doc.id);

            const myLikesRef = collection(db, "likes");
            const myLikesQuery = query(
              myLikesRef,
              where("fromUserId", "==", currentUser.uid),
              where("toOwnerId", "==", likeData.fromUserId)
            );
            const myLikesSnap = await getDocs(myLikesQuery);
            const hasLikedBack = !myLikesSnap.empty;

            allLikes.push({
              id: likeDoc.id,
              fromUserId: likeData.fromUserId,
              fromUserName: profileData.name,
              fromUserPhoto: profileData.photoUrl,
              fromUserCity: profileData.city,
              fromUserDogIds: fromUserDogIds,
              likedDogName: myDogsData[dogId]?.dogName || i18n.t("dog"),
              likedDogId: dogId,
              likedDogPhoto: myDogsData[dogId]?.photoUrl,
              createdAt: likeData.createdAt,
              isRead: likeData.isRead || false,
              hasLikedBack: hasLikedBack,
            });
          }
        }
      }

      const usersAbonnementsMap = {};
      const profilesQuery = collection(db, "profiles");
      const allProfiles = await getDocs(profilesQuery);
      
      allProfiles.forEach((profileDoc) => {
        const profileData = profileDoc.data();
        if (userIds.has(profileData.uid)) {
          usersAbonnementsMap[profileData.uid] = profileData.abonnement || "gratuit";
        }
      });

      setUsersAbonnements(usersAbonnementsMap);

      allLikes.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      setLikes(allLikes);
    } catch (error) {
      console.error("Erreur chargement likes :", error);
      Alert.alert(i18n.t("error"), i18n.t("error_loading_likes"));
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (likeId) => {
    try {
      const likeRef = doc(db, "likes", likeId);
      await updateDoc(likeRef, { isRead: true });

      setLikes((prev) =>
        prev.map((like) =>
          like.id === likeId ? { ...like, isRead: true } : like
        )
      );
    } catch (error) {
      console.error("Erreur marquage lecture :", error);
    }
  };

  const handleLikeBack = async (item) => {
    try {
      if (!item.fromUserDogIds || item.fromUserDogIds.length === 0) {
        Alert.alert(i18n.t("error"), i18n.t("user_no_dog_to_like"));
        return;
      }

      const firstDogId = item.fromUserDogIds[0];

      await addDoc(collection(db, "likes"), {
        fromUserId: auth.currentUser.uid,
        toOwnerId: item.fromUserId,
        toDogId: firstDogId,
        createdAt: new Date(),
        isRead: false,
      });

      Alert.alert(i18n.t("success"), i18n.t("like_back_sent"));

      setLikes((prev) =>
        prev.map((like) =>
          like.id === item.id ? { ...like, hasLikedBack: true } : like
        )
      );
    } catch (error) {
      console.error("Erreur like en retour :", error);
      Alert.alert(i18n.t("error"), i18n.t("error_sending_like"));
    }
  };

  const handleDeleteLike = async (likeId) => {
    Alert.alert(
      i18n.t("delete_this_like"),
      i18n.t("action_irreversible"),
      [
        { text: i18n.t("cancel"), style: "cancel" },
        {
          text: i18n.t("delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "likes", likeId));
              setLikes((prev) => prev.filter((like) => like.id !== likeId));
              Alert.alert(i18n.t("success"), i18n.t("like_deleted"));
            } catch (error) {
              console.error("Erreur suppression :", error);
              Alert.alert(i18n.t("error"), i18n.t("error_deleting"));
            }
          },
        },
      ]
    );
  };

  const getFilteredLikes = () => {
    if (filter === "unread") {
      return likes.filter((like) => !like.isRead);
    }
    return likes;
  };

  const getGroupedLikes = () => {
    const grouped = {};

    likes.forEach((like) => {
      if (!grouped[like.likedDogId]) {
        grouped[like.likedDogId] = {
          dogName: like.likedDogName,
          dogPhoto: like.likedDogPhoto,
          likes: [],
        };
      }
      grouped[like.likedDogId].likes.push(like);
    });

    return Object.entries(grouped).map(([dogId, data]) => ({
      dogId,
      dogName: data.dogName,
      dogPhoto: data.dogPhoto,
      likesCount: data.likes.length,
      unreadCount: data.likes.filter((l) => !l.isRead).length,
      likes: data.likes,
    }));
  };

  const renderGroupedItem = ({ item }) => (
    <TouchableOpacity
      style={styles.groupedCard}
      onPress={() => {
        Alert.alert(
          item.dogName,
          i18n.t("people_liked_dog", { count: item.likesCount })
        );
      }}
    >
      {item.dogPhoto ? (
        <Image source={{ uri: item.dogPhoto }} style={styles.dogImage} />
      ) : (
        <View style={styles.dogImagePlaceholder}>
          <MaterialCommunityIcons name="dog" size={40} color="#9CA3AF" />
        </View>
      )}
      <View style={styles.groupedInfo}>
        <Text style={styles.groupedDogName}>{item.dogName}</Text>
        <Text style={styles.groupedCount}>
          {item.likesCount} {item.likesCount > 1 ? i18n.t("people_interested") : i18n.t("person_interested")}
        </Text>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount} {i18n.t("new")}</Text>
          </View>
        )}
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={28}
        color="#FF6B35"
      />
    </TouchableOpacity>
  );

  const renderListItem = ({ item }) => {
    const userAbonnement = usersAbonnements[item.fromUserId] || "gratuit";

    const handleOpenChat = async () => {
      try {
        const currentUser = auth.currentUser;
        
        const conversationsRef = collection(db, "conversations");
        const q = query(
          conversationsRef,
          where("participants", "array-contains", currentUser.uid)
        );
        const conversationsSnap = await getDocs(q);
        
        let conversationId = null;
        
        conversationsSnap.forEach((doc) => {
          const data = doc.data();
          if (data.participants.includes(item.fromUserId)) {
            conversationId = doc.id;
          }
        });
        
        if (!conversationId) {
          const newConvRef = await addDoc(collection(db, "conversations"), {
            participants: [currentUser.uid, item.fromUserId],
            createdAt: new Date(),
            lastMessage: "",
            lastMessageTime: new Date(),
            unreadCount: {
              [currentUser.uid]: 0,
              [item.fromUserId]: 0,
            },
            dogName: item.fromUserName,
            dogPhotoUrl: item.fromUserPhoto,
          });
          conversationId = newConvRef.id;
        }
        
        navigation.navigate("Chat", {
          conversationId: conversationId,
          otherUserId: item.fromUserId,
          dogName: item.fromUserName,
        });
      } catch (error) {
        console.error("Erreur ouverture chat:", error);
        Alert.alert(i18n.t("error"), i18n.t("error_opening_conversation"));
      }
    };

    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.cardUnread]}
        onPress={() => markAsRead(item.id)}
        onLongPress={() => handleDeleteLike(item.id)}
      >
        <View style={styles.leftSection}>
          {item.fromUserPhoto ? (
            <Image
              source={{ uri: item.fromUserPhoto }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons name="account" size={30} color="#9CA3AF" />
            </View>
          )}
          {!item.isRead && <View style={styles.newIndicator} />}
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.fromUserName}</Text>
            <PremiumBadge abonnement={userAbonnement} size="small" />
          </View>
          <Text style={styles.city}>{item.fromUserCity}</Text>
          <View style={styles.likedDogContainer}>
            <Text style={styles.likedDog}>{i18n.t("liked")}: </Text>
            <Text style={styles.dogName}>{item.likedDogName}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          {!item.hasLikedBack && (
            <TouchableOpacity
              style={styles.actionButtonContainer}
              onPress={() => handleLikeBack(item)}
            >
              <LinearGradient
                colors={["#FFA85C", "#FF6A3D", "#F15156", "#E91E63"]}
                style={styles.actionButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="heart" size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButtonContainer}
            onPress={handleOpenChat}
          >
            <LinearGradient
              colors={["#42A5F5", "#1976D2"]}
              style={styles.actionButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons
                name="chat"
                size={20}
                color="#FFF"
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredLikes = getFilteredLikes();
  const groupedLikes = getGroupedLikes();
  const unreadCount = likes.filter((l) => !l.isRead).length;
  const titleText = i18n.t("interested") + (unreadCount > 0 ? " (" + unreadCount + ")" : "");

  if (embedded) {
    return (
      <>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>{i18n.t("loading")}</Text>
          </View>
        ) : likes.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="heart-outline" size={80} color="#D1D5DB" />
            <Text style={styles.emptyText}>{i18n.t("no_likes_yet")}</Text>
            <Text style={styles.emptySubtext}>{i18n.t("share_dogs_to_get_likes")}</Text>
          </View>
        ) : (
          <>
            <View style={styles.controls}>
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[styles.filterButton, filter === "all" && styles.filterButtonActive]}
                  onPress={() => setFilter("all")}
                >
                  <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>
                    {i18n.t("all")} ({likes.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterButton, filter === "unread" && styles.filterButtonActive]}
                  onPress={() => setFilter("unread")}
                >
                  <Text style={[styles.filterText, filter === "unread" && styles.filterTextActive]}>
                    {i18n.t("unread")} ({unreadCount})
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.viewModeButtons}>
                <TouchableOpacity
                  style={[styles.viewModeButton, viewMode === "list" && styles.viewModeButtonActive]}
                  onPress={() => setViewMode("list")}
                >
                  <MaterialCommunityIcons
                    name="view-list"
                    size={24}
                    color={viewMode === "list" ? "#FF6B35" : "#9CA3AF"}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.viewModeButton, viewMode === "grouped" && styles.viewModeButtonActive]}
                  onPress={() => setViewMode("grouped")}
                >
                  <MaterialCommunityIcons
                    name="view-grid"
                    size={24}
                    color={viewMode === "grouped" ? "#FF6B35" : "#9CA3AF"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {viewMode === "list" ? (
              <FlatList
                data={filteredLikes}
                keyExtractor={(item) => item.id}
                renderItem={renderListItem}
                contentContainerStyle={styles.list}
              />
            ) : (
              <FlatList
                data={groupedLikes}
                keyExtractor={(item) => item.dogId}
                renderItem={renderGroupedItem}
                contentContainerStyle={styles.list}
              />
            )}
          </>
        )}
      </>
    );
  }

  return (
    <ScreenLayout title={titleText} navigation={navigation} active="likes">
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>{i18n.t("loading")}</Text>
        </View>
      ) : likes.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="heart-outline" size={80} color="#D1D5DB" />
          <Text style={styles.emptyText}>{i18n.t("no_likes_yet")}</Text>
          <Text style={styles.emptySubtext}>{i18n.t("share_dogs_to_get_likes")}</Text>
        </View>
      ) : (
        <>
          <View style={styles.controls}>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[styles.filterButton, filter === "all" && styles.filterButtonActive]}
                onPress={() => setFilter("all")}
              >
                <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>
                  {i18n.t("all")} ({likes.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterButton, filter === "unread" && styles.filterButtonActive]}
                onPress={() => setFilter("unread")}
              >
                <Text style={[styles.filterText, filter === "unread" && styles.filterTextActive]}>
                  {i18n.t("unread")} ({unreadCount})
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.viewModeButtons}>
              <TouchableOpacity
                style={[styles.viewModeButton, viewMode === "list" && styles.viewModeButtonActive]}
                onPress={() => setViewMode("list")}
              >
                <MaterialCommunityIcons
                  name="view-list"
                  size={24}
                  color={viewMode === "list" ? "#FF6B35" : "#9CA3AF"}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.viewModeButton, viewMode === "grouped" && styles.viewModeButtonActive]}
                onPress={() => setViewMode("grouped")}
              >
                <MaterialCommunityIcons
                  name="view-grid"
                  size={24}
                  color={viewMode === "grouped" ? "#FF6B35" : "#9CA3AF"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {viewMode === "list" ? (
            <FlatList
              data={filteredLikes}
              keyExtractor={(item) => item.id}
              renderItem={renderListItem}
              contentContainerStyle={styles.list}
            />
          ) : (
            <FlatList
              data={groupedLikes}
              keyExtractor={(item) => item.dogId}
              renderItem={renderGroupedItem}
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
  loadingText: {
    color: "#6B7280",
    marginTop: 12,
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
    color: "#1A1A1D",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterButtons: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  filterButtonActive: {
    backgroundColor: "#FF6B35",
  },
  filterText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
  filterTextActive: {
    color: "#FFF",
  },
  viewModeButtons: {
    flexDirection: "row",
    gap: 8,
  },
  viewModeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  viewModeButtonActive: {
    backgroundColor: "#FFF",
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B35",
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
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  newIndicator: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF6B35",
    borderWidth: 2,
    borderColor: "#F5F5F7",
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1D",
  },
  city: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  likedDogContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  likedDog: {
    fontSize: 13,
    color: "#6B7280",
  },
  dogName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#FF6B35",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButtonContainer: {
    borderRadius: 20,
    overflow: "hidden",
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  groupedCard: {
    flexDirection: "row",
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  dogImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 12,
  },
  dogImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  groupedInfo: {
    flex: 1,
  },
  groupedDogName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1D",
    marginBottom: 4,
  },
  groupedCount: {
    fontSize: 14,
    color: "#6B7280",
  },
  unreadBadge: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  unreadText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
});