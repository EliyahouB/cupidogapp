import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { auth, db } from "../config/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import ScreenLayout from "../components/ScreenLayout";
import PremiumBadge from "../components/PremiumBadge";

const { width } = Dimensions.get("window");

export default function Favoris({ navigation, embedded = false }) {
  const [favoriteDogs, setFavoriteDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ownersAbonnements, setOwnersAbonnements] = useState({});

  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    if (!embedded) {
      const unsubscribe = navigation.addListener("focus", () => {
        loadFavorites();
      });
      return unsubscribe;
    }
  }, [navigation, embedded]);

  const loadFavorites = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      console.log("=== CHARGEMENT FAVORIS ===");
      
      const likesQuery = query(
        collection(db, "likes"),
        where("fromUserId", "==", user.uid)
      );
      const likesSnap = await getDocs(likesQuery);
      
      console.log("Nombre de likes:", likesSnap.size);

      const dogsPromises = likesSnap.docs.map(async (likeDoc) => {
        const likeData = likeDoc.data();
        const { toDogId, toOwnerId } = likeData;

        console.log("  → Like vers:", toDogId, "owner:", toOwnerId);

        try {
          const dogRef = doc(db, "users", toOwnerId, "dogs", toDogId);
          const dogSnap = await getDoc(dogRef);

          if (dogSnap.exists()) {
            console.log("     ✅ Chien trouvé:", dogSnap.data().dogName);
            return {
              id: dogSnap.id,
              ownerId: toOwnerId,
              ...dogSnap.data(),
            };
          } else {
            console.log("     ❌ Chien introuvable");
            return null;
          }
        } catch (error) {
          console.log("     ❌ Erreur chargement chien:", error);
          return null;
        }
      });

      const dogs = await Promise.all(dogsPromises);
      const validDogs = dogs.filter((dog) => dog !== null);
      
      // Charger les abonnements des propriétaires
      const ownerIds = [...new Set(validDogs.map(dog => dog.ownerId))];
      const ownersAbonnementsMap = {};
      
      const profilesRef = collection(db, "profiles");
      const allProfiles = await getDocs(profilesRef);
      
      allProfiles.forEach((profileDoc) => {
        const profileData = profileDoc.data();
        if (ownerIds.includes(profileData.uid)) {
          ownersAbonnementsMap[profileData.uid] = profileData.abonnement || "gratuit";
        }
      });

      setOwnersAbonnements(ownersAbonnementsMap);
      console.log("TOTAL chiens favoris:", validDogs.length);
      setFavoriteDogs(validDogs);
    } catch (error) {
      console.log("Erreur chargement favoris:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async (item) => {
    const user = auth.currentUser;
    if (!user) {
      alert("Vous devez être connecté");
      return;
    }

    if (user.uid === item.ownerId) {
      alert("C'est votre propre chien !");
      return;
    }

    try {
      const conversationsRef = collection(db, "conversations");
      const q = query(
        conversationsRef,
        where("participants", "array-contains", user.uid)
      );
      const conversationsSnap = await getDocs(q);
      
      let conversationId = null;
      
      conversationsSnap.forEach((doc) => {
        const data = doc.data();
        if (data.participants.includes(item.ownerId)) {
          conversationId = doc.id;
        }
      });

      if (!conversationId) {
        const newConvDoc = await addDoc(conversationsRef, {
          participants: [user.uid, item.ownerId],
          dogId: item.id,
          dogName: item.dogName,
          dogPhotoUrl: item.photoUrl || null,
          lastMessage: "",
          lastMessageTime: serverTimestamp(),
          unreadCount: {
            [user.uid]: 0,
            [item.ownerId]: 0,
          },
          createdAt: serverTimestamp(),
        });
        conversationId = newConvDoc.id;
      }

      navigation.navigate("Chat", {
        conversationId: conversationId,
        otherUserId: item.ownerId,
        dogName: item.dogName,
        dogPhotoUrl: item.photoUrl || null,
      });
    } catch (error) {
      console.log("Erreur création conversation:", error);
      alert("Erreur lors de la création de la conversation");
    }
  };

  const renderDog = ({ item }) => {
    const ownerAbonnement = ownersAbonnements[item.ownerId] || "gratuit";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("DetailsChien", { dog: item })}
      >
        <View style={styles.cardContent}>
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons name="dog" size={40} color="#999" />
            </View>
          )}

          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{item.dogName}</Text>
              <PremiumBadge abonnement={ownerAbonnement} size="small" />
            </View>
            
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="dog" size={16} color="#6B7280" />
              <Text style={styles.detail}>{item.breed}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="cake-variant" size={16} color="#6B7280" />
              <Text style={styles.detail}>{item.age} ans</Text>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="heart-outline" size={16} color="#FF6B35" />
              <Text style={styles.detailPurpose}>{item.purpose}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.chatButtonContainer}
            onPress={() => handleContact(item)}
          >
            <LinearGradient
              colors={['#06D6A0', '#059669']}
              style={styles.chatButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="message-text-outline" size={16} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // MODE EMBEDDED (dans LikesHub)
  if (embedded) {
    return (
      <View style={styles.container}>
        {loading ? (
          <Text style={styles.loadingText}>Chargement...</Text>
        ) : favoriteDogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="heart-outline" size={80} color="#D1D5DB" />
            <Text style={styles.emptyText}>Aucun favori pour le moment</Text>
            <Text style={styles.emptySubtext}>
              Likez des chiens pour les retrouver ici
            </Text>
          </View>
        ) : (
          <FlatList
            data={favoriteDogs}
            keyExtractor={(item) => item.id}
            renderItem={renderDog}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    );
  }

  // MODE STANDALONE (écran indépendant)
  return (
    <ScreenLayout title="Favoris" navigation={navigation} active="likes">
      <View style={styles.container}>
        {loading ? (
          <Text style={styles.loadingText}>Chargement...</Text>
        ) : favoriteDogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="heart-outline" size={80} color="#D1D5DB" />
            <Text style={styles.emptyText}>Aucun favori pour le moment</Text>
            <Text style={styles.emptySubtext}>
              Likez des chiens pour les retrouver ici
            </Text>
          </View>
        ) : (
          <FlatList
            data={favoriteDogs}
            keyExtractor={(item) => item.id}
            renderItem={renderDog}
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
  loadingText: {
    color: "#6B7280",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    color: "#1A1A1D",
    textAlign: "center",
    marginTop: 16,
    fontSize: 18,
    fontWeight: "bold",
  },
  emptySubtext: {
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
  },
  list: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#F5F5F7",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1D",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  detail: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  detailPurpose: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF6B35",
  },
  chatButtonContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
  },
  chatButtonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});