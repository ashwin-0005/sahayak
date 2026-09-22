import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import hi from "./hi.json";

export const SUPPORTED_LANGS = ["en", "hi"] as const;
export type UILang = (typeof SUPPORTED_LANGS)[number];

export const LANG_STORAGE_KEY = "sahayak.lang";

export const languageLabel: Record<UILang, string> = {
  en: "English",
  hi: "हिन्दी"
};

function storedLang(): UILang {
  const raw = localStorage.getItem(LANG_STORAGE_KEY);
  if (raw === "en" || raw === "hi") return raw;
  const nav = navigator.language ?? "";
  return SUPPORTED_LANGS.includes(nav.slice(0, 2) as UILang) ? (nav.slice(0, 2) as UILang) : "en";
}

export function setLanguage(lang: UILang): void {
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  void i18n.changeLanguage(lang);
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi }
    },
    fallbackLng: "en",
    lng: storedLang(),
    interpolation: { escapeValue: false }
  });

// Keep <html lang> in sync with the active language for accessibility.
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;