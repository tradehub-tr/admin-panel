// POD kanıt medyası — mock görselleri.
//
// NEDEN VAR:
//   Tohumdaki üç görsel alanı YER TUTUCU metin taşıyordu (`"signature_url":
//   "sig"`). Ekran doğru davranıp "Görsel yüklenemedi" çiziyordu, ama kanıt
//   medyasının tasarımı ne panelde ne Storybook'ta görülebiliyordu — üç kutu
//   da kırık. Ölçüldü 2026-08-24 (A9): kanıtlı üç story'nin üçünde de üç 404.
//
//   FE mock disiplini (`docs/lojistik/FE-MOCK-DISIPLINI.md` §12) mock'tan
//   "gerçek çıktı" istiyor: etiket yazdırılabilir açılmalı, barkod çizilmeli,
//   `#yer-tutucu` bağlantı yasak. Kanıt medyası bu kuralın dışında kalmıştı.
//
// NEDEN `data:` URI (dosya değil):
//   Mock'un tarayıcıdan başka bir şeye ihtiyacı olmamalı — statik dosya
//   koymak `public/` altına demo varlığı sızdırır ve üretim build'ine girer.
//   `data:` URI ile görsel yükün İÇİNDE geliyor; 14-BE gerçek `file_url`
//   döndürmeye başladığında bu modül silinir, ekran değişmez.
//
// NEDEN base64:
//   Ham SVG'deki `#` ve `<` karakterleri `data:` URI'de kaçırılmak zorunda;
//   base64 bunu tek adımda çözüyor ve string tek satırda kalıyor.

/** SVG metnini `data:` URI'ye çevirir. */
const svg = (icerik) =>
  `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(icerik.trim())))}`;

/**
 * Islak imza — teslim alanın karalaması.
 *
 * Beyaz zemin BİLEREK: gerçek imza taramaları da beyaz gelir ve ekranın koyu
 * temada görsele zemin verip vermediği ancak böyle görülür.
 */
export const SIGNATURE_URL = svg(`
<svg xmlns="http://www.w3.org/2000/svg" width="420" height="200" viewBox="0 0 420 200">
  <rect width="420" height="200" fill="#ffffff"/>
  <path d="M40 140 C70 60, 95 60, 105 120 S135 175, 150 105 S175 55, 195 120
           S225 165, 245 95 S285 60, 300 130"
        fill="none" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/>
  <path d="M300 130 C320 140, 345 132, 372 108" fill="none" stroke="#1f2937"
        stroke-width="4" stroke-linecap="round"/>
  <line x1="40" y1="168" x2="380" y2="168" stroke="#9ca3af" stroke-width="1.5"/>
  <text x="40" y="188" font-family="system-ui, sans-serif" font-size="13" fill="#6b7280">
    Teslim alan imzası
  </text>
</svg>`);

/**
 * Teslim fotoğrafı — kapı önüne bırakılmış koliler.
 *
 * Gerçek bir fotoğraf değil, onun YERİNİ TUTAN bir çizim: amaç kartın en/boy
 * oranını, kırpmasını ve büyütme davranışını gözden geçirilebilir kılmak.
 */
export const PHOTO_URL = svg(`
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
  <rect width="480" height="360" fill="#e5e7eb"/>
  <rect y="250" width="480" height="110" fill="#d1d5db"/>
  <rect x="90" y="150" width="140" height="120" fill="#c8a06a" stroke="#8a6a3f" stroke-width="3"/>
  <rect x="240" y="185" width="115" height="85" fill="#d2ad78" stroke="#8a6a3f" stroke-width="3"/>
  <line x1="90" y1="195" x2="230" y2="195" stroke="#8a6a3f" stroke-width="3"/>
  <line x1="160" y1="150" x2="160" y2="270" stroke="#8a6a3f" stroke-width="3"/>
  <rect x="112" y="163" width="52" height="26" fill="#ffffff" stroke="#8a6a3f"/>
  <rect x="330" y="60" width="120" height="190" fill="#9ca3af"/>
  <circle cx="345" cy="160" r="6" fill="#4b5563"/>
  <text x="24" y="330" font-family="system-ui, sans-serif" font-size="16" fill="#374151">
    Teslim fotoğrafı — 2 koli, kapı önü
  </text>
</svg>`);

/** Karşı taraf imzalı irsaliye — belge sekmesinin önizlemesi. */
export const DOCUMENT_URL = svg(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520" viewBox="0 0 400 520">
  <rect width="400" height="520" fill="#ffffff" stroke="#d1d5db" stroke-width="2"/>
  <rect x="0" y="0" width="400" height="64" fill="#f3f4f6"/>
  <text x="24" y="40" font-family="system-ui, sans-serif" font-size="19" font-weight="bold" fill="#111827">
    İRSALİYE
  </text>
  <text x="290" y="40" font-family="monospace" font-size="14" fill="#374151">A-284193</text>
  ${[110, 145, 180, 215, 250, 285, 320]
    .map(
      (y, i) =>
        `<line x1="24" y1="${y}" x2="${i % 3 === 2 ? 250 : 376}" y2="${y}" stroke="#e5e7eb" stroke-width="9"/>`
    )
    .join("")}
  <rect x="24" y="360" width="150" height="70" fill="none" stroke="#9ca3af" stroke-dasharray="4 3"/>
  <path d="M40 410 C60 375, 78 400, 92 385 S120 400, 150 378" fill="none"
        stroke="#1f2937" stroke-width="3" stroke-linecap="round"/>
  <text x="24" y="450" font-family="system-ui, sans-serif" font-size="12" fill="#6b7280">
    Teslim alan kaşe/imza
  </text>
</svg>`);
