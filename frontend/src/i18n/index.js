import { createI18n } from "vue-i18n";
import en from "./locales/en";
import tr from "./locales/tr";
import ar from "./locales/ar";
import ru from "./locales/ru";

export const SUPPORTED_LANGS = ["en", "tr", "ar", "ru"];
export const RTL_LANGS = ["ar"];

const LANG_STORAGE_KEY = "th-lang";

function detectLang() {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
  const nav = (navigator.language || "en").slice(0, 2);
  return SUPPORTED_LANGS.includes(nav) ? nav : "en";
}

export const i18n = createI18n({
  legacy: false, // Composition API + <script setup>
  globalInjection: true, // enables $t in templates
  locale: detectLang(),
  fallbackLocale: "en",
  messages: { en, tr, ar, ru },
});

export function isRtl(lang) {
  return RTL_LANGS.includes(lang);
}

/** Set <html dir> and <html lang> for the given language. */
export function applyDocumentDirection(lang) {
  document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
  document.documentElement.lang = lang;
}

export function getCurrentLang() {
  return i18n.global.locale.value;
}

/** Change the active language, persist it, and mirror the document direction. */
export function setLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  i18n.global.locale.value = lang;
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  applyDocumentDirection(lang);
}

// Apply dir/lang on first load to match the detected language.
applyDocumentDirection(i18n.global.locale.value);

export default i18n;
