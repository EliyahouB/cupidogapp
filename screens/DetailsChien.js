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
import { auth, db } from "../config/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

const { width } = Dimensions.get("window");

export default function DetailsChien({ route, navigation }) {
  const { dog } = route.params;
  const user = auth.currentUser;
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const flatListRef = useRef(null);

  // Prépare le tableau de photos (rétrocompatibilité)
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
    <ScrollView contentContainerStyle={styles.container}>
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
            <Text style={{ fontSize: 28 }}>
              {isFavorite ? "❤️" : "🤍"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imageText}>Pas d'image</Text>
          </View>
          <TouchableOpacity style={styles.favoriteIcon} onPress={handleFavorite}>
            <Text style={{ fontSize: 28 }}>
              {isFavorite ? "❤️" : "🤍"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.name}>{dog.dogName}</Text>
      <Text style={styles.detail}>Race : {dog.breed}</Text>
      <Text style={styles.detail}>Âge : {dog.age}</Text>
      <Text style={styles.detail}>Sexe : {dog.gender}</Text>
      <Text style={styles.detail}>But : {dog.purpose}</Text>
      <Text style={styles.detail}>Pedigree : {dog.pedigree || "Non précisé"}</Text>
      <Text style={styles.detail}>Concours : {dog.contest}</Text>
      {dog.contest === "Oui" && (
        <Text style={styles.detail}>Résultat : {dog.result || "Non précisé"}</Text>
      )}
      <Text style={styles.description}>{dog.description}</Text>

      <TouchableOpacity
        style={styles.chatButton}
        onPress={() =>
          navigation.navigate("Chat", {
            ownerId: dog.ownerId,
            dogName: dog.dogName,
          })
        }
      >
        <Text style={styles.chatText}>💬 Contacter le propriétaire</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
    backgroundColor: "#111",
    alignItems: "center",
  },
  carouselContainer: {
    width: width - 32,
    height: 240,
    marginBottom: 12,
    position: "relative",
  },
  photoSlide: {
    width: width - 32,
    height: 240,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: width - 32,
    height: 240,
    borderRadius: 12,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  imageText: {
    color: "#aaa",
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
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  detail: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 4,
  },
  description: {
    fontSize: 16,
    color: "#ddd",
    marginVertical: 12,
    textAlign: "center",
  },
  chatButton: {
    backgroundColor: "#42A5F5",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  chatText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});