import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import ScreenLayout from "../components/ScreenLayout";

export default function FicheChien({ route, navigation }) {
  const {
    dogName,
    breed,
    age,
    gender,
    description,
    pedigree,
    contest,
    result,
    photoUrl,
    ownerId,
  } = route.params;

  return (
    <ScreenLayout title={dogName} navigation={navigation}>
      <ScrollView contentContainerStyle={styles.container}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imageText}>Pas d'image</Text>
          </View>
        )}

        <Text style={styles.label}>Race</Text>
        <Text style={styles.value}>{breed}</Text>

        <Text style={styles.label}>Âge</Text>
        <Text style={styles.value}>{age}</Text>

        <Text style={styles.label}>Sexe</Text>
        <Text style={styles.value}>{gender}</Text>

        <Text style={styles.label}>Description</Text>
        <Text style={styles.value}>{description}</Text>

        <Text style={styles.label}>Pedigree</Text>
        <Text style={styles.value}>{pedigree}</Text>

        <Text style={styles.label}>Concours</Text>
        <Text style={styles.value}>{contest}</Text>

        {contest === "Oui" && (
          <>
            <Text style={styles.label}>Résultat</Text>
            <Text style={styles.value}>{result}</Text>
          </>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Chat", { ownerId, dogName })}
        >
          <Text style={styles.buttonText}>Contacter le propriétaire</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },
  imagePlaceholder: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#444",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  imageText: {
    color: "#aaa",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ff914d",
    alignSelf: "flex-start",
    marginTop: 12,
  },
  value: {
    fontSize: 16,
    color: "#fff",
    alignSelf: "flex-start",
  },
  button: {
    backgroundColor: "#ff914d",
    padding: 14,
    borderRadius: 8,
    marginTop: 24,
    alignItems: "center",
    alignSelf: "stretch",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
