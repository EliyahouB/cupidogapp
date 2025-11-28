import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
} from "react-native";
import { auth, db } from "../config/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import ScreenLayout from "../components/ScreenLayout";

export default function Likes({ navigation }) {
  const [favoriteDogs, setFavoriteDogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadFavorites();
    });
    return unsubscribe;
  }, [navigation]);

  const loadFavorites = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      console.log("=== CHARGEMENT FAVORIS ===");
      
      // 1. Charge tous les likes de l'utilisateur
      const likesQuery = query(
        collection(db, "likes"),
        where("fromUserId", "==", user.uid)
      );
      const likesSnap = await getDocs(likesQuery);
      
      console.log("Nombre de likes:", likesSnap.size);

      // 2. Pour chaque like, charge le chien correspondant
      const dogsPromises = likesSnap.docs.map(async (likeDoc) => {
        const likeData = likeDoc.data();
        const { toDogId, toOwnerId } = likeData;

        console.log("  → Like vers:", toDogId, "owner:", toOwnerId);

        try {
          // Charge le chien depuis users/{ownerId}/dogs/{dogId}
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
      
      console.log("TOTAL chiens favoris:", validDogs.length);
      setFavoriteDogs(validDogs);
    } catch (error) {
      console.log("Erreur chargement favoris:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderDog = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("DetailsChien", { dog: item })}
    >
      {item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageText}>Pas d'image</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{item.dogName}</Text>
        <Text style={styles.detail}>Race : {item.breed}</Text>
        <Text style={styles.detail}>Âge : {item.age} ans</Text>
        <Text style={styles.detail}>{item.purpose}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenLayout title="Favoris" navigation={navigation} active="likes">
      <View style={styles.container}>
        {loading ? (
          <Text style={styles.loadingText}>Chargement...</Text>
        ) : favoriteDogs.length === 0 ? (
          <Text style={styles.emptyText}>Aucun favori pour le moment</Text>
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
    color: "#ccc",
    textAlign: "center",
    marginTop: 40,
  },
  emptyText: {
    color: "#ccc",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  list: {
    paddingBottom: 100,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#444",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  imageText: {
    color: "#aaa",
    fontSize: 12,
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  detail: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 2,
  },
});