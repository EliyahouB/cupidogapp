import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
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

export default function MesMatchs({ navigation }) {
  const [likedDogs, setLikedDogs] = useState([]);
  const [matchedDogs, setMatchedDogs] = useState([]);
  const [blockedUserIds, setBlockedUserIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const blockedQuery = query(
          collection(db, "blocked"),
          where("fromUserId", "==", user.uid)
        );
        const blockedSnap = await getDocs(blockedQuery);
        const blockedIds = blockedSnap.docs.map((doc) => doc.data().toUserId);
        setBlockedUserIds(blockedIds);

        const likesQuery = query(
          collection(db, "likes"),
          where("fromUserId", "==", user.uid)
        );
        const likesSnap = await getDocs(likesQuery);
        const likedDogIds = likesSnap.docs.map((doc) => doc.data().toDogId);

        const matchesQueryA = query(
          collection(db, "matches"),
          where("userA", "==", user.uid)
        );
        const matchesQueryB = query(
          collection(db, "matches"),
          where("userB", "==", user.uid)
        );
        const [matchSnapA, matchSnapB] = await Promise.all([
          getDocs(matchesQueryA),
          getDocs(matchesQueryB),
        ]);

        const matchedUserIds = [
          ...matchSnapA.docs.map((doc) => doc.data().userB),
          ...matchSnapB.docs.map((doc) => doc.data().userA),
        ];

        const likedDogsList = [];
        const matchedDogsList = [];

        const usersSnap = await getDocs(collection(db, "users"));
        for (const userDoc of usersSnap.docs) {
          const uid = userDoc.id;
          if (blockedIds.includes(uid)) continue;

          const dogsSnap = await getDocs(collection(db, "users", uid, "dogs"));
          dogsSnap.forEach((dogDoc) => {
            const dogData = {
              id: dogDoc.id,
              ownerId: uid,
              ...dogDoc.data(),
            };

            if (likedDogIds.includes(dogDoc.id)) {
              likedDogsList.push(dogData);
            }

            if (matchedUserIds.includes(uid)) {
              matchedDogsList.push(dogData);
            }
          });
        }

        setLikedDogs(likedDogsList);
        setMatchedDogs(matchedDogsList);
      } catch (error) {
        alert("Erreur lors du chargement.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleBlock = (ownerId) => {
    Alert.alert(
      "Bloquer cet utilisateur",
      "Souhaitez-vous vraiment le bloquer ? Ses chiens ne seront plus visibles.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Bloquer",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) return;

            try {
              await addDoc(collection(db, "blocked"), {
                fromUserId: user.uid,
                toUserId: ownerId,
                type: "bloquer",
                createdAt: new Date(),
              });
              alert("Utilisateur bloqué.");
              setBlockedUserIds((prev) => [...prev, ownerId]);
              setLikedDogs((prev) => prev.filter((dog) => dog.ownerId !== ownerId));
              setMatchedDogs((prev) => prev.filter((dog) => dog.ownerId !== ownerId));
            } catch (error) {
              alert("Erreur lors du blocage.");
            }
          },
        },
      ]
    );
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

      <TouchableOpacity
        style={styles.blockButton}
        onPress={() => handleBlock(item.ownerId)}
      >
        <Text style={styles.blockText}>🚫 Bloquer</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenLayout title="Mes Matchs & Likes" navigation={navigation}>
      {loading ? (
        <Text style={styles.loading}>Chargement...</Text>
      ) : (
        <FlatList
          ListHeaderComponent={
            <>
              <Text style={styles.section}>💞 Matchs</Text>
              {matchedDogs.length === 0 && (
                <Text style={styles.empty}>Aucun match pour le moment</Text>
              )}
            </>
          }
          data={matchedDogs}
          keyExtractor={(item) => "match-" + item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            <>
              <Text style={styles.section}>❤️ Chiens likés</Text>
              {likedDogs.length === 0 && (
                <Text style={styles.empty}>Aucun like enregistré</Text>
              )}
              <FlatList
                data={likedDogs}
                keyExtractor={(item) => "like-" + item.id}
                renderItem={renderItem}
                numColumns={2}
              />
            </>
          }
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
  section: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
    marginTop: 16,
    textAlign: "center",
  },
  empty: {
    color: "#aaa",
    textAlign: "center",
    marginBottom: 12,
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
  blockButton: {
    backgroundColor: "#ff4d4d",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  blockText: {
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
