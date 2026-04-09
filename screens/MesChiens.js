import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../components/ScreenLayout";
import { auth, db } from "../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import PremiumBadge from "../components/PremiumBadge";
import i18n from "../utils/i18n";

const { width } = Dimensions.get("window");

export default function MesChiens({ navigation }) {
  const [myDogs, setMyDogs] = useState([]);
  const [loadingDogs, setLoadingDogs] = useState(true);
  const [userCity, setUserCity] = useState("");
  const [abonnement, setAbonnement] = useState("gratuit");

  useEffect(() => {
    loadMyDogs();
    loadUserCity();
    loadUserAbonnement();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadMyDogs();
      loadUserAbonnement();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserCity = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const profilesRef = collection(db, "profiles");
      const q = query(profilesRef, where("uid", "==", user.uid));
      const profileSnap = await getDocs(q);
      
      if (!profileSnap.empty) {
        setUserCity(profileSnap.docs[0].data().city || "");
      }
    } catch (error) {
      console.log("Erreur chargement ville:", error);
    }
  };

  const loadUserAbonnement = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const profilesRef = collection(db, "profiles");
      const q = query(profilesRef, where("uid", "==", user.uid));
      const profileSnap = await getDocs(q);
      
      if (!profileSnap.empty) {
        setAbonnement(profileSnap.docs[0].data().abonnement || "gratuit");
      }
    } catch (error) {
      console.log("Erreur chargement abonnement:", error);
    }
  };

  const loadMyDogs = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const dogsRef = collection(db, "users", user.uid, "dogs");
      const dogsSnap = await getDocs(dogsRef);
      const dogs = dogsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMyDogs(dogs);
    } catch (error) {
      console.log("Erreur chargement chiens:", error);
    } finally {
      setLoadingDogs(false);
    }
  };

  const renderDog = ({ item }) => (
    <TouchableOpacity
      style={styles.dogCard}
      onPress={() => navigation.navigate("DetailsChien", { dog: { ...item, ownerId: auth.currentUser.uid } })}
      activeOpacity={0.7}
    >
      <View style={styles.dogCardMain}>
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.dogCardImage} />
        ) : (
          <View style={styles.dogCardPlaceholder}>
            <MaterialCommunityIcons name="dog" size={50} color="#999" />
          </View>
        )}
        
        <View style={styles.dogCardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.dogCardName}>{item.dogName}</Text>
            <PremiumBadge abonnement={abonnement} size="small" />
          </View>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="dog" size={14} color="#6B7280" />
            <Text style={styles.dogCardDetail}>{item.breed}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="cake-variant" size={14} color="#6B7280" />
            <Text style={styles.dogCardDetail}>{item.age} {i18n.t("years_old")}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="heart-outline" size={14} color="#FF6B35" />
            <Text style={styles.dogCardPurpose}>{item.purpose}</Text>
          </View>
        </View>

        <View style={styles.dogCardActions}>
          <View style={styles.locationContainer}>
            <MaterialCommunityIcons name="map-marker" size={16} color="#FF6B35" />
            <Text style={styles.dogCardCity}>{userCity || i18n.t("city")}</Text>
          </View>
          
          <View style={styles.separatorVertical} />
          
          <TouchableOpacity
            style={styles.actionIcon}
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate("ModifierChien", { dog: item });
            }}
          >
            <MaterialCommunityIcons name="pencil" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenLayout title={i18n.t("my_dogs")} navigation={navigation} active="paw">
      <View style={styles.container}>
        {loadingDogs ? (
          <Text style={styles.loadingText}>{i18n.t("loading")}</Text>
        ) : myDogs.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="dog" size={80} color="#D1D5DB" />
            <Text style={styles.emptyText}>{i18n.t("no_dogs")}</Text>
            <Text style={styles.emptySubtext}>{i18n.t("add_first_dog")}</Text>
          </View>
        ) : (
          <FlatList
            data={myDogs}
            keyExtractor={(item) => item.id}
            renderItem={renderDog}
            contentContainerStyle={styles.list}
          />
        )}

        <TouchableOpacity
          style={styles.addButtonContainer}
          onPress={() => navigation.navigate("AjouterChien")}
        >
          <LinearGradient
            colors={['#FFA85C', '#FF6A3D', '#F15156', '#E91E63']}
            style={styles.addButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#fff" />
            <Text style={styles.addButtonText}>{i18n.t("add_new_dog")}</Text>
          </LinearGradient>
        </TouchableOpacity>
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
    color: "#6B7280",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1D",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  list: {
    paddingBottom: 100,
  },
  dogCard: {
    backgroundColor: "#F5F5F7",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  dogCardMain: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
  },
  dogCardImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 12,
  },
  dogCardPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dogCardInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  dogCardName: {
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
  dogCardDetail: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  dogCardPurpose: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF6B35",
  },
  dogCardActions: {
    flexDirection: "column",
    alignItems: "center",
    marginLeft: 8,
  },
  locationContainer: {
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: 4,
  },
  dogCardCity: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FF6B35",
    marginTop: 2,
  },
  separatorVertical: {
    width: 24,
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 6,
  },
  actionIcon: {
    padding: 8,
  },
  addButtonContainer: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});