// Ortak sayı biçimleyiciler — saf fonksiyonlar, global durum yok.
//
// NEDEN VAR (SOLID denetimi, 2026-08-24): TRY para biçimi ve oran→yüzde
// biçimi kopyalanmıştı ve kopyaların null davranışları birbirinden kaymıştı.
// Kapsam içindeki (`ready: true`) ekranların kopyaları BİTTİ — hepsi buradan
// besleniyor. Kalan elle yazılmış biçimleyiciler yalnız kapsam DIŞI, henüz
// route'u açılmamış prototiplerde: `PricingRuleScreen`, `PriceSimulationScreen`,
// `ShippingRateScreen`, `ReturnClosureScreen`, `ReturnInspectionScreen`.
// (`LegOperationScreen` prototip olmasına rağmen buraya bağlandı: yerel kopyası
// boş maliyette "NaN" basıyordu ve maskelenmiş bacakları 0 sayıyordu.)
// Kalanlar bakım turlarının dışında (CLAUDE.md §1.1
// "kullanılmayan prototipler"); ekranı açan kişi buraya bağlar.
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
 * SAYISALLIK kontrolü null kontrolünden ayrı DEĞİL (Security denetimi,
 * 2026-08-24): eskiden yalnız `null`/`undefined` eleniyordu ve `Number("")`
 * 0 verdiği için MASKELENMİŞ (boş) bir alan "₺0,00" olarak, yani gerçek sıfır
 * maliyet gibi görünüyordu; `"abc"` ise "₺NaN" basıyordu. Boş dize, yalnız
 * boşluk içeren dize ve NaN/Infinity artık "bilinmiyor" sayılıyor.
 *
 * @param {unknown} value
 * @returns {number|null}
 */
function toFiniteNumber(value) {
  if (value == null) return null;
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
