// CSV kaçış + formül-enjeksiyon koruması (17-FE denetimi, Security-major).
//
// PANEL-GENELİ ORTAK UTIL: CSV üreten her ekran hücreleri buradan geçirir.
// Eski yerel kaçışlar (örn. MyCertificationsView içindeki kısmi escape)
// zamanla buna taşınmalı — yeni CSV kodu doğrudan bunu kullanır.
//
// İki tehdit birden kapatılıyor:
//   1. RFC 4180 kırılması — virgül/tırnak/satırsonu içeren hücre kolonları
//      kaydırır; çift tırnak sarması + iç `"` → `""` ile korunur.
//   2. Formül enjeksiyonu — Excel/Sheets `=`, `+`, `-`, `@` (ve tab/CR) ile
//      başlayan hücreyi FORMÜL olarak çalıştırır (`=HYPERLINK(...)`,
//      `=cmd|...` DDE). Başa `'` konur: elektronik tabloda metin kalır.
//
// Sıra önemli: önce formül öneki, sonra tırnaklama — önek eklenen hücre
// virgül içeriyorsa yine doğru sarılır.

/** Excel/Sheets'in formül saydığı başlangıç karakterleri. */
const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

/** RFC 4180 gereği tırnaklama isteyen karakterler. */
const NEEDS_QUOTING_RE = /[",\n\r]/;

/**
 * Tek hücreyi CSV'ye güvenli hâle getirir.
 *
 * @param {unknown} value - Hücre değeri; null/undefined boş hücre olur.
 * @returns {string} Kaçışlı hücre metni.
 */
export function csvEscape(value) {
  let text = value == null ? "" : String(value);
  if (FORMULA_PREFIX_RE.test(text)) text = `'${text}`;
  if (NEEDS_QUOTING_RE.test(text)) text = `"${text.replaceAll('"', '""')}"`;
  return text;
}

/**
 * Başlık + satırlardan CSV metni üretir — HER hücre (başlıklar dahil)
 * `csvEscape`'ten geçer.
 *
 * BOM'SUZ saf metin döndürür: Excel'in UTF-8 tanıması için gereken BOM'u
 * çağıran ekler (mevcut desen — useMediaAudit/ReportCenterView Blob'a
 * `"\uFEFF" + csv` yazar). Böylece util'i sunucu karşılaştırma testi gibi
 * BOM istemeyen yerler de kullanabilir.
 *
 * @param {unknown[]} headers - Kolon başlıkları (i18n metinleri olabilir).
 * @param {unknown[][]} rows - Satırlar; her satır hücre dizisi.
 * @returns {string} `\n` ayraçlı CSV metni.
 */
export function buildCsv(headers, rows) {
  return [headers, ...rows].map((cells) => cells.map(csvEscape).join(",")).join("\n");
}

/**
 * Ondalıklı sayıyı CSV hücresine yazılabilir metne çevirir.
 *
 * NEDEN VAR (QA denetimi, 2026-08-24 — 10.000 kat şişme):
 *   Panelin CSV'leri Blob'a BOM ile yazılıyor, yani hedef "Türkçe yerelde
 *   açılan Excel". O yerelde `.` BİNLİK ayracıdır: ham JS sayısı `46239.2`
 *   hücreye düştüğünde Excel onu 462392 olarak okur. Aynı dosyada bazı
 *   kolonlar ham, bazıları `toFixed(2)` yazılıyordu — yani tutarsızlığın
 *   üstüne bir de sessiz veri bozulması biniyordu.
 *
 * KURAL (tek, istisnasız): ondalıklı her hücre AYNI basamak sayısı ve
 * locale'in ondalık ayracıyla yazılır. BİNLİK AYRACI YOK (`useGrouping:
 * false`) — Türkçede binlik ayracı `.` olduğu için onu basmak aynı tuzağı
 * geri getirirdi. Para birimi simgesi de YOK: hücre SAYI kalmalı, yoksa
 * Excel'de metin olur ve toplanamaz.
 *
 * @param {unknown} value Sayı ya da sayıya çevrilebilir dize.
 * @param {object} [options]
 * @param {string} [options.locale] BCP-47 dil etiketi (CSV'nin hedef yereli).
 * @param {number} [options.digits] Ondalık basamak sayısı.
 * @param {string} [options.blank] Sayı olmayan değer için hücre metni.
 * @returns {string}
 */
export function csvNumber(value, { locale = "tr-TR", digits = 2, blank = "—" } = {}) {
  if (value == null || (typeof value === "string" && value.trim() === "")) return blank;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return blank;
  return parsed.toLocaleString(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: false,
  });
}
