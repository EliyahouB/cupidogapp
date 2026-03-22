// screens/auth/SignUpEmail.js
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth, db } from "../../config/firebase";
import { doc, setDoc } from "firebase/firestore";

export default function SignUpEmail({ navigation, route }) {
  const { userType, providerType } = route.params;
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    try {
      // 1. Créer le compte Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Envoyer email de vérification
      await sendEmailVerification(user);

      // 3. Créer le profil Firestore avec le nouveau schéma
      const profileData = {
        uid: user.uid,
        email: user.email,
        createdAt: new Date(),
        
        // Type d'utilisateur
        userType: userType, // "particulier" ou "professionnel"
        
        // Si professionnel
        ...(userType === "professionnel" && {
          providerType: providerType, // "prestataire" ou "vendeur"
          providerStatus: "pending",
          subscription: "none",
        }),
        
        // Profil commun
        name: "",
        displayName: "",
        photoUrl: null,
        city: "",
        bio: "",
        phone: "",
        
        // Settings
        hideProfile: false,
        nomadMode: true,
        emailVerified: false,
        
        // Onboarding
        onboardingCompleted: false,
        
        // Legacy (pour compatibilité)
        purpose: "",
        gender: "",
        abonnement: "gratuit",
      };

      await setDoc(doc(db, "profiles", user.uid), profileData);

      // 4. Rediriger vers onboarding
      Alert.alert(
        "Compte créé !",
        "Un email de vérification a été envoyé à " + email,
        [
          {
            text: "OK",
            onPress: () => {
              // Navigation vers onboarding selon le type
              navigation.reset({
                index: 0,
                routes: [{ 
                  name: "OnboardingProfile", 
                  params: { userType, providerType } 
                }],
              });
            },
          },
        ]
      );
    } catch (e) {
      console.log("ERREUR:", e.code, e.message);
      let message = "Erreur lors de l'inscription";
      if (e.code === "auth/email-already-in-use") message = "Email déjà utilisé";
      if (e.code === "auth/invalid-email") message = "Email invalide";
      Alert.alert("Erreur", message);
    } finally {
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
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFF" />
          </TouchableOpacity>

          <Text style={styles.title}>{getTitle()}</Text>

          <View style={styles.card}>
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
                placeholder="Mot de passe (min. 6 caractères)"
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

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirmer le mot de passe"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>

            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={handleSignUp}
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
                  <Text style={styles.buttonText}>Créer mon compte</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  passwordInput: {
    flex: 1,
    height: 52,
    fontSize: 16,
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
});