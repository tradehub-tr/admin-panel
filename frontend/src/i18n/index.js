import { createI18n } from "vue-i18n";
import { FALLBACK_LANG, loadFallbackMessages, loadStartupMessages } from "./localeLoader";
import {
  LANG_STORAGE_KEY,
  SUPPORTED_LANGS,
  readAutoLang,
  readLangParam,
  readManualLang,
  resolveLang,
  writeLangCookie,
} from "./languageChoice";

export { SUPPORTED_LANGS };
export const RTL_LANGS = ["ar"];

/**
 * Panelin açılış dili (MOGEM-642 · Faz 1).
 *
 * Eskiden yalnız `localStorage.th-lang` okunuyordu; storefront'ta seçilen dil
 * panele hiç geçmiyordu çünkü storefront ayrı bir anahtar (`i18nextLng`)
 * kullanıyor. Karar artık ortak çerez üzerinden veriliyor — sıra ve gerekçesi
 * `languageChoice.js:resolveLang`'da.
 */
function detectLang() {
  return resolveLang({
    hl: readLangParam(location.search),
    manuel: readManualLang(),
    otomatik: readAutoLang(),
    tarayici: navigator.language,
  }).lang;
}

export let i18n = null;
let i18nInitializationPromise = null;

export function initializeI18n() {
  if (i18n) return Promise.resolve(i18n);
  if (!i18nInitializationPromise) {
    i18nInitializationPromise = (async () => {
      const locale = detectLang();
      uygulaDilYanEtkileri(locale);
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
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // localStorage kapalı (gizli sekme): seçim çerezde yaşar.
  }
  // Çerez AYRI try içinde — localStorage hata verse bile yazılmalı; storefront
  // ve sunucu tercihi ancak buradan görüyor.
  writeLangCookie(lang, "manual");
  applyDocumentDirection(lang);
}

/**
 * Açılışta `?hl=` geldiyse tercihi KALICILAŞTIRIR.
 *
 * Adresi burada TEMİZLEMİYORUZ. Denendi ve ölçüldü (16 Eyl 2026, gerçek
 * tarayıcı): `history.replaceState` çağrılıyor ama parametre adreste geri
 * beliriyordu. Sebep sıralama — `main.js:4` router'ı modül yükleme anında
 * import ediyor, `createWebHistory()` o anda `?hl=ru` taşıyan konumu
 * kaydediyor; `app.use(router)` ilk navigasyonu yaparken kendi kaydını geri
 * yazıyor. SPA'da adresin sahibi router'dır, arkasından iş yapılmaz —
 * temizlik `main.js`'te `router.isReady()` sonrasına taşındı.
 *
 * `detectLang()` SAF kalsın diye ayrıldı: testte dil kararı yan etkisiz
 * ölçülebilmeli.
 */
function uygulaDilYanEtkileri(locale) {
  if (!readLangParam(location.search)) return;
  // Bağlantıyla gelen dil kalıcı tercih sayılır; ikinci sayfada geri dönmesi
  // bağlantıyı işlevsiz kılardı.
  writeLangCookie(locale, "manual");
  try {
    localStorage.setItem(LANG_STORAGE_KEY, locale);
  } catch {
    // localStorage kapalı — çerez yeterli.
  }
}
