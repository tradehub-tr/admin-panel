/**
 * Dosyayı ÖLÇ — karar verme, ölçümü `preflight.js`'e ver.
 *
 * **Neden ayrı dosya.** Ölçüm tarayıcıya (ya da işçiye) muhtaç:
 * `createImageBitmap`, `OffscreenCanvas`, `mediabunny`. Kural ise saf mantık.
 * İkisi tek dosyada olsaydı kuralı test etmek için tarayıcı kurmak gerekirdi.
 * Bu dosya hem ana iş parçacığında hem Web Worker içinde çalışabiliyor:
 * DOM'a değil yalnız `self` üzerindeki API'lere dokunuyor.
 *
 * **Boyut ÖNCE başlıktan okunuyor.** Megapiksel tavanı çözme bombasına karşı
 * var; boyutu öğrenmek için dosyayı çözmek, korunmaya çalışılan saldırıyı
 * yapmak olurdu. `createImageBitmap` yalnız başlık okunamayınca (AVIF/HEIC)
 * ve tavan aşılmıyorsa çağrılıyor.
 *
 * **Ölçülemeyen ölçüldü gibi gösterilmiyor.** Her alan ya bir sayı ya `null`.
 * `decoded: false` dönen bir ölçüm ön kontrolde `manual_review` üretir.
 */

import { isAnimated, isDangerous, readDimensions, readDpi, sniffSignature } from "./bytes.js";

/** Başlık penceresi — imza, boyut ve DPI bu kadarında. */
const HEAD_BYTES = 64 * 1024;

/**
 * Animasyon penceresi. GIF'te ikinci kare çok ileride olabilir; 2 MB pratik
 * bir uzlaşma — daha fazlasını okumak, kaçınmaya çalıştığımız bellek maliyeti.
 * Bu pencerede ikinci kare bulunamazsa sonuç `false` DEĞİL, olduğu gibi
 * bırakılır (bkz. `isAnimated`).
 */
const ANIM_BYTES = 2 * 1024 * 1024;

/** Alfa örneklemesi bu ölçeğe indirilmiş kopyada yapılır. */
const ALPHA_SAMPLE = 64;

const VIDEO_EXT = [".mp4", ".webm", ".mov", ".m4v"];

/** Bu dosya video mu — uzantı ya da tarayıcının verdiği tür. */
export function isVideoFile(file) {
  const ext = extensionOf(file?.name || "");
  return VIDEO_EXT.includes(ext) || String(file?.type || "").startsWith("video/");
}

export function extensionOf(name) {
  const ad = String(name || "").trim();
  const son = ad.lastIndexOf(".");
  if (son < 0) return "";
  let bas = 0;
  while (bas < son && ad[bas] === ".") bas += 1;
  if (bas === son) return "";
  return ad.slice(son).toLowerCase();
}

