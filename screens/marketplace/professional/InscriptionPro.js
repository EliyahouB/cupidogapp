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

export default function InscriptionPro({ navigation }) {
  const user = auth.currentUser;

  const [formData, setFormData] = useState({
    activityType: "service_provider", // service_provider ou seller
    serviceCategory: "veterinaire", // Pour les prestataires
    businessType: "osek_patur", // osek_patur, osek_mursheh, hevra
    companyName: "",
    osekNumber: "",
    hpNumber: "",
    street: "",
    city: "",
    postalCode: "",
    phone: "",
    email: user?.email || "",
    requiresCertification: true, // true ou false
    subscriptionPlan: null, // "pro" ou "pro+"
  });

  const [logo, setLogo] = useState(null);
  const [teoudatOsek, setTeoudatOsek] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const serviceCategories = [
    { id: "veterinaire", name: "Vétérinaire", needsCert: true },
    { id: "toiletteur", name: "Toiletteur", needsCert: false },
    { id: "dogwalker", name: "Dog Walker / Gardiennage", needsCert: false },
    { id: "educateur", name: "Éducateur / Dresseur", needsCert: true },
    { id: "pension", name: "Pension canine", needsCert: true },
    { id: "transport", name: "Transport canin", needsCert: false },
    { id: "photographe", name: "Photographe", needsCert: false },
  ];

  const getProPlanDetails = (plan) => {
    if (plan === "pro") {
      return {
        name: "PRO",
        price: "159₪",
        duration: "par mois",
        features: [
          "Créer votre profil professionnel",
          "Recevoir des demandes de clients",
          "Leads Vétérinaire/Toiletteur/Éducateur/Pension/Photographe : 20₪",
          "Leads Dog Walker/Transport : 18₪",
          "Support standard",
          "Statistiques de base",
        ],
      };
    } else {
      return {
        name: "PRO+",
        price: "299₪",
        duration: "par mois",
        features: [
          "Tout de PRO +",
          "Badge PRO+ sur votre profil 🏆",
          "Leads Vétérinaire/Toiletteur/Éducateur/Pension/Photographe : 15₪ (-25%)",
          "Leads Dog Walker/Transport : 13₪ (-28%)",
          "Priorité dans les résultats de recherche",
          "Support prioritaire",
          "Statistiques avancées",
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
    Alert.alert("Abonnement sélectionné !", `Vous avez choisi l'offre ${selectedPlan === "pro" ? "PRO" : "PRO+"}`);
  };

  const pickLogo = async () => {
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
      Alert.alert("Erreur", "Impossible de sélectionner le document");
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
    // VALIDATION
    if (!formData.companyName.trim()) {
      Alert.alert("Erreur", "Nom de l'entreprise requis");
      return;
    }

    // Vérifier abonnement (si prestataire)
    if (formData.activityType === "service_provider" && !formData.subscriptionPlan) {
      Alert.alert("Erreur", "Veuillez choisir un abonnement PRO ou PRO+");
      return;
    }

    // Vérifier le numéro Osek/HP selon le type
    if (formData.requiresCertification) {
      if (formData.businessType === "osek_patur" || formData.businessType === "osek_mursheh") {
        if (!formData.osekNumber.trim() || formData.osekNumber.length < 9) {
          Alert.alert("Erreur", "Numéro Osek valide requis (9 chiffres minimum)");
          return;
        }
      } else if (formData.businessType === "hevra") {
        if (!formData.hpNumber.trim() || formData.hpNumber.length < 9) {
          Alert.alert("Erreur", "Numéro H.P. valide requis (9 chiffres minimum)");
          return;
        }
      }
    }

    if (!formData.street.trim() || !formData.city.trim()) {
      Alert.alert("Erreur", "Adresse complète requise");
      return;
    }
    if (!formData.phone.trim()) {
      Alert.alert("Erreur", "Téléphone requis");
      return;
    }

    setLoading(true);

    try {
      // Upload logo et documents
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
        status: "pending", // pending, approved, rejected
        createdAt: new Date(),
        approvedAt: null,
        rejectedAt: null,
        rejectionReason: null,
      };

      await setDoc(doc(db, "professional_accounts", user.uid), professionalData);

      Alert.alert(
        "Demande envoyée !",
        `Votre compte professionnel est en cours de validation. ${formData.activityType === "service_provider" ? `Abonnement ${formData.subscriptionPlan === "pro" ? "PRO" : "PRO+"} sélectionné.` : ""}\n\nVous recevrez un email sous 48h.`,
        [
          {
            text: "OK",
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error("Erreur handleSubmit:", error);
      Alert.alert("Erreur", "Impossible d'enregistrer votre compte professionnel");
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = serviceCategories.find(c => c.id === formData.serviceCategory);

  return (
    <ScreenLayout title="Compte Professionnel" navigation={navigation} showBack>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          
          {/* HEADER */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="briefcase-check" size={60} color="#1976D2" />
            <Text style={styles.headerTitle}>Devenez Professionnel</Text>
            <Text style={styles.headerSubtitle}>
              Vendez vos produits ou proposez vos services sur CupiDog
            </Text>
          </View>

          {/* INFO BOX */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information" size={20} color="#1976D2" />
            <Text style={styles.infoText}>
              Validation sous 48h • Conformité légale • Facturation automatique
            </Text>
          </View>

          {/* TYPE ACTIVITÉ */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Type d'activité *</Text>
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
                  <Text style={styles.radioText}>Prestataire de services</Text>
                  <Text style={styles.radioHint}>
                    Vétérinaire, toiletteur, dog walker, éducateur...
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
                  <Text style={styles.radioText}>Vendeur de produits</Text>
                  <Text style={styles.radioHint}>
                    Boutique, grossiste, fabricant...
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* CATÉGORIE SERVICE (si prestataire) */}
          {formData.activityType === "service_provider" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Catégorie de service *</Text>
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

          {/* CHOIX ABONNEMENT (si prestataire) */}
          {formData.activityType === "service_provider" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Choisissez votre abonnement *</Text>
              <View style={styles.subscriptionRow}>
                {/* PRO */}
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
                    <Text style={styles.subscriptionDuration}>par mois</Text>
                    <Text style={styles.subscriptionHint}>Leads 18-20₪</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* PRO+ */}
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
                    <Text style={styles.subscriptionDuration}>par mois</Text>
                    <Text style={styles.subscriptionHint}>Leads 13-15₪</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>Cliquez pour voir les détails de chaque offre</Text>
            </View>
          )}

          {/* TYPE ENTREPRISE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Type d'entreprise *</Text>
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

          {/* CERTIFICATION INFO */}
          {formData.activityType === "service_provider" && selectedCategory?.needsCert && (
            <View style={styles.warningBox}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="#FF9900" />
              <Text style={styles.warningText}>
                Cette activité nécessite une certification professionnelle et un numéro Osek/H.P.
              </Text>
            </View>
          )}

          {formData.activityType === "service_provider" && formData.serviceCategory === "dogwalker" && (
            <View style={styles.successBox}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#43A047" />
              <Text style={styles.successText}>
                Pour le Dog Walking, le numéro Osek/H.P. n'est pas obligatoire si activité occasionnelle.
              </Text>
            </View>
          )}

          {/* LOGO */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Logo de l'entreprise (optionnel)</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickLogo}
            >
              {logo ? (
                <Image source={{ uri: logo.uri }} style={styles.logoPreview} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <MaterialCommunityIcons name="camera-plus" size={40} color="#9CA3AF" />
                  <Text style={styles.uploadText}>Ajouter un logo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* NOM ENTREPRISE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom de l'entreprise *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Clinique Vétérinaire Tel Aviv"
              value={formData.companyName}
              onChangeText={(text) => setFormData({ ...formData, companyName: text })}
            />
          </View>

          {/* NUMÉROS LÉGAUX */}
          {formData.requiresCertification && (
            <>
              {(formData.businessType === "osek_patur" || formData.businessType === "osek_mursheh") && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Numéro Osek {formData.serviceCategory === "dogwalker" ? "(optionnel)" : "*"}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123456789"
                    keyboardType="numeric"
                    maxLength={15}
                    value={formData.osekNumber}
                    onChangeText={(text) => setFormData({ ...formData, osekNumber: text.replace(/\s/g, '') })}
                  />
                  <Text style={styles.hint}>9 chiffres minimum</Text>
                </View>
              )}

              {formData.businessType === "hevra" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Numéro H.P. (חברה) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="512345678"
                    keyboardType="numeric"
                    maxLength={15}
                    value={formData.hpNumber}
                    onChangeText={(text) => setFormData({ ...formData, hpNumber: text.replace(/\s/g, '') })}
                  />
                  <Text style={styles.hint}>9 chiffres minimum</Text>
                </View>
              )}
            </>
          )}

          {/* ADRESSE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse de l'entreprise *</Text>
            <TextInput
              style={styles.input}
              placeholder="Rue"
              value={formData.street}
              onChangeText={(text) => setFormData({ ...formData, street: text })}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Ville"
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
              />
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Code postal"
                keyboardType="numeric"
                value={formData.postalCode}
                onChangeText={(text) => setFormData({ ...formData, postalCode: text })}
              />
            </View>
          </View>

          {/* CONTACT */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone professionnel *</Text>
            <TextInput
              style={styles.input}
              placeholder="054-123-4567"
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email professionnel *</Text>
            <TextInput
              style={styles.input}
              placeholder="contact@entreprise.com"
              keyboardType="email-address"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
            />
          </View>

          {/* DOCUMENTS */}
          {formData.requiresCertification && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teoudat Osek / Certificat {formData.serviceCategory === "dogwalker" ? "(optionnel)" : "(recommandé)"}</Text>
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
                  {teoudatOsek ? teoudatOsek.name : "Sélectionner un document (PDF ou image)"}
                </Text>
              </TouchableOpacity>
              <Text style={styles.hint}>
                Recommandé pour validation rapide
              </Text>
            </View>
          )}

          {/* CONDITIONS */}
          <View style={styles.conditionsBox}>
            <MaterialCommunityIcons name="shield-check" size={20} color="#43A047" />
            <Text style={styles.conditionsText}>
              En créant un compte professionnel, vous acceptez de fournir des informations exactes et de respecter la législation israélienne en vigueur.
            </Text>
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
                <Text style={styles.submitButtonText}>Envoi en cours...</Text>
              ) : (
                <>
                  <MaterialCommunityIcons name="send" size={20} color="#FFF" />
                  <Text style={styles.submitButtonText}>Soumettre ma demande</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* MODAL DÉTAILS ABONNEMENT */}
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
                    <Text style={styles.modalFeaturesTitle}>Inclus dans l'offre :</Text>
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
                      <Text style={styles.modalSubscribeButtonText}>Choisir cette offre</Text>
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
  // MODAL
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