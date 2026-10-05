import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { auth, db, storage } from "../../config/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getReferralByCode, useReferralCode } from "../../utils/referral";
import i18n from "../../utils/i18n";

export default function OnboardingProfile({ navigation, route }) {
  const { userType, providerType } = route.params || {};
  
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDogModal, setShowDogModal] = useState(false);
  
  const [referralCode, setReferralCode] = useState("");
  const [referralValid, setReferralValid] = useState(null);
  const [referralChecking, setReferralChecking] = useState(false);
  const [referrerName, setReferrerName] = useState("");
  
  const [dateOfBirth, setDateOfBirth] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [gender, setGender] = useState("");
  const [bio, setBio] = useState("");
  const [purpose, setPurpose] = useState("");
  
  const [activityType, setActivityType] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [ossekNumber, setOssekNumber] = useState("");
  const [legalDocument, setLegalDocument] = useState(null);
  const [yearsExperience, setYearsExperience] = useState("");
  const [proBio, setProBio] = useState("");
  
  const [shopName, setShopName] = useState("");
  const [shopDescription, setShopDescription] = useState("");
  const [vendorOssekNumber, setVendorOssekNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  const activityTypes = [
    { id: "veterinaire", label: i18n.t("vet"), icon: "medical-bag", requiresDoc: true },
    { id: "toiletteur", label: i18n.t("groomer"), icon: "content-cut", requiresDoc: false },
    { id: "educateur", label: i18n.t("trainer"), icon: "school", requiresDoc: false },
    { id: "pension", label: i18n.t("boarding"), icon: "home-heart", requiresDoc: false },
    { id: "dogwalker", label: i18n.t("dog_walker"), icon: "walk", requiresDoc: false },
    { id: "taxi", label: i18n.t("pet_taxi"), icon: "car", requiresDoc: false },
    { id: "photographe", label: i18n.t("photographer"), icon: "camera", requiresDoc: false },
  ];

  const genderOptions = [
    { id: "homme", label: i18n.t("male"), icon: "gender-male" },
    { id: "femme", label: i18n.t("female"), icon: "gender-female" },
    { id: "autre", label: i18n.t("other"), icon: "gender-non-binary" },
  ];

  const purposeOptions = [
    { id: "rencontre", label: i18n.t("park_meetups"), icon: "dog-side" },
    { id: "saillie", label: i18n.t("breeding"), icon: "heart-multiple" },
    { id: "achat", label: i18n.t("buy_dog"), icon: "cart" },
    { id: "vente", label: i18n.t("sell_dog"), icon: "tag" },
    { id: "tout", label: i18n.t("all_of_above"), icon: "all-inclusive" },
  ];

  const experienceOptions = [
    { id: "0-1", label: "< 1 " + i18n.t("year") },
    { id: "1-3", label: "1-3 " + i18n.t("years") },
    { id: "3-5", label: "3-5 " + i18n.t("years") },
    { id: "5-10", label: "5-10 " + i18n.t("years") },
    { id: "10+", label: "10+ " + i18n.t("years") },
  ];

  const checkReferralCode = async (code) => {
    if (!code || code.length < 4) {
      setReferralValid(null);
      setReferrerName("");
      return;
    }

    setReferralChecking(true);
    try {
      const referral = await getReferralByCode(code);
      if (referral) {
        setReferralValid(true);
        setReferrerName(referral.businessName);
      } else {
        setReferralValid(false);
        setReferrerName("");
      }
    } catch (error) {
      console.log("Erreur check referral:", error);
      setReferralValid(false);
    } finally {
      setReferralChecking(false);
    }
  };

  const handleReferralCodeChange = (text) => {
    const upperText = text.toUpperCase();
    setReferralCode(upperText);
    if (upperText.length >= 4) {
      checkReferralCode(upperText);
    } else {
      setReferralValid(null);
      setReferrerName("");
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      allowsMultipleSelection: false,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setLegalDocument(result.assets[0]);
      }
    } catch (e) {
      console.log("Erreur document:", e);
    }
  };

  const uploadPhoto = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `profiles/${auth.currentUser.uid}_${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const uploadDocument = async (docAsset) => {
    const response = await fetch(docAsset.uri);
    const blob = await response.blob();
    const ext = docAsset.name.split('.').pop();
    const filename = `documents/${auth.currentUser.uid}_legal_${Date.now()}.${ext}`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const formatDate = (date) => {
    if (!date) return "";
    return date.toLocaleDateString(i18n.locale === "he" ? "he-IL" : i18n.locale === "ru" ? "ru-RU" : i18n.locale === "en" ? "en-US" : "fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const isActivityRequiresDoc = () => {
    const activity = activityTypes.find(a => a.id === activityType);
    return activity?.requiresDoc || false;
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const goToHome = async () => {
    setShowDogModal(false);
    try {
      await updateDoc(doc(db, "profiles", auth.currentUser.uid), {
        onboardingCompleted: true,
      });
    } catch (e) {
      console.log("Erreur update onboarding:", e);
    }
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }],
    });
  };

  const goToAddDog = async () => {
    setShowDogModal(false);
    try {
      await updateDoc(doc(db, "profiles", auth.currentUser.uid), {
        onboardingCompleted: true,
      });
    } catch (e) {
      console.log("Erreur update onboarding:", e);
    }
    navigation.reset({
      index: 1,
      routes: [
        { name: "Home" },
        { name: "AjouterChien" },
      ],
    });
  };

  const handleComplete = async () => {
    if (!auth.currentUser) {
      Alert.alert(i18n.t("error"), i18n.t("session_expired"));
      return;
    }

    if (!name.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("enter_name"));
      return;
    }

    if (!city.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("enter_city"));
      return;
    }

    if (userType === "particulier") {
      if (!gender) {
        Alert.alert(i18n.t("error"), i18n.t("select_gender"));
        return;
      }
      if (!purpose) {
        Alert.alert(i18n.t("error"), i18n.t("select_purpose"));
        return;
      }
    }

    if (userType === "professionnel" && providerType === "prestataire") {
      if (!activityType) {
        Alert.alert(i18n.t("error"), i18n.t("select_activity"));
        return;
      }
      if (!dateOfBirth) {
        Alert.alert(i18n.t("error"), i18n.t("enter_dob"));
        return;
      }
      const age = calculateAge(dateOfBirth);
      if (age < 18) {
        Alert.alert(i18n.t("error"), i18n.t("must_be_18"));
        return;
      }
      if (isActivityRequiresDoc() && !legalDocument) {
        Alert.alert(i18n.t("error"), i18n.t("doc_required_vet"));
        return;
      }
    }

    if (userType === "professionnel" && providerType === "vendeur") {
      if (!shopName.trim()) {
        Alert.alert(i18n.t("error"), i18n.t("enter_shop_name"));
        return;
      }
      if (!dateOfBirth) {
        Alert.alert(i18n.t("error"), i18n.t("enter_dob"));
        return;
      }
      const age = calculateAge(dateOfBirth);
      if (age < 18) {
        Alert.alert(i18n.t("error"), i18n.t("must_be_18"));
        return;
      }
      if (!vendorOssekNumber.trim()) {
        Alert.alert(i18n.t("error"), i18n.t("ossek_required"));
        return;
      }
    }

    setLoading(true);
    try {
      let photoUrl = null;
      if (photo) {
        photoUrl = await uploadPhoto(photo);
      }

      let documentUrl = null;
      if (legalDocument) {
        documentUrl = await uploadDocument(legalDocument);
      }

      const updateData = {
        name: name.trim(),
        displayName: name.trim(),
        city: city.trim(),
        photoUrl: photoUrl,
        updatedAt: new Date(),
      };

      if (userType === "particulier" || !userType) {
        updateData.gender = gender;
        updateData.purpose = purpose;
        updateData.bio = bio.trim();
        if (dateOfBirth) {
          updateData.dateOfBirth = dateOfBirth;
        }
      }

      if (userType === "professionnel" && providerType === "prestataire") {
        updateData.activityType = activityType;
        updateData.businessName = businessName.trim() || name.trim();
        updateData.dateOfBirth = dateOfBirth;
        updateData.ossekNumber = ossekNumber.trim() || null;
        updateData.legalDocumentUrl = documentUrl;
        updateData.legalDocumentVerified = false;
        updateData.yearsExperience = yearsExperience || null;
        updateData.bio = proBio.trim() || null;
      }

      if (userType === "professionnel" && providerType === "vendeur") {
        updateData.shopName = shopName.trim();
        updateData.shopDescription = shopDescription.trim() || null;
        updateData.dateOfBirth = dateOfBirth;
        updateData.ossekNumber = vendorOssekNumber.trim();
        updateData.whatsappNumber = whatsappNumber.trim() || null;
      }

      if (referralCode && referralValid) {
        updateData.usedReferralCode = referralCode;
      }

      await updateDoc(doc(db, "profiles", auth.currentUser.uid), updateData);

      if (referralCode && referralValid) {
        await useReferralCode(referralCode, auth.currentUser.uid, name.trim());
      }

      if (userType === "professionnel" && providerType === "prestataire") {
        await updateDoc(doc(db, "profiles", auth.currentUser.uid), {
          onboardingCompleted: true,
        });
        navigation.reset({
          index: 0,
          routes: [{ name: "SubscriptionChoice" }],
        });
      } else {
        setShowDogModal(true);
      }
    } catch (e) {
      console.log("ERREUR:", e);
      Alert.alert(i18n.t("error"), i18n.t("error_occurred"));
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (userType === "particulier" || !userType) return i18n.t("your_profile");
    if (providerType === "prestataire") return i18n.t("provider_profile");
    return i18n.t("seller_profile");
  };

  return (
    <LinearGradient colors={["#F5D547", "#FF9966"]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.subtitle}>{i18n.t("complete_profile_to_start")}</Text>

          <View style={styles.card}>
            <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <MaterialCommunityIcons name="camera-plus" size={32} color="#999" />
                  <Text style={styles.photoText}>{i18n.t("add_photo")}</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>
              {userType === "professionnel" ? i18n.t("full_name") + " *" : i18n.t("your_name") + " *"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Jean Dupont"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>{i18n.t("city")} *</Text>
            <TextInput
              style={styles.input}
              placeholder="Tel Aviv, Haifa, Jerusalem..."
              placeholderTextColor="#999"
              value={city}
              onChangeText={setCity}
            />

            <Text style={styles.label}>{i18n.t("referral_code_optional")}</Text>
            <View style={styles.referralContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.referralInput,
                  referralValid === true && styles.inputValid,
                  referralValid === false && styles.inputInvalid,
                ]}
                placeholder="Ex: VETMAX123"
                placeholderTextColor="#999"
                value={referralCode}
                onChangeText={handleReferralCodeChange}
                autoCapitalize="characters"
              />
              {referralChecking && (
                <ActivityIndicator size="small" color="#666" style={styles.referralLoader} />
              )}
              {referralValid === true && !referralChecking && (
                <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" style={styles.referralIcon} />
              )}
              {referralValid === false && !referralChecking && (
                <MaterialCommunityIcons name="close-circle" size={24} color="#F44336" style={styles.referralIcon} />
              )}
            </View>
            {referralValid === true && referrerName && (
              <Text style={styles.referralSuccess}>{i18n.t("referred_by")}: {referrerName}</Text>
            )}
            {referralValid === false && (
              <Text style={styles.referralError}>{i18n.t("invalid_code")}</Text>
            )}

            {(userType === "particulier" || !userType) && (
              <>
                <Text style={styles.label}>{i18n.t("date_of_birth")}</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <MaterialCommunityIcons name="calendar" size={20} color="#666" />
                  <Text style={[styles.dateText, !dateOfBirth && styles.datePlaceholder]}>
                    {dateOfBirth ? formatDate(dateOfBirth) : i18n.t("select_date")}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={dateOfBirth || new Date(1990, 0, 1)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(1920, 0, 1)}
                  />
                )}

                <Text style={styles.label}>{i18n.t("gender")} *</Text>
                <View style={styles.optionsRow}>
                  {genderOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.optionButton,
                        gender === option.id && styles.optionButtonActive,
                      ]}
                      onPress={() => setGender(option.id)}
                    >
                      <MaterialCommunityIcons
                        name={option.icon}
                        size={20}
                        color={gender === option.id ? "#FFF" : "#666"}
                      />
                      <Text
                        style={[
                          styles.optionText,
                          gender === option.id && styles.optionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>{i18n.t("why_cupidog")} *</Text>
                <View style={styles.purposeGrid}>
                  {purposeOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.purposeButton,
                        purpose === option.id && styles.purposeButtonActive,
                      ]}
                      onPress={() => setPurpose(option.id)}
                    >
                      <MaterialCommunityIcons
                        name={option.icon}
                        size={24}
                        color={purpose === option.id ? "#FFF" : "#666"}
                      />
                      <Text
                        style={[
                          styles.purposeText,
                          purpose === option.id && styles.purposeTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>{i18n.t("bio_optional")}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={i18n.t("bio_placeholder")}
                  placeholderTextColor="#999"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </>
            )}

            {userType === "professionnel" && providerType === "prestataire" && (
              <>
                <Text style={styles.label}>{i18n.t("date_of_birth")} *</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <MaterialCommunityIcons name="calendar" size={20} color="#666" />
                  <Text style={[styles.dateText, !dateOfBirth && styles.datePlaceholder]}>
                    {dateOfBirth ? formatDate(dateOfBirth) : i18n.t("select_date")}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={dateOfBirth || new Date(1990, 0, 1)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(1920, 0, 1)}
                  />
                )}

                <Text style={styles.label}>{i18n.t("activity_type")} *</Text>
                <View style={styles.activityGrid}>
                  {activityTypes.map((activity) => (
                    <TouchableOpacity
                      key={activity.id}
                      style={[
                        styles.activityButton,
                        activityType === activity.id && styles.activityButtonActive,
                      ]}
                      onPress={() => setActivityType(activity.id)}
                    >
                      <MaterialCommunityIcons
                        name={activity.icon}
                        size={24}
                        color={activityType === activity.id ? "#FFF" : "#666"}
                      />
                      <Text
                        style={[
                          styles.activityText,
                          activityType === activity.id && styles.activityTextActive,
                        ]}
                      >
                        {activity.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>{i18n.t("business_name_optional")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={i18n.t("business_name_placeholder")}
                  placeholderTextColor="#999"
                  value={businessName}
                  onChangeText={setBusinessName}
                />

                <Text style={styles.label}>
                  {i18n.t("ossek_number")} {isActivityRequiresDoc() ? "" : i18n.t("optional_label")}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="123456789"
                  placeholderTextColor="#999"
                  value={ossekNumber}
                  onChangeText={setOssekNumber}
                  keyboardType="numeric"
                />

                <Text style={styles.label}>
                  {i18n.t("legal_document")} {isActivityRequiresDoc() ? "*" : i18n.t("optional_label")}
                </Text>
                <TouchableOpacity style={styles.documentButton} onPress={pickDocument}>
                  <MaterialCommunityIcons 
                    name={legalDocument ? "file-check" : "file-upload"} 
                    size={24} 
                    color={legalDocument ? "#4CAF50" : "#666"} 
                  />
                  <Text style={[styles.documentText, legalDocument && styles.documentTextSuccess]}>
                    {legalDocument ? legalDocument.name : i18n.t("upload_document")}
                  </Text>
                </TouchableOpacity>
                {isActivityRequiresDoc() && (
                  <Text style={styles.hint}>{i18n.t("doc_required_hint")}</Text>
                )}

                <Text style={styles.label}>{i18n.t("years_experience")} {i18n.t("optional_label")}</Text>
                <View style={styles.experienceRow}>
                  {experienceOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.experienceButton,
                        yearsExperience === option.id && styles.experienceButtonActive,
                      ]}
                      onPress={() => setYearsExperience(option.id)}
                    >
                      <Text
                        style={[
                          styles.experienceText,
                          yearsExperience === option.id && styles.experienceTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>{i18n.t("services_description")} {i18n.t("optional_label")}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={i18n.t("services_placeholder")}
                  placeholderTextColor="#999"
                  value={proBio}
                  onChangeText={setProBio}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </>
            )}

            {userType === "professionnel" && providerType === "vendeur" && (
              <>
                <Text style={styles.label}>{i18n.t("date_of_birth")} *</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <MaterialCommunityIcons name="calendar" size={20} color="#666" />
                  <Text style={[styles.dateText, !dateOfBirth && styles.datePlaceholder]}>
                    {dateOfBirth ? formatDate(dateOfBirth) : i18n.t("select_date")}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={dateOfBirth || new Date(1990, 0, 1)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(1920, 0, 1)}
                  />
                )}

                <Text style={styles.label}>{i18n.t("shop_name")} *</Text>
                <TextInput
                  style={styles.input}
                  placeholder={i18n.t("shop_name_placeholder")}
                  placeholderTextColor="#999"
                  value={shopName}
                  onChangeText={setShopName}
                />

                <Text style={styles.label}>{i18n.t("ossek_number")} *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123456789"
                  placeholderTextColor="#999"
                  value={vendorOssekNumber}
                  onChangeText={setVendorOssekNumber}
                  keyboardType="numeric"
                />

                <Text style={styles.label}>{i18n.t("shop_description")} {i18n.t("optional_label")}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={i18n.t("shop_description_placeholder")}
                  placeholderTextColor="#999"
                  value={shopDescription}
                  onChangeText={setShopDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <Text style={styles.label}>{i18n.t("whatsapp_number")} {i18n.t("optional_label")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+972 50 123 4567"
                  placeholderTextColor="#999"
                  value={whatsappNumber}
                  onChangeText={setWhatsappNumber}
                  keyboardType="phone-pad"
                />
                <Text style={styles.hint}>{i18n.t("whatsapp_hint")}</Text>
              </>
            )}

            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={handleComplete}
              disabled={loading}
            >
              <LinearGradient
                colors={["#42A5F5", "#1976D2"]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>{i18n.t("start_adventure")} 🐕</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={showDogModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <LinearGradient
                colors={['#FFA85C', '#FF6A3D', '#F15156', '#E91E63']}
                style={styles.modalIconGradient}
              >
                <MaterialCommunityIcons name="dog" size={50} color="#FFF" />
              </LinearGradient>
            </View>

            <Text style={styles.modalTitle}>{i18n.t("have_dog_question")}</Text>
            <Text style={styles.modalText}>{i18n.t("create_dog_profile_text")}</Text>

            <TouchableOpacity
              style={styles.modalButtonPrimary}
              onPress={goToAddDog}
            >
              <LinearGradient
                colors={['#FFA85C', '#FF6A3D', '#F15156', '#E91E63']}
                style={styles.modalButtonGradient}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
                <Text style={styles.modalButtonTextPrimary}>{i18n.t("yes_create_profile")}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={goToHome}
            >
              <Text style={styles.modalButtonTextSecondary}>{i18n.t("later")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#F5F5F7",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  photoContainer: {
    alignSelf: "center",
    marginBottom: 24,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  photoText: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFF",
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  referralContainer: {
    position: "relative",
  },
  referralInput: {
    paddingRight: 50,
  },
  referralLoader: {
    position: "absolute",
    right: 16,
    top: 14,
  },
  referralIcon: {
    position: "absolute",
    right: 16,
    top: 14,
  },
  inputValid: {
    borderColor: "#4CAF50",
    borderWidth: 2,
  },
  inputInvalid: {
    borderColor: "#F44336",
    borderWidth: 2,
  },
  referralSuccess: {
    fontSize: 13,
    color: "#4CAF50",
    marginTop: -12,
    marginBottom: 16,
    fontWeight: "500",
  },
  referralError: {
    fontSize: 13,
    color: "#F44336",
    marginTop: -12,
    marginBottom: 16,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    gap: 10,
  },
  dateText: {
    fontSize: 16,
    color: "#333",
  },
  datePlaceholder: {
    color: "#999",
  },
  optionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  optionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    gap: 6,
  },
  optionButtonActive: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF6B6B",
  },
  optionText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  optionTextActive: {
    color: "#FFF",
  },
  purposeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  purposeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    gap: 6,
  },
  purposeButtonActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  purposeText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  purposeTextActive: {
    color: "#FFF",
  },
  activityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  activityButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    gap: 6,
  },
  activityButtonActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  activityText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  activityTextActive: {
    color: "#FFF",
  },
  documentButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    gap: 10,
  },
  documentText: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  documentTextSuccess: {
    color: "#4CAF50",
    fontWeight: "500",
  },
  hint: {
    fontSize: 12,
    color: "#888",
    marginBottom: 16,
    fontStyle: "italic",
  },
  experienceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  experienceButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  experienceButtonActive: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  experienceText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  experienceTextActive: {
    color: "#FFF",
  },
  buttonPrimary: {
    borderRadius: 28,
    overflow: "hidden",
    marginTop: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalIconContainer: {
    marginBottom: 20,
  },
  modalIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1D",
    marginBottom: 12,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtonPrimary: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  modalButtonGradient: {
    flexDirection: "row",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modalButtonTextPrimary: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalButtonSecondary: {
    paddingVertical: 12,
  },
  modalButtonTextSecondary: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
});