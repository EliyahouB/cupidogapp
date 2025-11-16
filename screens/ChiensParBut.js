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
  getDoc,
  doc,
} from "firebase/firestore";
import * as Location from "expo-location";
import ScreenLayout from "../components/ScreenLayout";
import FiltreModal from "../components/FiltreModal";

export default function ChiensParBut({ route, navigation }) {
  const { purpose } = route.params;
  const [dogs, setDogs] = useState([]);
  const [filteredDogs, setFilteredDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [abonnement, setAbonnement] = useState("gratuit");

  const [filters, setFilters] = useState({
    minAge: 1,
    maxAge: 15,
    breed: "",
    breedText: "",
    pedigreeOnly: false,
    distance: 1000,
  });

  useEffect(() => {
    const fetchDogs = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setAbonnement(userSnap.data().abonnement || "gratuit");
        }

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
        setFilteredDogs(allDogs);
      } catch (error) {
        alert("Erreur lors du chargement des chiens.");
      } finally {
        setLoading(false);
      }
    };

    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation(location.coords);
        }
      } catch (error) {
        console.log("Erreur GPS :", error);
      }
    };

    fetchDogs();
    getLocation();
  }, [purpose]);

  const applyFilters = () => {
    const filtered = dogs.filter((dog) => {
      const age = parseInt(dog.age);
      const breedMatch =
        filters.breed === "" ||
        dog.breed === filters.breed ||
        dog.breed?.toLowerCase().includes(filters.breedText.toLowerCase());

      const pedigreeMatch = !filters.pedigreeOnly || dog.pedigree;

      const ageMatch = age >= filters.minAge && age <= filters.maxAge;

      let distanceMatch = true;
      if (userLocation && dog.location) {
        const toRad = (value) => (value * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(dog.location.lat - userLocation.latitude);
        const dLon = toRad(dog.location.lon - userLocation.longitude);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(userLocation.latitude)) *
            Math.cos(toRad(dog.location.lat)) *
            Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        distanceMatch = distance <= filters.distance;
      }

      return ageMatch && breedMatch && pedigreeMatch && distanceMatch;
    });

    setFilteredDogs(filtered);
    setShowFilters(false);
  };

  const handleLike = async (dogId, ownerId) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await addDoc(collection(db, "likes"), {
        fromUserId: user.uid,
        toDogId: dogId,
        createdAt: new Date(),
      });

      alert("Like enregistré !");
    } catch (error) {
      alert("Erreur lors du like.");
    }
  };

  const renderItem = ({ item }) => (
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
    </TouchableOpacity>
  );

  return (
    <ScreenLayout
      title={`Chiens - ${purpose}`}
      navigation={navigation}
      rightIcon="filter"
      onRightPress={() => setShowFilters(true)}
    >
      <View style={{ flex: 1 }}>
        {loading ? (
          <Text style={styles.loading}>Chargement...</Text>
        ) : filteredDogs.length === 0 ? (
          <Text style={styles.loading}>Aucun chien trouvé</Text>
        ) : (
          <FlatList
            data={filteredDogs}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            numColumns={2}
          />
        )}

        <FiltreModal
          visible={showFilters}
          onClose={() => setShowFilters(false)}
          onApply={applyFilters}
          filters={filters}
          setFilters={setFilters}
          isPremium={abonnement !== "gratuit"}
        />
      </View>
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
