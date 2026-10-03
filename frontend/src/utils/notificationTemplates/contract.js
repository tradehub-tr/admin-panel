// Bildirim şablonları — API sözleşmesi yardımcıları (saf; `node --test` ile sınanır).
//
// Hata gövdesi her zaman `message.error_code` taşır (409 REVISION_CONFLICT, 422
// VALIDATION_FAILED, 404 NOT_FOUND, 429 RATE_LIMITED, 503 PROVIDER_UNAVAILABLE).
// `request()` HTTP durumunu `err.status`, ham gövdeyi `err.body` olarak taşır.
// İstemci `src/api/notificationTemplates.js` bunları kullanır ve yeniden dışa aktarır.

/** Sunucunun desteklediği filtre değerleri — bilinmeyen değer gönderilmez (422 alırdı). */
const SERVER_FILTERS = Object.freeze({
  translation: new Set(["hazir", "bekliyor", "kopya", "eksik"]),
  publish: new Set(["yayinda", "yayinda-taslak", "taslak"]),
});

export const payloadOf = (err) => {
  const message = err?.body?.message;
  return message && typeof message === "object" ? message : {};
};

/** Hata gövdesinden kullanıcıya gösterilecek Türkçe metin. */
export function errorText(err) {
  const p = payloadOf(err);
  const fields = p.field_errors ? Object.values(p.field_errors).filter(Boolean) : [];
  if (fields.length) return fields.join(" ");
  if (typeof p.message === "string" && p.message) return p.message;
  return err?.message || "İşlem tamamlanamadı.";
}

/**
 * Panel filtresini sunucu filtresine indirger. Panelde ayrıca "tam" / "var" (tüm diller
 * hazır / hazır olmayan dil var) seçenekleri vardır; sunucuda karşılığı yok, istemcide süzülür.
 */
export function serverFilters(params = {}) {
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === "" || value === null || value === undefined) continue;
    if (SERVER_FILTERS[key] && !SERVER_FILTERS[key].has(value)) continue;
    out[key] = value;
  }
  return out;
}

/** İstemci kimliği: aynı `request_id` ikinci ileti üretmez (yeniden denemede aynısı gönderilir). */
export function newRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // Güvenli bağlam dışı (çok eski tarayıcı) yedeği: RFC 4122 v4 biçimi.
  const b = globalThis.crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** 409 çakışma mı? Öyleyse `{ error_code, revision, theirs, saved_by, saved_at }`, değilse `null`. */
export const conflictOf = (err) =>
  err?.status === 409 && payloadOf(err).error_code === "REVISION_CONFLICT" ? payloadOf(err) : null;

/**
 * 422 doğrulama reddi (içerik sorunu) mı? Öyleyse `{ blocking[], warnings[], field_errors? }`.
 * Yalnız alan hatası taşıyan 422 (ör. test hedefi) içerik reddi sayılmaz → `null`.
 */
export function validationOf(err) {
  if (err?.status !== 422) return null;
  const p = payloadOf(err);
  return p.blocking?.length || p.warnings?.length ? p : null;
}

/** Sağlayıcı yok (503 PROVIDER_UNAVAILABLE) mı? */
export const providerUnavailable = (err) =>
  err?.status === 503 && payloadOf(err).error_code === "PROVIDER_UNAVAILABLE";

/** Hız sınırı (429 RATE_LIMITED) mı? */
export const rateLimited = (err) => err?.status === 429;
