/**
 * Dil tercihinin ÇEREZ KÖPRÜSÜ — panel tarafı (MOGEM-642 · Faz 1).
 *
 * Neden ayrı dosya: `i18n/index.js` vue-i18n örneğini kuruyor ve DOM'a
 * dokunuyor; buradaki yardımcılar saf tutulunca vue-i18n yüklenmeden test
 * edilebiliyor.
 *
 * Neden çerez: panel ile storefront AYRI uygulama (Vue SPA ↔ Vite MPA) ve
 * ayrı localStorage anahtarı kullanıyordu (`th-lang` ↔ `i18nextLng`). Aynı
 * kullanıcı iki taraf arasında geçerken dili iki kez seçiyordu. Çerez aynı
 * kökte paylaşıldığı için tek tercih iki tarafta da geçerli oluyor.
 *
 * ⚠ Bu dosya storefront'taki `src/i18n/languageChoice.ts` ile AYNI
 * SÖZLEŞMEYİ uygular: çerez adları, `SameSite`/`Path`/`Max-Age` değerleri ve
 * öncelik sırası birebir aynı olmalı. İki repo olduğu için kod paylaşılamıyor;
 * sözleşme `__tests__/dilCerezSozlesmesi.test.js` ile kilitli — orada yazan
 * değerler değişirse test kırmızıya döner.
 */

export const SUPPORTED_LANGS = ["en", "tr", "ar", "ru"];

/** Panelin eski (ve hâlâ yazılan) localStorage anahtarı. */
export const LANG_STORAGE_KEY = "th-lang";

/** Storefront ile ORTAK çerez adları. */
export const LANG_COOKIE_KEY = "th-lang";
export const LANG_SOURCE_COOKIE_KEY = "th-lang-source";

/** Bir yıl — dil tercihi mevsimlik değil. */
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Kabul edilen bağlantı parametreleri; `lang` eski bağlantılar için takma ad. */
export const HL_PARAM_NAMES = ["hl", "lang"];

/** "TR" · "tr-TR" · " tr " → "tr"; desteklenmeyen kodda null. */
export function normalizeLang(raw) {
  if (!raw) return null;
  const kod = String(raw).trim().slice(0, 2).toLowerCase();
  return SUPPORTED_LANGS.includes(kod) ? kod : null;
}

/** Çerez okur; `ham` verilirse onu ayrıştırır (test için saf kullanım). */
export function readCookie(ad, ham) {
  let kaynak = ham;
  if (kaynak === undefined) {
    try {
      kaynak = document.cookie;
    } catch {
      return null;
    }
  }
  if (!kaynak) return null;
  for (const parca of kaynak.split(";")) {
    const esittir = parca.indexOf("=");
    if (esittir < 0) continue;
    if (parca.slice(0, esittir).trim() !== ad) continue;
    try {
      return decodeURIComponent(parca.slice(esittir + 1).trim());
    } catch {
      return parca.slice(esittir + 1).trim();
    }
  }
  return null;
}

/**
 * Çerez yazar. `Secure` yalnız https'te eklenir — http://localhost'ta
 * konsaydı tarayıcı çerezi sessizce atar, lokal geliştirmede dil hiç
 * hatırlanmazdı.
 */
