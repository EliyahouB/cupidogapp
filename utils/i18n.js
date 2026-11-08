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
const supportedLocales = ["fr", "en", "he", "ru"];
const deviceLocale = Localization.getLocales?.()[0]?.languageCode || Localization.locale?.split("-")[0] || "en";
i18n.locale = supportedLocales.includes(deviceLocale) ? deviceLocale : "en";
console.log("[i18n] Langue du téléphone:", deviceLocale);
console.log("[i18n] Langue initialement utilisée:", i18n.locale);

// Fonction pour changer la langue manuellement
export const setLocale = async (locale) => {
  if (supportedLocales.includes(locale)) {
    i18n.locale = locale;
    await AsyncStorage.setItem("userLocale", locale);
    console.log("[i18n] Langue enregistrée:", locale);
  }
};

// Fonction pour charger la langue sauvegardée
export const loadSavedLocale = async () => {
  try {
    const savedLocale = await AsyncStorage.getItem("userLocale");
    console.log("[i18n] Langue lue par loadSavedLocale:", savedLocale);
    if (savedLocale && supportedLocales.includes(savedLocale)) {
      i18n.locale = savedLocale;
    }
    console.log("[i18n] Langue finalement utilisée par loadSavedLocale:", i18n.locale);
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