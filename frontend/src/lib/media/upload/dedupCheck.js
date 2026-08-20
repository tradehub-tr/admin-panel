/**
 * Yükleme öncesi tekilleştirme kontrolü (T-042) — "bu dosya kütüphanenizde".
 *
 * **Bu bir UYARI, engel değil.** Sunucu aynı içeriği zaten tekilleştiriyor
 * (Frappe `content_hash` + içerik-adresli adlandırma: aynı dosya ikinci kez
 * diske YAZILMAZ). Buradaki kontrolün tek işi kullanıcıyı yüklemeye
 * BAŞLAMADAN bilgilendirmek; "yine de yükle" her zaman açık kalır ve bu
 * kontrolün herhangi bir aşaması başarısız olursa yükleme NORMAL yoluna
 * devam eder (fail-open). Bir uyarı yardımcısının ağ hatası, yüklemeyi
 * durduran bir kapıya dönüşmemeli.
 *
 * **Hash tarayıcıda hesaplanır** — WebCrypto `crypto.subtle.digest`, yeni
 * bağımlılık yok. `subtle` yalnız güvenli bağlamda (HTTPS/localhost) var;
 * yoksa kontrol sessizce atlanır (fail-open, yine).
 *
 * **Tavan bilinçli:** `arrayBuffer()` dosyanın TAMAMINI belleğe alır —
 * WebCrypto akışlı özet desteklemiyor. 500 MB'a varan videolar için
 * (backend `chunked.py` tavanı) bu kabul edilemez; `DEDUP_MAX_BYTES` üstü
 * dosyada kontrol atlanır. Görsellerin tamamı ve videoların çoğu tavanın
 * altında kalır.
 *
 * **Kapsam sınırı (sunucuda ölçüldü):** eşleşme içerik-adresli dosya adından
 * yapılır (`/files/{sha[:2]}/{sha[:32]}.…`); içerik-adresli adlandırmadan
 * önce yüklenmiş eski dosyalar için uyarı çıkmaz. Eksik uyarı kabul,
 * yanlış pozitif değil — ayrıntı `tradehub_core/media/inventory.find_by_sha256`.
 *
 * Modül SAF tutuldu: `@/utils/api` import ETMEZ (modül düzeyinde
 * `import.meta.env` okuyor, `node --test` altında yüklenemez — ölçülmüş
 * gerekçe `crop/cropIntentApi.js` başlığında). Çağıran `call` enjekte eder.
 */

import { SEVERITY } from "./preflight.js";

/** Sunucudaki uç — `tradehub_core/api/seller_media.py::find_in_my_library`. */
export const DEDUP_METHOD = "tradehub_core.api.seller_media.find_in_my_library";

/**
 * Bulgu kodu. `preflight.REASON` listesine BİLEREK eklenmedi: o liste
 * sunucunun `SEBEP_*` red kodlarının birebir aynası; bu ise reddetmeyen,
 * yalnız istemcide üretilen bir bilgi bulgusu.
 */
export const REASON_DUPLICATE = "duplicate_in_library";

/** Bu boyutun üstünde kontrol atlanır (bellek tavanı — modül başlığı). */
export const DEDUP_MAX_BYTES = 64 * 1024 * 1024;

/**
 * Blob/File içeriğinin SHA-256'sı, 64 haneli küçük harf hex.
 *
 * @param {Blob} blob
 * @param {{subtle?: SubtleCrypto}} [opts] test için enjeksiyon
 * @returns {Promise<string|null>} WebCrypto yoksa `null` (fail-open).
 */
export async function sha256Hex(blob, { subtle = globalThis.crypto?.subtle } = {}) {
  if (!subtle || typeof blob?.arrayBuffer !== "function") return null;
  const buf = await blob.arrayBuffer();
  const digest = await subtle.digest("SHA-256", buf);
  let out = "";
  for (const b of new Uint8Array(digest)) out += b.toString(16).padStart(2, "0");
  return out;
}

/**
 * Dosya satıcının KENDİ kütüphanesinde var mı diye sunucuya sor.
 *
 * Kiracı sınırı sunucuda: uç mağazayı OTURUMDAN çözer, buradan mağaza
 * parametresi gitmez ve başka satıcının dosyası hiçbir koşulda dönmez
 * (`tests/test_media_dedup_endpoint.py` bunu ölçüyor).
 *
 * @param {File|Blob} file
 * @param {{call?: (method: string, args: object) => Promise<any>}} opts
 *   `call`: `api.callMethod` (enjekte edilir — modül saf kalsın).
 * @returns {Promise<{sha256: string, file_url: string, file_name: string, uploaded_at: string}|null>}
 *   Eşleşme yoksa ya da kontrol HERHANGİ bir sebeple yapılamadıysa `null`.
 */
export async function findDuplicateInLibrary(file, { call } = {}) {
  if (typeof call !== "function") return null;
  if (!file || typeof file.size !== "number" || file.size <= 0 || file.size > DEDUP_MAX_BYTES) {
    return null;
  }

  let sha;
  try {
    sha = await sha256Hex(file);
  } catch {
    return null; // okunamayan blob — uyarı yardımcısı yüklemeyi geciktirmez
  }
  if (!sha) return null;

  let body;
  try {
    const res = await call(DEDUP_METHOD, { sha256: sha });
    body = res?.message ?? res; // Frappe gövdesi `{message: …}` sarar
  } catch {
    return null; // ağ/oturum hatası — fail-open
  }
  if (!body || body.found !== true || !body.file) return null;
  return { sha256: sha, ...body.file };
}

/**
 * Eşleşmeyi kuyruk satırına yazılacak bulguya çevir.
 *
 * `severity: WARN` — `hasBlocker` yalnız BLOCK'a bakar, yani bu bulgu
 * yüklemeyi TEK BAŞINA durdurmaz; "yine de yükle" kararı kuyruğun işi.
 * Metin kodda değil çeviride: `media.preflight.reason.duplicate_in_library`
 * (`{name}` parametresiyle), `PreflightPanel.reasonText` deseni.
 */
export function duplicateFinding(match) {
  return {
    reason: REASON_DUPLICATE,
    severity: SEVERITY.WARN,
    params: { name: match?.file_name || match?.file_url || "" },
  };
}
