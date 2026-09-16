/**
 * DİL KARARI — panel tarafı öncelik sırası ve çerez köprüsü (MOGEM-642).
 *
 * NEDEN: panel `localStorage.th-lang`, storefront `localStorage.i18nextLng`
 * kullanıyordu. İki depo birbirini görmediği için aynı kullanıcı, mağaza
 * yüzünde Arapça seçtikten sonra panele girince İngilizce karşılanıyordu
 * (ölçüldü 16 Eyl 2026). Köprü artık ORTAK çerez.
 *
 * Bu dosya aynı zamanda İKİ REPO ARASINDAKİ SÖZLEŞMEYİ kilitler: çerez
 * adları ve ömrü storefront'taki `tradehubfront/src/i18n/languageChoice.ts`
 * ile birebir aynı olmak zorunda. Kod paylaşılamıyor (ayrı repo), bu yüzden
 * sabitler burada açıkça yazılı — biri değişirse köprü sessizce kopardı.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  HL_PARAM_NAMES,
  LANG_COOKIE_KEY,
  LANG_COOKIE_MAX_AGE,
  LANG_SOURCE_COOKIE_KEY,
  LANG_STORAGE_KEY,
  normalizeLang,
  readCookie,
  readLangParam,
  resolveLang,
  stripLangParam,
} from "../languageChoice.js";

/* ── Öncelik sırası ─────────────────────────────────────────────────── */

test("?hl= her şeyin üstünde — paylaşılan bağlantı işlevini korur", () => {
  assert.deepEqual(resolveLang({ hl: "ar", manuel: "tr", otomatik: "ru", tarayici: "en" }), {
    lang: "ar",
    kaynak: "hl",
  });
});

test("elle seçim, storefront'un otomatik kararını ezer", () => {
  assert.deepEqual(resolveLang({ manuel: "tr", otomatik: "ru", tarayici: "en" }), {
    lang: "tr",
    kaynak: "manual",
  });
});

test("seçim yoksa storefront'un otomatik kararı miras alınır", () => {
  // Ziyaretçi mağaza yüzünde Rusya'dan girip Rusça gördüyse panel de Rusça
  // açılmalı; aksi hâlde köprü yalnız tek yönde çalışırdı.
  assert.deepEqual(resolveLang({ otomatik: "ru", tarayici: "en" }), {
    lang: "ru",
    kaynak: "auto",
  });
});

test("hiçbir tercih yoksa tarayıcı dili, o da yoksa İngilizce", () => {
  assert.deepEqual(resolveLang({ tarayici: "tr-TR" }), { lang: "tr", kaynak: "browser" });
  assert.deepEqual(resolveLang({}), { lang: "en", kaynak: "default" });
  assert.deepEqual(resolveLang({ tarayici: "de" }), { lang: "en", kaynak: "default" });
});

test("desteklenmeyen değer sessizce atlanır, sonraki kaynağa düşer", () => {
  assert.deepEqual(resolveLang({ hl: "de", manuel: "tr" }), { lang: "tr", kaynak: "manual" });
});

/* ── Parametre okuma ve adres temizleme ─────────────────────────────── */

test("?hl= ve ?lang= okunur, hl önce gelir", () => {
  assert.equal(readLangParam("?hl=ar"), "ar");
  assert.equal(readLangParam("?lang=TR"), "tr");
  assert.equal(readLangParam("?lang=tr&hl=ar"), "ar");
});

test("desteklenmeyen dil null — panel hata vermez", () => {
  assert.equal(readLangParam("?hl=de"), null);
  assert.equal(readLangParam(""), null);
});

test("stripLangParam kullanıcının sorgusunu ve çapasını korur", () => {
  assert.equal(
    stripLangParam("/panel/siparisler?hl=ar&durum=acik"),
    "/panel/siparisler?durum=acik"
  );
  assert.equal(stripLangParam("/panel/?hl=ru#tablo"), "/panel/#tablo");
  assert.equal(stripLangParam("/panel/?durum=acik"), "/panel/?durum=acik");
});

/* ── Çerez ayrıştırma ───────────────────────────────────────────────── */

test("çerez ayrıştırma — benzer adlı çerez yanlışlıkla eşleşmez", () => {
  // "th-lang-source" adı "th-lang" ile başlar; naif bir `startsWith`
  // araması kaynak çerezini dil çerezi sanardı.
  assert.equal(readCookie("th-lang", "th-lang-source=manual"), null);
  assert.equal(readCookie("th-lang", "th-lang-source=manual; th-lang=ru"), "ru");
  assert.equal(readCookie("th-lang", "x=1; th-lang=ar; y=2"), "ar");
});

test("yüzdelik kodlama çözülür", () => {
  assert.equal(readCookie("t", "t=%C3%A7"), "ç");
});

test("normalizeLang biçimleri tekleştirir, desteklenmeyeni eler", () => {
  assert.equal(normalizeLang("TR"), "tr");
  assert.equal(normalizeLang("ar-SA"), "ar");
  assert.equal(normalizeLang(" ru "), "ru");
  assert.equal(normalizeLang("de"), null);
  assert.equal(normalizeLang(null), null);
});

/* ── İki repo arası sözleşme ────────────────────────────────────────── */

