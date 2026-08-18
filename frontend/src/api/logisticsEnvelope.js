// Lojistik yanıt ZARFI — saf mantık, tarayıcı API'si yok.
//
// NEDEN AYRI DOSYA:
//   `src/api/logistics.js` `@/utils/api` üzerinden `localStorage`/`fetch`
//   çekiyor; `node --test` ortamında ikisi de yok. Zarf mantığı orada
//   kaldığı sürece test onu import EDEMİYORDU ve sözleşmeyi birebir
//   kopyalayarak sınıyordu (`__tests__/logistics.test.js`). İki kopya
//   demek, kaynak değiştiğinde testin sessizce eskimesi demek. Zarf buraya
//   alındı: artık test GERÇEK kodu çağırıyor.
//
//   Aynı sebeple bu modül `@/utils/api`'yi import ETMEMELİ — ettiği an
//   testten görünmez olur.
//
// SÖZLEŞME:
//   Lojistik uçları tek bir zarf döndürüyor:
//     başarı → { ok: true,  data: <yük> }
//     hata   → { ok: false, error: { code, message, details? } }
//   Frappe bunu ayrıca `{ message: ... }` içine sarıyor. `unwrap` iki katmanı
//   da açar; çağıran ya doğrudan yükü alır ya `LogisticsApiError` yakalar.
//
// NEDEN TİPLİ HATA:
//   Ekranların hata TÜRÜNE göre dallanması gerekiyor — "bu özellik henüz açık
//   değil" (FEATURE_DISABLED) ile "yetkiniz yok" (PERMISSION_DENIED) farklı
//   ekran gösterir. Mesaj metnine bakarak dallanmak i18n ile kırılır.

/** Hiçbir kaynaktan okunabilir metin çıkmadığında gösterilecek son çare. */
export const FALLBACK_ERROR_MESSAGE = "Beklenmeyen bir hata oluştu.";

/**
 * Ekrana basılacak metni GARANTİ eder — asla "[object Object]" olmaz.
 *
 * NEDEN VAR (ölçülmüş hata): sunucu 417 gövdesinde zarfı döndürüyor,
 * `utils/api.js` genel çözümleyicisi `result.message`'ı (bir NESNE) alıp
 * `String()`'e sokuyor ve kullanıcıya "[object Object]" gösteriliyordu.
 * Mesaj alanına nesne düşme ihtimali olan HER yol buradan geçmeli: bir
 * yerde nesne kaçarsa metin değil, okunabilir bir fallback görünsün.
 *
 * @param {unknown} value Mesaj adayı.
 * @param {string} [fallback] Metin çıkmazsa kullanılacak yedek.
 * @returns {string} Boş olmayan bir string.
 */
export function toDisplayMessage(value, fallback = FALLBACK_ERROR_MESSAGE) {
  if (typeof value === "string") {
    const text = value.trim();
    // `String(nesne)` çıktısı zaten metne dönüşmüş olabilir — onu da ele.
    if (text && text !== "[object Object]") return text;
  } else if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

/** Sözleşmedeki hata kodunu taşıyan hata. */
export class LogisticsApiError extends Error {
  constructor({ code, message, details } = {}) {
    // `message` sunucudan geliyor ve sözleşme dışı bir şey olabilir; ham
    // hâliyle `super()`'e vermek "[object Object]" mesajı üretirdi.
    super(toDisplayMessage(message, toDisplayMessage(code)));
    this.name = "LogisticsApiError";
    /** Kararlı hata kodu — dallanma buna göre yapılır. */
    this.code = code;
    this.details = details ?? null;
  }

  get isPermissionDenied() {
    return this.code === "PERMISSION_DENIED" || this.code === "CAPABILITY_REQUIRED";
  }

  get isFeatureDisabled() {
    return this.code === "FEATURE_DISABLED";
  }

  get isNotFound() {
    return this.code === "NOT_FOUND";
  }
}

/**
 * Frappe + lojistik zarfını açar.
 *
 * `utils/api.js` ağ/HTTP hatalarında zaten `Error` fırlatıyor; burada yalnız
 * uygulama seviyesindeki `{ ok: false }` yanıtı ele alınıyor.
 *
 * @param {unknown} response Ham `api.callMethod*` çıktısı.
 * @returns {any} Zarfın `data` yükü.
 * @throws {LogisticsApiError}
 */
export function unwrap(response) {
  const envelope = response?.message ?? response;

  if (!envelope || typeof envelope !== "object" || !("ok" in envelope)) {
    // Sözleşme dışı yanıt — sessizce geçmek yerine görünür kıl.
    throw new LogisticsApiError({
      code: "INTERNAL_ERROR",
      message: "Beklenmeyen yanıt biçimi (sözleşme zarfı yok).",
    });
  }

  if (!envelope.ok) {
    throw new LogisticsApiError(envelope.error ?? {});
  }
  return envelope.data;
}

/**
 * HTTP hatasında GÖVDEDEKİ sözleşme zarfını kurtarır.
 *
 * NEDEN VAR (ölçülmüş hata): backend validasyon reddini `417 + {ok:false,
 * error:{code:"VALIDATION_ERROR", message:"…"}}` olarak döndürüyor. HTTP
 * başarısız olduğu için `utils/api.js` kendi `Error`'ını fırlatıyor ve
 * `unwrap` zarfa HİÇ ulaşamıyordu: sunucunun düzgün Türkçe mesajı yerine
 * ekranda "[object Object]", kodu yerine `INTERNAL_ERROR` görünüyordu.
 * `buildError` artık ham gövdeyi `err.body`'ye iliştiriyor; zarf sözleşmesini
 * bilen tek yer burası olduğu için çeviri de burada yapılıyor.
 *
 * Zarf yoksa (ağ hatası, oturum sonu yönlendirmesi, Frappe'nin kendi hata
 * biçimi) hata AYNEN geri verilir — uydurma bir kod üretmek, çağıranın hata
 * koduna göre dallanmasını yalanlardı.
 *
 * @param {unknown} e `utils/api.js`'ten gelen hata.
 * @returns {unknown} `LogisticsApiError` ya da girdinin kendisi.
 */
export function rescueLogisticsError(e) {
  if (e instanceof LogisticsApiError) return e;

  const envelope = e?.body?.message ?? e?.body;
  if (envelope && typeof envelope === "object" && envelope.ok === false) {
    const error = new LogisticsApiError(envelope.error ?? {});
    // HTTP durumu tanısal bağlam — çağıran gerekirse okusun, dallanma yine
    // `code` üzerinden yapılır.
    error.status = e?.status ?? 0;
    return error;
  }
  return e;
}
