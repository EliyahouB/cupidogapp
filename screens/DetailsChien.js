import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { auth, db } from "../config/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

export default function DetailsChien({ route, navigation }) {
  const { dog } = route.params;
  const user = auth.currentUser;
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const checkFavorite = async () => {
      if (!user) return;
      const favQuery = query(
        collection(db, "favorites"),
        where("fromUserId", "==", user.uid),
        where("toDogId", "==", dog.id)
      );
      const favSnap = await getDocs(favQuery);
      setIsFavorite(!favSnap.empty);
    };

    checkFavorite();
  }, [dog.id]);

  const handleFavorite = async () => {
    if (!user) return;

    try {
      await addDoc(collection(db, "favorites"), {
        fromUserId: user.uid,
        toDogId: dog.id,
        createdAt: new Date(),
      });
      setIsFavorite(true);
      alert("Ajouté aux favoris !");
    } catch (error) {
      alert("Erreur lors de l'ajout aux favoris.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {dog.photoUrl ? (
        <Image source={{ uri: dog.photoUrl }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageText}>Pas d'image</Text>
        </View>
      )}

      <TouchableOpacity style={styles.favoriteIcon} onPress={handleFavorite}>
        <Text style={{ fontSize: 28 }}>
          {isFavorite ? "❤️" : "🤍"}
        </Text>
      </TouchableOpacity>

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
  image: {
    width: "100%",
    height: 240,
    borderRadius: 12,
    marginBottom: 12,
  },
  imagePlaceholder: {
    width: "100%",
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
  favoriteIcon: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
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
