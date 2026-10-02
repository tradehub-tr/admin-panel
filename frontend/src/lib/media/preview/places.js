import { FULLY_VISIBLE_MIN, PLACES, STAGE } from "../vendor/placements.js";
import { visibleFraction } from "../crop/geometry.js";

/**
 * Önizleme yer kaydına tek erişim noktası. Veri `../vendor/placements.js`
 * (ÜRETİLMİŞ, kaynak `placements.json → preview_places`); burada yalnız
 * sorgu ve görünürlük hesabı var. Göreli içe aktarım bilinçli: node:test
 * doğrudan yükleyebilsin.
 */
export { FULLY_VISIBLE_MIN, STAGE };
export const DEVICES = Object.freeze(["desktop", "mobile"]);

const KINDS = Object.freeze({
  "company.cover_image": "coverImage",
  "seller.logo": "logo",
  "product.image": "productImage",
});

export function kindKey(slotKey) {
  return KINDS[slotKey] || "coverImage";
}

export function placesFor(slotKey, device) {
  return (PLACES[slotKey] || []).filter((p) => p.device === device);
}

export function devicesFor(slotKey) {
  return DEVICES.filter((d) => placesFor(slotKey, d).length > 0);
}

export function placeCount(slotKey) {
  return new Set((PLACES[slotKey] || []).map((p) => p.key)).size;
}

/** Yerde görünen pay. Görsel oranı bilinmiyorsa `unknown: true` — yüzde uydurulmaz. */
export function placeVisibility(place, imageRatio) {
  if (!(imageRatio > 0)) return { x: 1, y: 1, fraction: 1, pct: 100, full: true, unknown: true };
  const v = visibleFraction(imageRatio, place.ratio, place.fit);
  const fraction = v.x * v.y;
  return {
    ...v,
    fraction,
    pct: Math.round(fraction * 100),
    full: fraction >= FULLY_VISIBLE_MIN,
    unknown: false,
  };
}

/** Rozet: kenarı kesilen FARKLI yer sayısı (aynı yer iki cihazda bir kez sayılır). */
export function cutPlaceCount(slotKey, imageRatio) {
  if (!(imageRatio > 0)) return 0;
  const cut = (PLACES[slotKey] || []).filter((p) => !placeVisibility(p, imageRatio).full);
  return new Set(cut.map((p) => p.key)).size;
}

/** Bağlam kutusu: ölçeklenmiş CSS genişliği + oran. Ölçülmemiş yer kabı doldurur. */
export function boxStyle(place, scale = 1) {
  return {
    width: place.cssW ? `${Math.round(place.cssW * scale)}px` : "100%",
    maxWidth: "100%",
    aspectRatio: String(place.ratio),
  };
}

export function formatPercent(value01, locale = "tr") {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(
    Number(value01) || 0
  );
}
