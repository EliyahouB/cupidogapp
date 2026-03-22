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
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification,
  PhoneAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import * as SecureStore from "expo-secure-store";
import { auth } from "../config/firebase";
import app from "../config/firebase";

const COUNTRIES = [
  { code: "+972", flag: "🇮🇱", name: "Israël" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+1", flag: "🇺🇸", name: "USA" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
];

export default function SignIn({ navigation }) {
  const [mode, setMode] = useState("email"); // "email" ou "phone"
  
  // Email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Phone
  const [phone, setPhone] = useState("");
  const [verificationId, setVerificationId] = useState(null);
  const [code, setCode] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const recaptchaVerifier = useRef(null);

  const storeUserId = async (uid) => {
    try {
      await SecureStore.setItemAsync("userId", uid);
    } catch (e) {
      console.log("Erreur stockage userId", e);
    }
  };

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

  // ============ CONNEXION EMAIL ============
  const handleSignInEmail = async () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }
    
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      if (!user.emailVerified) {
        Alert.alert(
          "Email non vérifié",
          "Veuillez vérifier votre email avant de vous connecter.",
          [
            { 
              text: "Renvoyer l'email", 
              onPress: async () => {
                try {
                  await sendEmailVerification(user);
                  Alert.alert("Email envoyé", "Vérifiez votre boîte mail");
                } catch (error) {
                  Alert.alert("Erreur", "Impossible d'envoyer l'email");
                }
              }
            },
            { text: "OK", style: "cancel" }
          ]
        );
        setLoading(false);
        return;
      }
      
      await storeUserId(user.uid);
      navigation.replace("Home");
    } catch (e) {
      let message = "Erreur de connexion";
      if (e.code === "auth/invalid-email") message = "Email invalide";
      if (e.code === "auth/user-not-found") message = "Utilisateur introuvable";
      if (e.code === "auth/wrong-password") message = "Mot de passe incorrect";
      if (e.code === "auth/invalid-credential") message = "Email ou mot de passe incorrect";
      Alert.alert("Erreur", message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert("Erreur", "Entrez votre email pour réinitialiser");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Succès", "Email de réinitialisation envoyé");
    } catch (e) {
      Alert.alert("Erreur", "Échec de l'envoi de l'email");
    }
  };

  // ============ CONNEXION TÉLÉPHONE ============
  const sendVerificationCode = async () => {
    if (!phone || phone.length < 9) {
      Alert.alert("Erreur", "Veuillez entrer un numéro de téléphone valide");
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phone);
      console.log("Envoi SMS à:", formattedPhone);

      const phoneProvider = new PhoneAuthProvider(auth);
      const verId = await phoneProvider.verifyPhoneNumber(
        formattedPhone,
        recaptchaVerifier.current
      );

      setVerificationId(verId);
      Alert.alert("Code envoyé", "Un code de vérification a été envoyé au " + formattedPhone);
    } catch (error) {
      console.log("Erreur envoi SMS:", error);
      let message = "Erreur d'envoi du SMS";
      if (error.code === "auth/invalid-phone-number") {
        message = "Numéro de téléphone invalide";
      }
      if (error.code === "auth/too-many-requests") {
        message = "Trop de tentatives, réessayez plus tard";
      }
      Alert.alert("Erreur", message);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code || code.length !== 6) {
      Alert.alert("Erreur", "Entrez le code à 6 chiffres");
      return;
    }

    setLoading(true);
    try {
      console.log("Vérification du code...");
      const credential = PhoneAuthProvider.credential(verificationId, code);
      const userCredential = await signInWithCredential(auth, credential);

      console.log("Connexion réussie, UID:", userCredential.user.uid);
      await storeUserId(userCredential.user.uid);
      navigation.replace("Home");
    } catch (error) {
      console.log("Erreur vérification:", error);
      let message = "Code invalide";
      if (error.code === "auth/invalid-verification-code") {
        message = "Code incorrect";
      }
      if (error.code === "auth/code-expired") {
        message = "Code expiré, renvoyez un nouveau code";
      }
      Alert.alert("Erreur", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#F5D547', '#FF9966']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifier}
          firebaseConfig={app.options}
          attemptInvisibleVerification={true}
        />

        {/* MODAL SÉLECTEUR DE PAYS */}
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

        <ScrollView contentContainerStyle={styles.container}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (verificationId) {
                setVerificationId(null);
                setCode("");
              } else {
                navigation.goBack();
              }
            }}
          >
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFF" />
          </TouchableOpacity>

          <Text style={styles.title}>Se connecter</Text>

          {/* ONGLETS EMAIL / TÉLÉPHONE */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, mode === "email" && styles.tabActive]}
              onPress={() => {
                setMode("email");
                setVerificationId(null);
                setCode("");
              }}
            >
              <MaterialCommunityIcons 
                name="email" 
                size={20} 
                color={mode === "email" ? "#FFF" : "#666"} 
              />
              <Text style={[styles.tabText, mode === "email" && styles.tabTextActive]}>
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === "phone" && styles.tabActive]}
              onPress={() => setMode("phone")}
            >
              <MaterialCommunityIcons 
                name="phone" 
                size={20} 
                color={mode === "phone" ? "#FFF" : "#666"} 
              />
              <Text style={[styles.tabText, mode === "phone" && styles.tabTextActive]}>
                Téléphone
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {mode === "email" ? (
              <>
                {/* CONNEXION EMAIL */}
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Mot de passe"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <MaterialCommunityIcons
                      name={showPassword ? "eye-off" : "eye"}
                      size={24}
                      color="#888"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={handleResetPassword}>
                  <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.buttonPrimary}
                  onPress={handleSignInEmail}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#42A5F5', '#1976D2']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.buttonText}>Se connecter</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* CONNEXION TÉLÉPHONE */}
                {!verificationId ? (
                  <>
                    <Text style={styles.phoneHint}>
                      Entrez votre numéro de téléphone pour recevoir un code SMS
                    </Text>
                    
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
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        maxLength={10}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.buttonPrimary}
                      onPress={sendVerificationCode}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={['#4CAF50', '#388E3C']}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        {loading ? (
                          <ActivityIndicator color="#FFF" />
                        ) : (
                          <Text style={styles.buttonText}>Recevoir le code</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.phoneHint}>
                      Entrez le code à 6 chiffres reçu par SMS
                    </Text>
                    <Text style={styles.phoneDisplay}>
                      Envoyé au {formatPhoneNumber(phone)}
                    </Text>
                    
                    <TextInput
                      style={styles.codeInput}
                      placeholder="000000"
                      placeholderTextColor="#999"
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      textAlign="center"
                    />

                    <TouchableOpacity
                      style={styles.buttonPrimary}
                      onPress={verifyCode}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={['#42A5F5', '#1976D2']}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        {loading ? (
                          <ActivityIndicator color="#FFF" />
                        ) : (
                          <Text style={styles.buttonText}>Se connecter</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.resendButton}
                      onPress={() => {
                        setVerificationId(null);
                        setCode("");
                      }}
                    >
                      <Text style={styles.resendText}>Modifier le numéro</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.resendButton}
                      onPress={sendVerificationCode}
                      disabled={loading}
                    >
                      <Text style={styles.resendText}>Renvoyer le code</Text>
                    </TouchableOpacity>
                  </>
                )}
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
  container: {
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
    marginBottom: 24,
    textAlign: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  tabActive: {
    backgroundColor: "#1976D2",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  tabTextActive: {
    color: "#FFF",
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
  phoneHint: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  phoneDisplay: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  phoneContainer: {
    flexDirection: "row",
    marginBottom: 20,
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
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  passwordInput: {
    flex: 1,
    height: 52,
    fontSize: 16,
  },
  forgotText: {
    color: "#1976D2",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    marginBottom: 24,
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
    fontSize: 14,
    fontWeight: "600",
  },
  // MODAL PAYS
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