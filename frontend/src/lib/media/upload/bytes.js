/**
 * Dosyanın ilk baytlarından okunabilenler — saf, tarayıcısız, testlenebilir.
 *
 * **Neden baytlara bakılıyor.** Uzantı yalan söyleyebilir; adı `.jpg` olan
 * dosyanın içi HTML olabilir ve tarayıcı onu HTML olarak açarsa saklı XSS
 * olur. Sunucu da bakıyor (`upload_policy.sniff` / `is_dangerous`) — buradaki
 * kontrol onun yerine geçmiyor, kullanıcıya erken cevap veriyor.
 *
 * **İlk 512 bayt yetiyor, gerisi okunmuyor.** 200 MB'lık bir videoyu kontrol
 * için tümüyle belleğe almak, önlemeye çalıştığımız sorunun aynısı olurdu.
 * Animasyon tespiti daha geniş bir pencere istiyor (GIF'te ikinci kare çok
 * ileride olabilir); orası için ayrı ve açıkça sınırlı bir dilim okunuyor.
 *
 * **Bilinmiyor ≠ hayır.** Her fonksiyon "ölçemedim" durumunu `null` ile
 * ayırıyor. AVIF/HEIC animasyonu bu kodla anlaşılamıyor; `false` döndürmek
 * animasyonlu bir dosyanın statik sanılması demekti.
 */

const bas = (bytes, n) => (bytes ? bytes.subarray(0, n) : new Uint8Array(0));

function startsWith(bytes, imza, offset = 0) {
  if (!bytes || bytes.length < offset + imza.length) return false;
  for (let i = 0; i < imza.length; i += 1) {
    if (bytes[offset + i] !== imza[i]) return false;
  }
  return true;
}

const enc = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));

/**
 * İçeriğin gerçek türü — `upload_policy._SIGNATURES` tablosunun aynısı.
 * Bilinmiyorsa boş dize.
 */
export function sniffSignature(bytes) {
  if (!bytes || !bytes.length) return "";
  const b = bas(bytes, 32);
  if (startsWith(b, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(b, enc("GIF87a")) || startsWith(b, enc("GIF89a"))) return "gif";
  if (startsWith(b, enc("BM"))) return "bmp";
  if (startsWith(b, [0x49, 0x49, 0x2a, 0x00]) || startsWith(b, [0x4d, 0x4d, 0x00, 0x2a])) {
    return "tiff";
  }
  if (startsWith(b, enc("%PDF-"))) return "pdf";
  if (startsWith(b, [0x50, 0x4b, 0x03, 0x04])) return "zip";
  if (startsWith(b, [0x1a, 0x45, 0xdf, 0xa3])) return "webm";
  // RIFF konteyneri: WEBP ve WAV aynı başlıkla başlar, ayrım 8. bayttan.
  if (startsWith(b, enc("RIFF")) && startsWith(b, enc("WEBP"), 8)) return "webp";
  if (startsWith(b, enc("ftyp"), 4)) return "mp4";
  return "";
}

/** Tarayıcının ÇALIŞTIRABİLECEĞİ içerikler — `upload_policy._DANGEROUS_MARKERS`. */
const TEHLIKELI = ["<!doctype html", "<html", "<svg", "<?xml", "<script", "<%", "#!/"];

/**
 * İçerik tarayıcıda çalışabilir mi.
 *
 * Baştaki boşluklar ve BOM atlanıyor: `   <svg…` ile `<svg…` aynı şekilde
 * çalışır, yalnız ilk bayta bakmak boşluk eklenerek atlatılabilirdi.
 */
export function isDangerous(bytes) {
  if (!bytes || !bytes.length) return false;
  let metin = "";
  const b = bas(bytes, 512);
  for (let i = 0; i < b.length; i += 1) metin += String.fromCharCode(b[i]);
  // Baytlar tek tek karaktere çevrildiği için UTF-8 BOM burada üç ayrı
  // karakter (\xEF\xBB\xBF) olarak görünür — tek bir U+FEFF olarak değil.
  const t = metin.replace(/^[\s\xef\xbb\xbf]+/, "").toLowerCase();
  return TEHLIKELI.some((m) => t.startsWith(m));
}

/**
 * Dosya animasyonlu mu — `true` / `false` / `null` (bilinmiyor).
 *
 * GIF, animasyonlu PNG ve animasyonlu WebP konteynerden okunabiliyor.
 * AVIF/HEIC için güvenilir bir yol yok; `null` dönüyor ve ön kontrol bunu
 * "ölçülmedi" diye işliyor.
 */
export function isAnimated(bytes) {
  const tur = sniffSignature(bytes);
  if (!tur) return null;

  if (tur === "gif") {
    // Grafik kontrol uzantısı (0x21 0xF9) sayısı > 1 ise birden çok kare var.
    // Tek karelik GIF'te de bir tane bulunabilir; bu yüzden eşik 1.
    let sayac = 0;
    for (let i = 0; i + 1 < bytes.length; i += 1) {
      if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9) {
        sayac += 1;
        if (sayac > 1) return true;
      }
    }
    return false;
  }

  if (tur === "png") {
    // APNG göstergesi `acTL` yığını ve IDAT'tan ÖNCE gelmek zorunda.
    const idat = indexOfAscii(bytes, "IDAT");
    const actl = indexOfAscii(bytes, "acTL");
    if (actl >= 0 && (idat < 0 || actl < idat)) return true;
    return idat >= 0 ? false : null;
  }

  if (tur === "webp") {
    // VP8X uzantılı konteynerde ANIM yığını varsa animasyonlu.
    return indexOfAscii(bytes, "ANIM") >= 0;
  }

  if (tur === "jpeg" || tur === "bmp" || tur === "tiff") return false;
  return null;
}

