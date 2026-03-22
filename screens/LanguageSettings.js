import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenLayout from "../components/ScreenLayout";
import i18n, { setLocale, availableLocales } from "../config/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LanguageSettings({ navigation }) {
  const [currentLocale, setCurrentLocale] = useState(i18n.locale);

  useEffect(() => {
    loadCurrentLocale();
  }, []);

  const loadCurrentLocale = async () => {
    const saved = await AsyncStorage.getItem("userLocale");
    if (saved) {
      setCurrentLocale(saved);
    } else {
      setCurrentLocale(i18n.locale);
    }
  };

  const handleSelectLanguage = async (locale) => {
    await setLocale(locale);
    setCurrentLocale(locale);
    
    Alert.alert(
      i18n.t("success"),
      i18n.t("language") + " : " + availableLocales.find(l => l.code === locale)?.name,
      [
        {
          text: "OK",
          onPress: () => {
            // Recharger l'app pour appliquer la langue
            navigation.reset({
              index: 0,
              routes: [{ name: "Home" }],
            });
          },
        },
      ]
    );
  };

  const isRTL = currentLocale === "he";

  return (
    <ScreenLayout title={i18n.t("language")} navigation={navigation} showBack>
      <View style={styles.container}>
        <Text style={styles.subtitle}>
          {currentLocale === "fr" && "Choisissez votre langue"}
          {currentLocale === "en" && "Choose your language"}
          {currentLocale === "he" && "בחר את השפה שלך"}
          {currentLocale === "ru" && "Выберите язык"}
        </Text>

        {availableLocales.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.languageCard,
              currentLocale === lang.code && styles.languageCardActive,
            ]}
            onPress={() => handleSelectLanguage(lang.code)}
            activeOpacity={0.7}
          >
            <Text style={styles.flag}>{lang.flag}</Text>
            <Text style={[
              styles.languageName,
              currentLocale === lang.code && styles.languageNameActive,
            ]}>
              {lang.name}
            </Text>
            {currentLocale === lang.code && (
              <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
            )}
          </TouchableOpacity>
        ))}

        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information-outline" size={20} color="#6B7280" />
          <Text style={styles.infoText}>
            {currentLocale === "fr" && "L'application redémarrera pour appliquer la nouvelle langue."}
            {currentLocale === "en" && "The app will restart to apply the new language."}
            {currentLocale === "he" && "האפליקציה תופעל מחדש כדי להחיל את השפה החדשה."}
            {currentLocale === "ru" && "Приложение перезапустится для применения нового языка."}
          </Text>
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 20,
    textAlign: "center",
  },
  languageCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    gap: 16,
  },
  languageCardActive: {
    borderWidth: 2,
    borderColor: "#4CAF50",
    backgroundColor: "#F0FFF4",
  },
  flag: {
    fontSize: 32,
  },
  languageName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "500",
    color: "#003366",
  },
  languageNameActive: {
    fontWeight: "bold",
    color: "#4CAF50",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
});