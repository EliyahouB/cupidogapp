import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { httpsCallable } from "firebase/functions";
import Slider from "@react-native-community/slider";
import { auth, db, functions } from "../config/firebase";
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
import i18n from "../utils/i18n";
import { formatDogAge, getDogAgeMonths } from "../utils/dogAge";

const { width } = Dimensions.get("window");

async function requestCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return location.coords;
}

function getDistanceMeters(origin, destination) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(origin.latitude)) *
    Math.cos(toRadians(destination.latitude)) *
    Math.sin(longitudeDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export default function ChiensParBut({ route, navigation }) {
  const { purpose } = route.params;
  const isMeetup = purpose === "Rencontre";
  const [dogs, setDogs] = useState([]);
  const [filteredDogs, setFilteredDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [abonnement, setAbonnement] = useState("gratuit");
  const [likedDogs, setLikedDogs] = useState([]);
  const [ownersAbonnements, setOwnersAbonnements] = useState({});
  const [activeTab, setActiveTab] = useState("dogs");
  const [parkRadius, setParkRadius] = useState(2000);
  const [parks, setParks] = useState([]);
  const [parksLoading, setParksLoading] = useState(false);
  const [parksError, setParksError] = useState("");

  const [filters, setFilters] = useState({
    minAge: 0,
    maxAge: 15,
    breed: "",
    breedText: "",
    pedigreeOnly: false,
    distance: 1000,
  });

  const loadNearbyParks = async (radiusMeters = parkRadius) => {
    setParksLoading(true);
    setParksError("");

    try {
      const coords = userLocation || await requestCurrentLocation();
      if (!coords) {
        setParksError(i18n.t("location_permission_required"));
        return;
      }
      setUserLocation(coords);

      const findNearbyParks = httpsCallable(functions, "findNearbyParks");
      const result = await findNearbyParks({
        latitude: coords.latitude,
        longitude: coords.longitude,
        radiusMeters,
        languageCode: i18n.locale,
      });

      const nearbyParks = (result.data || [])
        .map((park) => ({
          ...park,
          distanceMeters: getDistanceMeters(coords, {
            latitude: park.latitude,
            longitude: park.longitude,
          }),
        }))
        .filter((park) => park.distanceMeters <= radiusMeters)
        .sort((first, second) => first.distanceMeters - second.distanceMeters);
      setParks(nearbyParks);
    } catch (error) {
      console.error("Erreur recherche de parcs:", error);
      setParksError(error.code === "functions/failed-precondition"
        ? i18n.t("parks_not_configured")
        : i18n.t("parks_load_error"));
    } finally {
      setParksLoading(false);
    }
  };

  const openParksTab = async () => {
    setActiveTab("parks");
    await loadNearbyParks();
  };

  const openParkInMaps = async (park) => {
    const mapsUrl = park.mapsUrl ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(park.name)}`;
    try {
      await Linking.openURL(mapsUrl);
    } catch (error) {
      console.error("Erreur ouverture Google Maps:", error);
    }
  };

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

          const likesQuery = query(
            collection(db, "likes"),
            where("fromUserId", "==", currentUser.uid)
          );
          const likesSnap = await getDocs(likesQuery);
          const liked = likesSnap.docs.map(doc => doc.data().toDogId);
          setLikedDogs(liked);
        } catch (error) {
          console.log("Erreur chargement chiens:", error);
          alert(i18n.t("error_loading_dogs"));
        } finally {
          setLoading(false);
        }
      };

      const getLocation = async () => {
        try {
          const coords = await requestCurrentLocation();
          if (coords) setUserLocation(coords);
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
      const ageMonths = getDogAgeMonths(dog);
      const breedMatch =
        filters.breed === "" ||
        dog.breed === filters.breed ||
        dog.breed?.toLowerCase().includes(filters.breedText.toLowerCase());

      const pedigreeMatch = !filters.pedigreeOnly || dog.pedigree === "Oui";
      const ageMatch = ageMonths !== null &&
        ageMonths >= filters.minAge * 12 &&
        ageMonths <= filters.maxAge * 12;

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
          alert(i18n.t("removed_from_favorites"));
        }
      } catch (error) {
        console.log("Erreur unlike:", error);
        alert(i18n.t("error_removing"));
      }
    } else {
      try {
        await addDoc(collection(db, "likes"), {
          fromUserId: user.uid,
          toDogId: dogId,
          toOwnerId: ownerId,
          createdAt: new Date(),
        });
        setLikedDogs([...likedDogs, dogId]);
        alert(i18n.t("added_to_favorites"));
      } catch (error) {
        console.log("Erreur like:", error);
        alert(i18n.t("error_liking"));
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
              <Text style={styles.detail}>{formatDogAge(item, i18n.locale)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScreenLayout
      title={isMeetup ? i18n.t("park_meetups") : `${i18n.t("dogs")} - ${purpose}`}
      navigation={navigation}
      showBack={true}
      rightIcon={!isMeetup || activeTab === "dogs" ? "filter" : null}
      onRightPress={() => setShowFilters(true)}
    >
      <View style={{ flex: 1 }}>
        {isMeetup && (
          <View style={styles.tabs}>
            <TouchableOpacity
              style={styles.tabButton}
              activeOpacity={0.85}
              onPress={() => setActiveTab("dogs")}
            >
              {activeTab === "dogs" ? (
                <LinearGradient colors={["#FF6B35", "#E91E63"]} style={styles.activeTab}>
                  <MaterialCommunityIcons name="dog" size={18} color="#FFF" />
                  <Text style={styles.activeTabText}>{i18n.t("meetup_dogs")}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveTab}>
                  <MaterialCommunityIcons name="dog" size={18} color="#6B7280" />
                  <Text style={styles.inactiveTabText}>{i18n.t("meetup_dogs")}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tabButton}
              activeOpacity={0.85}
              onPress={openParksTab}
            >
              {activeTab === "parks" ? (
                <LinearGradient colors={["#FF6B35", "#E91E63"]} style={styles.activeTab}>
                  <MaterialCommunityIcons name="map-marker-radius" size={18} color="#FFF" />
                  <Text style={styles.activeTabText}>{i18n.t("parks_nearby")}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveTab}>
                  <MaterialCommunityIcons name="map-marker-radius" size={18} color="#6B7280" />
                  <Text style={styles.inactiveTabText}>{i18n.t("parks_nearby")}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {!isMeetup || activeTab === "dogs" ? (
          <>
            {loading ? (
              <Text style={styles.loading}>{i18n.t("loading")}</Text>
            ) : filteredDogs.length === 0 ? (
              <Text style={styles.loading}>{i18n.t("no_dogs_found")}</Text>
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
          </>
        ) : (
          <View style={styles.parksContainer}>
            <View style={styles.radiusControl}>
              <View style={styles.radiusHeader}>
                <Text style={styles.radiusLabel}>{i18n.t("search_radius")}</Text>
                <LinearGradient
                  colors={["#FF6B35", "#E91E63"]}
                  style={styles.radiusValueBadge}
                >
                  <Text style={styles.radiusValue}>{Math.round(parkRadius / 1000)} km</Text>
                </LinearGradient>
              </View>
              <Slider
                style={styles.radiusSlider}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={parkRadius / 1000}
                onValueChange={(value) => setParkRadius(Math.round(value) * 1000)}
                onSlidingComplete={(value) => loadNearbyParks(Math.round(value) * 1000)}
                minimumTrackTintColor="#FF6B35"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#E91E63"
              />
              <View style={styles.radiusRange}>
                <Text style={styles.radiusRangeText}>1 km</Text>
                <Text style={styles.radiusRangeText}>10 km</Text>
              </View>
            </View>

            {parksLoading ? (
              <View style={styles.parksMessage}>
                <ActivityIndicator size="large" color="#FF6B35" />
                <Text style={styles.messageText}>{i18n.t("loading_nearby_parks")}</Text>
              </View>
            ) : parksError ? (
              <View style={styles.parksMessage}>
                <MaterialCommunityIcons name="map-marker-alert-outline" size={36} color="#FF6B35" />
                <Text style={styles.messageText}>{parksError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => loadNearbyParks()}>
                  <Text style={styles.retryButtonText}>{i18n.t("retry")}</Text>
                </TouchableOpacity>
              </View>
            ) : parks.length === 0 ? (
              <View style={styles.parksMessage}>
                <MaterialCommunityIcons name="tree-outline" size={40} color="#6B7280" />
                <Text style={styles.messageText}>{i18n.t("no_nearby_parks")}</Text>
              </View>
            ) : (
              <FlatList
                data={parks}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.parkList}
                renderItem={({ item }) => (
                  <View style={styles.parkRow}>
                    <View style={styles.parkIcon}>
                      <MaterialCommunityIcons name="tree" size={22} color="#FF6B35" />
                    </View>
                    <View style={styles.parkInfo}>
                      <Text style={styles.parkName} numberOfLines={2}>{item.name}</Text>
                      <Text style={styles.parkDistance}>
                        {item.distanceMeters < 1000
                          ? `${Math.round(item.distanceMeters)} m`
                          : `${(item.distanceMeters / 1000).toFixed(1)} km`}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.mapsButton}
                      onPress={() => openParkInMaps(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`${i18n.t("open_in_maps")}: ${item.name}`}
                    >
                      <MaterialCommunityIcons name="map-outline" size={19} color="#FFF" />
                      <Text style={styles.mapsButtonText}>{i18n.t("open_in_maps")}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        )}
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
  tabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 4,
    backgroundColor: "#F5F5F7",
    borderRadius: 14,
  },
  tabButton: {
    flex: 1,
  },
  activeTab: {
    minHeight: 44,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 8,
  },
  inactiveTab: {
    minHeight: 44,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 8,
  },
  activeTabText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  inactiveTabText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },
  parksContainer: {
    flex: 1,
  },
  radiusControl: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F1F1F3",
    shadowColor: "#1A1A1D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  radiusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  radiusLabel: {
    color: "#003366",
    fontSize: 14,
    fontWeight: "700",
  },
  radiusValue: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  radiusValueBadge: {
    minWidth: 68,
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  radiusSlider: {
    width: "100%",
    height: 28,
  },
  radiusRange: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -8,
  },
  radiusRangeText: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
  },
  parkList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  parkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: "#F5F5F7",
  },
  parkIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  parkInfo: {
    flex: 1,
    gap: 4,
  },
  parkName: {
    color: "#1A1A1D",
    fontSize: 15,
    fontWeight: "700",
  },
  parkDistance: {
    color: "#6B7280",
    fontSize: 13,
  },
  mapsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#FF6B35",
  },
  mapsButtonText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  parksMessage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 28,
  },
  messageText: {
    color: "#6B7280",
    fontSize: 15,
    textAlign: "center",
  },
  retryButton: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#FF6B35",
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
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