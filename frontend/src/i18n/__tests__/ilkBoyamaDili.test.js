/**
 * İLK BOYAMA DİLİ — `index.html`'deki açılış script'i (MOGEM-642 · Faz 2).
 *
 * Neden: `initializeI18n()` belge yönünü ancak `await loadStartupMessages()`
 * bittikten SONRA uyguluyor. Sözlük parçası ağdan gelene kadar Arapça
 * kullanıcı `lang="tr"` ve LTR bir belge görüyor. `index.html`'e konan satır
 * içi script kararı ~1 ms'te veriyor.
 *
 * Bu test script'i `index.html`'DEN OKUR — yani üretime giden metnin ta
 * kendisini çalıştırır — ve kararını `resolveLang()` ile karşılaştırır.
 * Kopya mantık sessizce ayrışırsa (biri localStorage'ı "auto" çerezinin önüne
 * alır, diğeri almaz) ziyaretçi sayfanın dil değiştirmesini görür.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { JSDOM } from "jsdom";

const KOK = fileURLToPath(new URL("../../..", import.meta.url));

/** `index.html`'deki açılış script'inin gövdesi. */
function scriptGovdesi() {
  const html = readFileSync(`${KOK}/index.html`, "utf8");
  const eslesme = /<script>\s*\(function \(\) \{([\s\S]*?)\}\)\(\);\s*<\/script>/g;
  for (const m of html.matchAll(eslesme)) {
    if (m[1].includes("__thDil")) return m[0].replace(/^<script>/, "").replace(/<\/script>$/, "");
  }
  throw new Error("index.html'de dil açılış script'i bulunamadı (__thDil)");
}

function sahteDepo(baslangic = {}) {
  const m = { ...baslangic };
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null),
    setItem: (k, v) => {
      m[k] = String(v);
    },
    removeItem: (k) => {
      delete m[k];
    },
    clear: () => {
      for (const k of Object.keys(m)) delete m[k];
    },
  };
}

function ortam(s) {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: "http://localhost/panel/",
  });
  for (const [ad, deger] of Object.entries(s.cerez ?? {})) {
    dom.window.document.cookie = `${ad}=${encodeURIComponent(deger)}; Path=/`;
  }
  return {
    dom,
    document: dom.window.document,
    localStorage: sahteDepo(s.depo ?? {}),
    location: { search: s.search ?? "", href: "http://localhost/panel/", protocol: "http:" },
    navigator: { language: s.tarayici ?? "" },
    URLSearchParams: dom.window.URLSearchParams,
  };
}

function scriptiCalistir(o) {
  const pencere = {};
  new Function(
    "window",
    "document",
    "location",
    "navigator",
    "localStorage",
    "URLSearchParams",
    scriptGovdesi()
  )(pencere, o.document, o.location, o.navigator, o.localStorage, o.URLSearchParams);
  return pencere.__thDil;
}

/** Modül tarafının aynı senaryodaki kararı (i18n/index.js:detectLang sırası). */
async function modulKarari(o) {
  const onceki = {
    document: globalThis.document,
    localStorage: globalThis.localStorage,
  };
  globalThis.document = o.document;
  globalThis.localStorage = o.localStorage;
  try {
    const { readAutoLang, readLangParam, readManualLang, resolveLang } =
      await import("../languageChoice.js");
    return resolveLang({
      hl: readLangParam(o.location.search),
      manuel: readManualLang(),
      otomatik: readAutoLang(),
      tarayici: o.navigator.language,
    });
  } finally {
    globalThis.document = onceki.document;
    globalThis.localStorage = onceki.localStorage;
  }
}

