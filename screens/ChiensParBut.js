import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
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
  addDoc,
  collectionGroup,
  serverTimestamp,
} from "firebase/firestore";
import * as Location from "expo-location";
import ScreenLayout from "../components/ScreenLayout";
import FiltreModal from "../components/FiltreModal";

const { width } = Dimensions.get("window");

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
        const profilesRef = collection(db, "profiles");
        const q = query(profilesRef, where("uid", "==", currentUser.uid));
        const profileSnap = await getDocs(q);
        
        if (!profileSnap.empty) {
          const userAbonnement = profileSnap.docs[0].data().abonnement || "gratuit";
          setAbonnement(userAbonnement);
        }

        const dogsQuery = query(
          collectionGroup(db, "dogs"),
          where("purpose", "==", purpose)
        );
        const dogsSnap = await getDocs(dogsQuery);
        
        const allDogs = [];

        dogsSnap.forEach((dogDoc) => {
          const dogData = dogDoc.data();
          const ownerId = dogDoc.ref.parent.parent.id;
          
          if (ownerId === currentUser.uid) return;
          
          allDogs.push({
            id: dogDoc.id,
            ownerId: ownerId,
            ...dogData,
          });
        });

        setDogs(allDogs);
        setFilteredDogs(allDogs);
      } catch (error) {
        console.log("Erreur chargement chiens:", error);
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

      const pedigreeMatch = !filters.pedigreeOnly || dog.pedigree === "Oui";
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
        toOwnerId: ownerId,
        createdAt: new Date(),
      });
      alert("Ajouté aux favoris !");
    } catch (error) {
      console.log("Erreur like:", error);
      alert("Erreur lors du like.");
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* CŒUR STYLE INSTAGRAM */}
      <TouchableOpacity
        style={styles.likeButtonTop}
        onPress={() => handleLike(item.id, item.ownerId)}
      >
        <LinearGradient
          colors={['#FF8A5B', '#FF6B35', '#E85D2A']}
          style={styles.likeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons name="heart" size={22} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cardContent}
        onPress={() => navigation.navigate("DetailsChien", { dog: item })}
      >
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <MaterialCommunityIcons name="dog" size={40} color="#999" />
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.name}>{item.dogName}</Text>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="dog" size={16} color="#6B7280" />
            <Text style={styles.detail}>{item.breed}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="cake-variant" size={16} color="#6B7280" />
            <Text style={styles.detail}>{item.age} ans</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenLayout
      title={`Chiens - ${purpose}`}
      navigation={navigation}
      showBack={true}
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
    color: "#1A1A1D",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  list: {
    padding: 12,
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
    position: "relative",
  },
  likeButtonTop: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  likeGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
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
  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1D",
    marginBottom: 6,
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
});