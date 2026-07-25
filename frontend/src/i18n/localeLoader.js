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

export async function loadStartupMessages(lang) {
  const languages = lang === "en" ? ["en"] : ["en", lang];
  const entries = await Promise.all(
    languages.map(async (code) => [code, await loadLocaleMessages(code)])
  );
  return Object.fromEntries(entries);
}
