import catalog from "./vendor/slot_profiles.js";

/**
 * Slot politikalarından türetilmiş profil kataloğu — Crop Studio'nun neyi
 * kırpacağını buradan öğrenir.
 *
 * **Kural seti burada yazılmaz.** Katalog `tradehub_core`'daki 9 slot
 * politikasından `scripts/sync-crop-geometry.mjs` ile türetilir; bu dosya
 * yalnız okur ve iki soruyu yanıtlar: "bu profil kırpılıyor mu" ve "hedef
 * oran kaç".
 *
 * ### Bulgu 1 — hedef oran ETİKETTEN alınmaz
 *
 * `company.cover_image / cover_16x9_1000` politikada `target_ratio: "16:9"`
 * etiketini taşır ama gerçek boyutu 1000×563 → 1,77619…; tam 16:9 ise
 * 1,77778. Kullanıcıya "16:9" düğmesi gösterip `16/9` ile kırparsak render
 * 1000×563'e ölçeklerken kadrajı yeniden kırpar ve kenara yaslanmış bir logo
 * gözle görülür biçimde kayar (~0,9 px). Bu yüzden `targetAR` **daima**
 * `width / height`'ten hesaplanır; etiket yalnız ekranda gösterilir.
 * `crop.py::parse_aspect_ratio` de `aspect_ratio_value`'yu metinden önce okur.
 *
 * ### `cover` + `height: null` — 12 profil
 *
 * Politikanın niyeti belirsiz (Faz 2 açığı, T-101…105 kapsamı dışı).
 * `crop.py` bunu `target_ratio=None` sayar ve taban bölgeyi aynen döndürür.
 * Crop Studio bu profiller için oran kilidi SUNMAZ, "bu profil kırpılmıyor"
 * bilgisini gösterir.
 */

export const SLOTS = catalog.slots;

/** Kırpma yalnız `cover` + yükseklik tanımlı profillerde gerçek iş yapar. */
export function isCroppable(profile) {
  return profile?.fit === "cover" && Number(profile?.width) > 0 && Number(profile?.height) > 0;
}

/**
 * Profilin hedef en-boy oranı.
 *
 * @returns {number|null} `null` = serbest kırpma (oran kilidi yok).
 */
export function profileTargetAR(profile) {
  if (!isCroppable(profile)) return null;
  return profile.width / profile.height;
}

/** Etiket ile gerçek oran ayrışıyor mu — kullanıcıya bilgi rozeti için. */
export function ratioLabelMisleading(profile) {
  const ar = profileTargetAR(profile);
  if (!ar || !profile.ratioLabel) return false;
  const [a, b] = String(profile.ratioLabel).split(":").map(Number);
  if (!(a > 0) || !(b > 0)) return false;
  return Math.abs(a / b - ar) > 1e-6;
}

export function getSlot(slotKey) {
  return SLOTS.find((s) => s.slotKey === slotKey) || null;
}

/** Bir slotun profilleri, kırpılabilirlik ve hedef oranla zenginleştirilmiş. */
export function slotProfiles(slotKey) {
  const slot = getSlot(slotKey);
  if (!slot) return [];
  return slot.profiles.map((p) => ({
    ...p,
    croppable: isCroppable(p),
    targetAR: profileTargetAR(p),
    labelMisleading: ratioLabelMisleading(p),
  }));
}

/** Kırpma arayüzü bu slot için gerçek iş yapıyor mu. */
export function slotIsCroppable(slotKey) {
  return slotProfiles(slotKey).some((p) => p.croppable);
}

/**
 * Oran kilidi seçenekleri: **yalnız gerçekten kırpılan profillerden** türer.
 * Serbest ("kilit yok") her zaman ilk seçenektir.
 */
export function ratioOptions(slotKey) {
  const seen = new Map();
  for (const p of slotProfiles(slotKey)) {
    if (!p.croppable) continue;
    const key = p.targetAR.toFixed(9);
    if (seen.has(key)) {
      seen.get(key).profiles.push(p.name);
      continue;
    }
    seen.set(key, {
      id: key,
      targetAR: p.targetAR,
      label: p.ratioLabel || `${p.width}:${p.height}`,
      width: p.width,
      height: p.height,
      labelMisleading: p.labelMisleading,
      profiles: [p.name],
    });
  }
  return [...seen.values()];
}
