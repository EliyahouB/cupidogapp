import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
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

export default function MesChiens({ navigation }) {
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
  const [myDogs, setMyDogs] = useState([]);
  const [loadingDogs, setLoadingDogs] = useState(true);

  useEffect(() => {
    loadMyDogs();
  }, []);

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
      alert("Utilisateur non connecte");
      return;
    }

    if (!dogName.trim()) {
      alert("Le nom du chien est obligatoire");
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
        alert("Limite atteinte : abonnement " + abonnement + " autorise " + limites[abonnement] + " chien(s).");
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

      alert("Chien enregistre !");
      
      setDogName("");
      setBreed(DOG_BREEDS[0]);
      setCustomBreed("");
      setAge("");
      setGender("Male");
      setPurpose("Rencontre");
      setDescription("");
      setPedigree("Non");
      setContest("Non");
      setResult("");
      setImageUri(null);

      loadMyDogs();
    } catch (error) {
      alert("Erreur lors de l enregistrement.");
      console.log("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderDog = ({ item }) => (
    <View style={styles.dogCard}>
      {item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={styles.dogCardImage} />
      ) : (
        <View style={styles.dogCardPlaceholder}>
          <Text style={styles.dogCardPlaceholderText}>Pas de photo</Text>
        </View>
      )}
      <View style={styles.dogCardInfo}>
        <Text style={styles.dogCardName}>{item.dogName}</Text>
        <Text style={styles.dogCardDetail}>{item.breed} - {item.age} ans</Text>
        <Text style={styles.dogCardDetail}>{item.purpose}</Text>
      </View>
    </View>
  );

  return (
    <ScreenLayout title="Mes Chiens" navigation={navigation} active="paw">
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
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={breed} onValueChange={(itemValue) => setBreed(itemValue)}>
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
          <Picker selectedValue={gender} onValueChange={(itemValue) => setGender(itemValue)}>
            <Picker.Item label="Male" value="Male" />
            <Picker.Item label="Femelle" value="Femelle" />
          </Picker>
        </View>

        <Text style={styles.label}>But</Text>
        <View style={styles.pickerWrapperSmall}>
          <Picker selectedValue={purpose} onValueChange={(itemValue) => setPurpose(itemValue)}>
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
          <Picker selectedValue={pedigree} onValueChange={(itemValue) => setPedigree(itemValue)}>
            <Picker.Item label="Oui" value="Oui" />
            <Picker.Item label="Non" value="Non" />
          </Picker>
        </View>

        <Text style={styles.label}>Concours</Text>
        <View style={styles.pickerWrapperSmall}>
          <Picker selectedValue={contest} onValueChange={(itemValue) => setContest(itemValue)}>
            <Picker.Item label="Oui" value="Oui" />
            <Picker.Item label="Non" value="Non" />
          </Picker>
        </View>

        {contest === "Oui" && (
          <>
            <Text style={styles.label}>Resultat</Text>
            <TextInput style={styles.input} value={result} onChangeText={setResult} />
          </>
        )}

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <Text style={styles.subtitle}>Mes chiens enregistres</Text>
        {loadingDogs ? (
          <Text style={styles.loadingText}>Chargement...</Text>
        ) : myDogs.length === 0 ? (
          <Text style={styles.emptyText}>Aucun chien enregistre</Text>
        ) : (
          <FlatList
            data={myDogs}
            keyExtractor={(item) => item.id}
            renderItem={renderDog}
            scrollEnabled={false}
          />
        )}
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
  subtitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
    marginTop: 24,
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
  },
  imageText: {
    color: "#333",
  },
  dogImage: {
    width: 140,
    height: 140,
    borderRadius: 20,
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
  divider: {
    height: 1,
    backgroundColor: "#444",
    marginVertical: 24,
  },
  loadingText: {
    color: "#ccc",
    textAlign: "center",
    marginTop: 20,
  },
  emptyText: {
    color: "#ccc",
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
  dogCard: {
    flexDirection: "row",
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
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
  dogCardPlaceholderText: {
    color: "#aaa",
    fontSize: 12,
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
});