// Barkod görseli üretimi — FE fazı için.
//
// NE OLDUĞU:
//   Verilen koddan DETERMİNİSTİK bir çubuk deseni çizer ve SVG data URI
//   döndürür. Aynı kod her zaman aynı deseni verir; ekranı yenilemek barkodu
//   değiştirmez.
//
// NE OLMADIĞI:
//   Gerçek Code128 KODLAMASI DEĞİLDİR — okuyucuyla taranamaz. Amaç, etiket
//   önizlemesinde "burada bir barkod var" bilgisini görsel olarak vermek ve
//   yazdırma akışını kapatmak. Gerçek kodlama 13-BE'nin işi
//   (`logistics/labels/barcode.py`, Code128).
//
//   Yer tutucu bir gri kutu koymak yerine çizim yapılıyor çünkü etiket
//   tasarımının okunabilirliği (çubuk yoğunluğu, kod metninin yeri) ancak
//   gerçekçi bir görüntüyle değerlendirilebiliyor.

/** Code128 benzeri görünüm için çubuk genişlik kademeleri. */
const WIDTHS = [1, 2, 3, 4];

/**
 * Koddan deterministik çubuk dizisi üretir.
 *
 * FNV-1a benzeri basit bir karıştırma: karakter değeri + konum. Amaç
 * kriptografik değil, aynı koddan aynı desenin çıkması.
 *
 * @param {string} code
 * @param {number} barCount
 * @returns {Array<{w: number, gap: number}>}
 */
function barsOf(code, barCount) {
  const text = String(code || "");
  const bars = [];
  let hash = 2166136261;
  for (let i = 0; i < barCount; i++) {
    const ch = text.charCodeAt(i % Math.max(1, text.length)) || 65;
    hash = ((hash ^ (ch + i * 31)) * 16777619) >>> 0;
    bars.push({
      w: WIDTHS[hash % WIDTHS.length],
      gap: WIDTHS[(hash >>> 8) % WIDTHS.length],
    });
  }
  return bars;
}

/**
 * Barkod SVG'si (ham metin).
 *
 * @param {string} code
 * @param {{width?: number, height?: number, showText?: boolean}} [opts]
 * @returns {string}
 */
export function barcodeSvg(code, { width = 240, height = 60, showText = true } = {}) {
  const text = String(code || "");
  const textHeight = showText ? 14 : 0;
  const barHeight = Math.max(10, height - textHeight);

  // Sessiz bölge (quiet zone) — gerçek barkodlarda zorunlu, burada da
  // bırakılıyor ki etiket tasarımı gerçekçi görünsün.
  const quiet = 8;
  const usable = width - quiet * 2;

  const bars = barsOf(text, 42);
  const totalUnits = bars.reduce((sum, b) => sum + b.w + b.gap, 0) || 1;
  const unit = usable / totalUnits;

  let x = quiet;
  let rects = "";
  for (const bar of bars) {
    const w = bar.w * unit;
    rects += `<rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${barHeight}" />`;
    x += w + bar.gap * unit;
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
