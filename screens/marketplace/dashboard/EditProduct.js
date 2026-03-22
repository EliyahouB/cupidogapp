import React, { useEffect, useState } from "react";
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
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, db } from "../../../config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import ScreenLayout from "../../../components/ScreenLayout";

export default function EditProduct({ route, navigation }) {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    brand: "",
    weight: "",
  });
  const [newPhoto, setNewPhoto] = useState(null);

  useEffect(() => {
    loadProduct();
  }, []);

  const loadProduct = async () => {
    try {
      const docRef = doc(db, "marketplace_products", productId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setProduct(data);
        setFormData({
          name: data.name || "",
          description: data.description || "",
          price: data.price?.toString() || "",
          stock: data.stock?.toString() || "",
          brand: data.brand || "",
          weight: data.weight || "",
        });
      } else {
        Alert.alert("Erreur", "Produit introuvable");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Erreur loadProduct:", error);
      Alert.alert("Erreur", "Impossible de charger le produit");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert("Permission requise", "Accès à la galerie requis");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setNewPhoto(result.assets[0]);
    }
  };

  const uploadPhoto = async () => {
    if (!newPhoto) return null;

    try {
      const response = await fetch(newPhoto.uri);
      const blob = await response.blob();
      
      const filename = `products/${productId}/${Date.now()}.jpg`;
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
    if (!formData.name.trim()) {
      Alert.alert("Erreur", "Nom du produit requis");
      return;
    }
    if (!formData.price || isNaN(formData.price) || parseFloat(formData.price) <= 0) {
      Alert.alert("Erreur", "Prix valide requis");
      return;
    }
    if (!formData.stock || isNaN(formData.stock) || parseInt(formData.stock) < 0) {
      Alert.alert("Erreur", "Stock valide requis");
      return;
    }

    setSaving(true);

    try {
      const docRef = doc(db, "marketplace_products", productId);
      const updateData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        brand: formData.brand,
        weight: formData.weight,
        updatedAt: new Date(),
      };

      // Upload nouvelle photo si sélectionnée
      if (newPhoto) {
        const photoURL = await uploadPhoto();
        if (photoURL) {
          updateData.photos = [photoURL, ...(product.photos || []).slice(1)];
        }
      }

      await updateDoc(docRef, updateData);

      Alert.alert(
        "Modifié !",
        "Votre produit a été mis à jour",
        [
          { 
            text: "OK", 
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error("Erreur handleSubmit:", error);
      Alert.alert("Erreur", "Impossible de modifier le produit");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenLayout title="Modifier produit" navigation={navigation} showBack>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#E91E63" />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Modifier produit" navigation={navigation} showBack>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          
          {/* PHOTO */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Photo du produit</Text>
            <TouchableOpacity
              style={styles.photoUpload}
              onPress={pickImage}
            >
              {newPhoto ? (
                <Image source={{ uri: newPhoto.uri }} style={styles.photoPreview} />
              ) : product?.photos?.[0] ? (
                <Image source={{ uri: product.photos[0] }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <MaterialCommunityIcons name="camera-plus" size={40} color="#9CA3AF" />
                  <Text style={styles.photoPlaceholderText}>Ajouter une photo</Text>
                </View>
              )}
            </TouchableOpacity>
            {(newPhoto || product?.photos?.[0]) && (
              <TouchableOpacity
                style={styles.changePhotoButton}
                onPress={pickImage}
              >
                <Text style={styles.changePhotoText}>Changer la photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* NOM */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom du produit *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Royal Canin Maxi Adult 15kg"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          {/* DESCRIPTION */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Décrivez votre produit..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
            />
          </View>

          {/* PRIX */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prix de vente *</Text>
            <View style={styles.priceInputContainer}>
              <TextInput
                style={styles.priceInput}
                placeholder="0"
                keyboardType="numeric"
                value={formData.price}
                onChangeText={(text) => setFormData({ ...formData, price: text })}
              />
              <Text style={styles.currency}>₪</Text>
            </View>
            {formData.price && !isNaN(formData.price) && parseFloat(formData.price) > 0 && (
              <View style={styles.calculationBox}>
                <Text style={styles.calculationText}>
                  💰 Vous recevrez : {(parseFloat(formData.price) * 0.8).toFixed(0)}₪
                </Text>
              </View>
            )}
          </View>

          {/* STOCK */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stock disponible *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 10"
              keyboardType="numeric"
              value={formData.stock}
              onChangeText={(text) => setFormData({ ...formData, stock: text })}
            />
          </View>

          {/* MARQUE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Marque (optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Royal Canin"
              value={formData.brand}
              onChangeText={(text) => setFormData({ ...formData, brand: text })}
            />
          </View>

          {/* POIDS */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Poids (optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 15kg"
              value={formData.weight}
              onChangeText={(text) => setFormData({ ...formData, weight: text })}
            />
          </View>

        </ScrollView>

        {/* BOUTON SUBMIT */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.submitButtonContainer}
            onPress={handleSubmit}
            disabled={saving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#E91E63", "#F06292"]}
              style={styles.submitButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {saving ? (
                <Text style={styles.submitButtonText}>Enregistrement...</Text>
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#FFF" />
                  <Text style={styles.submitButtonText}>Enregistrer les modifications</Text>
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
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  changePhotoButton: {
    marginTop: 8,
    alignSelf: "center",
  },
  changePhotoText: {
    fontSize: 14,
    color: "#E91E63",
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
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: "#003366",
    paddingVertical: 12,
  },
  currency: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6B7280",
  },
  calculationBox: {
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  calculationText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#43A047",
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