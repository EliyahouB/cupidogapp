import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import ScreenLayout from "../components/ScreenLayout";
import { auth, db, storage } from "../config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
} from "firebase/firestore";

export default function MesChiens({ navigation }) {
  const [dogName, setDogName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Mâle");
  const [description, setDescription] = useState("");
  const [pedigree, setPedigree] = useState("");
  const [contest, setContest] = useState("Non");
  const [result, setResult] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dogIdToLike, setDogIdToLike] = useState("");

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Utilisateur non connecté");
      return;
    }

    setLoading(true);
    let photoUrl = null;

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const abonnement = userSnap.exists() ? userSnap.data().abonnement : "gratuit";

      const dogsRef = collection(db, "users", user.uid, "dogs");
      const dogsSnap = await getDocs(dogsRef);
      const dogCount = dogsSnap.size;

      const limites = {
        gratuit: 1,
        lite: 3,
        premium: Infinity,
      };

      if (dogCount >= limites[abonnement]) {
        alert(`Limite atteinte : abonnement "${abonnement}" autorise ${limites[abonnement]} chien(s).`);
        setLoading(false);
        return;
      }

      if (imageUri) {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const filename = `dogs/${user.uid}/${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        photoUrl = await getDownloadURL(storageRef);
      }

      await addDoc(dogsRef, {
        dogName,
        breed,
        age,
        gender,
        description,
        pedigree,
        contest,
        result: contest === "Oui" ? result : "",
        photoUrl,
        createdAt: new Date(),
      });

      alert("Chien enregistré !");
    } catch (error) {
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    const user = auth.currentUser;
    if (!user || !dogIdToLike) {
      alert("Sélectionnez un chien à liker.");
      return;
    }

    try {
      await addDoc(collection(db, "likes"), {
        fromUserId: user.uid,
        toDogId: dogIdToLike,
        createdAt: new Date(),
      });

      alert("Like enregistré !");
    } catch (error) {
      alert("Erreur lors du like.");
    }
  };

  return (
    <ScreenLayout title="Mes Chiens" navigation={navigation}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Ajouter un chien</Text>

        <Text style={styles.label}>Photo du chien</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.dogImage} />
          ) : (
            <Text style={styles.imageText}>Choisir une image</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Nom</Text>
        <TextInput style={styles.input} value={dogName} onChangeText={setDogName} />

        <Text style={styles.label}>Race</Text>
        <TextInput style={styles.input} value={breed} onChangeText={setBreed} />

        <Text style={styles.label}>Âge</Text>
        <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" />

        <Text style={styles.label}>Sexe</Text>
        <Picker
          selectedValue={gender}
          style={styles.input}
          onValueChange={(itemValue) => setGender(itemValue)}
        >
          <Picker.Item label="Mâle" value="Mâle" />
          <Picker.Item label="Femelle" value="Femelle" />
        </Picker>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={styles.label}>Pedigree</Text>
        <TextInput style={styles.input} value={pedigree} onChangeText={setPedigree} />

        <Text style={styles.label}>Concours</Text>
        <Picker
          selectedValue={contest}
          style={styles.input}
          onValueChange={(itemValue) => setContest(itemValue)}
        >
          <Picker.Item label="Oui" value="Oui" />
          <Picker.Item label="Non" value="Non" />
        </Picker>

        {contest === "Oui" && (
          <>
            <Text style={styles.label}>Résultat</Text>
            <TextInput style={styles.input} value={result} onChangeText={setResult} />
          </>
        )}

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>Liker un chien</Text>
        <TextInput
          style={styles.input}
          placeholder="ID du chien à liker"
          value={dogIdToLike}
          onChangeText={setDogIdToLike}
        />
        <TouchableOpacity style={styles.button} onPress={handleLike}>
          <Text style={styles.buttonText}>Liker</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#333",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
  },
  imagePicker: {
    backgroundColor: "#333",
    borderRadius: 8,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  imageText: {
    color: "#aaa",
  },
  dogImage: {
    width: 140,
    height: 140,
    borderRadius: 20,
  },
  button: {
    backgroundColor: "#ff914d",
    padding: 14,
    borderRadius: 8,
    marginTop: 24,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
