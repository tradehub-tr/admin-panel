import api from "@/utils/api";

/**
 * `Media Crop Intent` uçları — Crop Studio'nun sunucuya dokunduğu TEK yer.
 *
 * Ayrı bir modül olmasının nedeni test edilebilirlik: `useCropStudio` saf
 * kalmalı ve Node'un yerleşik koşucusunda (`node --test`) import edilebilmeli.
 * `@/utils/api` modül düzeyinde `import.meta.env` okuyor, yani Vite dışında
 * import edilemez (ölçüldü: `Cannot read properties of undefined (reading
 * 'VITE_API_BASE')`). Bu yüzden composable bu modülü **dinamik** import eder;
 * testler `saveIntent` enjekte ederek bu yolu hiç çalıştırmaz.
 *
 * Uçlar `tradehub_core/api/media_crop.py` içinde. Kütüphane
 * (`media/pipeline/api/crop.py`) saf Python'dur ve whitelist TAŞIMAZ — panelin
 * eskiden gösterdiği `...pipeline.api.crop.save_intent` yolu hiçbir zaman
 * çağrılabilir değildi.
 */

export const SAVE_METHOD = "tradehub_core.api.media_crop.save_intent";
export const GET_METHOD = "tradehub_core.api.media_crop.get_intent";
export const SUGGEST_METHOD = "tradehub_core.api.media_crop.suggest_focal";

/**
 * Kırpma niyetini kaydeder. **İdempotent** — aynı varlık için ikinci çağrı
 * yeni kayıt açmaz, mevcudu günceller (`autoname: field:asset`).
 *
 * @param {object} payload `useCropStudio.savePayload` çıktısı + `asset`.
 * @returns {Promise<object>} Sunucu gövdesi (`intent`, `windows`, `etag`).
 */
export async function saveCropIntent(payload) {
  const { overrides, safe_area: guvenli, ...rest } = payload;
  // Frappe form-encoded gövdede iç içe diziyi/sözlüğü taşıyamaz; uç JSON
  // dizgesini çözmeyi biliyor (`api/media_crop._cozumle`).
  //
  // `safe_area` boş sözlük olarak da GÖNDERİLİR ve bu bilinçlidir: uç
  // `None` (dokunma) ile `{}` (güvenli alanı SİL) ayrımını koruyor
  // (`_parse_safe_area`). Alanı hiç göndermemek, kullanıcı yakınlaştırmayı
  // 1×'e döndürdüğünde eski güvenli alanın kayıtta kalması demekti.
  const res = await api.callMethod(SAVE_METHOD, {
    ...rest,
    safe_area: JSON.stringify(guvenli || {}),
    overrides: JSON.stringify(overrides || []),
  });
  return res?.message ?? res;
}

/**
 * Odak önerisi ister. **Yazmaz** — öneri kullanıcı onayına sunulur.
 *
 * Sunucu tercih edilir çünkü ölçümü EXIF rotasyonu uygulanmış 32×32 LANCZOS
 * ızgarada yapıyor; panelin yedek yolu tarayıcının çözdüğü bitmap üzerinde
 * çalışır ve aynı sayıyı vermez. Uç dakikada 30 çağrıyla sınırlı
 * (`SUGGEST_RATE_LIMIT_CALLS`), stüdyodaki insan hızının çok üstünde.
 *
 * @returns {Promise<object>} `{asset, slot_key, suggestion, applied, windows}`.
 */
export async function suggestCropFocal(asset) {
  const res = await api.callMethod(SUGGEST_METHOD, { asset });
  return res?.message ?? res;
}

/** Kayıtlı niyeti okur. Niyet yoksa `exists: false` ile 200 döner (404 DEĞİL). */
export async function getCropIntent(asset) {
  const res = await api.callMethod(GET_METHOD, { asset });
  return res?.message ?? res;
}
