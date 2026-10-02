/**
 * Crop Studio geometrisine tek giriş kapısı.
 *
 * **Sunucu kırpma matematiği bu dosyada YOKTUR** (aşağıdaki görünür-kısım bölümü CSS modelidir, sunucu penceresi değildir). Her şey
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

/*
 * ── Görünür kısım: CSS object-fit / object-position modeli (2026-10-01) ──
 *
 * Bu dört fonksiyon SUNUCUNUN kırpma penceresi DEĞİLDİR (o `crop_geometry`
 * ikizidir ve yukarıdan yeniden dışa aktarılır). Burası tarayıcının
 * `object-fit: cover` + `object-position: X% Y%` ile görseli nasıl
 * kestiğinin birebir modelidir; vitrin aynı değeri CSS olarak uyguladığı
 * için önizleme = vitrin. Spec: 2026-10-01-gorsel-onizleme-odak-design.md §4.2.
 */

/** 0-1 aralığına kelepçele; sayı değilse merkez (0.5). */
export function clampFocal(value) {
  const n = Number(value);
  if (value === null || value === undefined || !Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

/** Görselin yerde görünen payı: `min(1, yerOranı / görselOranı)` (yatay) ya da dikey eşdeğeri. */
export function visibleFraction(imageRatio, placeRatio, fit = "cover") {
  if (!(imageRatio > 0) || !(placeRatio > 0) || fit === "contain") return { x: 1, y: 1 };
  if (placeRatio < imageRatio) return { x: placeRatio / imageRatio, y: 1 };
  return { x: 1, y: imageRatio / placeRatio };
}

/** Görselin üstünde görünen çerçeve (0-1): konum = (1 − görünen) × odak. */
export function frameRect(imageRatio, placeRatio, focal, fit = "cover") {
  const v = visibleFraction(imageRatio, placeRatio, fit);
  return {
    left: (1 - v.x) * clampFocal(focal?.x),
    top: (1 - v.y) * clampFocal(focal?.y),
    width: v.x,
    height: v.y,
  };
}

/** CSS `object-position` değeri — `0.78` → `"78%"` (kayan nokta artığı yok). */
export function objectPosition(focal) {
  const p = (v) => `${Math.round(clampFocal(v) * 1000) / 10}%`;
  return `${p(focal?.x)} ${p(focal?.y)}`;
}