function indexOfAscii(bytes, ascii) {
  const hedef = enc(ascii);
  const son = bytes.length - hedef.length;
  for (let i = 0; i <= son; i += 1) {
    if (startsWith(bytes, hedef, i)) return i;
  }
  return -1;
}

/**
 * Görsel boyutlarını BAŞLIKTAN oku — `{width, height}` ya da `null`.
 *
 * **Neden çözmeden okunuyor.** Megapiksel tavanı (`max_megapixels_hard: 80`)
 * tam olarak "çözme bombası"na karşı var: 100 MP'lik bir PNG birkaç yüz KB
 * olabilir ama açıldığında yüzlerce MB RAM ister. Boyutu öğrenmek için önce
 * dosyayı çözmek, korunmaya çalışılan saldırıyı tarayıcıda gerçekleştirmek
 * olurdu. Başlık birkaç yüz bayt; tavan aşılıyorsa dosya hiç açılmaz.
 *
 * Okunamayan biçimler (AVIF, HEIC, TIFF) `null` döner — çağıran o zaman
 * `createImageBitmap`'e düşer ya da "ölçülmedi" der.
 */
export function readDimensions(bytes) {
  const tur = sniffSignature(bytes);

  if (tur === "png") {
    // IHDR her zaman ilk yığın: 8 bayt imza + 4 uzunluk + 4 tip + genişlik/yükseklik
    if (bytes.length < 24) return null;
    return { width: u32(bytes, 16), height: u32(bytes, 20) };
  }

  if (tur === "gif") {
    if (bytes.length < 10) return null;
    return { width: u16le(bytes, 6), height: u16le(bytes, 8) };
  }

  if (tur === "bmp") {
    if (bytes.length < 26) return null;
    return { width: u32le(bytes, 18), height: Math.abs(i32le(bytes, 22)) };
  }

  if (tur === "webp") {
    const b = bytes;
    if (startsWith(b, enc("VP8X"), 12)) {
      // Genişlik/yükseklik 24 bit, 1 eksik yazılır.
      return { width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
    }
    if (startsWith(b, enc("VP8L"), 12)) {
      // 14 bit genişlik + 14 bit yükseklik, 1 eksik.
      const bits = u32le(b, 21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (startsWith(b, enc("VP8 "), 12)) {
      return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
    }
    return null;
  }

  if (tur === "jpeg") {
    // SOF0…SOF15 arasındaki çerçeve başlığı aranır; SOF4/SOF8/SOF12 tanım
    // gereği çerçeve başlığı DEĞİL, atlanır.
    let i = 2;
    // Koşul yalnız işaret + uzunluk alanını (4 bayt) güvence altına alıyor;
    // çerçeve gövdesi ayrıca kontrol ediliyor. Daha geniş bir koşul, dosyanın
    // SON segmenti SOF olduğunda onu okumadan döngüyü bitirirdi.
    while (i + 3 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i += 1;
        continue;
      }
      const isaret = bytes[i + 1];
      if (isaret === 0xd8 || isaret === 0x01 || (isaret >= 0xd0 && isaret <= 0xd7)) {
        i += 2;
        continue;
      }
      const uzunluk = (bytes[i + 2] << 8) | bytes[i + 3];
      const sof = isaret >= 0xc0 && isaret <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(isaret);
      if (sof) {
        if (i + 8 >= bytes.length) return null;
        return {
          height: (bytes[i + 5] << 8) | bytes[i + 6],
          width: (bytes[i + 7] << 8) | bytes[i + 8],
        };
      }
      if (uzunluk < 2) return null;
      i += 2 + uzunluk;
    }
    return null;
  }

  return null;
}

const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const u32le = (b, o) => ((b[o + 3] << 24) | (b[o + 2] << 16) | (b[o + 1] << 8) | b[o]) >>> 0;
const i32le = (b, o) => (b[o + 3] << 24) | (b[o + 2] << 16) | (b[o + 1] << 8) | b[o];
const u24le = (b, o) => (b[o + 2] << 16) | (b[o + 1] << 8) | b[o];
const u16le = (b, o) => (b[o + 1] << 8) | b[o];

/**
 * Beyan edilen çözünürlük (DPI) — okunamıyorsa `null`.
 *
 * **Slot politikasında DPI EŞİĞİ YOK.** `slots/*.json` yalnız ÇIKTI için
 * `master.dpi_out` (72) tanımlıyor; girdi için bir kural yazılmamış. Bu değer
 * bu yüzden REDDETMİYOR, ekranda bilgi olarak duruyor — T-091 "DPI kontrolü"
 * diyor ama karşılığı olan bir kural bugün mevcut değil.
 *
 * JPEG'de JFIF APP0 yoğunluğu, PNG'de `pHYs` yığını okunuyor.
 */
export function readDpi(bytes) {
  const tur = sniffSignature(bytes);

  if (tur === "jpeg") {
    // APP0 (0xFFE0) + "JFIF\0": birim(1 bayt) + Xdensity(2) + Ydensity(2)
    for (let i = 2; i + 13 < Math.min(bytes.length, 4096); i += 1) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xe0 && startsWith(bytes, enc("JFIF"), i + 4)) {
        const birim = bytes[i + 11];
        const x = (bytes[i + 12] << 8) | bytes[i + 13];
        if (!x) return null;
        if (birim === 1) return x; // nokta/inç
        if (birim === 2) return Math.round(x * 2.54); // nokta/cm
        return null; // birim 0 = oransız, DPI anlamı yok
      }
    }
    return null;
  }

  if (tur === "png") {
    const p = indexOfAscii(bytes, "pHYs");
    if (p < 0 || p + 12 >= bytes.length) return null;
    const px = (bytes[p + 4] << 24) | (bytes[p + 5] << 16) | (bytes[p + 6] << 8) | bytes[p + 7];
    const birim = bytes[p + 12];
    if (birim !== 1 || !px) return null; // 1 = metre
    return Math.round(px * 0.0254);
  }

  return null;
}
