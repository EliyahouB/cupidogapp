import React, { useState } from "react";
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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, getDoc, getDocs, doc } from "firebase/firestore";

const DOG_BREEDS = [
  "Labrador Retriever",
  "Berger Allemand",
  "Golden Retriever",
  "Bouledogue Francais",
  "Beagle",
  "Caniche",
  "Rottweiler",
  "Yorkshire Terrier",
  "Boxer",
  "Teckel",
  "Husky Siberien",
  "Doberman",
  "Schnauzer",
  "Shih Tzu",
  "Chihuahua",
  "Berger Australien",
  "Cavalier King Charles",
  "Carlin",
  "Border Collie",
  "Cocker Spaniel",
  "Bulldog Anglais",
  "Jack Russell Terrier",
  "Akita Inu",
  "Berger Belge Malinois",
  "Bichon Frise",
  "Boston Terrier",
  "Bouvier Bernois",
  "Bull Terrier",
  "Chow Chow",
  "Colley",
  "Corgi",
  "Dalmatien",
  "Epagneul Breton",
  "Fox Terrier",
  "Grand Danois",
  "Lhassa Apso",
  "Malamute d Alaska",
  "Mastiff",
  "Pointer",
  "Rhodesian Ridgeback",
  "Saint Bernard",
  "Samoyede",
  "Setter Irlandais",
  "Shiba Inu",
  "Springer Spaniel",
  "Staffordshire Terrier",
  "Terre Neuve",
  "Vizsla",
  "Weimaraner",
  "West Highland Terrier",
  "Autre",
];

export default function AjouterChien({ navigation }) {
  const [dogName, setDogName] = useState("");
  const [breed, setBreed] = useState(DOG_BREEDS[0]);
  const [customBreed, setCustomBreed] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [purpose, setPurpose] = useState("Rencontre");
  const [description, setDescription] = useState("");
  const [pedigree, setPedigree] = useState("Non");
  const [contest, setContest] = useState("Non");
  const [result, setResult] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const chooseImageSource = () => {
    Alert.alert(
      "Ajouter une photo",
      "Choisissez une source",
      [
        {
          text: "Appareil photo",
          onPress: takePhoto,
        },
        {
          text: "Galerie",
          onPress: pickImage,
        },
        {
          text: "Annuler",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const takePhoto = async () => {
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
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
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
      Alert.alert("Erreur", "Utilisateur non connecte");
      return;
    }

    if (!dogName.trim()) {
      Alert.alert("Erreur", "Le nom du chien est obligatoire");
      return;
    }

    setLoading(true);
    let photoUrl = null;

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const abonnement = userSnap.exists()
        ? userSnap.data().abonnement
        : "gratuit";

      const dogsRef = collection(db, "users", user.uid, "dogs");
      const dogsSnap = await getDocs(dogsRef);
      const dogCount = dogsSnap.size;

      const limites = {
        gratuit: 1,
        lite: 3,
        premium: Infinity,
      };

      if (dogCount >= limites[abonnement]) {
        Alert.alert(
          "Limite atteinte",
          "Abonnement " +
            abonnement +
            " autorise " +
            limites[abonnement] +
            " chien(s)."
        );
        setLoading(false);
        return;
      }

      if (imageUri) {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const filename = "dogs/" + user.uid + "/" + Date.now() + ".jpg";
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        photoUrl = await getDownloadURL(storageRef);
      }

      const finalBreed = breed === "Autre" ? customBreed : breed;

      await addDoc(dogsRef, {
        dogName,
        breed: finalBreed,
        age,
        gender,
        purpose,
        description,
        pedigree,
        contest,
        result: contest === "Oui" ? result : "",
        photoUrl,
        createdAt: new Date(),
      });

      Alert.alert("Succes", "Chien enregistre !", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert("Erreur", "Erreur lors de l enregistrement.");
      console.log("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout
      title="Ajouter un chien"
      navigation={navigation}
      showBack={true}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Photo du chien</Text>
        <TouchableOpacity
          style={styles.imagePicker}
          onPress={chooseImageSource}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.dogImage} />
          ) : (
            <View style={styles.imagePickerContent}>
              <MaterialCommunityIcons
                name="camera-plus"
                size={40}
                color="#666"
              />
              <Text style={styles.imageText}>Choisir une image</Text>
            </View>
          )}
        </TouchableOpacity>

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
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Text>
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
  imagePicker: {
    backgroundColor: "#eee",
    borderRadius: 8,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  imagePickerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  imageText: {
    color: "#666",
    marginTop: 8,
    fontSize: 14,
  },
  dogImage: {
    width: "100%",
    height: 140,
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
});