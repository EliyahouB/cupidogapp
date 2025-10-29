import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
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
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { db, storage } from "../config/firebase";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { useNavigation } from "@react-navigation/native";

export default function Profile() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("Homme");
  const [bio, setBio] = useState("");
  const [purpose, setPurpose] = useState("Saillie");
  const [imageUri, setImageUri] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const loadProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(collection(db, "profiles"), where("uid", "==", user.uid));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        const data = docData.data();
        setProfileId(docData.id);
        setName(data.name || "");
        setCity(data.city || "");
        setGender(data.gender || "Homme");
        setBio(data.bio || "");
        setPurpose(data.purpose || "Saillie");
        setPhotoUrl(data.photoUrl || null);
        setImageUri(data.photoUrl || null);
      }
    };

    loadProfile();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    let uploadedPhotoUrl = photoUrl;

    try {
      if (imageUri && !imageUri.startsWith("https://")) {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const filename = `profilePhotos/${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        uploadedPhotoUrl = await getDownloadURL(storageRef);
      }

      const user = auth.currentUser;
      const data = {
        uid: user.uid,
        name,
        city,
        gender,
        bio,
        purpose,
        photoUrl: uploadedPhotoUrl,
        updatedAt: new Date(),
      };

      if (profileId) {
        const docRef = doc(db, "profiles", profileId);
        await updateDoc(docRef, data);
        alert("Profil mis à jour !");
      } else {
        await addDoc(collection(db, "profiles"), {
          ...data,
          createdAt: new Date(),
        });
        alert("Profil enregistré !");
      }
    } catch (error) {
      console.error("Erreur d'enregistrement :", error);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigation.replace("Welcome");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Mon Profil</Text>

        <Text style={styles.label}>Photo de profil</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.profileImage} />
          ) : (
            <Text style={styles.imageText}>Choisir une image</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Prénom / Nom</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />

        <Text style={styles.label}>Ville</Text>
        <TextInput style={styles.input} value={city} onChangeText={setCity} />

        <Text style={styles.label}>Sexe</Text>
        <Picker
          selectedValue={gender}
          style={styles.input}
          onValueChange={(itemValue) => setGender(itemValue)}
        >
          <Picker.Item label="Homme" value="Homme" />
          <Picker.Item label="Femme" value="Femme" />
        </Picker>

        <Text style={styles.label}>Bio / Description</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          value={bio}
          onChangeText={setBio}
          multiline
        />

        <Text style={styles.label}>But de l'inscription</Text>
        <Picker
          selectedValue={purpose}
          style={styles.input}
          onValueChange={(itemValue) => setPurpose(itemValue)}
        >
          <Picker.Item label="Saillie" value="Saillie" />
          <Picker.Item label="Adoption" value="Adoption" />
          <Picker.Item label="Rencontre" value="Rencontre" />
          <Picker.Item label="Vente" value="Vente" />
          <Picker.Item label="Échange" value="Échange" />
        </Picker>

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#1c1c1c",
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
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
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
  logoutButton: {
    backgroundColor: "#444",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
});
