/**
 * Ekrana insan dili — veri dosyalarındaki kod sabitlerini ve kimlikleri
 * i18n anahtarına ya da okunur metne çevirir.
 *
 * `vendor/*` ÜRETİLMİŞTİR (`npm run sync:simulator`) ve düzenlenmez;
 * `EMULE_DEGERLER_OLCULMEDI` gibi durum kodları veri künyesidir, ekrana
 * olduğu gibi basılmaz. Eşleme burada, metinler `i18n/locales/*.js`
 * `mediaSimulator.measurement` / `regionName` bloklarında.
 */

/** Durum kodu → i18n türü. Sıra önemli: en özgül desen önce. */
const MEASUREMENT_KINDS = Object.freeze([
  { pattern: /^KISMEN_DOGRULANDI/, kind: "partial" },
  { pattern: /^EMULE/, kind: "emulated" },
  { pattern: /^(TAM_)?DOGRULANDI/, kind: "verified" },
  { pattern: /OLCULMEDI|DOGRULANMADI/, kind: "unverified" },
]);

/**
 * Ölçüm durumu kodunu sınıflandırır.
 *
 * @param {string} code  ör. `KISMEN_DOGRULANDI_8_BOLGE_15TEN_GERCEK_TARAYICIDA`
 * @returns {{ kind: string, code: string, done: number|null, total: number|null }}
 *   `kind` bilinmeyen kodda `"unknown"` — ekran genel "Doğrulanmadı" etiketine düşer.
 *   `done`/`total` koddaki ilk iki sayıdır (8 / 15); yoksa `null`.
 */
export function measurementStatus(code) {
  const raw = String(code || "").trim();
  const hit = MEASUREMENT_KINDS.find((k) => k.pattern.test(raw));
  const nums = (raw.match(/\d+/g) || []).map(Number);
  return {
    kind: hit ? hit.kind : "unknown",
    code: raw,
    done: nums.length >= 2 ? nums[0] : null,
    total: nums.length >= 2 ? nums[1] : null,
  };
}

/**
 * `home/category_bento` → `Home · Category bento`.
 *
 * i18n'de adı olmayan bölge/cihaz kimliği için son çare: eğik çizgi ayraç
 * olur, alt çizgi boşluk, her parçanın ilk harfi büyük.
 */
export function humanizeId(id) {
  return (
    String(id || "")
      .split("/")
      .map((seg) => seg.replace(/[_-]+/g, " ").trim())
      .filter(Boolean)
      // Kimlikler İngilizce; Türkçe büyük harf kuralı (i → İ) burada yanlış olur.
      .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
      .join(" · ")
  );
}

/**
 * Bölge kimliğinin i18n yolu: `home/category_bento` → `home.category_bento`.
 * vue-i18n noktayı ayraç sayar; eğik çizgi anahtarda kalamaz.
 */
export function regionKeyPath(id) {
  return String(id || "").replace(/\//g, ".");
}

/**
 * Serbest metindeki `sayfa/bolge` biçimli bölge kimliklerini ayıklar —
 * ölçüm notu "hâlâ doğrulanmamış 7 bölge: home/tailored_grid, …" diye
 * sayıyor; ekran onları insan adıyla listeler.
 *
 * Not dosya yolları da içeriyor (`docs/reports`, `src/lib`); aynı kalıba
 * uyan her şey bölge değildir. `knownPages` verilirse yalnız sayfa kısmı o
 * listede olan kimlikler kalır.
 */
export function extractRegionIds(text, knownPages = null) {
  const found = String(text || "").match(/\b[a-z][a-z0-9_]*\/[a-z][a-z0-9_]*\b/g) || [];
  const pages = knownPages ? new Set(knownPages) : null;
  return [...new Set(found)].filter((id) => !pages || pages.has(id.split("/")[0]));
}
