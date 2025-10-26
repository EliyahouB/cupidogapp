import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import ScreenLayout from "../components/ScreenLayout";
import { db } from "../config/firebase";
import { collectionGroup, query, where, getDocs } from "firebase/firestore";

export default function ListeChiens({ route, navigation }) {
  const { purpose } = route.params;
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDogs = async () => {
      try {
        const q = query(
          collectionGroup(db, "dogs"),
          where("purpose", "==", purpose)
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setDogs(results);
      } catch (error) {
        setDogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDogs();
  }, [purpose]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("FicheChien", item)}
    >
      {item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageText}>Pas d'image</Text>
        </View>
      )}
      <Text style={styles.name}>{item.dogName}</Text>
      <Text style={styles.details}>{item.breed}</Text>
      <Text style={styles.details}>{item.city}</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenLayout title={`Chiens - ${purpose}`} navigation={navigation}>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#ff914d" />
        </View>
      ) : dogs.length === 0 ? (
        <View style={styles.loader}>
          <Text style={styles.empty}>Aucun chien trouvé</Text>
        </View>
      ) : (
        <FlatList
          data={dogs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.list}
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 12,
  },
  card: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    margin: 8,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: 120,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    backgroundColor: "#444",
    justifyContent: "center",
    alignItems: "center",
  },
  imageText: {
    color: "#aaa",
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 8,
  },
  details: {
    fontSize: 14,
    color: "#ccc",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    color: "#fff",
    fontSize: 16,
  },
});
