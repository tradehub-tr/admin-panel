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
