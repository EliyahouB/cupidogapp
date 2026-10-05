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
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import * as SecureStore from "expo-secure-store";
import { auth } from "../config/firebase";
import { sendPhoneOtp, verifyPhoneOtp } from "../utils/phoneOtp";
import i18n from "../utils/i18n";

const COUNTRIES = [
  { code: "+972", flag: "🇮🇱", name: "Israël" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+1", flag: "🇺🇸", name: "USA" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
];

export default function SignIn({ navigation }) {
  const [mode, setMode] = useState("email");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [phone, setPhone] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const handleSignInEmail = async () => {
    if (!email || !password) {
      Alert.alert(i18n.t("error"), i18n.t("fill_all_fields"));
      return;
    }
    
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      if (!user.emailVerified) {
        Alert.alert(
          i18n.t("email_not_verified"),
          i18n.t("verify_email_first"),
          [
            { 
              text: i18n.t("resend_email"), 
              onPress: async () => {
                try {
                  await sendEmailVerification(user);
                  Alert.alert(i18n.t("email_sent"), i18n.t("check_inbox"));
                } catch (error) {
                  Alert.alert(i18n.t("error"), i18n.t("error_sending_email"));
                }
              }
            },
            { text: i18n.t("ok"), style: "cancel" }
          ]
        );
        setLoading(false);
        return;
      }
      
      await storeUserId(user.uid);
      navigation.replace("Home");
    } catch (e) {
      let message = i18n.t("login_error");
      if (e.code === "auth/invalid-email") message = i18n.t("invalid_email");
      if (e.code === "auth/user-not-found") message = i18n.t("user_not_found");
      if (e.code === "auth/wrong-password") message = i18n.t("wrong_password");
      if (e.code === "auth/invalid-credential") message = i18n.t("invalid_credentials");
      Alert.alert(i18n.t("error"), message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert(i18n.t("error"), i18n.t("enter_email_reset"));
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(i18n.t("success"), i18n.t("reset_email_sent"));
    } catch (e) {
      Alert.alert(i18n.t("error"), i18n.t("error_sending_email"));
    }
  };

  const sendVerificationCode = async () => {
    if (!phone || phone.length < 9) {
      Alert.alert(i18n.t("error"), i18n.t("enter_valid_phone"));
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phone);
      console.log("Envoi WhatsApp à:", formattedPhone);
      await sendPhoneOtp({ phoneNumber: formattedPhone, purpose: "signin" });
      setCodeSent(true);
      Alert.alert(i18n.t("code_sent"), i18n.t("code_sent_to") + " " + formattedPhone + " (WhatsApp)");
    } catch (error) {
      console.log("Erreur envoi WhatsApp:", error);
      let message = i18n.t("error_sending_sms");
      if (error.code === "functions/invalid-argument") {
        message = i18n.t("invalid_phone");
      }
      if (error.code === "functions/resource-exhausted") {
        message = i18n.t("too_many_requests");
      }
      if (error.code === "functions/not-found") {
        message = i18n.t("user_not_found");
      }
      Alert.alert(i18n.t("error"), message);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code || code.length !== 6) {
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
      const userCredential = await verifyPhoneOtp(formatPhoneNumber(phone), code);

      console.log("Connexion réussie, UID:", userCredential.user.uid);
      await storeUserId(userCredential.user.uid);
      navigation.replace("Home");
    } catch (error) {
      console.log("Erreur vérification:", error);
      let message = i18n.t("invalid_code");
      if (error.code === "auth/invalid-verification-code") {
        message = i18n.t("wrong_code");
      }
      if (error.code === "auth/code-expired") {
        message = i18n.t("code_expired");
      }
      if (error.code === "functions/not-found") {
        message = i18n.t("user_not_found");
      }
      Alert.alert(i18n.t("error"), message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#F5D547', '#FF9966']} style={styles.gradient}>
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
                <Text style={styles.modalCloseText}>{i18n.t("close")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <ScrollView contentContainerStyle={styles.container}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (codeSent) {
                setCodeSent(false);
                setCode("");
              } else {
                navigation.goBack();
              }
            }}
          >
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFF" />
          </TouchableOpacity>

          <Text style={styles.title}>{i18n.t("login")}</Text>

          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, mode === "email" && styles.tabActive]}
              onPress={() => {
                setMode("email");
                setCodeSent(false);
                setCode("");
              }}
            >
              <MaterialCommunityIcons 
                name="email" 
                size={20} 
                color={mode === "email" ? "#FFF" : "#666"} 
              />
              <Text style={[styles.tabText, mode === "email" && styles.tabTextActive]}>
                {i18n.t("email")}
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
                {i18n.t("phone")}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {mode === "email" ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder={i18n.t("email")}
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder={i18n.t("password")}
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
                  <Text style={styles.forgotText}>{i18n.t("forgot_password")}</Text>
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
                      <Text style={styles.buttonText}>{i18n.t("login")}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {!codeSent ? (
                  <>
                    <Text style={styles.phoneHint}>{i18n.t("phone_hint")}</Text>
                    
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
                          <Text style={styles.buttonText}>{i18n.t("receive_code")}</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.phoneHint}>{i18n.t("enter_code_hint")}</Text>
                    <Text style={styles.phoneDisplay}>
                      {i18n.t("sent_to")} {formatPhoneNumber(phone)}
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
                          <Text style={styles.buttonText}>{i18n.t("login")}</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.resendButton}
                      onPress={() => {
                        setCodeSent(false);
                        setCode("");
                      }}
                    >
                      <Text style={styles.resendText}>{i18n.t("change_number")}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.resendButton}
                      onPress={sendVerificationCode}
                      disabled={loading}
                    >
                      <Text style={styles.resendText}>{i18n.t("resend_code")}</Text>
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