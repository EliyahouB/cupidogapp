import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { auth, db } from "../config/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
} from "firebase/firestore";
import ScreenLayout from "../components/ScreenLayout";

export default function ChiensParBut({ route, navigation }) {
  const { purpose } = route.params;
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDogs = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const profilesRef = collection(db, "profiles");
        const profilesQuery = query(profilesRef, where("purpose", "==", purpose));
        const profilesSnap = await getDocs(profilesQuery);

        const userIds = profilesSnap.docs
          .map((doc) => doc.id)
          .filter((id) => id !== currentUser.uid);

        const allDogs = [];

        for (const uid of userIds) {
          const dogsRef = collection(db, "users", uid, "dogs");
          const dogsSnap = await getDocs(dogsRef);

          dogsSnap.forEach((dogDoc) => {
            allDogs.push({
              id: dogDoc.id,
              ownerId: uid,
              ...dogDoc.data(),
            });
          });
        }

        setDogs(allDogs);
      } catch (error) {
        alert("Erreur lors du chargement des chiens.");
      } finally {
        setLoading(false);
      }
    };

    fetchDogs();
  }, [purpose]);

  const handleLike = async (dogId, ownerId) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await addDoc(collection(db, "likes"), {
        fromUserId: user.uid,
        toDogId: dogId,
        createdAt: new Date(),
      });

      const reverseLikesQuery = query(
        collection(db, "likes"),
        where("fromUserId", "==", ownerId)
      );
      const reverseLikesSnap = await getDocs(reverseLikesQuery);

      let matchFound = false;

      reverseLikesSnap.forEach((doc) => {
        const likedDogId = doc.data().toDogId;
        if (likedDogId && likedDogId.startsWith(user.uid)) {
          matchFound = true;
        }
      });

      if (matchFound) {
        await addDoc(collection(db, "matches"), {
          userA: user.uid,
          userB: ownerId,
          createdAt: new Date(),
        });

        alert("🎉 Match trouvé !");
      } else {
        alert("Like enregistré !");
      }
    } catch (error) {
      alert("Erreur lors du like.");
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageText}>Pas d'image</Text>
        </View>
      )}
      <Text style={styles.name}>{item.dogName}</Text>
      <Text style={styles.detail}>Race : {item.breed}</Text>
      <Text style={styles.detail}>Âge : {item.age}</Text>

      <TouchableOpacity
        style={styles.likeButton}
        onPress={() => handleLike(item.id, item.ownerId)}
      >
        <Text style={styles.likeText}>❤️ Liker</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.chatButton}
        onPress={() =>
          navigation.navigate("Chat", {
            ownerId: item.ownerId,
            dogName: item.dogName,
          })
        }
      >
        <Text style={styles.chatText}>💬 Contacter</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenLayout title={`Chiens - ${purpose}`} navigation={navigation}>
      {loading ? (
        <Text style={styles.loading}>Chargement...</Text>
      ) : dogs.length === 0 ? (
        <Text style={styles.loading}>Aucun chien trouvé</Text>
      ) : (
        <FlatList
          data={dogs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          numColumns={2}
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  loading: {
    color: "#fff",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  list: {
    padding: 12,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#222",
    borderRadius: 12,
    padding: 12,
    margin: 8,
    width: "45%",
    alignItems: "center",
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: "#444",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  imageText: {
    color: "#aaa",
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  detail: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 2,
  },
  likeButton: {
    backgroundColor: "#ff914d",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  likeText: {
    color: "#fff",
    fontWeight: "bold",
  },
  chatButton: {
    backgroundColor: "#42A5F5",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  chatText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
