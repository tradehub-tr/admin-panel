/** Medya kütüphanesi biçimlendiricileri — sayı/tarih gösterimi tek yerden. */

const UNITS = ["B", "KB", "MB", "GB"];

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "—";
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits).replace(".", ",")} ${UNITS[unit]}`;
}

export function formatDimensions(item) {
  if (item.kind === "document") return "—";
  if (!item.width || !item.height) return "—";
  return `${item.width} × ${item.height}`;
}

export function formatDate(iso, locale = "tr") {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Tarayıcının çizebildiği görsel uzantıları.
 *
 * TIFF ve SVG kasten dışarıda: TIFF çoğu tarayıcıda açılmıyor, SVG ise kullanıcı
 * yüklemesi olduğu için satır içi gösterimi XSS yüzeyi. Backend'deki karşılığı
 * `media/audit.py → RENDERABLE_EXT` — ikisi birlikte güncellenmeli.
 */
export const RENDERABLE_IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|bmp)(\?|$)/i;

/** Bu adres tarayıcıda küçük resim olarak gösterilebilir mi. */
export function canRenderThumb(url) {
  return typeof url === "string" && RENDERABLE_IMAGE_RE.test(url);
}

/**
 * Kısa boyut gösterimi (KB/MB/GB) — dar sütunlar için.
 *
 * `formatBytes` her zaman en uygun birimi seçer ve virgüllü yazar; medya
 * ekranlarında sabit ondalık daha okunaklı olduğu için ayrı tutuldu. Dört
 * ekranda birebir aynı kopya vardı.
 */
export function formatSize(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

/** Dosya türüne göre AppIcon adı — kart, satır ve seçici aynı ikonu kullansın. */
export function iconForKind(kind) {
  if (kind === "video") return "video";
  if (kind === "document") return "file-text";
  return "image";
}

/**
 * Serbest metin araması — dosya adı, başlık ve etiketlerde.
 * Store ve seçici modal aynı davranışı paylaşsın diye tek yerde.
 * Türkçe locale kullanılır: "İSO" → "iso" eşleşmeli.
 */
export function matchesQuery(item, query) {
  const q = (query || "").trim().toLocaleLowerCase("tr");
  if (!q) return true;
  return [item.fileName, item.title, ...item.tags].join(" ").toLocaleLowerCase("tr").includes(q);
}
