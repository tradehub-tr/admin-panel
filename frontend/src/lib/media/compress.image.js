// Görsel sıkıştırma: browser-image-compression ile WebP'ye çevirir.
// Safari/iOS canvas.toBlob('image/webp') desteklemediği için (WebP istenmiş
// olsa bile gerçek çıktı webp OLMAYABİLİR) sonucu kontrol edip gerekirse JPEG
// q85 ile ikinci bir geçiş yapar. Sunucu (WP2 engine.to_webp) JPEG geldiğinde
// WebP'ye tamamlıyor, bu yüzden fallback güvenli. (tradehubfront/src/lib/media
// altındaki TS sürümüyle aynı mantık — storefront'ta test edildi.)
import imageCompression from "browser-image-compression";

const HEDEF_GENISLIK = 1920;
const HEDEF_MAX_MB = 0.5;

// WebP desteği tek seferlik feature-detect edilip modül seviyesinde cache'lenir.
let webpDestekCache = null;

async function webpDestekliMi() {
  if (webpDestekCache !== null) return webpDestekCache;
  webpDestekCache = await new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    canvas.toBlob((blob) => resolve(blob?.type === "image/webp"), "image/webp");
  });
  return webpDestekCache;
}

function tabanAd(name) {
  const idx = name.lastIndexOf(".");
  return idx > 0 ? name.slice(0, idx) : name;
}

/**
 * @param {File} file
 * @param {{ webpSupported?: boolean, maxWidth?: number, maxSizeMB?: number }} [opts]
 * @returns {Promise<{ blob: Blob, name: string, converted: "webp"|"jpeg" }>}
 */
export async function prepareImage(file, opts = {}) {
  const webpDestek = opts.webpSupported ?? (await webpDestekliMi());
  const maxWidthOrHeight = opts.maxWidth ?? HEDEF_GENISLIK;
  const maxSizeMB = opts.maxSizeMB ?? HEDEF_MAX_MB;
  const taban = tabanAd(file.name);

  if (!webpDestek) {
    const jpeg = await imageCompression(file, {
      maxWidthOrHeight,
      maxSizeMB,
      initialQuality: 0.85,
      useWebWorker: true,
      fileType: "image/jpeg",
    });
    return { blob: jpeg, name: `${taban}.jpg`, converted: "jpeg" };
  }

  const webpDenemesi = await imageCompression(file, {
    maxWidthOrHeight,
    maxSizeMB,
    initialQuality: 0.8,
    useWebWorker: true,
    fileType: "image/webp",
  });

  if (webpDenemesi.type === "image/webp") {
    return { blob: webpDenemesi, name: `${taban}.webp`, converted: "webp" };
  }

  // Safari tuzağı: canvas.toBlob('image/webp') sessizce başka type döndürdü —
  // güvenilir JPEG q85 ile ikinci geçiş yap.
  const jpeg = await imageCompression(file, {
    maxWidthOrHeight,
    maxSizeMB,
    initialQuality: 0.85,
    useWebWorker: true,
    fileType: "image/jpeg",
  });
  return { blob: jpeg, name: `${taban}.jpg`, converted: "jpeg" };
}
