/**
 * Satıcı medya klasörlerine yapılan uygulama-içi sürüklemelerin veri biçimi.
 * Tarayıcının `text/plain` alanı özellikle kullanılmaz: dış sayfadan bırakılan
 * bir URL taşıma isteğine dönüşmemeli.
 */
export const MEDIA_FOLDER_DRAG_MIME = "application/x-istoc-media-files+json";

/** Klasör taşıma ucunun tek istek sınırı. */
export const MAX_MEDIA_FOLDER_MOVE = 200;

/**
 * Yalnız site-içi mutlak yolları kabul et, sıralamayı koruyarak tekilleştir.
 * Sahiplik yine sunucuda doğrulanır; bu kontrol güvenlik sınırı değil, istemci
 * tarafında bozuk/dış drag verisini uca hiç göndermeyen ilk filtredir.
 */
export function normalizeMediaFolderDragUrls(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((url) => typeof url === "string" && /^\/[^/]/.test(url)))];
}

export function readMediaFolderDrag(dataTransfer) {
  if (!dataTransfer?.getData) return [];
  try {
    return normalizeMediaFolderDragUrls(
      JSON.parse(dataTransfer.getData(MEDIA_FOLDER_DRAG_MIME) || "[]")
    );
  } catch {
    return [];
  }
}

export function writeMediaFolderDrag(dataTransfer, urls) {
  if (!dataTransfer?.setData) return [];
  const safe = normalizeMediaFolderDragUrls(urls);
  dataTransfer.effectAllowed = "move";
  dataTransfer.setData(MEDIA_FOLDER_DRAG_MIME, JSON.stringify(safe));
  return safe;
}
