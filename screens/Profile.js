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
  ActivityIndicator,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [profileId, setProfileId] = useState(null);
  const [nomadMode, setNomadMode] = useState(false);
  const [hideProfile, setHideProfile] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const loadProfile = async () => {
      const user = auth.currentUser;
      
      if (!user) {
        setInitialLoading(false);
        Alert.alert("Erreur", "Vous devez être connecté pour voir votre profil.");
        return;
      }

      try {
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
      } catch (error) {
        console.error("Erreur chargement profil :", error);
        Alert.alert("Erreur", "Impossible de charger votre profil.");
      } finally {
        setInitialLoading(false);
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
      Alert.alert("Erreur", "Erreur lors de la mise à jour du paramètre.");
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Erreur sélection image :", error);
      Alert.alert("Erreur", "Impossible de sélectionner l'image.");
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !city.trim()) {
      Alert.alert("Champs requis", "Veuillez remplir au moins le nom et la ville.");
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
        Alert.alert("Succès", "Profil mis à jour !");
      } else {
        const docRef = await addDoc(collection(db, "profiles"), {
          ...data,
          createdAt: new Date(),
        });
        setProfileId(docRef.id);
        Alert.alert("Succès", "Profil enregistré !");
      }
    } catch (error) {
      console.error("Erreur d'enregistrement :", error);
      Alert.alert("Erreur", "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Oui",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error("Erreur déconnexion :", error);
              Alert.alert("Erreur", "Impossible de se déconnecter.");
            }
          }
        }
      ]
    );
  };

  if (initialLoading) {
    return (
      <ScreenLayout title="Mon Profil" navigation={navigation} active="profile">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff914d" />
          <Text style={styles.loadingText}>Chargement du profil...</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Mon Profil" navigation={navigation} active="profile">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Mon Profil</Text>

        <Text style={styles.label}>Photo de profil</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.profileImage} />
          ) : (
            <View style={styles.placeholderContainer}>
              <MaterialCommunityIcons name="camera-plus" size={48} color="#999" />
              <Text style={styles.imageText}>Ajouter une photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Prénom / Nom *</Text>
        <TextInput 
          style={styles.input} 
          value={name} 
          onChangeText={setName}
          placeholder="Votre nom"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Ville *</Text>
        <TextInput 
          style={styles.input} 
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
          style={[styles.input, styles.bioInput]}
          value={bio}
          onChangeText={setBio}
          multiline
          placeholder="Parlez-nous de vous..."
          placeholderTextColor="#999"
          textAlignVertical="top"
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
          <View style={styles.switchLabelContainer}>
            <Text style={styles.label}>Mode nomade</Text>
            <Text style={styles.switchDescription}>
              Afficher votre profil dans plusieurs villes
            </Text>
          </View>
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
          <View style={styles.switchLabelContainer}>
            <Text style={styles.label}>Masquer mon profil</Text>
            <Text style={styles.switchDescription}>
              Votre profil ne sera plus visible par les autres
            </Text>
          </View>
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

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleSave} 
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="#fff" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 16,
  },
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 24,
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 6,
    marginTop: 12,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#fff",
    color: "#1a1a1a",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    fontSize: 15,
  },
  bioInput: {
    height: 100,
    paddingTop: 12,
  },
  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  imagePicker: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
  },
  placeholderContainer: {
    alignItems: "center",
  },
  imageText: {
    color: "#666",
    marginTop: 8,
    fontSize: 14,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  switchDescription: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 2,
  },
  button: {
    backgroundColor: "#ff914d",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: "#999",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 17,
  },
  logoutButton: {
    flexDirection: "row",
    backgroundColor: "#d32f2f",
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});