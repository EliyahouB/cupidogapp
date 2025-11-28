import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../components/ScreenLayout";
import { auth, db, storage } from "../config/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";

const DOG_BREEDS = [
  "Akita Inu",
  "Beagle",
  "Berger Allemand",
  "Berger Australien",
  "Berger Belge Malinois",
  "Bichon Frise",
  "Border Collie",
  "Boston Terrier",
  "Bouledogue Francais",
  "Bouvier Bernois",
  "Boxer",
  "Bull Terrier",
  "Bulldog Anglais",
  "Caniche",
  "Carlin",
  "Cavalier King Charles",
  "Chihuahua",
  "Chow Chow",
  "Cocker Spaniel",
  "Colley",
  "Corgi",
  "Dalmatien",
  "Doberman",
  "Epagneul Breton",
  "Fox Terrier",
  "Golden Retriever",
  "Grand Danois",
  "Husky Siberien",
  "Jack Russell Terrier",
  "Labrador Retriever",
  "Lhassa Apso",
  "Malamute d Alaska",
  "Mastiff",
  "Pointer",
  "Rhodesian Ridgeback",
  "Rottweiler",
  "Saint Bernard",
  "Samoyede",
  "Schnauzer",
  "Setter Irlandais",
  "Shiba Inu",
  "Shih Tzu",
  "Spitz",
  "Springer Spaniel",
  "Staffordshire Terrier",
  "Teckel",
  "Terre Neuve",
  "Vizsla",
  "Weimaraner",
  "West Highland Terrier",
  "Yorkshire Terrier",
].sort().concat(["Autre"]);

