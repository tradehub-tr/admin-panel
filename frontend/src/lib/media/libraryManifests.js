/**
 * Media Library teslim zenginleştirmesi (T-092).
 *
 * Kart başına manifest istemek N+1 üretir. Çağıran yalnız görünür sayfayı
 * verir; bu yardımcı bütün anahtarları TEK `manifest_batch` çağrısında ister
 * ve yanıtı mevcut satırlara yerinde uygular.
 */

export const MANIFEST_BATCH_METHOD = "tradehub_core.api.media_manifest.manifest_batch";
export const MANIFEST_BATCH_MAX = 100;

export function manifestKey(item) {
  return String(item?.docName || item?.fileUrl || item?.id || "").trim();
}

function renditionRow(row) {
  return {
    profile: row?.profile || "",
    width: Number(row?.width) || 0,
    height: Number(row?.height) || 0,
    format: String(row?.format || "").toUpperCase(),
    fileUrl: row?.file_url || "",
    bytes: Number(row?.bytes) || 0,
    ssim: Number(row?.ssim) || 0,
    generation: row?.generation || "",
  };
}

/** Manifesti kartın `MediaThumb → MediaImage` sözleşmesine uygula. */
export function applyLibraryManifest(item, manifest) {
  if (!item) return item;
  const version = manifest?.version || null;
  item.renditions = (manifest?.renditions || [])
    .map(renditionRow)
    .filter((row) => row.width > 0 && row.fileUrl);
  item.lqip =
    version?.lqip_data_uri || version?.lqip || version?.dominant_color || item.lqip || "";
  item.assetNames = Array.isArray(manifest?.assets) ? [...manifest.assets] : [];
  item.deliveryState = manifest ? (item.renditions.length ? "ready" : "source-only") : "missing";
  item._manifestLoaded = true;
  return item;
}

/**
 * Görünür satırların tamamını tek istekte zenginleştir.
 *
 * 100 üstü girdi sessizce kırpılmaz; görünür sayfanın sözleşme dışına çıktığı
 * açıkça kırılır. Bugünkü sayfa seçenekleri 12/24/48 olduğundan normal akış
 * her zaman tek istektir.
 */
export async function loadLibraryManifests(rows, { call, force = false } = {}) {
  if (typeof call !== "function") throw new TypeError("manifest taşıması zorunlu");
  const candidates = (rows || []).filter((row) => force || !row?._manifestLoaded);
  const keys = [...new Set(candidates.map(manifestKey).filter(Boolean))];
  if (!keys.length) return { requested: 0, returned: 0, calls: 0 };
  if (keys.length > MANIFEST_BATCH_MAX) {
    throw new RangeError(`Tek manifest isteğinde en fazla ${MANIFEST_BATCH_MAX} dosya olabilir.`);
  }

  const response = await call(MANIFEST_BATCH_METHOD, { file_urls: keys });
  const body = response?.message ?? response ?? {};
  const manifests = body.manifests || {};
  for (const item of candidates) {
    const key = manifestKey(item);
    if (key) applyLibraryManifest(item, manifests[key] ?? null);
  }
  return {
    requested: keys.length,
    returned: Number(body.returned) || 0,
    calls: 1,
  };
}
