import React, { useState } from "react";
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
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, db, auth } from "../../../config/firebase";
import { doc, setDoc } from "firebase/firestore";
import ScreenLayout from "../../../components/ScreenLayout";
import i18n from "../../../utils/i18n";

export default function InscriptionPro({ navigation }) {
  const user = auth.currentUser;

  const [formData, setFormData] = useState({
    activityType: "service_provider",
    serviceCategory: "veterinaire",
    businessType: "osek_patur",
    companyName: "",
    osekNumber: "",
    hpNumber: "",
    street: "",
    city: "",
    postalCode: "",
    phone: "",
    email: user?.email || "",
    requiresCertification: true,
    subscriptionPlan: null,
  });

  const [logo, setLogo] = useState(null);
  const [teoudatOsek, setTeoudatOsek] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const serviceCategories = [
    { id: "veterinaire", name: i18n.t("veterinarian"), needsCert: true },
    { id: "toiletteur", name: i18n.t("groomer"), needsCert: false },
    { id: "dogwalker", name: i18n.t("dog_walker_boarding"), needsCert: false },
    { id: "educateur", name: i18n.t("trainer_educator"), needsCert: true },
    { id: "pension", name: i18n.t("dog_boarding"), needsCert: true },
    { id: "transport", name: i18n.t("dog_transport"), needsCert: false },
    { id: "photographe", name: i18n.t("photographer"), needsCert: false },
  ];

  const getProPlanDetails = (plan) => {
    if (plan === "pro") {
      return {
        name: "PRO",
        price: "159₪",
        duration: i18n.t("per_month"),
        features: [
          i18n.t("create_professional_profile"),
          i18n.t("receive_client_requests"),
          i18n.t("leads_vet_groomer_price"),
          i18n.t("leads_walker_transport_price"),
          i18n.t("standard_support"),
          i18n.t("basic_statistics"),
        ],
      };
    } else {
      return {
        name: "PRO+",
        price: "299₪",
        duration: i18n.t("per_month"),
        features: [
          i18n.t("everything_from_pro_plus"),
          i18n.t("pro_plus_badge"),
          i18n.t("leads_vet_groomer_discount"),
          i18n.t("leads_walker_transport_discount"),
          i18n.t("search_priority"),
          i18n.t("priority_support"),
          i18n.t("advanced_statistics"),
        ],
      };
    }
  };

  const handlePlanClick = (plan) => {
    setSelectedPlan(plan);
    setModalVisible(true);
  };

  const handleSubscribePlan = () => {
    setFormData({ ...formData, subscriptionPlan: selectedPlan });
    setModalVisible(false);
    Alert.alert(i18n.t("subscription_selected"), `${i18n.t("you_chose_offer")} ${selectedPlan === "pro" ? "PRO" : "PRO+"}`);
  };

  const pickLogo = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert(i18n.t("permission_required"), i18n.t("gallery_access_required"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setLogo(result.assets[0]);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        setTeoudatOsek(result.assets[0]);
      }
    } catch (error) {
      console.error("Erreur pickDocument:", error);
      Alert.alert(i18n.t("error"), i18n.t("error_selecting_document"));
    }
  };

  const uploadFile = async (file, folder) => {
    if (!file) return null;

    try {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      const filename = `${folder}/${user.uid}/${Date.now()}_${file.name || 'file'}`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error("Erreur upload:", error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!formData.companyName.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("company_name_required"));
      return;
    }

    if (formData.activityType === "service_provider" && !formData.subscriptionPlan) {
      Alert.alert(i18n.t("error"), i18n.t("choose_subscription"));
      return;
    }

    if (formData.requiresCertification) {
      if (formData.businessType === "osek_patur" || formData.businessType === "osek_mursheh") {
        if (!formData.osekNumber.trim() || formData.osekNumber.length < 9) {
          Alert.alert(i18n.t("error"), i18n.t("valid_osek_required"));
          return;
        }
      } else if (formData.businessType === "hevra") {
        if (!formData.hpNumber.trim() || formData.hpNumber.length < 9) {
          Alert.alert(i18n.t("error"), i18n.t("valid_hp_required"));
          return;
        }
      }
    }

    if (!formData.street.trim() || !formData.city.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("full_address_required"));
      return;
    }
    if (!formData.phone.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("phone_required"));
      return;
    }

    setLoading(true);

    try {
      const logoURL = await uploadFile(logo, "professional/logos");
      const docURL = await uploadFile(teoudatOsek, "professional/documents");

      const professionalData = {
        userId: user.uid,
        userEmail: user.email,
        activityType: formData.activityType,
        serviceCategory: formData.activityType === "service_provider" ? formData.serviceCategory : null,
        subscriptionPlan: formData.activityType === "service_provider" ? formData.subscriptionPlan : null,
        businessType: formData.businessType,
        companyName: formData.companyName,
        osekNumber: formData.osekNumber,
        hpNumber: formData.hpNumber,
        address: {
          street: formData.street,
          city: formData.city,
          postalCode: formData.postalCode,
        },
        phone: formData.phone,
        email: formData.email,
        requiresCertification: formData.requiresCertification,
        logo: logoURL,
        teoudatOsek: docURL,
        status: "pending",
        createdAt: new Date(),
        approvedAt: null,
        rejectedAt: null,
        rejectionReason: null,
      };

      await setDoc(doc(db, "professional_accounts", user.uid), professionalData);

      Alert.alert(
        i18n.t("request_sent"),
        `${i18n.t("professional_account_pending")} ${formData.activityType === "service_provider" ? `${i18n.t("subscription")} ${formData.subscriptionPlan === "pro" ? "PRO" : "PRO+"} ${i18n.t("selected")}.` : ""}\n\n${i18n.t("email_within_48h")}`,
        [
          {
            text: i18n.t("ok"),
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error("Erreur handleSubmit:", error);
      Alert.alert(i18n.t("error"), i18n.t("error_saving_professional"));
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = serviceCategories.find(c => c.id === formData.serviceCategory);

  return (
    <ScreenLayout title={i18n.t("professional_account")} navigation={navigation} showBack>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          
          <View style={styles.header}>
            <MaterialCommunityIcons name="briefcase-check" size={60} color="#1976D2" />
            <Text style={styles.headerTitle}>{i18n.t("become_professional")}</Text>
            <Text style={styles.headerSubtitle}>
              {i18n.t("sell_products_or_services")}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information" size={20} color="#1976D2" />
            <Text style={styles.infoText}>
              {i18n.t("validation_48h_info")}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("activity_type")} *</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[styles.radioOption, formData.activityType === "service_provider" && styles.radioOptionActive]}
                onPress={() => setFormData({ ...formData, activityType: "service_provider", subscriptionPlan: null })}
              >
                <MaterialCommunityIcons 
                  name={formData.activityType === "service_provider" ? "radiobox-marked" : "radiobox-blank"} 
                  size={24} 
                  color={formData.activityType === "service_provider" ? "#1976D2" : "#9CA3AF"} 
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.radioText}>{i18n.t("service_provider")}</Text>
                  <Text style={styles.radioHint}>
                    {i18n.t("service_provider_examples")}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.radioOption, formData.activityType === "seller" && styles.radioOptionActive]}
                onPress={() => setFormData({ ...formData, activityType: "seller", subscriptionPlan: null })}
              >
                <MaterialCommunityIcons 
                  name={formData.activityType === "seller" ? "radiobox-marked" : "radiobox-blank"} 
                  size={24} 
                  color={formData.activityType === "seller" ? "#1976D2" : "#9CA3AF"} 
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.radioText}>{i18n.t("product_seller")}</Text>
                  <Text style={styles.radioHint}>
                    {i18n.t("product_seller_examples")}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {formData.activityType === "service_provider" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("service_category")} *</Text>
              <View style={styles.categoryGrid}>
                {serviceCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      formData.serviceCategory === cat.id && styles.categoryCardActive
                    ]}
                    onPress={() => {
                      setFormData({ 
                        ...formData, 
                        serviceCategory: cat.id,
                        requiresCertification: cat.needsCert
                      });
                    }}
                  >
                    <Text style={[
                      styles.categoryText,
                      formData.serviceCategory === cat.id && styles.categoryTextActive
                    ]}>
                      {cat.name}
                    </Text>
                    {cat.needsCert && (
                      <MaterialCommunityIcons name="certificate" size={14} color="#FF9900" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {formData.activityType === "service_provider" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("choose_subscription")} *</Text>
              <View style={styles.subscriptionRow}>
                <TouchableOpacity
                  style={[
                    styles.subscriptionCard,
                    formData.subscriptionPlan === "pro" && styles.subscriptionCardActive
                  ]}
                  onPress={() => handlePlanClick("pro")}
                >
                  <LinearGradient
                    colors={["#64B5F6", "#90CAF9"]}
                    style={styles.subscriptionGradient}
                  >
                    {formData.subscriptionPlan === "pro" && (
                      <View style={styles.subscriptionCheck}>
                        <MaterialCommunityIcons name="check-circle" size={24} color="#43A047" />
                      </View>
                    )}
                    <MaterialCommunityIcons name="briefcase" size={32} color="#FFF" />
                    <Text style={styles.subscriptionTitle}>PRO</Text>
                    <Text style={styles.subscriptionPrice}>159₪</Text>
                    <Text style={styles.subscriptionDuration}>{i18n.t("per_month")}</Text>
                    <Text style={styles.subscriptionHint}>{i18n.t("leads")} 18-20₪</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.subscriptionCard,
                    formData.subscriptionPlan === "pro+" && styles.subscriptionCardActive
                  ]}
                  onPress={() => handlePlanClick("pro+")}
                >
                  <LinearGradient
                    colors={["#1976D2", "#42A5F5"]}
                    style={styles.subscriptionGradient}
                  >
                    {formData.subscriptionPlan === "pro+" && (
                      <View style={styles.subscriptionCheck}>
                        <MaterialCommunityIcons name="check-circle" size={24} color="#43A047" />
                      </View>
                    )}
                    <View style={styles.proPlusBadge}>
                      <Text style={styles.proPlusBadgeText}>⭐ PREMIUM</Text>
                    </View>
                    <MaterialCommunityIcons name="crown" size={32} color="#FFF" />
                    <Text style={styles.subscriptionTitle}>PRO+</Text>
                    <Text style={styles.subscriptionPrice}>299₪</Text>
                    <Text style={styles.subscriptionDuration}>{i18n.t("per_month")}</Text>
                    <Text style={styles.subscriptionHint}>{i18n.t("leads")} 13-15₪</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>{i18n.t("click_for_details")}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("business_type")} *</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[styles.radioOption, formData.businessType === "osek_patur" && styles.radioOptionActive]}
                onPress={() => setFormData({ ...formData, businessType: "osek_patur" })}
              >
                <MaterialCommunityIcons 
                  name={formData.businessType === "osek_patur" ? "radiobox-marked" : "radiobox-blank"} 
                  size={24} 
                  color={formData.businessType === "osek_patur" ? "#1976D2" : "#9CA3AF"} 
                />
                <Text style={styles.radioText}>עוסק פטור (Osek Patur)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.radioOption, formData.businessType === "osek_mursheh" && styles.radioOptionActive]}
                onPress={() => setFormData({ ...formData, businessType: "osek_mursheh" })}
              >
                <MaterialCommunityIcons 
                  name={formData.businessType === "osek_mursheh" ? "radiobox-marked" : "radiobox-blank"} 
                  size={24} 
                  color={formData.businessType === "osek_mursheh" ? "#1976D2" : "#9CA3AF"} 
                />
                <Text style={styles.radioText}>עוסק מורשה (Osek Mursheh)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.radioOption, formData.businessType === "hevra" && styles.radioOptionActive]}
                onPress={() => setFormData({ ...formData, businessType: "hevra" })}
              >
                <MaterialCommunityIcons 
                  name={formData.businessType === "hevra" ? "radiobox-marked" : "radiobox-blank"} 
                  size={24} 
                  color={formData.businessType === "hevra" ? "#1976D2" : "#9CA3AF"} 
                />
                <Text style={styles.radioText}>חברה (Hevra - Ltd/LTD)</Text>
              </TouchableOpacity>
            </View>
          </View>

          {formData.activityType === "service_provider" && selectedCategory?.needsCert && (
            <View style={styles.warningBox}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="#FF9900" />
              <Text style={styles.warningText}>
                {i18n.t("certification_required_warning")}
              </Text>
            </View>
          )}

          {formData.activityType === "service_provider" && formData.serviceCategory === "dogwalker" && (
            <View style={styles.successBox}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#43A047" />
              <Text style={styles.successText}>
                {i18n.t("dogwalker_no_osek_required")}
              </Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("company_logo_optional")}</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickLogo}
            >
              {logo ? (
                <Image source={{ uri: logo.uri }} style={styles.logoPreview} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <MaterialCommunityIcons name="camera-plus" size={40} color="#9CA3AF" />
                  <Text style={styles.uploadText}>{i18n.t("add_logo")}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("company_name")} *</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t("company_name_example")}
              value={formData.companyName}
              onChangeText={(text) => setFormData({ ...formData, companyName: text })}
            />
          </View>

          {formData.requiresCertification && (
            <>
              {(formData.businessType === "osek_patur" || formData.businessType === "osek_mursheh") && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{i18n.t("osek_number")} {formData.serviceCategory === "dogwalker" ? `(${i18n.t("optional")})` : "*"}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123456789"
                    keyboardType="numeric"
                    maxLength={15}
                    value={formData.osekNumber}
                    onChangeText={(text) => setFormData({ ...formData, osekNumber: text.replace(/\s/g, '') })}
                  />
                  <Text style={styles.hint}>{i18n.t("minimum_9_digits")}</Text>
                </View>
              )}

              {formData.businessType === "hevra" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{i18n.t("hp_number")} (חברה) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="512345678"
                    keyboardType="numeric"
                    maxLength={15}
                    value={formData.hpNumber}
                    onChangeText={(text) => setFormData({ ...formData, hpNumber: text.replace(/\s/g, '') })}
                  />
                  <Text style={styles.hint}>{i18n.t("minimum_9_digits")}</Text>
                </View>
              )}
            </>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("business_address")} *</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t("street")}
              value={formData.street}
              onChangeText={(text) => setFormData({ ...formData, street: text })}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder={i18n.t("city")}
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
              />
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder={i18n.t("postal_code")}
                keyboardType="numeric"
                value={formData.postalCode}
                onChangeText={(text) => setFormData({ ...formData, postalCode: text })}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("professional_phone")} *</Text>
            <TextInput
              style={styles.input}
              placeholder="054-123-4567"
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("professional_email")} *</Text>
            <TextInput
              style={styles.input}
              placeholder="contact@company.com"
              keyboardType="email-address"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
            />
          </View>

          {formData.requiresCertification && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("teudat_osek_certificate")} {formData.serviceCategory === "dogwalker" ? `(${i18n.t("optional")})` : `(${i18n.t("recommended")})`}</Text>
              <TouchableOpacity
                style={styles.documentButton}
                onPress={pickDocument}
              >
                <MaterialCommunityIcons 
                  name={teoudatOsek ? "file-check" : "file-upload"} 
                  size={24} 
                  color={teoudatOsek ? "#43A047" : "#1976D2"} 
                />
                <Text style={styles.documentButtonText}>
                  {teoudatOsek ? teoudatOsek.name : i18n.t("select_document")}
                </Text>
              </TouchableOpacity>
              <Text style={styles.hint}>
                {i18n.t("recommended_for_fast_validation")}
              </Text>
            </View>
          )}

          <View style={styles.conditionsBox}>
            <MaterialCommunityIcons name="shield-check" size={20} color="#43A047" />
            <Text style={styles.conditionsText}>
              {i18n.t("professional_terms_agreement")}
            </Text>
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
                <Text style={styles.submitButtonText}>{i18n.t("sending")}...</Text>
              ) : (
                <>
                  <MaterialCommunityIcons name="send" size={20} color="#FFF" />
                  <Text style={styles.submitButtonText}>{i18n.t("submit_request")}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={28} color="#666" />
              </TouchableOpacity>

              {selectedPlan && (
                <>
                  <LinearGradient
                    colors={selectedPlan === "pro" ? ["#64B5F6", "#90CAF9"] : ["#1976D2", "#42A5F5"]}
                    style={styles.modalHeader}
                  >
                    <MaterialCommunityIcons 
                      name={selectedPlan === "pro" ? "briefcase" : "crown"} 
                      size={40} 
                      color="#FFF" 
                    />
                    <Text style={styles.modalTitle}>{getProPlanDetails(selectedPlan).name}</Text>
                    <Text style={styles.modalPrice}>{getProPlanDetails(selectedPlan).price}</Text>
                    <Text style={styles.modalDuration}>{getProPlanDetails(selectedPlan).duration}</Text>
                  </LinearGradient>

                  <ScrollView style={styles.modalBody}>
                    <Text style={styles.modalFeaturesTitle}>{i18n.t("included_in_offer")} :</Text>
                    {getProPlanDetails(selectedPlan).features.map((feature, index) => (
                      <View key={index} style={styles.modalFeatureRow}>
                        <MaterialCommunityIcons name="check-circle" size={20} color="#43A047" />
                        <Text style={styles.modalFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </ScrollView>

                  <TouchableOpacity
                    style={styles.modalSubscribeButtonContainer}
                    onPress={handleSubscribePlan}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={selectedPlan === "pro" ? ["#64B5F6", "#90CAF9"] : ["#1976D2", "#42A5F5"]}
                      style={styles.modalSubscribeButton}
                    >
                      <Text style={styles.modalSubscribeButtonText}>{i18n.t("choose_this_offer")}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 120,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#003366",
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#1976D2",
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: "row",
    backgroundColor: "#FFF3E0",
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#FF9900",
    lineHeight: 18,
  },
  successBox: {
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: "#43A047",
    lineHeight: 18,
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
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#003366",
  },
  hint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  inputHalf: {
    flex: 1,
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  radioOptionActive: {
    backgroundColor: "#E3F2FD",
    borderColor: "#1976D2",
  },
  radioText: {
    fontSize: 14,
    color: "#003366",
    fontWeight: "500",
  },
  radioHint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
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
  subscriptionRow: {
    flexDirection: "row",
    gap: 12,
  },
  subscriptionCard: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  subscriptionCardActive: {
    borderWidth: 3,
    borderColor: "#43A047",
  },
  subscriptionGradient: {
    padding: 16,
    alignItems: "center",
    minHeight: 180,
    position: "relative",
  },
  subscriptionCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FFF",
    borderRadius: 20,
  },
  proPlusBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  proPlusBadgeText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#FFF",
  },
  subscriptionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: 8,
  },
  subscriptionPrice: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: 4,
  },
  subscriptionDuration: {
    fontSize: 12,
    color: "#FFF",
    opacity: 0.9,
  },
  subscriptionHint: {
    fontSize: 11,
    color: "#FFF",
    opacity: 0.8,
    marginTop: 8,
  },
  uploadButton: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  logoPreview: {
    width: "100%",
    height: 150,
  },
  uploadPlaceholder: {
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  uploadText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
  },
  documentButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  documentButtonText: {
    flex: 1,
    fontSize: 14,
    color: "#003366",
  },
  conditionsBox: {
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  conditionsText: {
    flex: 1,
    fontSize: 12,
    color: "#43A047",
    lineHeight: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  modalClose: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
  },
  modalHeader: {
    padding: 24,
    paddingTop: 40,
    alignItems: "center",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: 12,
  },
  modalPrice: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: 8,
  },
  modalDuration: {
    fontSize: 14,
    color: "#FFF",
    opacity: 0.9,
  },
  modalBody: {
    padding: 24,
  },
  modalFeaturesTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 16,
  },
  modalFeatureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  modalFeatureText: {
    fontSize: 15,
    color: "#333",
    flex: 1,
    lineHeight: 22,
  },
  modalSubscribeButtonContainer: {
    padding: 16,
    borderRadius: 12,
    overflow: "hidden",
    margin: 16,
  },
  modalSubscribeButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  modalSubscribeButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
  },
});