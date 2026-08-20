import data from "./vendor/simulator_data.js";
import { regionByKey } from "./layout.js";
import { DEFAULT_SOURCE_WIDTH, renditionsFor, simulate } from "./select.js";

/**
 * Video posteri simülasyonu.
 *
 * **Uç YOK.** `media/pipeline/video/poster.py` posteri üretmeyi biliyor ama
 * onu çağıran bir API ucu kurulu değil ve `Media Rendition` tablosu boş. Bu
 * yüzden burada gerçek bir poster dosyası GÖSTERİLMEZ; yalnız "poster
 * üretilseydi hangi basamak inerdi" hesabı yapılır. Uydurma uç çağrılmaz.
 *
 * **Vekil kutu — ÖLÇÜLMEDİ.** `placements.json` 15 bölgenin hepsinde
 * `product.image` slotunu ölçmüş; video için ölçülmüş bir bölge YOK. Poster
 * `<video poster>` olarak ürün detay ana görsel kutusunda basılacağı için o
 * bölge VEKİL olarak kullanılıyor. Gerçek video yerleşimi ölçülene kadar bu
 * sonuç "yaklaşık" etiketiyle gösterilmeli.
 */

/** `video_decision.json` `poster` bloğu — panelde yeniden yazılmadı. */
export const POSTER_SPEC = Object.freeze({ ...data.poster });

/** Poster basamaklarının okunduğu slot. */
export const POSTER_SLOT = "company.cover_video";

/** Vekil bölge anahtarı — video bölgesi ölçülene kadar. */
export const POSTER_PROXY_REGION = "product_detail/main_image";

/**
 * Poster basamakları: `company.cover_video` merdiveninin `poster` ile
 * başlayan profilleri. Video türevleri (mp4/hls) poster seçimine girmez.
 */
export function posterRenditions(sourceWidth = DEFAULT_SOURCE_WIDTH) {
  return renditionsFor(POSTER_SLOT, sourceWidth).filter((r) => r.name.startsWith("poster"));
}

/**
 * 13 cihazın tamamı için poster seçimi.
 *
 * @returns {{region: object|null, ladder: object[], rows: object[]}}
 *   `region` null ise vekil bölge veride bulunamadı — ekran "ölçülemedi" der.
 */
export function simulatePoster(devices, sourceWidth = DEFAULT_SOURCE_WIDTH) {
  const region = regionByKey(POSTER_PROXY_REGION);
  const ladder = posterRenditions(sourceWidth);
  if (!region) return { region: null, ladder, rows: [] };
  return { region, ladder, rows: devices.map((d) => simulate(d, region, ladder)) };
}
