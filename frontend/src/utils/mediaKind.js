/**
 * Dosya türü çözümü — panelin TEK kaynağı.
 *
 * NEDEN AYRI MODÜL: kural iki yerde kopyalanmıştı ve ikisi de ayrı ayrı
 * yanlıştı. `composables/useSellerMedia.js` uzantıya bakıp bilinmeyeni
 * "image" sayıyordu; `stores/media.js` MIME'a bakıp bilinmeyeni "document"
 * sayıyordu. Ses desteği açıldığında (MOGEM-620 §15) aynı `.mp3` dosyası
 * kütüphanede "görsel", yükleme kuyruğunda "belge" görünüyordu — biri kırık
 * küçük resim çiziyor, diğeri yanlış rozet basıyordu.
 *
 * BACKEND İLE HİZA: uzantı listelerinin doğruluk kaynağı Python tarafında
 * (`media/upload_policy.py::AUDIO_EXTENSIONS` ve `media/inventory.py::
 * KIND_EXTENSIONS`). İki repo arasında derleme zamanı bağ kurulamıyor;
 * listeler elle eşleniyor. Backend'e yeni uzantı eklendiğinde BURASI da
 * güncellenmeli — aksi hâlde dosya yüklenir ama panelde yanlış türde görünür.
 */

/** Ses uzantıları — `upload_policy.AUDIO_EXTENSIONS` karşılığı. */
export const AUDIO_EXTENSIONS = Object.freeze(["mp3", "m4a", "aac", "ogg", "opus", "wav", "flac"]);

/** Video uzantıları — `inventory.VIDEO_EXTENSIONS` karşılığı. */
export const VIDEO_EXTENSIONS = Object.freeze(["mp4", "webm", "mov", "avi", "mkv", "m4v"]);

/** Belge uzantıları — `inventory.DOCUMENT_EXTENSIONS` karşılığı. */
export const DOCUMENT_EXTENSIONS = Object.freeze([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "txt",
  "rtf",
  "ppt",
  "pptx",
  "zip",
]);

/** Panelin tanıdığı türler — filtre seçenekleri de bu sırayla çizilir. */
export const MEDIA_KINDS = Object.freeze(["image", "video", "audio", "document"]);

/**
 * Uzantıdan tür.
 *
 * Yakalayıcı dal "image": bilinmeyen bir uzantı panelde KAYBOLMASIN, en
 * azından görsel olarak görünsün. Backend `inventory._kind_condition` da
 * aynı yakalayıcıyı kullanıyor — iki taraf aynı şeyi söylüyor.
 *
 * @param {string} uzanti Noktasız uzantı ("mp3") veya dosya adı ("a.mp3").
 */
export function kindOfExtension(uzanti) {
  const ham = String(uzanti || "").toLowerCase();
  const u = ham.includes(".") ? ham.slice(ham.lastIndexOf(".") + 1) : ham;
  if (VIDEO_EXTENSIONS.includes(u)) return "video";
  if (AUDIO_EXTENSIONS.includes(u)) return "audio";
  if (DOCUMENT_EXTENSIONS.includes(u)) return "document";
  return "image";
}

/**
 * MIME'dan tür — yükleme kuyruğu tarayıcının verdiği `File.type`'ı taşıyor.
 *
 * Yakalayıcı dal burada "document": tarayıcı MIME'ı BOŞ da verebilir
 * (bilinmeyen uzantıda yaygın) ve o dosyayı görsel sayıp önizleme çizmeye
 * çalışmak kırık resim üretirdi. Uzantı yolunun yakalayıcısından bilerek
 * farklı — orada elimizde dosya adı var, burada olmayabilir.
 */
export function kindOfMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  return "document";
}

/**
 * Dosya nesnesinden tür — MIME varsa ondan, yoksa addan.
 *
 * Tarayıcı `.opus`/`.flac` gibi uzantılarda `File.type`'ı boş bırakabiliyor;
 * yalnız MIME'a bakmak o dosyaları "belge" yapardı. Ad her zaman var.
 */
export function kindOfFile(file) {
  const mime = String(file?.type || "");
  if (mime) return kindOfMime(mime);
  return kindOfExtension(String(file?.name || ""));
}