test("çerez sözleşmesi storefront ile AYNI", () => {
  // Eşi: tradehubfront/src/i18n/__tests__/dilKarari.test.ts
  // → "çerez adı ve ömrü panelle ORTAK sözleşme"
  assert.equal(LANG_COOKIE_KEY, "th-lang");
  assert.equal(LANG_SOURCE_COOKIE_KEY, "th-lang-source");
  assert.equal(LANG_COOKIE_MAX_AGE, 31536000);
  assert.deepEqual([...HL_PARAM_NAMES], ["hl", "lang"]);
});

test("panelin localStorage anahtarı değişmedi — eski seçimler okunabilmeli", () => {
  // Bu anahtar değişirse yayın anında her panel kullanıcısının dil tercihi
  // sıfırlanır; `readManualLang` geçişi tam olarak bunu önlüyor.
  assert.equal(LANG_STORAGE_KEY, "th-lang");
});

/* ── Depolama bağlı davranış (stub'lı) ──────────────────────────────── */

/**
 * `document.cookie` taklidi — GERÇEK tarayıcı davranışını taklit eder:
 * atama tek bir çerezi ekler/değiştirir, okuma hepsini `ad=değer; …` olarak
 * verir. Düz bir string alanı kullansaydık ikinci yazma birincisini silerdi
 * ve "dil + kaynak birlikte yazılır" testi yanlışlıkla geçerdi.
 */
function sahteCerezKavanozu() {
  const kutu = new Map();
  return {
    get cookie() {
      return [...kutu].map(([a, d]) => `${a}=${d}`).join("; ");
    },
    set cookie(satir) {
      const [ciftler] = satir.split(";");
      const esittir = ciftler.indexOf("=");
      const ad = ciftler.slice(0, esittir).trim();
      const deger = ciftler.slice(esittir + 1).trim();
      if (/Max-Age=0\b/.test(satir)) kutu.delete(ad);
      else kutu.set(ad, deger);
    },
    documentElement: {},
  };
}

function ortamKur({ cerezler = {}, depo = {} } = {}) {
  const belge = sahteCerezKavanozu();
  for (const [a, d] of Object.entries(cerezler)) belge.cookie = `${a}=${d}`;
  const eskiler = {};
  const kur = (ad, deger) => {
    eskiler[ad] = Object.getOwnPropertyDescriptor(globalThis, ad);
    Object.defineProperty(globalThis, ad, { configurable: true, value: deger });
  };
  kur("document", belge);
  kur("location", { protocol: "http:", search: "", href: "http://localhost/panel/" });
  const harita = new Map(Object.entries(depo));
  kur("localStorage", {
    getItem: (k) => (harita.has(k) ? harita.get(k) : null),
    setItem: (k, v) => harita.set(k, String(v)),
  });
  return {
    belge,
    depo: harita,
    geriAl() {
      for (const [ad, tanim] of Object.entries(eskiler)) {
        if (tanim) Object.defineProperty(globalThis, ad, tanim);
        else delete globalThis[ad];
      }
    },
  };
}

test("readManualLang: çerez 'manual' ise dili döner", async () => {
  const o = ortamKur({ cerezler: { "th-lang": "ar", "th-lang-source": "manual" } });
  try {
    const { readManualLang } = await import("../languageChoice.js");
    assert.equal(readManualLang(), "ar");
  } finally {
    o.geriAl();
  }
});

test("readManualLang: çerez 'auto' ise elle seçim SAYILMAZ", async () => {
  // Kusurun kendisi: kaynağa bakmasaydık storefront'un otomatik kararı
  // "kullanıcı seçti" sanılır, ülke tespiti bir daha hiç çalışmazdı.
  const o = ortamKur({ cerezler: { "th-lang": "en", "th-lang-source": "auto" } });
  try {
    const { readManualLang, readAutoLang } = await import("../languageChoice.js");
    assert.equal(readManualLang(), null);
    assert.equal(readAutoLang(), "en"); // otomatik basamakta görünür
  } finally {
    o.geriAl();
  }
});

test("readManualLang: çerez yoksa ESKİ localStorage seçimi çereze taşınır", async () => {
  // Bu özellik yayına çıktığında dilini çoktan seçmiş panel kullanıcıları
  // tercihlerini kaybetmemeli. Panelde localStorage'a yalnız setLanguage()
  // yazdığı için oradaki değer her zaman kullanıcının kendi seçimidir.
  const o = ortamKur({ depo: { "th-lang": "ru" } });
  try {
    const { readManualLang } = await import("../languageChoice.js");
    assert.equal(readManualLang(), "ru");
    assert.match(o.belge.cookie, /th-lang=ru/);
    assert.match(o.belge.cookie, /th-lang-source=manual/);
  } finally {
    o.geriAl();
  }
});

test("writeLangCookie dili ve kaynağı BİRLİKTE yazar", async () => {
  const o = ortamKur();
  try {
    const { writeLangCookie, readCookie: oku } = await import("../languageChoice.js");
    writeLangCookie("ar", "manual");
    assert.equal(oku("th-lang"), "ar");
    assert.equal(oku("th-lang-source"), "manual");
  } finally {
    o.geriAl();
  }
});

test("readAutoLang: 'manual' çerezi otomatik basamakta GÖRÜNMEZ", async () => {
  // İki basamağın aynı çerezi okuduğu yerde ayrım kaynak alanında; bu test
  // ayrımın ters yönünü kilitler.
  const o = ortamKur({ cerezler: { "th-lang": "tr", "th-lang-source": "manual" } });
  try {
    const { readAutoLang } = await import("../languageChoice.js");
    assert.equal(readAutoLang(), null);
  } finally {
    o.geriAl();
  }
});
