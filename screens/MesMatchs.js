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

export default function MesMatchs({ navigation }) {
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list");
  const [filter, setFilter] = useState("all");

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

            const reverseLikesRef = collection(db, "likes");
            const reverseLikesQuery = query(
              reverseLikesRef,
              where("fromUserId", "==", currentUser.uid),
              where("toUserId", "==", likeData.fromUserId)
            );
            const reverseLikesSnap = await getDocs(reverseLikesQuery);
            const hasLikedBack = !reverseLikesSnap.empty;

            allLikes.push({
              id: likeDoc.id,
              fromUserId: likeData.fromUserId,
              fromUserName: profileData.name,
              fromUserPhoto: profileData.photoUrl,
              fromUserCity: profileData.city,
              likedDogName: myDogsData[dogId]?.dogName || "Chien",
              likedDogId: dogId,
              likedDogPhoto: myDogsData[dogId]?.photoUrl,
              createdAt: likeData.createdAt,
              isRead: likeData.isRead || false,
              hasLikedBack: hasLikedBack,
            });
          }
        }
      }

      allLikes.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      setLikes(allLikes);
    } catch (error) {
      console.error("Erreur chargement likes :", error);
      Alert.alert("Erreur", "Erreur lors du chargement des likes.");
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
      await addDoc(collection(db, "likes"), {
        fromUserId: auth.currentUser.uid,
        toUserId: item.fromUserId,
        createdAt: new Date(),
        isRead: false,
      });

      Alert.alert("Succès", "Like en retour envoyé !");

      setLikes((prev) =>
        prev.map((like) =>
          like.id === item.id ? { ...like, hasLikedBack: true } : like
        )
      );
    } catch (error) {
      console.error("Erreur like en retour :", error);
      Alert.alert("Erreur", "Impossible d'envoyer le like.");
    }
  };

  const handleDeleteLike = async (likeId) => {
    Alert.alert(
      "Supprimer ce like ?",
      "Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "likes", likeId));
              setLikes((prev) => prev.filter((like) => like.id !== likeId));
              Alert.alert("Succès", "Like supprimé.");
            } catch (error) {
              console.error("Erreur suppression :", error);
              Alert.alert("Erreur", "Impossible de supprimer.");
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
          item.likesCount + " personne(s) ont liké ce chien"
        );
      }}
    >
      {item.dogPhoto ? (
        <Image source={{ uri: item.dogPhoto }} style={styles.dogImage} />
      ) : (
        <View style={styles.dogImagePlaceholder}>
          <MaterialCommunityIcons name="dog" size={40} color="#aaa" />
        </View>
      )}
      <View style={styles.groupedInfo}>
        <Text style={styles.groupedDogName}>{item.dogName}</Text>
        <Text style={styles.groupedCount}>
          {item.likesCount} {item.likesCount > 1 ? "personnes intéressées" : "personne intéressée"}
        </Text>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount} nouveau(x)</Text>
          </View>
        )}
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={28}
        color="#ff914d"
      />
    </TouchableOpacity>
  );

  const renderListItem = ({ item }) => (
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
            <MaterialCommunityIcons name="account" size={30} color="#aaa" />
          </View>
        )}
        {!item.isRead && <View style={styles.newIndicator} />}
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{item.fromUserName}</Text>
        <Text style={styles.city}>{item.fromUserCity}</Text>
        <View style={styles.likedDogContainer}>
          <Text style={styles.likedDog}>A liké : </Text>
          <Text style={styles.dogName}>{item.likedDogName}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {!item.hasLikedBack && (
          <TouchableOpacity
            style={styles.likeBackButton}
            onPress={() => handleLikeBack(item)}
          >
            <MaterialCommunityIcons name="heart" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.chatButton}
          onPress={() =>
            navigation.navigate("Chat", {
              ownerId: item.fromUserId,
              dogName: item.fromUserName,
            })
          }
        >
          <MaterialCommunityIcons
            name="chat-outline"
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const filteredLikes = getFilteredLikes();
  const groupedLikes = getGroupedLikes();
  const unreadCount = likes.filter((l) => !l.isRead).length;

  const titleText = "Intéressés" + (unreadCount > 0 ? " (" + unreadCount + ")" : "");

  return (
    <ScreenLayout
      title={titleText}
      navigation={navigation}
      active="likes"
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff914d" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : likes.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="heart-outline" size={80} color="#444" />
          <Text style={styles.emptyText}>Aucun like pour le moment</Text>
          <Text style={styles.emptySubtext}>
            Partagez vos chiens pour recevoir des likes !
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.controls}>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filter === "all" && styles.filterButtonActive,
                ]}
                onPress={() => setFilter("all")}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === "all" && styles.filterTextActive,
                  ]}
                >
                  Tous ({likes.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filter === "unread" && styles.filterButtonActive,
                ]}
                onPress={() => setFilter("unread")}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === "unread" && styles.filterTextActive,
                  ]}
                >
                  Non lus ({unreadCount})
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.viewModeButtons}>
              <TouchableOpacity
                style={[
                  styles.viewModeButton,
                  viewMode === "list" && styles.viewModeButtonActive,
                ]}
                onPress={() => setViewMode("list")}
              >
                <MaterialCommunityIcons
                  name="view-list"
                  size={24}
                  color={viewMode === "list" ? "#ff914d" : "#aaa"}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.viewModeButton,
                  viewMode === "grouped" && styles.viewModeButtonActive,
                ]}
                onPress={() => setViewMode("grouped")}
              >
                <MaterialCommunityIcons
                  name="view-grid"
                  size={24}
                  color={viewMode === "grouped" ? "#ff914d" : "#aaa"}
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
    color: "#fff",
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
    color: "#fff",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#1a1a1a",
  },
  filterButtons: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#333",
  },
  filterButtonActive: {
    backgroundColor: "#ff914d",
  },
  filterText: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "600",
  },
  filterTextActive: {
    color: "#fff",
  },
  viewModeButtons: {
    flexDirection: "row",
    gap: 8,
  },
  viewModeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#333",
  },
  viewModeButtonActive: {
    backgroundColor: "#444",
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
  newIndicator: {
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
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 2,
  },
  city: {
    fontSize: 13,
    color: "#aaa",
    marginBottom: 4,
  },
  likedDogContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  likedDog: {
    fontSize: 13,
    color: "#ccc",
  },
  dogName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#ff914d",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  likeBackButton: {
    backgroundColor: "#ff914d",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  chatButton: {
    backgroundColor: "#42A5F5",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  groupedCard: {
    flexDirection: "row",
    backgroundColor: "#222",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
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
    backgroundColor: "#444",
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
    color: "#fff",
    marginBottom: 4,
  },
  groupedCount: {
    fontSize: 14,
    color: "#ccc",
  },
  unreadBadge: {
    backgroundColor: "#ff914d",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  unreadText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
});