/**
 * Crop Studio geometrisine tek giriş kapısı.
 *
 * **Bu dosyada matematik YOKTUR ve olmayacaktır.** Her şey
 * `vendor/crop_geometry.ts`'ten yeniden dışa aktarılır; o dosya
 * `tradehub_core/tradehub_core/media/pipeline/core/crop_geometry.py`'nin
 * birebir TypeScript ikizidir ve `tests/fixtures/crop_vectors.json` ile
 * **584 vektörde 0 px sapma** ölçülmüştür (T-100).
 *
 * Panelde kırpma hesabı gerektiren her yer buradan içe aktarır. Sebebi tek:
 * ikinci bir uygulama, sunucunun kestiği kadraj ile kullanıcının gördüğü
 * kadrajın ayrışması demektir — ve o hatayı kimse yeniden üretemez.
 *
 * `vendor/` altındaki dosyalar ELLE DÜZENLENMEZ. Kaynağı değiştir, sonra:
 *
 *     npm run sync:crop
 *
 * `src/lib/media/crop/__tests__/cropGeometryParity.test.js` her koşuda hem
 * vektörleri hem sha256 zincirini doğrular.
 *
 * ### İçe aktarılan neden `.js`, `.ts` değil
 *
 * İkiz `.ts`tir ve `vendor/crop_geometry.ts` olarak birebir durur; ama bu dosya
 * ondan **tipleri silinerek türetilmiş** `vendor/crop_geometry.js`i içe aktarır.
 * Ölçülen sebep: `tradehub_core` konteynerinde node v20.19.2 var ve
 * `--experimental-strip-types` orada YOK ("bad option"). `.ts` içe aktarıldığı
 * sürece parite kapısı Node sürümüne bağlı kalıyor, o soru CI'da HAYIR yanıtlıyor
 * ve kapı hiç ölçmeden kırmızı yanıyordu. Türetme senkron adımında bir kez yapılır
 * (`scripts/sync-crop-geometry.mjs`, gerekçe orada uzun uzun yazılı), çıktı sha256
 * zincirine girer; koşum tarafında hiçbir bayrak, derleyici ya da bundler gerekmez.
 *
 * Bu bir "ikinci uygulama" DEĞİLDİR: `transformWithEsbuild` yalnız tip sözdizimini
 * siler, hedef `esnext` olduğu için tek bir ifade bile yeniden yazılmaz. Ve iddia
 * ölçülüyor — 592 vektörün tamamı bu `.js` üzerinden koşuyor.
 */
export {
  EPS,
  PARITY_TOLERANCE_PX,
  ZOOM_MIN,
  ZOOM_MAX,
  MIN_EDGE_PX,
  FIT_INSIDE,
  FIT_OUTSIDE,
  FIT_MODES,
  CropGeometryError,
  clamp,
  rect,
  rectRight,
  rectBottom,
  rectCenterX,
  rectCenterY,
  rectRatio,
  ratioFit,
  clampWindow,
  zoomBase,
  zoomFromBase,
  cropWindow,
  focalFromWindow,
  roundWindow,
} from "./vendor/crop_geometry.js";
