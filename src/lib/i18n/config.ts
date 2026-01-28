import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zh from "../../locales/zh.json";
import en from "../../locales/en.json";
import ja from "../../locales/ja.json";

const resources = {
  zh: {
    translation: zh,
  },
  en: {
    translation: en,
  },
  ja: {
    translation: ja,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem("i18nextLng") || "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
