import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
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
import ScreenLayout from "../components/ScreenLayout";

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
  const [nomadMode, setNomadMode] = useState(false);
  const [hideProfile, setHideProfile] = useState(false);
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
        setNomadMode(data.nomadMode || false);
        setHideProfile(data.hideProfile || false);
      }
    };

    loadProfile();
  }, []);

  const updateSetting = async (field, value) => {
    if (!profileId) return;

    try {
      const profileRef = doc(db, "profiles", profileId);
      await updateDoc(profileRef, { [field]: value });
    } catch (error) {
      console.error("Erreur de mise à jour :", error);
      alert("Erreur lors de la mise à jour du paramètre.");
    }
  };

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
    if (!name.trim() || !city.trim()) {
      alert("Veuillez remplir au moins le nom et la ville.");
      return;
    }

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
        nomadMode,
        hideProfile,
        updatedAt: new Date(),
      };

      if (profileId) {
        const profileRef = doc(db, "profiles", profileId);
        await updateDoc(profileRef, data);
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
    <ScreenLayout title="Mon Profil" navigation={navigation} active="profile">
      <ScrollView contentContainerStyle={styles.container}>
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
        <TextInput 
          style={styles.input} 
          value={name} 
          onChangeText={setName}
          placeholder="Votre nom"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Ville</Text>
        <TextInput 
          style={styles.inputSmall} 
          value={city} 
          onChangeText={setCity}
          placeholder="Votre ville"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Sexe</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={gender}
            onValueChange={(itemValue) => setGender(itemValue)}
          >
            <Picker.Item label="Homme" value="Homme" />
            <Picker.Item label="Femme" value="Femme" />
          </Picker>
        </View>

        <Text style={styles.label}>Bio / Description</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          value={bio}
          onChangeText={setBio}
          multiline
          placeholder="Parlez-nous de vous..."
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>But de l'inscription</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={purpose}
            onValueChange={(itemValue) => setPurpose(itemValue)}
          >
            <Picker.Item label="Saillie" value="Saillie" />
            <Picker.Item label="Adoption" value="Adoption" />
            <Picker.Item label="Rencontre" value="Rencontre" />
            <Picker.Item label="Vente" value="Vente" />
            <Picker.Item label="Échange" value="Échange" />
          </Picker>
        </View>

        <View style={styles.switchContainer}>
          <Text style={styles.label}>Mode nomade</Text>
          <Switch
            value={nomadMode}
            onValueChange={(value) => {
              setNomadMode(value);
              updateSetting("nomadMode", value);
            }}
            trackColor={{ false: "#767577", true: "#ff914d" }}
            thumbColor={nomadMode ? "#fff" : "#f4f3f4"}
          />
        </View>

        <View style={styles.switchContainer}>
          <Text style={styles.label}>Masquer mon profil</Text>
          <Switch
            value={hideProfile}
            onValueChange={(value) => {
              setHideProfile(value);
              updateSetting("hideProfile", value);
            }}
            trackColor={{ false: "#767577", true: "#ff914d" }}
            thumbColor={hideProfile ? "#fff" : "#f4f3f4"}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
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
    color: "#1a1a1a",
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#fff",
    color: "#1a1a1a",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  inputSmall: {
    backgroundColor: "#fff",
    color: "#1a1a1a",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    width: "60%",
  },
  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  imagePicker: {
    backgroundColor: "#eee",
    borderRadius: 8,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  imageText: {
    color: "#333",
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 8,
  },
  button: {
    backgroundColor: "#ff914d",
    paddingVertical: 14,
    paddingHorizontal: 24,
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