export default function ModifierChien({ route, navigation }) {
  const { dog } = route.params;
  const [dogName, setDogName] = useState(dog.dogName || "");
  const [breed, setBreed] = useState(dog.breed || DOG_BREEDS[0]);
  const [customBreed, setCustomBreed] = useState("");
  const [age, setAge] = useState(dog.age?.toString() || "");
  const [gender, setGender] = useState(dog.gender || "Male");
  const [purpose, setPurpose] = useState(dog.purpose || "Rencontre");
  const [description, setDescription] = useState(dog.description || "");
  const [pedigree, setPedigree] = useState(dog.pedigree || "Non");
  const [contest, setContest] = useState(dog.contest || "Non");
  const [result, setResult] = useState(dog.result || "");
  const [imageUris, setImageUris] = useState([null, null, null, null]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Charge les photos existantes
    if (dog.photoUrls && dog.photoUrls.length > 0) {
      const existingPhotos = [...dog.photoUrls];
      while (existingPhotos.length < 4) {
        existingPhotos.push(null);
      }
      setImageUris(existingPhotos.slice(0, 4));
    } else if (dog.photoUrl) {
      setImageUris([dog.photoUrl, null, null, null]);
    }

    // Si la race est "Autre", charge le nom personnalisé
    if (!DOG_BREEDS.includes(dog.breed) && dog.breed) {
      setBreed("Autre");
      setCustomBreed(dog.breed);
    }
  }, []);

  const chooseImageSource = (index) => {
    Alert.alert(
      "Ajouter une photo",
      "Choisissez une source",
      [
        {
          text: "Appareil photo",
          onPress: () => takePhoto(index),
        },
        {
          text: "Galerie",
          onPress: () => pickImage(index),
        },
        {
          text: "Annuler",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const takePhoto = async (index) => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission refusee",
        "L acces a l appareil photo est necessaire."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImageUris = [...imageUris];
      newImageUris[index] = result.assets[0].uri;
      setImageUris(newImageUris);
    }
  };

  const pickImage = async (index) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImageUris = [...imageUris];
      newImageUris[index] = result.assets[0].uri;
      setImageUris(newImageUris);
    }
  };

  const removeImage = (index) => {
    const newImageUris = [...imageUris];
    newImageUris[index] = null;
    setImageUris(newImageUris);
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Erreur", "Utilisateur non connecte");
      return;
    }

    if (!dogName.trim()) {
      Alert.alert("Erreur", "Le nom du chien est obligatoire");
      return;
    }

    setLoading(true);
    const photoUrls = [];

    try {
      console.log("1. Upload des nouvelles photos...");
      
      for (let i = 0; i < imageUris.length; i++) {
        if (imageUris[i]) {
          // Si c'est une URL existante (commence par https://), on la garde
          if (imageUris[i].startsWith("https://")) {
            photoUrls.push(imageUris[i]);
          } else {
            // Sinon, c'est une nouvelle photo locale, on l'upload
            const response = await fetch(imageUris[i]);
            const blob = await response.blob();
            const filename = "dogs/" + user.uid + "/" + Date.now() + "_" + i + ".jpg";
            const storageRef = ref(storage, filename);
            await uploadBytes(storageRef, blob);
            const url = await getDownloadURL(storageRef);
            photoUrls.push(url);
            console.log("   Photo", i + 1, "uploadée");
          }
        }
      }

      const finalBreed = breed === "Autre" ? customBreed : breed;

      console.log("2. Mise à jour du chien...");
      const dogRef = doc(db, "users", user.uid, "dogs", dog.id);
      await updateDoc(dogRef, {
        dogName,
        breed: finalBreed,
        age,
        gender,
        purpose,
        description,
        pedigree,
        contest,
        result: contest === "Oui" ? result : "",
        photoUrl: photoUrls[0] || null,
        photoUrls: photoUrls,
      });

      console.log("3. Chien modifié avec succès !");
      Alert.alert("Succes", "Chien modifie !", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.log("ERREUR:", error);
      Alert.alert("Erreur", "Erreur lors de la modification.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Supprimer ce chien ?",
      "Cette action est irreversible.",
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) return;

            setLoading(true);
            try {
              console.log("1. Suppression du chien...");
              const dogRef = doc(db, "users", user.uid, "dogs", dog.id);
              await deleteDoc(dogRef);

              console.log("2. Chien supprimé !");
              Alert.alert("Succès", "Chien supprimé", [
                {
                  text: "OK",
                  onPress: () => navigation.navigate("MesChiens"),
                },
              ]);
            } catch (error) {
              console.log("ERREUR:", error);
              Alert.alert("Erreur", "Erreur lors de la suppression.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenLayout
      title="Modifier le chien"
      navigation={navigation}
      showBack={true}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Photos du chien (4 max)</Text>
        <View style={styles.photosGrid}>
          {imageUris.map((uri, index) => (
            <TouchableOpacity
              key={index}
              style={styles.photoBox}
              onPress={() => chooseImageSource(index)}
            >
              {uri ? (
                <View style={styles.photoContainer}>
                  <Image source={{ uri }} style={styles.photoImage} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <MaterialCommunityIcons name="close-circle" size={24} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <MaterialCommunityIcons name="camera-plus" size={32} color="#666" />
                  <Text style={styles.photoText}>Photo {index + 1}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Nom</Text>
        <TextInput
          style={styles.input}
          value={dogName}
          onChangeText={setDogName}
        />

        <Text style={styles.label}>Race</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={breed}
            onValueChange={(itemValue) => setBreed(itemValue)}
          >
            {DOG_BREEDS.map((breedName) => (
              <Picker.Item key={breedName} label={breedName} value={breedName} />
            ))}
          </Picker>
        </View>

        {breed === "Autre" && (
          <>
            <Text style={styles.label}>Precisez la race</Text>
            <TextInput
              style={styles.input}
              value={customBreed}
              onChangeText={setCustomBreed}
              placeholder="Entrez la race"
            />
          </>
        )}

        <Text style={styles.label}>Age</Text>
        <TextInput
          style={styles.inputSmall}
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
          placeholder="En annees"
        />

        <Text style={styles.label}>Sexe</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={gender}
            onValueChange={(itemValue) => setGender(itemValue)}
          >
            <Picker.Item label="Male" value="Male" />
            <Picker.Item label="Femelle" value="Femelle" />
          </Picker>
        </View>

        <Text style={styles.label}>But</Text>
        <View style={styles.pickerWrapperSmall}>
          <Picker
            selectedValue={purpose}
            onValueChange={(itemValue) => setPurpose(itemValue)}
          >
            <Picker.Item label="Rencontre" value="Rencontre" />
            <Picker.Item label="Vente" value="Vente" />
            <Picker.Item label="Saillie" value="Saillie" />
          </Picker>
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={styles.label}>Pedigree</Text>
        <View style={styles.pickerWrapperSmall}>
          <Picker
            selectedValue={pedigree}
            onValueChange={(itemValue) => setPedigree(itemValue)}
          >
            <Picker.Item label="Oui" value="Oui" />
            <Picker.Item label="Non" value="Non" />
          </Picker>
        </View>

        <Text style={styles.label}>Concours</Text>
        <View style={styles.pickerWrapperSmall}>
          <Picker
            selectedValue={contest}
            onValueChange={(itemValue) => setContest(itemValue)}
          >
            <Picker.Item label="Oui" value="Oui" />
            <Picker.Item label="Non" value="Non" />
          </Picker>
        </View>

        {contest === "Oui" && (
          <>
            <Text style={styles.label}>Resultat</Text>
            <TextInput
              style={styles.input}
              value={result}
              onChangeText={setResult}
            />
          </>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Enregistrement..." : "Enregistrer les modifications"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={loading}
        >
          <Text style={styles.deleteButtonText}>🗑️ Supprimer ce chien</Text>
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
  label: {
    fontSize: 16,
    color: "#fff",
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
    width: "50%",
  },
  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  pickerWrapperSmall: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    width: "60%",
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  photoBox: {
    width: "47%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  photoContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
  },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  photoText: {
    color: "#666",
    marginTop: 4,
    fontSize: 12,
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
  deleteButton: {
    backgroundColor: "#ff4444",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});