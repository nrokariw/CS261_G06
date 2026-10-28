import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import thTranslation from "./locales/th/translation.json";
import enTranslation from "./locales/en/translation.json";

const savedLanguage =
  typeof window !== "undefined"
    ? localStorage.getItem("campusshare-lang") || "th"
    : "th";

i18n.use(initReactI18next).init({
  resources: {
    th: { translation: thTranslation },
    en: { translation: enTranslation },
  },
  lng: savedLanguage,
  fallbackLng: "th",
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (lng) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("campusshare-lang", lng);
    document.documentElement.lang = lng;
  }
});

export default i18n;
