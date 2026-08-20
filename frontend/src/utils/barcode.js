// Barkod görseli üretimi — gerçek Code 128-B kodlaması.
//
// NE OLDUĞU:
//   Verilen koddan standart Code 128-B sembolü çizer ve SVG döndürür.
//   Basılan etiket FİZİKSEL OKUYUCUYLA taranabilir: başlangıç kodu,
//   sessiz bölge, modül-103 kontrol basamağı ve dur kodu standarda uygun.
//
// NEDEN İSTEMCİ TARAFINDA:
//   Kodlama saf bir dönüşüm — sunucuya gitmesi için hiçbir neden yok.
//   Sunucu yalnız barkodun DEĞERİNİ üretiyor (`package_code`), görselleştirme
//   burada. Taşıyıcı entegrasyonu geldiğinde taşıyıcının kendi etiketi
//   kullanılacak; o gelene kadar basılan etiket bugünden okutulabilir.
//
// MODÜL GENİŞLİĞİ:
//   17 karakterlik koli kodu 242 modül eder. 100 mm'lik termal etikette
//   modül ~0.37 mm — standart okuyucu sınırı 0.25 mm, rahat okunur.
//   Ekranda 300 px'lik önizlemede ~1.2 px kalıyor; ekrandan okutmak için
//   yakınlaştırmak gerekebilir, basılı etikette gerekmiyor.

/**
 * Code 128 desen tablosu — 107 giriş.
 *
 * Her giriş çubuk/boşluk genişliklerini modül cinsinden sırayla verir ve
 * çubukla başlar. 0-102 veri, 103/104/105 başlangıç kodları, 106 dur kodu.
 * Veri desenleri 11 modül, dur kodu 13 modüldür (sondaki bitiş çubuğu).
 */
const C128 = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const START_B = 104;
const STOP = 106;
/** Standart en az 10 modül sessiz bölge ister; altına inince okuyucu kaçırır. */
const QUIET_MODULES = 10;
/** ASCII dışı karakterin yerine geçen '?' — Code 128-B değeri. */
const SUBSTITUTE = "?".charCodeAt(0) - 32;

/**
 * Code 128-B değer dizisi: başlangıç + veri + kontrol basamağı + dur.
 *
 * ASCII 32-126 dışındaki karakter SESSİZCE ATLANMIYOR, '?' ile değiştiriliyor.
 * Atlamak okunan kodu sessizce kısaltır ve yanlış koliyi doğrulatır.
 *
 * @param {string} text
 * @returns {number[]}
 */
export function code128Values(text) {
  const values = [START_B];
  for (const ch of String(text ?? "")) {
    const c = ch.charCodeAt(0);
    values.push(c >= 32 && c <= 126 ? c - 32 : SUBSTITUTE);
  }

  // Kontrol basamağı: başlangıç kodu + her değerin 1'den başlayan konum
  // ağırlığıyla çarpımı, modül 103.
  let sum = values[0];
  for (let i = 1; i < values.length; i++) sum += values[i] * i;

  values.push(sum % 103, STOP);
  return values;
}

/** Değer dizisinin modül genişlikleri (çubukla başlar, sırayla alternatif). */
export function code128Modules(text) {
  return code128Values(text).map((v) => C128[v]).join("");
}

/**
 * Code 128-B sembolünün SVG'si (ham metin).
 *
 * @param {string} code
 * @param {{width?: number, height?: number, showText?: boolean}} [opts]
 * @returns {string}
 */
export function barcodeSvg(code, { width = 240, height = 60, showText = true } = {}) {
  const text = String(code ?? "");
  const textHeight = showText ? 14 : 0;
  const barHeight = Math.max(10, height - textHeight);

  const modules = code128Modules(text);
  const totalUnits =
    [...modules].reduce((sum, d) => sum + Number(d), 0) + QUIET_MODULES * 2;
  const unit = width / totalUnits;

  let x = QUIET_MODULES * unit;
  let isBar = true;
  let rects = "";
  for (const digit of modules) {
    const w = Number(digit) * unit;
    if (isBar) rects += `<rect x="${x.toFixed(3)}" y="0" width="${w.toFixed(3)}" height="${barHeight}" />`;
    x += w;
    isBar = !isBar;
  }

  const label = showText
    ? `<text x="${width / 2}" y="${height - 2}" text-anchor="middle" font-family="monospace" font-size="11" letter-spacing="1.5" fill="#111">${escapeXml(text)}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="#fff"/>
<g fill="#111">${rects}</g>${label}
</svg>`;
}

/**
 * Barkodu `<img src>` içinde kullanılabilir data URI'ye çevirir.
 *
 * `encodeURIComponent` kullanılıyor, base64 değil: SVG metin olarak kalınca
 * hem daha küçük hem tarayıcı geliştirici araçlarında okunabilir oluyor.
 */
export function barcodeDataUri(code, opts) {
  return `data:image/svg+xml,${encodeURIComponent(barcodeSvg(code, opts))}`;
}

function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  })[c]);
}
