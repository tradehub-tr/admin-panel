import { createI18n } from "vue-i18n";
import { FALLBACK_LANG, loadFallbackMessages, loadStartupMessages } from "./localeLoader";

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
        fallbackLocale: FALLBACK_LANG,
        messages,
        // Fallback sözlüğü açılışta yok; ilk eksik anahtarda tembel yüklenir
        // (bkz. localeLoader.loadStartupMessages). Yüklenene kadar vue-i18n
        // anahtarı basar, sözlük gelince reaktif olarak yeniden render eder.
        missing: (_locale, key) => ensureFallbackLoaded(key),
        missingWarn: false,
        fallbackWarn: false,
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

let fallbackInstalled = false;

/** Eksik anahtar görülünce İngilizce sözlüğü bir kez yükleyip i18n'e takar. */
function ensureFallbackLoaded() {
  if (fallbackInstalled || !i18n) return;
  const available = i18n.global.availableLocales || [];
  if (available.includes(FALLBACK_LANG)) {
    fallbackInstalled = true;
    return;
  }
  fallbackInstalled = true; // aynı render'daki yüzlerce missing çağrısı tek yükleme
  loadFallbackMessages()
    .then((messages) => i18n.global.setLocaleMessage(FALLBACK_LANG, messages))
    .catch((e) => {
      fallbackInstalled = false;
      console.warn("i18n fallback sözlüğü yüklenemedi:", e?.message);
    });
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
