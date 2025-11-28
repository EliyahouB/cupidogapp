import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../components/ScreenLayout";
import { auth, db } from "../config/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export default function MesChiens({ navigation }) {
  const [myDogs, setMyDogs] = useState([]);
  const [loadingDogs, setLoadingDogs] = useState(true);
  const [userCity, setUserCity] = useState("");

  useEffect(() => {
    loadMyDogs();
    loadUserCity();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadMyDogs();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserCity = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const profilesRef = collection(db, "profiles");
      const profilesSnap = await getDocs(profilesRef);
      const profileDoc = profilesSnap.docs.find(
        (doc) => doc.data().uid === user.uid
      );
      if (profileDoc) {
        setUserCity(profileDoc.data().city || "");
      }
    } catch (error) {
      console.log("Erreur chargement ville:", error);
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
      onPress={() => navigation.navigate("DetailsChien", { dog: item })}
      activeOpacity={0.7}
    >
      <View style={styles.dogCardMain}>
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.dogCardImage} />
        ) : (
          <View style={styles.dogCardPlaceholder}>
            <MaterialCommunityIcons name="dog" size={40} color="#aaa" />
          </View>
        )}
        <View style={styles.dogCardInfo}>
          <Text style={styles.dogCardName}>{item.dogName}</Text>
          <Text style={styles.dogCardDetail}>
            {item.breed} - {item.age} ans
          </Text>
          <Text style={styles.dogCardDetail}>{item.purpose}</Text>
        </View>
      </View>

      <View style={styles.dogCardFooter}>
        <View style={styles.dogCardLocation}>
          <MaterialCommunityIcons
            name="map-marker"
            size={18}
            color="#ff914d"
          />
          <Text style={styles.dogCardCity}>{userCity || "Ville"}</Text>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate("ModifierChien", { dog: item });
          }}
        >
          <MaterialCommunityIcons name="pencil" size={18} color="#999" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenLayout title="Mes Chiens" navigation={navigation} active="paw">
      <View style={styles.container}>
        {loadingDogs ? (
          <Text style={styles.loadingText}>Chargement...</Text>
        ) : myDogs.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="dog" size={80} color="#444" />
            <Text style={styles.emptyText}>Aucun chien enregistré</Text>
            <Text style={styles.emptySubtext}>
              Ajoutez votre premier compagnon !
            </Text>
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
          style={styles.addButton}
          onPress={() => navigation.navigate("AjouterChien")}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Ajouter un nouveau chien</Text>
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
    color: "#ccc",
    textAlign: "center",
    marginTop: 40,
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
    color: "#fff",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
  },
  list: {
    paddingBottom: 100,
  },
  dogCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  dogCardMain: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dogCardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  dogCardPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#444",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dogCardInfo: {
    flex: 1,
    justifyContent: "center",
  },
  dogCardName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  dogCardDetail: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 2,
  },
  dogCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#444",
  },
  dogCardLocation: {
    flexDirection: "row",
    alignItems: "center",
  },
  dogCardCity: {
    fontSize: 13,
    color: "#ff914d",
    marginLeft: 4,
  },
  editButton: {
    padding: 6,
  },
  addButton: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#ff914d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});