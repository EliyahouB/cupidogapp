import React, { useState, useCallback } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import { auth, db } from "../config/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  collectionGroup,
  deleteDoc,
  doc,
} from "firebase/firestore";
import * as Location from "expo-location";
import ScreenLayout from "../components/ScreenLayout";
import FiltreModal from "../components/FiltreModal";
import PremiumBadge from "../components/PremiumBadge";

const { width } = Dimensions.get("window");

export default function ChiensParBut({ route, navigation }) {
  const { purpose } = route.params;
  const [dogs, setDogs] = useState([]);
  const [filteredDogs, setFilteredDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [abonnement, setAbonnement] = useState("gratuit");
  const [likedDogs, setLikedDogs] = useState([]);
  const [ownersAbonnements, setOwnersAbonnements] = useState({});

  const [filters, setFilters] = useState({
    minAge: 1,
    maxAge: 15,
    breed: "",
    breedText: "",
    pedigreeOnly: false,
    distance: 1000,
  });

  useFocusEffect(
    useCallback(() => {
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
          const ownerIds = new Set();

          dogsSnap.forEach((dogDoc) => {
            const dogData = dogDoc.data();
            const ownerId = dogDoc.ref.parent.parent.id;
            
            if (ownerId === currentUser.uid) return;
            
            ownerIds.add(ownerId);
            allDogs.push({
              id: dogDoc.id,
              ownerId: ownerId,
              ...dogData,
            });
          });

          // Charger les abonnements des propriétaires
          const ownersAbonnementsMap = {};
          const profilesQuery = collection(db, "profiles");
          const allProfiles = await getDocs(profilesQuery);
          
          allProfiles.forEach((profileDoc) => {
            const profileData = profileDoc.data();
            if (ownerIds.has(profileData.uid)) {
              ownersAbonnementsMap[profileData.uid] = profileData.abonnement || "gratuit";
            }
          });

          setOwnersAbonnements(ownersAbonnementsMap);
          setDogs(allDogs);
          setFilteredDogs(allDogs);

          // RECHARGER LES LIKES À CHAQUE FOCUS
          const likesQuery = query(
            collection(db, "likes"),
            where("fromUserId", "==", currentUser.uid)
          );
          const likesSnap = await getDocs(likesQuery);
          const liked = likesSnap.docs.map(doc => doc.data().toDogId);
          setLikedDogs(liked);
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
    }, [purpose])
  );

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

    const isAlreadyLiked = likedDogs.includes(dogId);

    if (isAlreadyLiked) {
      // UNLIKER
      try {
        const likesRef = collection(db, "likes");
        const q = query(
          likesRef,
          where("fromUserId", "==", user.uid),
          where("toDogId", "==", dogId)
        );
        const likesSnap = await getDocs(q);
        
        if (!likesSnap.empty) {
          const likeDoc = likesSnap.docs[0];
          await deleteDoc(doc(db, "likes", likeDoc.id));
          setLikedDogs(likedDogs.filter(id => id !== dogId));
          alert("Retiré des favoris !");
        }
      } catch (error) {
        console.log("Erreur unlike:", error);
        alert("Erreur lors du retrait.");
      }
    } else {
      // LIKER
      try {
        await addDoc(collection(db, "likes"), {
          fromUserId: user.uid,
          toDogId: dogId,
          toOwnerId: ownerId,
          createdAt: new Date(),
        });
        setLikedDogs([...likedDogs, dogId]);
        alert("Ajouté aux favoris !");
      } catch (error) {
        console.log("Erreur like:", error);
        alert("Erreur lors du like.");
      }
    }
  };

  const renderItem = ({ item }) => {
    const isLiked = likedDogs.includes(item.id);
    const ownerAbonnement = ownersAbonnements[item.ownerId] || "gratuit";

    return (
      <View style={styles.card}>
        <View 
          style={styles.likeButton}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            onPress={() => {
              console.log("LIKE CLIQUÉ !", item.id);
              handleLike(item.id, item.ownerId);
            }}
            activeOpacity={0.7}
          >
            {isLiked ? (
              <LinearGradient
                colors={['#FFA85C', '#FF6A3D', '#F15156', '#E91E63']}
                style={styles.likeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons 
                  name="heart" 
                  size={28} 
                  color="#FFF"
                />
              </LinearGradient>
            ) : (
              <View style={styles.likeContainer}>
                <MaterialCommunityIcons 
                  name="heart-outline" 
                  size={28} 
                  color="#FF6B35"
                />
              </View>
            )}
          </TouchableOpacity>
        </View>

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
          </View>
        </TouchableOpacity>
      </View>
    );
  };

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
  likeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
  },
  likeContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  likeGradient: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
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
});