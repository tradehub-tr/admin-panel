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

import { toFiniteNumber } from "./format.js";

/** Excel/Sheets'in formül saydığı başlangıç karakterleri. */
const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

/**
 * Düz (gruplamasız, işaretli) ondalık sayı — formül önekinden MUAF hücreler.
 *
 * NEDEN VAR (QA denetimi, 2026-08-25 — SESSİZ VERİ BOZULMASI):
 *   `FORMULA_PREFIX_RE` `-` ile BAŞLAYAN her hücreye `'` koyuyordu ve
 *   `csvNumber`ın ürettiği NEGATİF sayı da `-` ile başlıyor. Maliyet
 *   raporunda zarar eden taşıyıcının marj hücresi `'-372,00` olarak
 *   yazılıyordu: Excel onu METİN sayar, `SUM()` atlar ve marj toplamı
 *   ZARARI İÇERMEDİĞİ İÇİN olduğundan iyi görünür. Yani koruma, koruduğu
 *   şeyden büyük bir hasar veriyordu.
 *
 *   Negatif sayı formül-enjeksiyon riski DEĞİL: Excel `-372`yi ifade değil
 *   SAYI okur; çalıştırılabilir bir şey yok. Yaygın mitigasyon kuralı da
 *   bunu söylüyor — önek yalnız hücre GEÇERLİ BİR SAYI DEĞİLSE eklenir.
 *
 *   Kapsam bilerek DAR: yalnız başta `-`, ondalık ayracı `.` ya da `,`
 *   (hedef locale'e göre `csvNumber` ikisini de üretebilir), binlik ayracı
 *   yok (`useGrouping: false`), üs/boşluk yok. `+5` de muaf DEĞİL: Excel onu
 *   ifade olarak ayrıştırır, muafiyeti tek karaktere genişletmenin kazancı
 *   yok. `-2+3` gibi İFADE metni bu kalıba uymaz ve önekini almaya devam eder.
 */
const PLAIN_NUMBER_RE = /^-\d+(?:[.,]\d+)?$/;

/** Ayraçtan bağımsız olarak tırnaklama isteyen karakterler (RFC 4180). */
const NEEDS_QUOTING_RE = /["\n\r]/;

/** Panelin varsayılan alan ayracı. */
export const DEFAULT_DELIMITER = ",";

/**
 * Tek hücreyi CSV'ye güvenli hâle getirir.
 *
 * AYRAÇ PARAMETRE (QA denetimi, 2026-08-28 — KOLON KAYMASI):
 *   Tırnaklama kuralı ayracı VİRGÜL varsayıyordu. Türkçe Excel'i hedefleyen
 *   ekranlar (`PriceSimulationView`) `;` ile yazıyor ve ölçüldü:
 *   `csvEscape("ARAS;KARGO")` → `ARAS;KARGO`, yani tırnaklanmadan çıkıyor ve
 *   hücre iki kolona bölünüyordu. Kaçış, dosyanın gerçek ayracını BİLMEK
 *   zorunda; varsayılan `,` olduğu için mevcut çağıranlar etkilenmiyor.
 *
 * @param {unknown} value - Hücre değeri; null/undefined boş hücre olur.
 * @param {string} [delimiter] - Dosyanın alan ayracı.
 * @returns {string} Kaçışlı hücre metni.
 */
export function csvEscape(value, delimiter = DEFAULT_DELIMITER) {
  let text = value == null ? "" : String(value);
  if (FORMULA_PREFIX_RE.test(text) && !PLAIN_NUMBER_RE.test(text)) text = `'${text}`;
  // Ayraç `includes` ile aranıyor: regex'e gömülseydi `|` gibi bir ayraç
  // kalıbı bozardı.
  if (NEEDS_QUOTING_RE.test(text) || (delimiter && text.includes(delimiter))) {
    text = `"${text.replaceAll('"', '""')}"`;
  }
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
 * AYRAÇ: varsayılan `,` — mevcut çıktılar (ReportCenterView) değişmez. Türkçe
 * Excel'i hedefleyen ekran `{ delimiter: ";" }` geçer; kaçış da aynı ayracı
 * görür, yoksa `;` içeren bir hücre sessizce kolon kaydırır.
 *
 * @param {unknown[]} headers - Kolon başlıkları (i18n metinleri olabilir).
 * @param {unknown[][]} rows - Satırlar; her satır hücre dizisi.
 * @param {object} [options]
 * @param {string} [options.delimiter] - Alan ayracı.
 * @returns {string} `\n` ayraçlı CSV metni.
 */
export function buildCsv(headers, rows, { delimiter = DEFAULT_DELIMITER } = {}) {
  return [headers, ...rows]
    .map((cells) => cells.map((cell) => csvEscape(cell, delimiter)).join(delimiter))
    .join("\n");
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
  // "Bu değer sayı mı" tanımı `utils/format.js`ten geliyor (SOLID denetimi,
  // 2026-08-25): buradaki kopya birebir aynıydı ve ayrışsaydı ekran ile CSV
  // aynı hücre için farklı "bilinmiyor" kararı verirdi.
  const parsed = toFiniteNumber(value);
  if (parsed === null) return blank;
  return parsed.toLocaleString(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: false,
  });
}
