import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { createServer } from "vite";

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));

function replaceGlobal(name, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, value });
  return () => {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  };
}

test("eşzamanlı i18n başlatmaları aynı örneği döndürür", async () => {
  const restoreLocalStorage = replaceGlobal("localStorage", {
    getItem: () => "tr",
    setItem: () => {},
  });
  const restoreNavigator = replaceGlobal("navigator", { language: "tr-TR" });
  const restoreDocument = replaceGlobal("document", {
    documentElement: {},
    createElement: () => ({}),
    cookie: "",
  });
  // `location` ve `history`: dil kararı MOGEM-642 ile `?hl=` parametresini
  // okumaya ve adresi `replaceState` ile temizlemeye başladı. Node'da ikisi
  // de yok; stub olmadan `detectLang()` daha ilk satırda ReferenceError verir.
  const restoreLocation = replaceGlobal("location", {
    search: "",
    href: "http://localhost/panel/",
    protocol: "http:",
  });
  const restoreHistory = replaceGlobal("history", { state: null, replaceState: () => {} });
  const server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { initializeI18n } = await server.ssrLoadModule("/src/i18n/index.js");
    const [first, second] = await Promise.all([initializeI18n(), initializeI18n()]);

    assert.strictEqual(first, second);
  } finally {
    await server.close();
    restoreHistory();
    restoreLocation();
    restoreDocument();
    restoreNavigator();
    restoreLocalStorage();
  }
});

/**
 * `setLanguage()` çerezi KENDİSİ yazmalı — localStorage kapalı olsa bile.
 *
 * NEDEN AYRI TEST: E2E ile ölçülemiyor. İki dil seçici de (`LanguageSwitcher`
 * ve `AppHeader`'ın ⋯ menüsü) seçimden sonra `window.location.reload()`
 * çağırıyor; yeniden yüklemede `readManualLang()` localStorage'daki seçimi
 * bulup çereze TAŞIYOR. Yani `setLanguage` içindeki çerez yazımını silseniz
 * bile E2E yeşil kalıyor — ölçüldü 16 Eyl 2026, karşı kanıt turu maskelendi.
 *
 * Maskenin kalktığı tek durum localStorage'ın yazılamadığı hâl (gizli sekme,
 * izin reddi): orada taşınacak bir seçim yok ve çerez tek kurtarıcı. Çerez
 * yazımının `setLanguage` içinde AYRI bir `try` bloğunda olması da bunun için.
 */
test("setLanguage: localStorage yazılamıyorsa bile çerez yazılır", async () => {
  const yazilanlar = [];
  const restoreLocalStorage = replaceGlobal("localStorage", {
    getItem: () => null,
    setItem: () => {
      throw new Error("QuotaExceeded"); // gizli sekme / izin reddi
    },
  });
  const restoreNavigator = replaceGlobal("navigator", { language: "en-US" });
  const restoreDocument = replaceGlobal("document", {
    documentElement: {},
    createElement: () => ({}),
    get cookie() {
      return yazilanlar.join("; ");
    },
    set cookie(satir) {
      yazilanlar.push(satir.split(";")[0]);
    },
  });
  const restoreLocation = replaceGlobal("location", {
    search: "",
    href: "http://localhost/panel/",
    protocol: "http:",
  });
  const restoreHistory = replaceGlobal("history", { state: null, replaceState: () => {} });

  const server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { setLanguage } = await server.ssrLoadModule("/src/i18n/index.js");
    setLanguage("ru");

    assert.ok(
      yazilanlar.includes("th-lang=ru"),
      `dil çerezi yazılmadı, yazılanlar: ${JSON.stringify(yazilanlar)}`
    );
    assert.ok(
      yazilanlar.includes("th-lang-source=manual"),
      `kaynak çerezi yazılmadı, yazılanlar: ${JSON.stringify(yazilanlar)}`
    );
  } finally {
    await server.close();
    restoreHistory();
    restoreLocation();
    restoreDocument();
    restoreNavigator();
    restoreLocalStorage();
  }
});
