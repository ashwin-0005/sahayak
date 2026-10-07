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

// jsdom/Node environments may not provide window.localStorage (Node >= 22
// ships an experimental global that shadows it). The app only degrades the
// language preference in that case — a miss is harmless.
function getStoredLang(): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(LANG_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storedLang(): UILang {
  const raw = getStoredLang();
  if (raw === "en" || raw === "hi") return raw;
  const nav = navigator.language ?? "";
  return SUPPORTED_LANGS.includes(nav.slice(0, 2) as UILang) ? (nav.slice(0, 2) as UILang) : "en";
}

export function setLanguage(lang: UILang): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Storage unavailable (private mode / test env): keep the session language.
  }
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

// Keep <html lang> and the PWA description in sync with the active language.
function syncDocumentLang(lng: string): void {
  document.documentElement.lang = lng;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", i18n.t("app.description", { lng }));
}

i18n.on("languageChanged", syncDocumentLang);
syncDocumentLang(i18n.language);

export default i18n;