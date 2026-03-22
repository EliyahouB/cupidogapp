import * as Localization from "expo-localization";
import { I18n } from "i18n-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

import fr from "../locales/fr";
import en from "../locales/en";
import he from "../locales/he";
import ru from "../locales/ru";

const i18n = new I18n({
  fr,
  en,
  he,
  ru,
});

// Langue par défaut
i18n.defaultLocale = "en";
i18n.enableFallback = true;

// Initialiser avec la langue du téléphone
const deviceLocale = Localization.locale?.split("-")[0] || "en";
const supportedLocales = ["fr", "en", "he", "ru"];
i18n.locale = supportedLocales.includes(deviceLocale) ? deviceLocale : "en";

// Fonction pour changer la langue manuellement
export const setLocale = async (locale) => {
  if (supportedLocales.includes(locale)) {
    i18n.locale = locale;
    await AsyncStorage.setItem("userLocale", locale);
  }
};

// Fonction pour charger la langue sauvegardée
export const loadSavedLocale = async () => {
  try {
    const savedLocale = await AsyncStorage.getItem("userLocale");
    if (savedLocale && supportedLocales.includes(savedLocale)) {
      i18n.locale = savedLocale;
    }
  } catch (error) {
    console.log("Erreur chargement langue:", error);
  }
};

// Liste des langues disponibles
export const availableLocales = [
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "he", name: "עברית", flag: "🇮🇱" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
];

export default i18n;