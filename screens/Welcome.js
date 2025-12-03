import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Welcome({ navigation }) {
  return (
    <LinearGradient
      colors={['#F5D547', '#FF9966']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Bienvenue sur CupiDog</Text>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.buttonWhite}
            onPress={() => navigation.navigate("SignUp")}
          >
            <Text style={styles.buttonWhiteText}>Créer un compte</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonTransparent}
            onPress={() => navigation.navigate("SignIn")}
          >
            <Text style={styles.buttonTransparentText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 60,
  },
  logoContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
  },
  buttonsContainer: {
    paddingHorizontal: 32,
    gap: 16,
  },
  buttonWhite: {
    backgroundColor: "#FFF",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonWhiteText: {
    color: "#FF6B35",
    fontSize: 18,
    fontWeight: "700",
  },
  buttonTransparent: {
    backgroundColor: "transparent",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  buttonTransparentText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
});