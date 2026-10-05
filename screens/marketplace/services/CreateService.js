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
import i18n from "../../../utils/i18n";

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
    { id: "veterinaire", name: i18n.t("veterinarian"), leadPrices: { pro: 20, pro_plus: 15 } },
    { id: "toiletteur", name: i18n.t("groomer"), leadPrices: { pro: 18, pro_plus: 13 } },
    { id: "dogwalker", name: i18n.t("dog_walker_boarding"), leadPrices: { pro: 12, pro_plus: 8 } },
    { id: "educateur", name: i18n.t("trainer_educator"), leadPrices: { pro: 25, pro_plus: 18 } },
    { id: "assurance", name: "Assurance chien", leadPrices: { pro: 35, pro_plus: 25 } },
    { id: "pension", name: i18n.t("dog_boarding"), leadPrices: { pro: 20, pro_plus: 15 } },
    { id: "transport", name: i18n.t("dog_transport"), leadPrices: { pro: 15, pro_plus: 10 } },
    { id: "photographe", name: i18n.t("photographer"), leadPrices: { pro: 25, pro_plus: 18 } },
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
            { text: i18n.t("create_account"), onPress: () => {
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
          `${i18n.t("account_rejected_reason")} ${proData.rejectionReason || i18n.t("reason_not_specified")}`,
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
    if (!formData.businessName.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("company_name_required"));
      return;
    }
    if (!formData.description.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("description_required"));
      return;
    }
    if (!formData.city.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("city_required"));
      return;
    }
    if (!formData.phone.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("phone_required"));
      return;
    }

    setLoading(true);

    try {
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
          i18n.t("service_created"),
          i18n.t("professional_profile_active"),
          [
            { 
              text: i18n.t("ok"), 
              onPress: () => navigation.navigate("ServicesHome")
            }
          ]
        );
      } else {
        Alert.alert(i18n.t("error"), i18n.t("error_creating_service"));
      }
    } catch (error) {
      console.error("Erreur handleSubmit:", error);
      Alert.alert(i18n.t("error"), i18n.t("error_occurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout title={i18n.t("become_provider")} navigation={navigation} showBack>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{i18n.t("create_professional_profile")}</Text>
            <Text style={styles.headerSubtitle}>
              {i18n.t("receive_requests_grow_business")}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("presentation_photo")} *</Text>
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
                  <Text style={styles.photoPlaceholderHint}>{i18n.t("professional_photo_recommended")}</Text>
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
            <Text style={styles.label}>{i18n.t("company_name")} *</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t("company_name_example")}
              value={formData.businessName}
              onChangeText={(text) => setFormData({ ...formData, businessName: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("description")} *</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder={i18n.t("describe_services_experience")}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("city")} *</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t("city_example")}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("phone")} *</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t("phone_example")}
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("email")}</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t("email_example")}
              keyboardType="email-address"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("price_range")}</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t("price_range_example")}
              value={formData.priceRange}
              onChangeText={(text) => setFormData({ ...formData, priceRange: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("subscription")} *</Text>
            <TouchableOpacity
              style={[
                styles.aboCard,
                formData.abonnement === "pro" && styles.aboCardActive
              ]}
              onPress={() => setFormData({ ...formData, abonnement: "pro" })}
            >
              <View style={styles.aboHeader}>
                <Text style={styles.aboName}>PRO</Text>
                <Text style={styles.aboPrice}>159₪/{i18n.t("month")}</Text>
              </View>
              <Text style={styles.aboFeature}>• {i18n.t("photos_portfolio", { count: 5 })}</Text>
              <Text style={styles.aboFeature}>• {i18n.t("normal_lead_price")}</Text>
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
                <Text style={styles.aboPrice}>299₪/{i18n.t("month")}</Text>
              </View>
              <Text style={styles.aboFeature}>• {i18n.t("photos_portfolio", { count: 15 })}</Text>
              <Text style={styles.aboFeature}>• {i18n.t("top_results")}</Text>
              <Text style={styles.aboFeature}>• {i18n.t("reduced_lead_price")}</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

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
                <Text style={styles.submitButtonText}>{i18n.t("creating")}...</Text>
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#FFF" />
                  <Text style={styles.submitButtonText}>{i18n.t("create_my_profile")}</Text>
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