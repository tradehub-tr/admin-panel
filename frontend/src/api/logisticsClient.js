// Lojistik API İSTEMCİ ÇEKİRDEĞİ — yeni uç modüllerinin ortak tabanı.
//
// ═══════════════════════════════════════════════════════════════════════
//  SAHİPLİK (16-FE-0 · LOGISTICS-TASK-SPLIT.md)
// ═══════════════════════════════════════════════════════════════════════
//  `src/router/*` ve `src/api/logistics*.js` çekirdeği **Bora'nındır**.
//  Ama bu, "Ali uç ekleyemez" demek DEĞİL — herkesin aynı dosyaya yazması
//  demek olurdu ki tam kaçındığımız şey bu.
//
//  YENİ UÇ NASIL EKLENİR:
//    1. KENDİ modül dosyanı aç:  `src/api/logisticsPricing.js`,
//       `src/api/logisticsPod.js`, `src/api/logisticsReturns.js` …
//       (bir modül = bir domain = bir sahip)
//    2. `logisticsGet` / `logisticsPost` ile yaz — zarf açma, tipli hata ve
//       CSRF/401 davranışı hazır gelir.
//    3. `src/api/logistics.js`'e DOKUNMA. O Bora'nın çekirdek modülü
//       (katalog, taşıyıcı hesabı, ayarlar, sevkiyat).
//
//  Örnek:
//    import { LOGISTICS_METHOD, logisticsGet } from "@/api/logisticsClient";
//
//    export const listPricingRules = (params) =>
//      logisticsGet(`${LOGISTICS_METHOD.PRICING}.list_pricing_rules`, params);
//
//  NEDEN `utils/api.js` DOĞRUDAN ÇAĞRILMIYOR:
//    Zarf açma (`unwrap`) her uçta tekrar edilirse biri unutur ve o ekran
//    `{ok, data}` nesnesini veri sanıp sessizce boş çizer. Tek geçit tek
//    davranış demek.

import api from "@/utils/api";

import { rescueLogisticsError, unwrap } from "./logisticsEnvelope";

/**
 * Whitelisted Frappe modül adları.
 *
 * Uç adını elle yazmak yerine buradan türet: yeniden adlandırma tek yerden
 * yapılır ve yazım hatası çalışma anında değil, kod okurken görünür.
 */
export const LOGISTICS_METHOD = Object.freeze({
  CATALOG: "tradehub_core.api.v1.logistics_catalog",
  ADMIN: "tradehub_core.api.v1.logistics_admin",
  SHIPMENT: "tradehub_core.api.v1.shipment",
  // 2026-08 tam denetim: bekleyen operasyon uçları (pano, kuyruk, istisna)
  // guest'e açık v1.logistics modülüne adreslenmişti. Admin ucu guest
  // modülüne EKLENMEZ (yanlışlıkla-guest riski) — hedefleri admin-only
  // v1.logistics_ops (16-BE'de açılacak). PACKAGING/POD önekleri de burada:
  // 13/14-FE modülleri mock'tan canlıya geçerken uç adını elle yazmasın,
  // whitelist tek yerden okunsun diye.
  OPS: "tradehub_core.api.v1.logistics_ops",
  PACKAGING: "tradehub_core.api.v1.packaging",
  POD: "tradehub_core.api.v1.pod",
  // 20-FE: fiyat kuralları + simülasyon. Guest'e açık v1.logistics'e
  // EKLENMEZ — admin ucu guest modülüne konursa yanlışlıkla-guest riski
  // doğuyor (aynı gerekçe POD'da da yazılı).
  PRICING: "tradehub_core.api.v1.pricing",
  // 17-FE rapor uçları: OPS'a EKLENMEDİ — o Bora'nın 16-BE dosyası; raporlar
  // split kuralı gereği (bir modül = bir domain = bir sahip) Ali'nin 17-BE
  // dosyası `v1.reports`'ta yaşar. Admin-only; guest v1.logistics'e bilinçli
  // eklenmedi. Sözleşme: api/reports.js.
  REPORTS: "tradehub_core.api.v1.reports",
});

/**
 * Tek geçit: çağır → zarfı aç → HTTP hatasındaki zarfı kurtar.
 *
 * `try/catch` GEREKLİ: sözleşme hatalarının bir kısmı HTTP 200 gövdesinde
 * (`{ok:false}`), bir kısmı HTTP 417 gövdesinde geliyor. İkincisinde
 * `utils/api.js` fırlatıyor ve `unwrap` hiç çalışmıyor; zarf `err.body`'den
 * kurtarılmazsa ekranda kod `INTERNAL_ERROR`, mesaj "[object Object]" oluyor.
 */
async function call(transport, method, params) {
  try {
    return unwrap(await transport(method, params));
  } catch (e) {
    throw rescueLogisticsError(e);
  }
}

/**
 * GET uç çağrısı — okuma.
 *
 * @param {string} method Tam whitelisted metot adı.
 * @param {Object} [params] Sorgu parametreleri.
 * @returns {Promise<any>} Zarfın `data` yükü.
 * @throws {import("./logisticsEnvelope").LogisticsApiError}
 */
export async function logisticsGet(method, params = undefined) {
  return call((m, p) => api.callMethodGET(m, p), method, params);
}

/**
 * POST uç çağrısı — yazma. CSRF `utils/api.js`'te ekleniyor.
 *
 * @param {string} method Tam whitelisted metot adı.
 * @param {Object} [params] Gövde parametreleri.
 * @returns {Promise<any>} Zarfın `data` yükü.
 * @throws {import("./logisticsEnvelope").LogisticsApiError}
 */
export async function logisticsPost(method, params = undefined) {
  return call((m, p) => api.callMethod(m, p), method, params);
}

// Tipli hata BİLEREK buradan yeniden dışa AÇILMIYOR — üçüncü bir adres,
// aynı sınıfın üç yerden import edilmesi demekti. İki meşru yol var:
//   * `@/api/logisticsEnvelope` — tanımın kendisi; yeni modüller bunu kullanır
//   * `@/api/logistics`        — mevcut çağıranların yolu (stores/logistics.js,
//     carriers/CarrierAccountView.vue); geriye dönük uyum için korunuyor