async function head(file, n) {
  const buf = await file.slice(0, Math.min(n, file.size)).arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * Dosyayı ölç.
 *
 * @param {File|Blob} file
 * @param {{maxMegapixels?: number, wantAlpha?: boolean}} opts
 *   `maxMegapixels` verilirse tavanı aşan görsel ÇÖZÜLMEZ — bombayı açmamak
 *   ön kontrolün asıl işi.
 * @returns {Promise<object>} `preflight.evaluate` girdisi.
 */
export async function probeFile(file, opts = {}) {
  const { maxMegapixels = 0, wantAlpha = false, probeVideoFn = null } = opts;
  const ext = extensionOf(file.name || "");

  const olcum = {
    name: file.name || "",
    size: file.size || 0,
    mime: file.type || "",
    ext,
    sniffed: "",
    dangerous: false,
    dpi: null,
    animated: null,
    width: null,
    height: null,
    hasAlpha: null,
    durationS: null,
    frameRate: null,
    videoCodec: null,
    audioCodec: null,
    decoded: false,
    decodeFailed: false,
    probeError: "",
  };

  if (!file.size) return olcum;

  let bas;
  try {
    bas = await head(file, HEAD_BYTES);
  } catch (e) {
    olcum.probeError = String(e?.message || e);
    return olcum;
  }

  olcum.sniffed = sniffSignature(bas);
  olcum.dangerous = isDangerous(bas);
  olcum.dpi = readDpi(bas);

  if (isVideoFile(file)) {
    // Video ölçümü DIŞARIDAN geliyor (`videoProbe.js`). Sebep yapısal:
    // `mediabunny` devingen içe aktarılıyor ve devingen içe aktarma işçi
    // paketinde kod bölmesi üretiyor; Vite'ın işçi biçimi (`worker.format`,
    // varsayılan `iife`) bölünmüş çıktıyı KABUL ETMİYOR ve üretim yapısı
    // kırılıyor. Ölçüldü: `Invalid value "iife" for option "output.format"`.
    // Bu yüzden işçi yalnız görsel ölçüyor; video ana iş parçacığında.
    if (typeof probeVideoFn === "function") await probeVideoFn(file, olcum);
    else olcum.probeError = "video ölçümü bu bağlamda yok";
    return olcum;
  }

  const boyut = readDimensions(bas);
  if (boyut && boyut.width > 0 && boyut.height > 0) {
    olcum.width = boyut.width;
    olcum.height = boyut.height;
    olcum.decoded = true;
  }

  // Animasyon: başlıkta bulunamadıysa daha geniş pencere okunuyor.
  olcum.animated = isAnimated(bas);
  if (olcum.animated === false && file.size > HEAD_BYTES) {
    try {
      olcum.animated = isAnimated(await head(file, ANIM_BYTES));
    } catch {
      /* geniş pencere okunamadıysa dar penceredeki sonuç kalır */
    }
  }

  const mp = olcum.decoded ? (olcum.width * olcum.height) / 1_000_000 : 0;
  const bombaMi = maxMegapixels > 0 && mp > maxMegapixels;

  // Başlık okunamadı (AVIF/HEIC/TIFF) → çözerek dene. Bomba şüphesi varsa
  // ÇÖZÜLMEZ: tavanı aşan dosyayı açmak, tavanın engellediği şeyi yapmaktır.
  if (!olcum.decoded && !bombaMi) {
    await decodeDimensions(file, olcum, wantAlpha);
  } else if (wantAlpha && !bombaMi && olcum.hasAlpha === null) {
    await decodeAlpha(file, olcum);
  }

  return olcum;
}

async function decodeDimensions(file, olcum, wantAlpha) {
  if (typeof createImageBitmap !== "function") {
    olcum.probeError = "createImageBitmap yok";
    return;
  }
  let bitmap = null;
  try {
    bitmap = await createImageBitmap(file);
    olcum.width = bitmap.width;
    olcum.height = bitmap.height;
    olcum.decoded = true;
    if (wantAlpha) olcum.hasAlpha = sampleAlpha(bitmap);
  } catch (e) {
    olcum.decodeFailed = true;
    olcum.probeError = String(e?.message || e);
  } finally {
    bitmap?.close?.();
  }
}

async function decodeAlpha(file, olcum) {
  if (typeof createImageBitmap !== "function") return;
  let bitmap = null;
  try {
    bitmap = await createImageBitmap(file);
    olcum.hasAlpha = sampleAlpha(bitmap);
  } catch {
    /* alfa ölçülemedi — `null` kalır, ön kontrol bunu bilgi sayar */
  } finally {
    bitmap?.close?.();
  }
}

/**
 * Alfa var mı — küçültülmüş kopyada örneklenir.
 *
 * Tam boyutta taramak 80 MP'lik bir görselde 320 MB'lık bir ImageData demekti.
 * Küçültme saydamlığı yok etmez: tamamen saydam bir bölge küçültüldüğünde de
 * saydam kalır. Ölçülemezse `null` — "alfa yok" ile karıştırılmıyor.
 */
function sampleAlpha(bitmap) {
  if (typeof OffscreenCanvas !== "function") return null;
  try {
    const canvas = new OffscreenCanvas(ALPHA_SAMPLE, ALPHA_SAMPLE);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.clearRect(0, 0, ALPHA_SAMPLE, ALPHA_SAMPLE);
    ctx.drawImage(bitmap, 0, 0, ALPHA_SAMPLE, ALPHA_SAMPLE);
    const { data } = ctx.getImageData(0, 0, ALPHA_SAMPLE, ALPHA_SAMPLE);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  } catch {
    return null;
  }
}
