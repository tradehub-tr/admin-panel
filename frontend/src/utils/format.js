// Ortak sayı biçimleyiciler — saf fonksiyonlar, global durum yok.
//
// NEDEN VAR (SOLID denetimi, 2026-08-24): TRY para biçimi ve oran→yüzde
// biçimi kopyalanmıştı ve kopyaların null davranışları birbirinden kaymıştı.
//
// DURUM (kapanış turu, 2026-08-25): bu başlık bir tur boyunca GERÇEĞE
// UYMUYORDU — "kalan kopyalar yalnız route'u açılmamış prototiplerde" diyordu
// ama listelediği beş ekranın ÜÇÜ canlıydı (`ShippingRateScreen` ← K1,
// `PricingRuleScreen` ← K2, `PriceSimulationScreen` ← K3, hepsi `ready: true`).
// "Burada iş kalmadı" izlenimi, iş dururken verilmişti. O üç ekranın para
// biçimleyici kopyaları bu turda `formatTry`a bağlandı.
// Geriye YALNIZ iki prototip kaldı: `ReturnClosureScreen`,
// `ReturnInspectionScreen` — ikisinin de route'u kapalı, yani bakım turlarının
// dışındalar (CLAUDE.md §1.1 "kullanılmayan prototipler"); ekranı açan kişi
// buraya bağlar. Bu satırları güncellemeden ekran açma.
// (`LegOperationScreen` prototip olmasına rağmen buraya bağlandı: yerel kopyası
// boş maliyette "NaN" basıyordu ve maskelenmiş bacakları 0 sayıyordu.)
//
// LOCALE PARAMETRE, TARAYICI AYARI DEĞİL (SOLID+QA denetimi, 2026-08-24):
// eskiden `toLocaleString(undefined, …)` çağrılıyordu, yani biçim KULLANICININ
// TARAYICI dilinden geliyordu — aynı ekran birinde "₺46.239,20", ötekinde
// "TRY 46,239.20" görünüyordu ve yüzde elle "." ondalığıyla basıldığı için
// ikisi yan yana çelişiyordu. Locale artık açık bir parametre; varsayılan
// panelin ana dili (tr-TR). Composable YAZILMADI: fonksiyonlar saf kalsın,
// çağıran farklı bir dil istiyorsa parametreyi geçsin.

/** Panelin ana dili — biçimleyicilerin varsayılan locale'i. */
export const DEFAULT_LOCALE = "tr-TR";

/**
 * Sayıya çevrilebiliyorsa sayı, çevrilemiyorsa null.
 *
 * DIŞA AÇIK (SOLID denetimi, 2026-08-25): `utils/csv.js` `csvNumber` aynı
 * mantığı satır satır kopyalamıştı. İki yerde yaşayan "bu değer sayı mı"
 * tanımı ayrışır ve aynı hücre için EKRAN ile CSV farklı "bilinmiyor" kararı
 * verir (biri "—", öteki "0,00"). Tanım tek yerde.
 *
 * SAYISALLIK kontrolü null kontrolünden ayrı DEĞİL (Security denetimi,
 * 2026-08-24): eskiden yalnız `null`/`undefined` eleniyordu ve `Number("")`
 * 0 verdiği için MASKELENMİŞ (boş) bir alan "₺0,00" olarak, yani gerçek sıfır
 * maliyet gibi görünüyordu; `"abc"` ise "₺NaN" basıyordu. Boş dize, yalnız
 * boşluk içeren dize ve NaN/Infinity artık "bilinmiyor" sayılıyor.
 *
 * @param {unknown} value
 * @returns {number|null}
 */
