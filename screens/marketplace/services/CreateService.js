import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, db } from "../../../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import ScreenLayout from "../../../components/ScreenLayout";
import { auth } from "../../../config/firebase";
import { createService } from "../../../utils/marketplace";

export default function CreateService({ navigation }) {
  const user = auth.currentUser;

  const [formData, setFormData] = useState({
    category: "veterinaire",
    businessName: "",
    description: "",
    city: "",
    phone: "",
    email: user?.email || "",
    priceRange: "",
    abonnement: "pro",
  });
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const categories = [
    { id: "veterinaire", name: "Vétérinaire", leadPrices: { pro: 20, pro_plus: 15 } },
    { id: "toiletteur", name: "Toiletteur", leadPrices: { pro: 18, pro_plus: 13 } },
    { id: "dogwalker", name: "Dog-walker & Gardiennage", leadPrices: { pro: 12, pro_plus: 8 } },
    { id: "educateur", name: "Éducateur / Dresseur", leadPrices: { pro: 25, pro_plus: 18 } },
    { id: "pension", name: "Pension canine", leadPrices: { pro: 20, pro_plus: 15 } },
    { id: "transport", name: "Transport canin", leadPrices: { pro: 15, pro_plus: 10 } },
    { id: "photographe", name: "Photographe", leadPrices: { pro: 25, pro_plus: 18 } },
  ];

  useEffect(() => {
    checkProfessionalAccount();
  }, []);

  const checkProfessionalAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const proDoc = await getDoc(doc(db, "professional_accounts", user.uid));
      
      if (!proDoc.exists()) {
        Alert.alert(
          "Compte professionnel requis",
          "Vous devez d'abord créer un compte professionnel pour proposer des services.",
          [
            { text: "Annuler", onPress: () => navigation.goBack(), style: "cancel" },
            { text: "Créer mon compte", onPress: () => {
              navigation.goBack();
              navigation.navigate("InscriptionPro");
            }}
          ]
        );
        return;
      }

      const proData = proDoc.data();
      
      if (proData.status === "pending") {
        Alert.alert(
          "Compte en validation",
          "Votre compte professionnel est en cours de validation (sous 48h).",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
        return;
      }

      if (proData.status === "rejected") {
        Alert.alert(
          "Compte refusé",
          `Votre compte a été refusé : ${proData.rejectionReason || "Raison non spécifiée"}`,
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Si approved, on continue normalement
    } catch (error) {
      console.error("Erreur checkProfessionalAccount:", error);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert("Permission requise", "Accès à la galerie requis pour ajouter une photo");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0]);
    }
  };

  const uploadPhoto = async () => {
    if (!photo) return null;

    try {
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      
      const filename = `services/${user.uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error("Erreur upload photo:", error);
      return null;
    }
  };

  const handleSubmit = async () => {
    // VALIDATION
    if (!formData.businessName.trim()) {
      Alert.alert("Erreur", "Nom de l'entreprise requis");
      return;
    }
    if (!formData.description.trim()) {
      Alert.alert("Erreur", "Description requise");
      return;
    }
    if (!formData.city.trim()) {
      Alert.alert("Erreur", "Ville requise");
      return;
    }
    if (!formData.phone.trim()) {
      Alert.alert("Erreur", "Téléphone requis");
      return;
    }

    setLoading(true);

    try {
      // UPLOAD PHOTO
      const photoURL = await uploadPhoto();

      const selectedCategory = categories.find(c => c.id === formData.category);
      
      const serviceData = {
        providerId: user.uid,
        providerName: user.displayName || formData.businessName,
        category: formData.category,
        businessName: formData.businessName,
        description: formData.description,
        services: [],
        priceRange: formData.priceRange,
        photos: photoURL ? [photoURL] : [],
        city: formData.city,
        zones: [formData.city],
        phone: formData.phone,
        email: formData.email,
        abonnement: formData.abonnement,
        ranking: formData.abonnement === "pro_plus" ? 100 : 50,
        rating: 0,
        reviewsCount: 0,
        leadPrices: selectedCategory.leadPrices,
        totalLeadsReceived: 0,
        totalLeadsAccepted: 0,
      };

      const result = await createService(serviceData);

      if (result.success) {
        Alert.alert(
          "Service créé !",
          "Votre profil professionnel est maintenant actif.",
          [
            { 
              text: "OK", 
              onPress: () => navigation.navigate("ServicesHome")
            }
          ]
        );
      } else {
        Alert.alert("Erreur", "Impossible de créer le service.");
      }
    } catch (error) {
      console.error("Erreur handleSubmit:", error);
      Alert.alert("Erreur", "Une erreur s'est produite.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout title="Devenir prestataire" navigation={navigation} showBack>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Créez votre profil professionnel</Text>
            <Text style={styles.headerSubtitle}>
              Recevez des demandes de clients et développez votre activité
            </Text>
          </View>

          {/* PHOTO */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Photo de présentation *</Text>
            <TouchableOpacity
              style={styles.photoUpload}
              onPress={pickImage}
            >
              {photo ? (
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <MaterialCommunityIcons name="camera-plus" size={40} color="#9CA3AF" />
                  <Text style={styles.photoPlaceholderText}>Ajouter une photo</Text>
                  <Text style={styles.photoPlaceholderHint}>Photo professionnelle recommandée</Text>
                </View>
              )}
            </TouchableOpacity>
            {photo && (
              <TouchableOpacity
                style={styles.changePhotoButton}
                onPress={pickImage}
              >
                <Text style={styles.changePhotoText}>Changer la photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* CATÉGORIE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Catégorie *</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    formData.category === cat.id && styles.categoryCardActive
                  ]}
                  onPress={() => setFormData({ ...formData, category: cat.id })}
                >
                  <Text style={[
                    styles.categoryText,
                    formData.category === cat.id && styles.categoryTextActive
                  ]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* NOM ENTREPRISE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom de l'entreprise *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Clinique Vétérinaire Tel Aviv"
              value={formData.businessName}
              onChangeText={(text) => setFormData({ ...formData, businessName: text })}
            />
          </View>

          {/* DESCRIPTION */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Décrivez vos services, votre expérience..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
            />
          </View>

          {/* VILLE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ville *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Tel Aviv"
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
            />
          </View>

          {/* TÉLÉPHONE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 054-123-4567"
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
            />
          </View>

          {/* EMAIL */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="contact@exemple.com"
              keyboardType="email-address"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
            />
          </View>

          {/* TARIFS */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fourchette de prix</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 200-800₪"
              value={formData.priceRange}
              onChangeText={(text) => setFormData({ ...formData, priceRange: text })}
            />
          </View>

          {/* ABONNEMENT */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Abonnement *</Text>
            <TouchableOpacity
              style={[
                styles.aboCard,
                formData.abonnement === "pro" && styles.aboCardActive
              ]}
              onPress={() => setFormData({ ...formData, abonnement: "pro" })}
            >
              <View style={styles.aboHeader}>
                <Text style={styles.aboName}>PRO</Text>
                <Text style={styles.aboPrice}>159₪/mois</Text>
              </View>
              <Text style={styles.aboFeature}>• 5 photos portfolio</Text>
              <Text style={styles.aboFeature}>• Prix lead normal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.aboCard,
                formData.abonnement === "pro_plus" && styles.aboCardActive
              ]}
              onPress={() => setFormData({ ...formData, abonnement: "pro_plus" })}
            >
              <View style={styles.aboHeader}>
                <Text style={styles.aboName}>PRO+</Text>
                <Text style={styles.aboPrice}>299₪/mois</Text>
              </View>
              <Text style={styles.aboFeature}>• 15 photos portfolio</Text>
              <Text style={styles.aboFeature}>• Top des résultats</Text>
              <Text style={styles.aboFeature}>• Prix lead réduit (-30%)</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* BOUTON SUBMIT */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.submitButtonContainer}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#1976D2", "#42A5F5"]}
              style={styles.submitButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <Text style={styles.submitButtonText}>Création en cours...</Text>
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#FFF" />
                  <Text style={styles.submitButtonText}>Créer mon profil</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#003366",
    marginBottom: 8,
  },
  photoUpload: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  photoPreview: {
    width: "100%",
    height: 200,
  },
  photoPlaceholder: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  photoPlaceholderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 12,
  },
  photoPlaceholderHint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  changePhotoButton: {
    marginTop: 8,
    alignSelf: "center",
  },
  changePhotoText: {
    fontSize: 14,
    color: "#1976D2",
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#003366",
  },
  textarea: {
    minHeight: 80,
    paddingTop: 12,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryCard: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  categoryCardActive: {
    backgroundColor: "#E3F2FD",
    borderColor: "#1976D2",
  },
  categoryText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  categoryTextActive: {
    color: "#1976D2",
    fontWeight: "bold",
  },
  aboCard: {
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  aboCardActive: {
    borderColor: "#1976D2",
    backgroundColor: "#E3F2FD",
  },
  aboHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  aboName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#003366",
  },
  aboPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1976D2",
  },
  aboFeature: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  submitButtonContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
  },
});