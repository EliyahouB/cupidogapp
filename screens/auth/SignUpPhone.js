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
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../config/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { sendPhoneOtp, verifyPhoneOtp } from "../../utils/phoneOtp";
import i18n from "../../utils/i18n";

const COUNTRIES = [
  { code: "+972", flag: "🇮🇱", name: "Israël" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+1", flag: "🇺🇸", name: "USA" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
];

export default function SignUpPhone({ navigation, route }) {
  const { userType, providerType } = route.params;

  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

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
      Alert.alert(i18n.t("error"), i18n.t("enter_valid_phone"));
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      console.log("Envoi WhatsApp à:", formattedPhone);
      await sendPhoneOtp({
        phoneNumber: formattedPhone,
        purpose: "signup",
        userType,
        providerType,
      });
      setCodeSent(true);
      setStep(2);
      Alert.alert(i18n.t("code_sent"), i18n.t("code_sent_to") + " " + formattedPhone + " (WhatsApp)");
    } catch (e) {
      console.log("ERREUR WhatsApp:", e.code, e.message);

      let message = i18n.t("error_sending_sms");
      if (e.code === "functions/invalid-argument") message = i18n.t("invalid_phone");
      if (e.code === "functions/resource-exhausted") message = i18n.t("too_many_requests");
      if (e.message && e.message.includes("region")) message = i18n.t("region_not_activated");

      Alert.alert(i18n.t("error"), message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert(i18n.t("error"), i18n.t("enter_6_digit_code"));
      return;
    }

    if (!codeSent) {
      Alert.alert(i18n.t("error"), i18n.t("invalid_code"));
      return;
    }

    setLoading(true);

    try {
      console.log("Vérification du code...");
      const userCredential = await verifyPhoneOtp(
        formatPhoneNumber(phoneNumber),
        verificationCode
      );
      const user = userCredential.user;
      console.log("Authentification réussie, UID:", user.uid);

      const profileRef = doc(db, "profiles", user.uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
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
      }

      navigation.reset({
        index: 0,
        routes: [
          {
            name: "OnboardingProfile",
            params: {
              userType: userType,
              providerType: providerType,
            },
          },
        ],
      });
    } catch (e) {
      console.log("ERREUR VERIF:", e.code, e.message);

      let message = i18n.t("invalid_code");
      if (e.code === "auth/invalid-verification-code") message = i18n.t("wrong_code");
      if (e.code === "auth/code-expired") message = i18n.t("code_expired");
      if (e.code === "functions/invalid-argument") message = i18n.t("wrong_code");
      if (e.code === "functions/already-exists") message = i18n.t("account_already_exists");

      Alert.alert(i18n.t("error"), message);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (userType === "particulier") return i18n.t("signup");
    if (providerType === "prestataire") return i18n.t("provider_signup");
    return i18n.t("seller_signup");
  };

  return (
    <LinearGradient colors={["#F5D547", "#FF9966"]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <Modal
          visible={showCountryPicker}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{i18n.t("choose_country")}</Text>
              {COUNTRIES.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.countryOption,
                    selectedCountry.code === country.code && styles.countryOptionActive,
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
                <Text style={styles.modalCloseText}>{i18n.t("close")}</Text>
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
                <Text style={styles.label}>{i18n.t("phone_number")}</Text>
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
                <Text style={styles.hint}>{i18n.t("sms_hint")}</Text>

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
                      <Text style={styles.buttonText}>{i18n.t("send_code")}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>{i18n.t("verification_code")}</Text>
                <Text style={styles.phoneDisplay}>
                  {i18n.t("sent_to")} {formatPhoneNumber(phoneNumber)}
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
                      <Text style={styles.buttonText}>{i18n.t("verify")}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={() => {
                    setStep(1);
                    setVerificationCode("");
                    setCodeSent(false);
                  }}
                  disabled={loading}
                >
                  <Text style={styles.resendText}>{i18n.t("change_number")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleSendCode}
                  disabled={loading}
                >
                  <Text style={styles.resendText}>{i18n.t("resend_code")}</Text>
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