import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { auth, db } from "../config/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

const { width } = Dimensions.get("window");

export default function DetailsChien({ route, navigation }) {
  const { dog } = route.params;
  const user = auth.currentUser;
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const flatListRef = useRef(null);

  const photos = dog.photoUrls && dog.photoUrls.length > 0 
    ? dog.photoUrls 
    : dog.photoUrl 
    ? [dog.photoUrl] 
    : [];

  useEffect(() => {
    const checkFavorite = async () => {
      if (!user) return;
      
      try {
        const likesQuery = query(
          collection(db, "likes"),
          where("fromUserId", "==", user.uid),
          where("toDogId", "==", dog.id)
        );
        const likesSnap = await getDocs(likesQuery);
        setIsFavorite(!likesSnap.empty);
      } catch (error) {
        console.log("Erreur vérification favoris:", error);
      }
    };

    checkFavorite();
  }, [dog.id]);

  const handleFavorite = async () => {
    if (!user) return;

    try {
      await addDoc(collection(db, "likes"), {
        fromUserId: user.uid,
        toDogId: dog.id,
        toOwnerId: dog.ownerId,
        createdAt: new Date(),
      });
      setIsFavorite(true);
      alert("Ajouté aux favoris !");
    } catch (error) {
      console.log("Erreur ajout favoris:", error);
      alert("Erreur lors de l'ajout aux favoris.");
    }
  };

  const handleContact = async () => {
    if (!user) {
      alert("Vous devez être connecté");
      return;
    }

    if (user.uid === dog.ownerId) {
      alert("C'est votre propre chien !");
      return;
    }

    try {
      console.log("1. Recherche conversation existante...");
      
      const conversationsRef = collection(db, "conversations");
      const q = query(
        conversationsRef,
        where("participants", "array-contains", user.uid)
      );
      const conversationsSnap = await getDocs(q);
      
      let conversationId = null;
      
      conversationsSnap.forEach((doc) => {
        const data = doc.data();
        if (data.participants.includes(dog.ownerId)) {
          conversationId = doc.id;
          console.log("2. Conversation existante trouvée:", conversationId);
        }
      });

      if (!conversationId) {
        console.log("2. Création nouvelle conversation...");
        const newConvDoc = await addDoc(conversationsRef, {
          participants: [user.uid, dog.ownerId],
          dogId: dog.id,
          dogName: dog.dogName,
          dogPhotoUrl: photos[0] || null,
          lastMessage: "",
          lastMessageTime: serverTimestamp(),
          unreadCount: {
            [user.uid]: 0,
            [dog.ownerId]: 0,
          },
          createdAt: serverTimestamp(),
        });
        conversationId = newConvDoc.id;
        console.log("3. Nouvelle conversation créée:", conversationId);
      }

      navigation.navigate("Chat", {
        conversationId: conversationId,
        otherUserId: dog.ownerId,
        dogName: dog.dogName,
        dogPhotoUrl: photos[0] || null,
      });
    } catch (error) {
      console.log("Erreur création conversation:", error);
      alert("Erreur lors de la création de la conversation");
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentPhotoIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderPhoto = ({ item }) => (
    <View style={styles.photoSlide}>
      <Image source={{ uri: item }} style={styles.image} />
    </View>
  );

  return (
    <LinearGradient
      colors={['#F5D547', '#FF9966']}
      style={styles.gradient}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          {photos.length > 0 ? (
            <View style={styles.carouselContainer}>
              <FlatList
                ref={flatListRef}
                data={photos}
                renderItem={renderPhoto}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
              />
              
              {photos.length > 1 && (
                <View style={styles.photoIndicator}>
                  <Text style={styles.photoIndicatorText}>
                    {currentPhotoIndex + 1} / {photos.length}
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.favoriteIcon} onPress={handleFavorite}>
                <MaterialCommunityIcons 
                  name={isFavorite ? "heart" : "heart-outline"} 
                  size={28} 
                  color={isFavorite ? "#FF6B35" : "#666"} 
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.imagePlaceholder}>
                <MaterialCommunityIcons name="dog" size={60} color="#999" />
                <Text style={styles.imageText}>Pas d'image</Text>
              </View>
              <TouchableOpacity style={styles.favoriteIcon} onPress={handleFavorite}>
                <MaterialCommunityIcons 
                  name={isFavorite ? "heart" : "heart-outline"} 
                  size={28} 
                  color={isFavorite ? "#FF6B35" : "#666"} 
                />
              </TouchableOpacity>
            </View>
          )}

          {/* BADGES */}
          <View style={styles.badgesContainer}>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="check-decagram" size={14} color="#06D6A0" />
              <Text style={styles.badgeText}>Vérifié</Text>
            </View>
          </View>

          {/* INFOS AVEC ICÔNES */}
          <View style={styles.dogInfo}>
            <Text style={styles.dogName}>{dog.dogName}</Text>
            
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="dog" size={18} color="#6B7280" />
              <Text style={styles.infoText}>{dog.breed}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="cake-variant" size={18} color="#6B7280" />
              <Text style={styles.infoText}>{dog.age}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="gender-male-female" size={18} color="#6B7280" />
              <Text style={styles.infoText}>{dog.gender}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="heart-outline" size={18} color="#FF6B35" />
              <Text style={styles.infoPurpose}>{dog.purpose}</Text>
            </View>

            {dog.pedigree && dog.pedigree !== "Non précisé" && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="certificate" size={18} color="#6B7280" />
                <Text style={styles.infoText}>Pedigree: {dog.pedigree}</Text>
              </View>
            )}

            {dog.contest === "Oui" && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="trophy" size={18} color="#FFB84D" />
                <Text style={styles.infoText}>{dog.result || "Concours"}</Text>
              </View>
            )}

            {dog.description && (
              <Text style={styles.description}>{dog.description}</Text>
            )}
          </View>

          {/* BOUTONS */}
          <View style={styles.dogActions}>
            <TouchableOpacity style={styles.likeButtonOutline} onPress={handleFavorite}>
              <MaterialCommunityIcons 
                name={isFavorite ? "heart" : "heart-outline"} 
                size={22} 
                color="#FF6B35" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.chatButtonContainer} onPress={handleContact}>
              <LinearGradient
                colors={['#06D6A0', '#059669']}
                style={styles.chatButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="message-text-outline" size={18} color="#FFF" />
                <Text style={styles.chatText}>Contacter</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  carouselContainer: {
    width: "100%",
    height: 240,
    marginBottom: 12,
    position: "relative",
  },
  photoSlide: {
    width: width - 64,
    height: 240,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: "100%",
    height: 240,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  imageText: {
    color: "#999",
    marginTop: 8,
    fontSize: 14,
  },
  photoIndicator: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  photoIndicatorText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  favoriteIcon: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: "#FFF",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  badgesContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1D",
  },
  dogInfo: {
    marginBottom: 16,
  },
  dogName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1D",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  infoText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1A1A1D",
  },
  infoPurpose: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FF6B35",
  },
  description: {
    fontSize: 15,
    color: "#6B7280",
    marginTop: 12,
    lineHeight: 22,
  },
  dogActions: {
    flexDirection: "row",
    gap: 12,
  },
  likeButtonOutline: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  chatButtonContainer: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
  },
  chatButtonGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chatText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 17,
  },
});