export function writeCookie(ad, deger, maxAge = LANG_COOKIE_MAX_AGE) {
  try {
    const guvenli = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${ad}=${encodeURIComponent(deger)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${guvenli}`;
  } catch {
    // Çerez yazılamıyor: tercih localStorage'da yaşar, panel açılmaya devam eder.
  }
}

/** Tercih çerezini ve kaynağını birlikte yazar — ikisi hiç ayrışmasın. */
export function writeLangCookie(lang, kaynak) {
  writeCookie(LANG_COOKIE_KEY, lang);
  writeCookie(LANG_SOURCE_COOKIE_KEY, kaynak);
}

/** Sorgu dizesinden dil parametresini okur; desteklenmeyen değerde null. */
export function readLangParam(search) {
  if (!search) return null;
  let params;
  try {
    params = new URLSearchParams(search);
  } catch {
    return null;
  }
  for (const ad of HL_PARAM_NAMES) {
    const lang = normalizeLang(params.get(ad));
    if (lang) return lang;
  }
  return null;
}

/**
 * Dil parametrelerini adresten çıkarır, geri kalan sorguyu ve çapayı KORUR.
 * Parametre yoksa girdi aynen döner — çağıran `replaceState` gerekip
 * gerekmediğine buna bakarak karar verir.
 */
export function stripLangParam(url) {
  const [yol, ...sorguParcalari] = url.split("?");
  if (sorguParcalari.length === 0) return url;
  const sorguVeCapa = sorguParcalari.join("?");
  const [sorgu, ...capaParcalari] = sorguVeCapa.split("#");
  const capa = capaParcalari.length ? `#${capaParcalari.join("#")}` : "";

  let params;
  try {
    params = new URLSearchParams(sorgu);
  } catch {
    return url;
  }
  let dokunuldu = false;
  for (const ad of HL_PARAM_NAMES) {
    if (params.has(ad)) {
      params.delete(ad);
      dokunuldu = true;
    }
  }
  if (!dokunuldu) return url;
  const kalan = params.toString();
  return kalan ? `${yol}?${kalan}${capa}` : `${yol}${capa}`;
}

/**
 * Kullanıcının ELLE seçtiği dil.
 *
 * Çerez önce, ama yalnız `th-lang-source=manual` işaretliyse: otomatik karar
 * da aynı çereze yazılıyor ("auto") ve onu kullanıcı seçimi saymak,
 * storefront'ta ülke tespitinin bir daha çalışmaması demekti.
 *
 * Çerez yoksa panelin ESKİ localStorage değeri kabul edilir ve çereze
 * TAŞINIR — bu özellik yayına çıktığında dilini çoktan seçmiş panel
 * kullanıcıları tercihlerini kaybetmesin diye. Panelde localStorage'a
 * yalnızca `setLanguage()` yazıyor (otomatik tespit yazmıyor), bu yüzden
 * oradaki değer her zaman kullanıcının kendi seçimidir.
 */
export function readManualLang() {
  if (readCookie(LANG_SOURCE_COOKIE_KEY) === "manual") {
    const cerez = normalizeLang(readCookie(LANG_COOKIE_KEY));
    if (cerez) return cerez;
  }
  try {
    const eski = normalizeLang(localStorage.getItem(LANG_STORAGE_KEY));
    if (eski) {
      writeLangCookie(eski, "manual"); // geçiş: eski seçimi çereze taşı
      return eski;
    }
  } catch {
    // localStorage yok — çerez de yoksa seçim yapılmamış demektir.
  }
  return null;
}

/** Storefront'un otomatik kararı ("auto" çerez); panel onu miras alır. */
export function readAutoLang() {
  if (readCookie(LANG_SOURCE_COOKIE_KEY) === "manual") return null;
  return normalizeLang(readCookie(LANG_COOKIE_KEY));
}

/**
 * Dil kararının TEK yeri — storefront'takiyle aynı sıra.
 *
 *  1. `?hl=`     — paylaşılan bağlantı her şeyi ezer.
 *  2. elle seçim — kullanıcının kendi kararı otomatik tespitten üstün.
 *  3. otomatik   — storefront'ta ülkeye göre verilmiş karar (çerez "auto").
 *                  Panelin kendi ülke tespiti YOKTUR: buraya giren kullanıcı
 *                  giriş yapmış bir satıcı/yönetici, IP'sine göre dil
 *                  değiştirmek onun için sürpriz olurdu.
 *  4. tarayıcı   — hiçbir tercih yoksa en iyi tahmin.
 *  5. `en`       — her koşulda açılan varsayılan.
 *
 * Her koşulda geçerli bir dil döner; çağıranın hata yakalaması gerekmez.
 */
export function resolveLang(kaynaklar = {}) {
  const hl = normalizeLang(kaynaklar.hl);
  if (hl) return { lang: hl, kaynak: "hl" };

  const manuel = normalizeLang(kaynaklar.manuel);
  if (manuel) return { lang: manuel, kaynak: "manual" };

  const otomatik = normalizeLang(kaynaklar.otomatik);
  if (otomatik) return { lang: otomatik, kaynak: "auto" };

  const tarayici = normalizeLang(kaynaklar.tarayici);
  if (tarayici) return { lang: tarayici, kaynak: "browser" };

  return { lang: "en", kaynak: "default" };
}
