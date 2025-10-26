import * as Localization from "expo-localization";
import { I18n } from "i18n-js";

import fr from "../locales/fr";
import en from "../locales/en";
import de from "../locales/de";
import es from "../locales/es";
import pt from "../locales/pt";
import it from "../locales/it";
import nl from "../locales/nl";
import ru from "../locales/ru";
import ar from "../locales/ar";
import zh from "../locales/zh";
import ja from "../locales/ja";
import he from "../locales/he";
import ko from "../locales/ko";

// Créer une instance d'I18n avec les traductions
const i18n = new I18n({
  fr,
  en,
  de,
  es,
  pt,
  it,
  nl,
  ru,
  ar,
  zh,
  ja,
  he,
  ko,
});

// Sécuriser la locale : si elle est undefined, on force "en"
i18n.locale = typeof Localization.locale === "string" ? Localization.locale : "en";

// Activer les langues de secours
i18n.enableFallback = true;

export default i18n;
