/**
 * Önizleme simülatörüne tek giriş kapısı.
 *
 * ## Neden burada matematik VAR (Faz 10'dan farklı)
 *
 * Kırpma stüdyosunda (`src/lib/media/crop/geometry.js`) tek satır matematik
 * yoktur: kaynağın hazır bir TypeScript ikizi vardı, vendor'landı, bitti.
 * Simülatörde o ikiz **yok** — `tradehub_core/media/pipeline/simulator/` altında
 * yalnız `srcset.py` var (arandı: `find . -iname "*srcset*"` ve
 * `grep -rl "selectRendition\|sizes_attribute"` → JS/TS eşleşme sıfır).
 *
 * Görev tanımının ikinci yolu izlendi:
 *
 *   1. `devices.json` + `placements.json` **birebir** vendor'lanır — kutu
 *      kuralları, kırılımlar, sütun sayıları hâlâ VERİDİR ve panelde yazılı
 *      değildir (`npm run sync:simulator`).
 *   2. Seçim mantığı panelde JavaScript olarak yazılır (`layout.js`,
 *      `select.js`).
 *   3. `srcset.py` KOŞTURULUP 195 bölge vektörü + 13 poster vektörü + 15
 *      `sizes` dizgesi dosyaya dökülür; `__tests__/srcsetParity.test.js`
 *      panelin hesabını her `npm test`'te o beklentiyle karşılaştırır ve
 *      sapmayı raporlar.
 *
 * Yani ikinci uygulama var ama **denetimsiz değil**. Kaynak `srcset.py`
 * değişirse manifest hash'i tutmaz ve test "senkron gerekli" der.
 *
 * `vendor/` ELLE DÜZENLENMEZ. Kaynağı değiştir, sonra:  npm run sync:simulator
 */
export {
  DEVICES,
  DEVICE_MEASUREMENT,
  PLACEMENT_MEASUREMENT,
  BREAKPOINTS,
  CONTAINERS,
  PAGES,
  ALL_REGIONS,
  PRIMARY_REGIONS,
  EXCLUDED_REGIONS,
  SimulatorDataError,
  deviceById,
  regionByKey,
  containerWidth,
  flattenContainer,
  boxWidth,
  demandMultiplier,
  matchingStep,
} from "./layout.js";

export {
  WARN_SOURCE_INSUFFICIENT,
  WARN_OVERSHOOT,
  WARN_ZOOM_INSUFFICIENT,
  WARN_NO_PROFILE,
  DEFAULT_SOURCE_WIDTH,
  renditionsFor,
  selectRendition,
  simulate,
  simulateMatrix,
  summarize,
  sizesAttribute,
  sizesFor,
  srcsetAttribute,
} from "./select.js";

export {
  MIN_SCALE,
  MAX_SCALE,
  LAYOUT_GRID,
  LAYOUT_SLIDER,
  LAYOUT_FIXED,
  LAYOUT_FLUID,
  LAYOUT_VIEWPORT_HEIGHT,
  frameScale,
  deviceFrame,
  frameStyle,
  containerParts,
  slotAspect,
  regionLayout,
  pageTemplate,
  tileBox,
} from "./frame.js";

export {
  POSTER_SPEC,
  POSTER_SLOT,
  POSTER_PROXY_REGION,
  posterRenditions,
  simulatePoster,
} from "./poster.js";
