import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GoogleAuthButton from "../../components/GoogleAuthButton";
import { signInWithGoogle } from "../../utils/googleAuth";
import i18n from "../../utils/i18n";

export default function AuthMethods({ navigation, route }) {
  const { userType, providerType } = route.params;
  const [loading, setLoading] = useState(null);
  const insets = useSafeAreaInsets();

  const getTitle = () => {
    if (userType === "particulier") return i18n.t("create_my_account");
    if (providerType === "prestataire") return i18n.t("provider_signup");
    return i18n.t("seller_signup");
  };

  const handleGoogleSignUp = async () => {
    setLoading("google");
    try {
      const result = await signInWithGoogle({ userType, providerType });
      if (result && !result.profileCreated) {
        Alert.alert(i18n.t("success"), i18n.t("google_account_connected"));
      }
    } catch (e) {
      console.log("Google ERREUR:", e.code, e.message);
      console.error("Erreur de connexion Google:", e);
      Alert.alert(i18n.t("error"), i18n.t("login_error"));
    } finally {
      setLoading(null);
    }
  };

  const handleMethod = (method) => {
    const params = { userType, providerType };
    
    switch (method) {
      case "email":
        navigation.navigate("SignUpEmail", params);
        break;
      case "phone":
        navigation.navigate("SignUpPhone", params);
        break;
      case "google":
        handleGoogleSignUp();
        break;
      case "apple":
        Alert.alert("Apple", i18n.t("coming_soon"));
        break;
    }
  };

  return (
    <LinearGradient colors={["#F5D547", "#FF9966"]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={28} color="#FFF" />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 16 }}>
          <View style={styles.container}>
            <Text style={styles.title}>{getTitle()}</Text>
            <Text style={styles.subtitle}>{i18n.t("choose_signup_method")}</Text>

            <View style={styles.methodsContainer}>
              <TouchableOpacity
                style={styles.methodButton}
                onPress={() => handleMethod("email")}
                disabled={loading !== null}
              >
                <View style={[styles.methodIcon, { backgroundColor: "#E3F2FD" }]}>
                  <MaterialCommunityIcons name="email-outline" size={24} color="#1976D2" />
                </View>
                <Text style={styles.methodText}>{i18n.t("continue_with_email")}</Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.methodButton}
                onPress={() => handleMethod("phone")}
                disabled={loading !== null}
              >
                <View style={[styles.methodIcon, { backgroundColor: "#E8F5E9" }]}>
                  <MaterialCommunityIcons name="phone-outline" size={24} color="#4CAF50" />
                </View>
                <Text style={styles.methodText}>{i18n.t("continue_with_phone")}</Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{i18n.t("or")}</Text>
                <View style={styles.dividerLine} />
              </View>

              <GoogleAuthButton
                onPress={() => handleMethod("google")}
                disabled={loading !== null}
                loading={loading === "google"}
              />

              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={[styles.socialButton, styles.appleButton]}
                  onPress={() => handleMethod("apple")}
                >
                  <MaterialCommunityIcons name="apple" size={24} color="#FFF" />
                  <Text style={[styles.socialText, { color: "#FFF" }]}>{i18n.t("continue_with_apple")}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>{i18n.t("have_account")} </Text>
              <TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
                <Text style={styles.loginLink}>{i18n.t("login")}</Text>
              </TouchableOpacity>
            </View>
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
  backButton: {
    padding: 16,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginBottom: 32,
  },
  methodsContainer: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  methodButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  methodText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#999",
    fontSize: 14,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 12,
    gap: 10,
  },
  socialText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  appleButton: {
    backgroundColor: "#000",
    borderColor: "#000",
    marginBottom: 0,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  loginText: {
    color: "#FFF",
    fontSize: 15,
  },
  loginLink: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});