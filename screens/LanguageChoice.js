import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import i18n, { setLocale, availableLocales } from "../utils/i18n";

export default function LanguageChoice({ onDone }) {
  const [selected, setSelected] = useState(i18n.locale);

  const handleConfirm = async () => {
    await setLocale(selected);
    onDone();
  };

  return (
    <LinearGradient colors={["#FF6B6B", "#FF8E53"]} style={styles.container}>
      <SafeAreaView style={styles.inner}>
        <Text style={styles.flag}>🐾</Text>
        <Text style={styles.title}>CupiDog</Text>
        <Text style={styles.subtitle}>Choisissez votre langue{"\n"}Choose your language</Text>

        <View style={styles.list}>
          {availableLocales.map((lang) => {
            const active = selected === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.card, active && styles.cardActive]}
                onPress={() => setSelected(lang.code)}
                activeOpacity={0.8}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[styles.langName, active && styles.langNameActive]}>
                  {lang.name}
                </Text>
                {active && (
                  <MaterialCommunityIcons name="check-circle" size={24} color="#FF6B6B" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleConfirm} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Continuer / Continue</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  flag: {
    fontSize: 56,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginBottom: 36,
    lineHeight: 24,
  },
  list: {
    width: "100%",
    gap: 12,
    marginBottom: 32,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardActive: {
    backgroundColor: "#FFF",
    borderColor: "#FFF",
  },
  langFlag: {
    fontSize: 28,
  },
  langName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#FFF",
  },
  langNameActive: {
    color: "#FF6B6B",
  },
  button: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 48,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#FF6B6B",
  },
});
