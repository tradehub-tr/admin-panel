/**
 * T-123 — RUM toplayıcısı, genel giriş noktası.
 *
 * ZİNCİRİN NERESİ HAZIR
 * ---------------------
 * Bu paket zincirin İSTEMCİ halkasıdır ve tamamlanmıştır. Zincirin geri
 * kalanı (ölçülmüş durum, 2026-08-19):
 *
 *   [x] Sunucu çekirdeği  — `media/pipeline/delivery/rum.py` (doğrulama,
 *                           örneklem, p75, `to_metrics()` köprüsü)
 *   [x] Alarmlar          — `observability/alerts.py` içinde 4 RUM kuralı
 *   [x] İstemci toplayıcı — BU PAKET
 *   [ ] HTTP ucu          — YOK. `tradehub_core/api/` altında RUM gövdesi
 *                           kabul eden `@frappe.whitelist()` fonksiyonu
 *                           arandı, bulunamadı.
 *   [ ] `Media RUM Sample` DocType — YOK. `tradehub_core/doctype/` altında
 *                           dizin yok; şema `rum.DOCTYPE_DESIGN` içinde
 *                           TASARLANMIŞ ama kurulmamış.
 *
 * Son iki madde backend işidir ve bu görevin kapsamı dışındadır. Sonucu
 * açıkça söylemek gerekir: **bugün bu toplayıcı monte edilse bile gerçek
 * saha verisi TOPLANAMAZ.** Uç 404 döner, `transport.js` devreyi açar ve
 * toplayıcı susar. Alarmlar besleyicisiz kalmaya devam eder.
 */

export {
  ALLOWED_FIELDS,
  CONNECTION_TYPES,
  DEVICE_CLASSES,
  FORBIDDEN_FIELDS,
  LIMITS,
  METRICS,
  METRIC_GROUP_BY,
  NAVIGATION_TYPES,
  RATING_GOOD,
  RATING_NEEDS_IMPROVEMENT,
  RATING_POOR,
  RATING_THRESHOLDS,
  REQUIRED_FIELDS,
  ROUTE_TEMPLATES,
  SOURCES,
  UNITLESS,
  VIEWPORT_BUCKETS,
} from "./contract.js";

export {
  collectContext,
  connectionType,
  deviceClass,
  dprValue,
  navigationType,
  routeTemplate,
  viewportBucket,
  viewportWidth,
} from "./context.js";

export { DEFAULT_SAMPLE_RATE, decide, decideSafe, randomHex, sessionToken } from "./sampling.js";

export {
  RumPayloadError,
  buildPayload,
  buildPayloadSafe,
  piiFields,
  rating,
  roundValue,
} from "./payload.js";

export { lcpAssetTags, normalizeRegion, parseFormat, parseProfile } from "./lcpAsset.js";

export {
  DEFAULT_ENDPOINT,
  SEND_BEACON,
  SEND_DISABLED,
  SEND_EMPTY,
  SEND_FAILED,
  SEND_FETCH,
  SEND_OK,
  createTransport,
} from "./transport.js";

export { DEFAULT_METRICS, createRumCollector } from "./collector.js";

export { sha256Hex } from "./sha256.js";