const SENARYOLAR = [
  { ad: "ipucu yok → varsayılan", tarayici: "" },
  { ad: "yalnız tarayıcı Türkçe", tarayici: "tr-TR" },
  { ad: "tarayıcı desteklenmeyen dilde", tarayici: "de-DE" },
  { ad: "?hl=ar her şeyi ezer", search: "?hl=ar", tarayici: "tr-TR" },
  { ad: "?lang=ru takma adı", search: "?lang=ru", tarayici: "tr-TR" },
  { ad: "?hl=de desteklenmiyor", search: "?hl=de", tarayici: "ru-RU" },
  {
    ad: "elle seçim çerezi",
    cerez: { "th-lang": "ar", "th-lang-source": "manual" },
    tarayici: "tr-TR",
  },
  {
    ad: "storefront'un otomatik kararı (auto çerezi) miras alınır",
    cerez: { "th-lang": "ru" },
    tarayici: "tr-TR",
  },
  {
    ad: "kaynak işareti olmadan çerez elle seçim SAYILMAZ (auto olur)",
    cerez: { "th-lang": "ru", "th-lang-source": "auto" },
    tarayici: "tr-TR",
  },
  {
    ad: "panelin eski localStorage seçimi, auto çerezinden ÜSTÜN",
    cerez: { "th-lang": "ru" },
    depo: { "th-lang": "ar" },
    tarayici: "tr-TR",
  },
  {
    ad: "elle seçim çerezi localStorage'ı da ezer",
    cerez: { "th-lang": "ru", "th-lang-source": "manual" },
    depo: { "th-lang": "ar" },
    tarayici: "tr-TR",
  },
  { ad: "yalnız localStorage", depo: { "th-lang": "ar" }, tarayici: "tr-TR" },
  { ad: "geçersiz localStorage değeri", depo: { "th-lang": "zz" }, tarayici: "ru-RU" },
];

for (const s of SENARYOLAR) {
  test(`ilk boyama dili — ${s.ad}`, async () => {
    const o = ortam(s);
    const script = scriptiCalistir(o); // ÖNCE: script salt okur
    const modul = await modulKarari(o); // SONRA: readManualLang() çereze yazabilir
    assert.equal(script.lang, modul.lang, `dil ayrıştı (${s.ad})`);
    assert.equal(script.kaynak, modul.kaynak, `kaynak ayrıştı (${s.ad})`);
  });
}

test("ilk boyama dili — belge nitelikleri yazılıyor", () => {
  const o = ortam({ search: "?hl=ar" });
  scriptiCalistir(o);
  assert.equal(o.document.documentElement.lang, "ar");
  assert.equal(o.document.documentElement.dir, "rtl");
});

test("ilk boyama dili — RTL olmayan dilde dir açıkça ltr", () => {
  const o = ortam({ search: "?hl=ru" });
  scriptiCalistir(o);
  assert.equal(o.document.documentElement.dir, "ltr");
});

test("ilk boyama dili — SALT OKUR, tercihi yazmaz", () => {
  // Tercihi iki yerden yazmak iki farklı "kaynak" değeri üretme riskidir:
  // script "auto", modül "manual" yazsaydı ülke tespiti bir daha çalışmazdı.
  const o = ortam({ search: "?hl=ar" });
  const cerezOnce = o.document.cookie;
  scriptiCalistir(o);
  assert.equal(o.document.cookie, cerezOnce);
  assert.equal(o.localStorage.getItem("th-lang"), null);
});

test("ilk boyama dili — çerez erişimi patlarsa karar yine verilir", () => {
  const o = ortam({ tarayici: "ru-RU" });
  Object.defineProperty(o.document, "cookie", {
    configurable: true,
    get() {
      throw new Error("çerez engelli");
    },
  });
  const karar = scriptiCalistir(o);
  assert.equal(karar.lang, "ru");
});

test("ilk boyama dili — çerez sözleşmesi storefront ile aynı adları kullanıyor", async () => {
  // Çerez ADI ya da kaynak işareti bir tarafta değişirse köprü SESSİZCE
  // kopar: iki uygulama da açılır, yalnız tercih taşınmaz.
  const govde = scriptGovdesi();
  const { LANG_COOKIE_KEY, LANG_SOURCE_COOKIE_KEY, LANG_STORAGE_KEY } =
    await import("../languageChoice.js");
  for (const ad of [LANG_COOKIE_KEY, LANG_SOURCE_COOKIE_KEY, LANG_STORAGE_KEY]) {
    assert.ok(govde.includes(`"${ad}"`), `${ad} script'te geçmiyor`);
  }
});