export function toFiniteNumber(value) {
  if (value == null) return null;
  // NESNE/DİZİ "bilinmiyor" (QA denetimi, 2026-08-28): `Number([])` 0 verdiği
  // için boş bir dizi hücrede GERÇEK SIFIR gibi görünüyordu — miktar
  // kolonunda ölçüldü (`fmt([])` → "0"). Hiçbir sayısal alan nesne olarak
  // gelmiyor; gelirse bu bir veri hatası, sıfır değil.
  if (typeof value === "object") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * TRY para biçimi — bilinmeyen değerde GARANTİLİ "—" döner.
 *
 * "0 TL" göstermek yanlış bilgi olurdu (B8 maliyet sekmesi kararı):
 * maskelenmiş/boş alan ile gerçek sıfır maliyet aynı şey değil. Gerçek 0
 * ise "—" DEĞİL, biçimlenmiş sıfır ("₺0,00") döner.
 *
 * @param {number|string|null|undefined} value
 * @param {string} [locale] BCP-47 dil etiketi; varsayılan panelin dili.
 * @returns {string}
 */
export function formatTry(value, locale = DEFAULT_LOCALE) {
  const number = toFiniteNumber(value);
  return number === null
    ? "—"
    : number.toLocaleString(locale, { style: "currency", currency: "TRY" });
}

/**
 * MİKTAR biçimi (adet, kg, m…) — bilinmeyen değerde GARANTİLİ "—".
 *
 * NEDEN VAR (QA denetimi, 2026-08-28 — SESSİZ VERİ BOZULMASI):
 *   `ShipmentItemsTab` miktarları yerel bir `fmt()` ile basıyordu:
 *   `n == null ? "—" : Number(n).toLocaleString()`. Ölçüldü — `fmt("")`,
 *   `fmt("   ")` ve `fmt([])` hepsi **"0"** veriyordu, `fmt("abc")` ise
 *   "NaN". Yani "veri yok" ile "sıfır adet" ekranda ayırt edilemiyordu;
 *   `formatTry` için ZATEN kapatılmış hatanın (bkz. `toFiniteNumber`
 *   başlığı) miktar kolonundaki birebir kopyasıydı.
 *
 *   AĞIRLAŞTIRAN: boş `remaining_qty` hücrede "0" görünüyor VE
 *   `remaining_qty > 0` false olduğu için "kalan var" vurgusu da sönüyordu —
 *   TUR-106 invariant'ının operasyondaki görünen yüzü sessizce kapanıyordu.
 *
 * LOCALE AÇIK PARAMETRE: eski kopya `toLocaleString()`i argümansız
 * çağırıyordu, yani biçim TARAYICI dilinden geliyordu — aynı miktar
 * "1,234.5" / "1.234,5" / "١٬٢٣٤٫٥" olabiliyordu. Varsayılan panelin dili.
 *
 * BASAMAK: miktar hem tam sayı (2000 adet) hem ondalık (0,3 m) olabiliyor;
 * sabit basamak dayatılmıyor — `Intl` varsayılanı (en çok 3 hane) tam sayıyı
 * "2.000", ondalığı "0,3" basar. Para değil, o yüzden `formatTry`ın iki
 * haneli kuralı buraya taşınmadı.
 *
 * @param {number|string|null|undefined} value
 * @param {string} [locale] BCP-47 dil etiketi; varsayılan panelin dili.
 * @returns {string}
 */
export function formatQty(value, locale = DEFAULT_LOCALE) {
  const number = toFiniteNumber(value);
  if (number === null) return "—";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(number);
}

/**
 * ORANI (0..1) yüzde metnine çevirir — bilinmeyen değerde "—".
 *
 * AD, TANIM KÜMESİNİ SÖYLÜYOR (SOLID denetimi, 2026-08-24): bu fonksiyon
 * eskiden `formatPercent` adındaydı ve `constants/dashboard.js` içinde AYNI
 * adla, TERS tanım kümeli (0..100 yüzdesi bekleyen, `value / 100` yapan) bir
 * ikizi vardı. IDE otomatik-import'u yanlışını çekerse hata sessiz kalıyordu:
 * 0.9 girdisi biri için %90, öteki için %0,9. Ad artık girdinin ne olduğunu
 * söylüyor; ikizine dokunulmadı (lojistik dışı).
 *
 * Yüzde işareti ELLE eklenmiyor: `Intl` onu locale'in kuralına göre koyuyor
 * (tr-TR "%90,1", en-US "90.1%") — elle "%" eklemek ondalık ayracını da
 * sabitliyordu ve Türkçe ekranda "₺46.239,20" ile "90.1%" yan yana düşüyordu.
 *
 * @param {number|string|null|undefined} value 0..1 aralığında oran.
 * @param {string} [locale] BCP-47 dil etiketi; varsayılan panelin dili.
 * @returns {string}
 */
export function formatRatioPercent(value, locale = DEFAULT_LOCALE) {
  const number = toFiniteNumber(value);
  if (number === null) return "—";
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(number);
}
