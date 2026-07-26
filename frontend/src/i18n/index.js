import { createI18n } from "vue-i18n";
import { loadStartupMessages } from "./localeLoader";

export const SUPPORTED_LANGS = ["en", "tr", "ar", "ru"];
export const RTL_LANGS = ["ar"];

const LANG_STORAGE_KEY = "th-lang";

function detectLang() {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
  const nav = (navigator.language || "en").slice(0, 2);
  return SUPPORTED_LANGS.includes(nav) ? nav : "en";
}

export let i18n = null;
let i18nInitializationPromise = null;

export function initializeI18n() {
  if (i18n) return Promise.resolve(i18n);
  if (!i18nInitializationPromise) {
    i18nInitializationPromise = (async () => {
      const locale = detectLang();
      const messages = await loadStartupMessages(locale);
      i18n = createI18n({
        legacy: false,
        globalInjection: true,
        locale,
        fallbackLocale: "en",
        messages,
      });
      applyDocumentDirection(locale);
      return i18n;
    })().catch((error) => {
      i18nInitializationPromise = null;
      throw error;
    });
  }
  return i18nInitializationPromise;
}

export function isRtl(lang) {
  return RTL_LANGS.includes(lang);
}

/** Set <html dir> and <html lang> for the given language. */
export function applyDocumentDirection(lang) {
  document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
  document.documentElement.lang = lang;
}

export function getCurrentLang() {
  return i18n?.global.locale.value || detectLang();
}

/** Change the active language, persist it, and mirror the document direction. */
export function setLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  if (i18n) i18n.global.locale.value = lang;
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  applyDocumentDirection(lang);
}
