// screens/auth/SignUpPhone.js
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { PhoneAuthProvider, signInWithCredential } from "firebase/auth";
import { auth, db } from "../../config/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import app from "../../config/firebase";

const COUNTRIES = [
  { code: "+972", flag: "🇮🇱", name: "Israël" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+1", flag: "🇺🇸", name: "USA" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
];

export default function SignUpPhone({ navigation, route }) {
  const { userType, providerType } = route.params;
  
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationId, setVerificationId] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  
  const recaptchaVerifier = useRef(null);

  const formatPhoneNumber = (number) => {
    let cleaned = number.replace(/\s/g, "").replace(/-/g, "");
    
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }
    
    if (cleaned.startsWith("+")) {
      return cleaned;
    }
    
    return selectedCountry.code + cleaned;
  };

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      Alert.alert("Erreur", "Veuillez entrer un numéro de téléphone valide");
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      console.log("Envoi SMS à:", formattedPhone);
      
      const phoneProvider = new PhoneAuthProvider(auth);
      const id = await phoneProvider.verifyPhoneNumber(
        formattedPhone,
        recaptchaVerifier.current
      );
      
      setVerificationId(id);
      setStep(2);
      Alert.alert("Code envoyé", "Un code de vérification a été envoyé au " + formattedPhone);
    } catch (e) {
      console.log("ERREUR SMS:", e.code, e.message);
      let message = "Erreur lors de l'envoi du code";
      if (e.code === "auth/invalid-phone-number") message = "Numéro de téléphone invalide";
      if (e.code === "auth/too-many-requests") message = "Trop de tentatives, réessayez plus tard";
      if (e.code === "auth/captcha-check-failed") message = "Vérification captcha échouée";
      if (e.message.includes("region")) message = "Cette région n'est pas encore activée. Contactez le support.";
      Alert.alert("Erreur", message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert("Erreur", "Veuillez entrer le code à 6 chiffres");
      return;
    }

    setLoading(true);
    try {
      console.log("Vérification du code...");
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      console.log("Authentification réussie, UID:", user.uid);

      const profileRef = doc(db, "profiles", user.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        Alert.alert(
          "Compte existant",
          "Ce numéro est déjà associé à un compte. Vous avez été connecté automatiquement.",
          [{ text: "OK" }]
        );
        return;
      }

      console.log("Création du profil Firestore...");
      const profileData = {
        uid: user.uid,
        phone: user.phoneNumber,
        email: "",
        createdAt: new Date(),
        authProvider: "phone",
        userType: userType,
        ...(userType === "professionnel" && {
          providerType: providerType,
          providerStatus: "pending",
          subscription: "none",
        }),
        name: "",
        displayName: "",
        photoUrl: null,
        city: "",
        bio: "",
        hideProfile: false,
        nomadMode: true,
        emailVerified: false,
        phoneVerified: true,
        onboardingCompleted: false,
        purpose: "",
        gender: "",
        abonnement: "gratuit",
      };

      await setDoc(profileRef, profileData);
      console.log("Profil créé avec succès");

      // Navigation explicite vers OnboardingProfile
      navigation.reset({
        index: 0,
        routes: [{ 
          name: 'OnboardingProfile',
          params: { 
            userType: userType,
            providerType: providerType 
          }
        }],
      });

    } catch (e) {
      console.log("ERREUR VERIF:", e.code, e.message);
      let message = "Code de vérification incorrect";
      if (e.code === "auth/invalid-verification-code") message = "Code invalide";
      if (e.code === "auth/code-expired") message = "Code expiré, renvoyez un nouveau code";
      Alert.alert("Erreur", message);
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (userType === "particulier") return "Inscription";
    if (providerType === "prestataire") return "Inscription Prestataire";
    return "Inscription Vendeur";
  };

  return (
    <LinearGradient colors={["#F5D547", "#FF9966"]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifier}
          firebaseConfig={app.options}
          attemptInvisibleVerification={true}
        />
        
        <Modal
          visible={showCountryPicker}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Choisir un pays</Text>
              {COUNTRIES.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.countryOption,
                    selectedCountry.code === country.code && styles.countryOptionActive
                  ]}
                  onPress={() => {
                    setSelectedCountry(country);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.countryOptionText}>
                    {country.flag} {country.name} ({country.code})
                  </Text>
                  {selectedCountry.code === country.code && (
                    <MaterialCommunityIcons name="check" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowCountryPicker(false)}
              >
                <Text style={styles.modalCloseText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (step === 2) {
                setStep(1);
                setVerificationCode("");
              } else {
                navigation.goBack();
              }
            }}
          >
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFF" />
          </TouchableOpacity>

          <Text style={styles.title}>{getTitle()}</Text>

          <View style={styles.card}>
            {step === 1 ? (
              <>
                <Text style={styles.label}>Numéro de téléphone</Text>
                <View style={styles.phoneContainer}>
                  <TouchableOpacity
                    style={styles.countryCode}
                    onPress={() => setShowCountryPicker(true)}
                  >
                    <Text style={styles.countryCodeText}>
                      {selectedCountry.flag} {selectedCountry.code}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="50 123 4567"
                    placeholderTextColor="#999"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
                <Text style={styles.hint}>
                  Vous recevrez un code de vérification par SMS
                </Text>

                <TouchableOpacity
                  style={styles.buttonPrimary}
                  onPress={handleSendCode}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={["#4CAF50", "#388E3C"]}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.buttonText}>Envoyer le code</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>Code de vérification</Text>
                <Text style={styles.phoneDisplay}>
                  Envoyé au {formatPhoneNumber(phoneNumber)}
                </Text>
                
                <TextInput
                  style={styles.codeInput}
                  placeholder="000000"
                  placeholderTextColor="#999"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  textAlign="center"
                />

                <TouchableOpacity
                  style={styles.buttonPrimary}
                  onPress={handleVerifyCode}
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
                      <Text style={styles.buttonText}>Vérifier</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={() => {
                    setStep(1);
                    setVerificationCode("");
                    setVerificationId(null);
                  }}
                  disabled={loading}
                >
                  <Text style={styles.resendText}>Modifier le numéro</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleSendCode}
                  disabled={loading}
                >
                  <Text style={styles.resendText}>Renvoyer le code</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
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
  backButton: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 32,
    textAlign: "center",
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
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  phoneContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },
  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    height: 52,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    gap: 4,
  },
  countryCodeText: {
    fontSize: 16,
    color: "#333",
  },
  phoneInput: {
    flex: 1,
    backgroundColor: "#FFF",
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    letterSpacing: 1,
  },
  hint: {
    fontSize: 13,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
  },
  phoneDisplay: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  codeInput: {
    backgroundColor: "#FFF",
    height: 60,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 28,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    letterSpacing: 8,
    fontWeight: "bold",
  },
  buttonPrimary: {
    borderRadius: 28,
    overflow: "hidden",
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
  resendButton: {
    marginTop: 16,
    alignItems: "center",
  },
  resendText: {
    color: "#1976D2",
    fontSize: 15,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  countryOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  countryOptionActive: {
    backgroundColor: "#E8F5E9",
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  countryOptionText: {
    fontSize: 18,
    color: "#333",
  },
  modalClose: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
});