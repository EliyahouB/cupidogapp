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
import { createProduct } from "../../../utils/marketplace";
import i18n from "../../../utils/i18n";

export default function CreateProduct({ navigation }) {
  const user = auth.currentUser;

  const [formData, setFormData] = useState({
    category: "nourriture",
    name: "",
    description: "",
    price: "",
    stock: "",
    brand: "",
    weight: "",
  });
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const categories = [
    { id: "nourriture", name: i18n.t("food"), icon: "food" },
    { id: "jouets", name: i18n.t("toys"), icon: "tennis-ball" },
    { id: "accessoires", name: i18n.t("accessories"), icon: "bag-personal" },
    { id: "hygiene", name: i18n.t("hygiene"), icon: "spray-bottle" },
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
          i18n.t("pro_account_required"),
          i18n.t("pro_account_required_desc"),
          [
            { text: i18n.t("cancel"), onPress: () => navigation.goBack(), style: "cancel" },
            { text: i18n.t("create_my_account"), onPress: () => {
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
          i18n.t("account_pending"),
          i18n.t("account_pending_desc"),
          [{ text: i18n.t("ok"), onPress: () => navigation.goBack() }]
        );
        return;
      }

      if (proData.status === "rejected") {
        Alert.alert(
          i18n.t("account_rejected"),
          `${i18n.t("account_rejected_reason")}: ${proData.rejectionReason || i18n.t("not_specified")}`,
          [{ text: i18n.t("ok"), onPress: () => navigation.goBack() }]
        );
        return;
      }

      if (proData.activityType !== "seller") {
        Alert.alert(
          i18n.t("wrong_account_type"),
          i18n.t("wrong_account_type_desc"),
          [{ text: i18n.t("ok"), onPress: () => navigation.goBack() }]
        );
        return;
      }
    } catch (error) {
      console.error("Erreur checkProfessionalAccount:", error);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert(i18n.t("permission_required"), i18n.t("gallery_access_required"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      allowsMultipleSelection: false,
      aspect: [1, 1],
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
      
      const filename = `products/${user.uid}/${Date.now()}.jpg`;
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
    if (!formData.name.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("product_name_required"));
      return;
    }
    if (!formData.description.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("description_required"));
      return;
    }
    if (!formData.price || isNaN(formData.price) || parseFloat(formData.price) <= 0) {
      Alert.alert(i18n.t("error"), i18n.t("valid_price_required"));
      return;
    }
    if (!formData.stock || isNaN(formData.stock) || parseInt(formData.stock) < 0) {
      Alert.alert(i18n.t("error"), i18n.t("valid_stock_required"));
      return;
    }

    setLoading(true);

    try {
      const photoURL = await uploadPhoto();

      const productData = {
        sellerId: user.uid,
        sellerName: user.displayName || i18n.t("seller"),
        category: formData.category,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        brand: formData.brand,
        weight: formData.weight,
        photos: photoURL ? [photoURL] : [],
        featured: false,
        rating: 0,
        reviewsCount: 0,
      };

      const result = await createProduct(productData);

      if (result.success) {
        Alert.alert(
          i18n.t("product_created"),
          i18n.t("product_created_desc", { amount: (productData.price * 0.8).toFixed(0) }),
          [
            { 
              text: i18n.t("ok"), 
              onPress: () => navigation.navigate("BoutiqueHome")
            }
          ]
        );
      } else {
        Alert.alert(i18n.t("error"), i18n.t("error_creating_product"));
      }
    } catch (error) {
      console.error("Erreur handleSubmit:", error);
      Alert.alert(i18n.t("error"), i18n.t("error_occurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout title={i18n.t("sell_product")} navigation={navigation} showBack>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{i18n.t("add_your_product")}</Text>
            <Text style={styles.headerSubtitle}>{i18n.t("you_receive_80")}</Text>
            <View style={styles.commissionBadge}>
              <MaterialCommunityIcons name="cash-multiple" size={20} color="#43A047" />
              <Text style={styles.commissionText}>{i18n.t("cupidog_commission")}: 20%</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("product_photo")} *</Text>
            <TouchableOpacity
              style={styles.photoUpload}
              onPress={pickImage}
            >
              {photo ? (
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <MaterialCommunityIcons name="camera-plus" size={40} color="#9CA3AF" />
                  <Text style={styles.photoPlaceholderText}>{i18n.t("add_photo")}</Text>
                  <Text style={styles.photoPlaceholderHint}>{i18n.t("clear_photo_hint")}</Text>
                </View>
              )}
            </TouchableOpacity>
            {photo && (
              <TouchableOpacity
                style={styles.changePhotoButton}
                onPress={pickImage}
              >
                <Text style={styles.changePhotoText}>{i18n.t("change_photo")}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("category")} *</Text>
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
                  <MaterialCommunityIcons 
                    name={cat.icon} 
                    size={24} 
                    color={formData.category === cat.id ? "#E91E63" : "#6B7280"} 
                  />
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("product_name")} *</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t("product_name_example")}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("description")} *</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder={i18n.t("describe_product")}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("selling_price")} *</Text>
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
                  💰 {i18n.t("you_will_receive")}: {(parseFloat(formData.price) * 0.8).toFixed(0)}₪
                </Text>
                <Text style={styles.calculationSubtext}>
                  {i18n.t("cupidog_commission")}: {(parseFloat(formData.price) * 0.2).toFixed(0)}₪
                </Text>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("available_stock")} *</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t("stock_example")}
              keyboardType="numeric"
              value={formData.stock}
              onChangeText={(text) => setFormData({ ...formData, stock: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("brand_optional")}</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t("brand_example")}
              value={formData.brand}
              onChangeText={(text) => setFormData({ ...formData, brand: text })}
            />
          </View>

          {formData.category === "nourriture" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("weight_optional")}</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t("weight_example")}
                value={formData.weight}
                onChangeText={(text) => setFormData({ ...formData, weight: text })}
              />
            </View>
          )}

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.submitButtonContainer}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#E91E63", "#F06292"]}
              style={styles.submitButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <Text style={styles.submitButtonText}>{i18n.t("publishing")}</Text>
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#FFF" />
                  <Text style={styles.submitButtonText}>{i18n.t("publish_product")}</Text>
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
    marginBottom: 12,
  },
  commissionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  commissionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#43A047",
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
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  categoryCard: {
    width: "47%",
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
  },
  categoryCardActive: {
    backgroundColor: "#FCE4EC",
    borderColor: "#E91E63",
  },
  categoryText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  categoryTextActive: {
    color: "#E91E63",
    fontWeight: "bold",
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
    marginBottom: 4,
  },
  calculationSubtext: {
    fontSize: 12,
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