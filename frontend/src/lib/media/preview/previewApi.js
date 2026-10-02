import api from "@/utils/api";

/** Görsel önizleme penceresi uçları — `tradehub_core/api/media_preview.py`. */
export const TARGET_METHOD = "tradehub_core.api.media_preview.get_preview_target";
export const PREFS_GET_METHOD = "tradehub_core.api.media_preview.get_preview_prefs";
export const PREFS_SET_METHOD = "tradehub_core.api.media_preview.set_preview_prefs";
export const DIMENSIONS_METHOD = "tradehub_core.api.seller_media.get_dimensions";

const unwrap = (res) => res?.message ?? res;

/** Dosya + slot → `{asset, processing, source, focal, square}`. */
export async function getPreviewTarget(fileUrl, slotKey) {
  return unwrap(await api.callMethodGET(TARGET_METHOD, { file_url: fileUrl, slot_key: slotKey }));
}

/** `{autoopen: boolean}` — kullanıcıya özel, sunucuda. */
export async function getPreviewPrefs() {
  return unwrap(await api.callMethodGET(PREFS_GET_METHOD, {}));
}

export async function setPreviewPrefs(autoopen) {
  return unwrap(await api.callMethod(PREFS_SET_METHOD, { autoopen: autoopen ? "1" : "0" }));
}

/** Rozet için gerçek piksel ölçüsü (`seller_media.get_dimensions`, sahiplik kapılı). */
export async function getImageDimensions(fileUrl) {
  return unwrap(await api.callMethodGET(DIMENSIONS_METHOD, { file_url: fileUrl }));
}
