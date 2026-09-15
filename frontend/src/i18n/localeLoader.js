const localeLoaders = {
  en: () => import("./locales/en.js"),
  tr: () => import("./locales/tr.js"),
  ar: () => import("./locales/ar.js"),
  ru: () => import("./locales/ru.js"),
};

const messageCache = new Map();

export async function loadLocaleMessages(lang) {
  if (messageCache.has(lang)) return messageCache.get(lang);
  const load = localeLoaders[lang];
  if (!load) throw new Error(`Desteklenmeyen dil: ${lang}`);
  const messages = (await load()).default;
  messageCache.set(lang, messages);
  return messages;
}

// Açılışta YALNIZ aktif dil. Eskiden İngilizce de her dil için fallback diye
// peşinen indiriliyordu: tr açılışında tr+en = 711 KB ham / 246 KB gzip,
// mount'tan önce (MOGEM-638 §3.3). tr ile en arasında ~40 anahtar fark var;
// fallback gerekince `loadFallbackMessages` onu ilk eksik anahtarda getirir.
export async function loadStartupMessages(lang) {
  return { [lang]: await loadLocaleMessages(lang) };
}

export const FALLBACK_LANG = "en";
let fallbackPromise = null;

/** İngilizce fallback sözlüğünü bir kez, ihtiyaç anında yükler. */
export function loadFallbackMessages() {
  if (!fallbackPromise) {
    fallbackPromise = loadLocaleMessages(FALLBACK_LANG).catch((e) => {
      fallbackPromise = null;
      throw e;
    });
  }
  return fallbackPromise;
}
