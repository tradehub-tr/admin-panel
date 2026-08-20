/**
 * Crop Studio klavye kısayolları — saf eşleme, dinleyici burada YOK.
 *
 * ### `useMediaShortcuts` ile çakışma — TARANDI ve çözüldü
 *
 * `src/composables/useMediaShortcuts.js` **`window`** üzerinde `keydown`
 * dinliyor ve şu tuşları tüketiyor: `Ctrl/Cmd+Z` (medya işlemini geri al),
 * `Ctrl/Cmd+A`, ok tuşları (ızgarada gezinme), `Enter`, `Space`, `p`, `a`,
 * `Delete`, `Escape`, `/`, `f`. Crop Studio bir medya gezgini ekranının
 * ÜSTÜNDE açılıyor ve o composable hâlâ bağlı: `Ctrl+Z` kadrajı geri alırken
 * aynı anda medya işlemini de geri alırdı.
 *
 * Çözüm: Crop Studio dinleyicisini **`document` üzerinde YAKALAMA (capture)
 * evresinde** bağlamak ve tükettiği tuşta `stopPropagation()` çağırmak. Olay
 * yolu `document(capture) → … → document(bubble) → window` olduğu için
 * yakalamada durdurulan olay `window` dinleyicisine hiç ulaşmaz. `Escape`
 * ayrıca `MediaModal`'ın `@keydown.esc.stop` işleyicisiyle zaten kesiliyor.
 *
 * ÖLÇÜLMEDİ: gerçek tarayıcıda iki dinleyicinin sırası test edilmedi —
 * bu görevde tarayıcı doğrulaması yapılmadı. Olay yolu DOM sözleşmesidir,
 * ama ölçüm ölçümdür.
 */

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function isTyping(target) {
  return TYPING_TAGS.has(target?.tagName) || Boolean(target?.isContentEditable);
}

/**
 * @param {KeyboardEvent|object} event
 * @returns {{action:string, fast?:boolean}|null} `null` = bu tuş bizim değil.
 */
export function cropShortcut(event) {
  const mod = event.metaKey || event.ctrlKey;

  if (mod && String(event.key).toLowerCase() === "z") {
    return { action: event.shiftKey ? "redo" : "undo" };
  }
  if (mod) return null;
  if (isTyping(event.target)) return null;

  switch (event.key) {
    case "+":
    case "=":
      return { action: "zoomIn" };
    case "-":
    case "_":
      return { action: "zoomOut" };
    case "l":
    case "L":
      return { action: "toggleLock" };
    case "Enter":
      return { action: "apply" };
    default:
      return null;
  }
}

/** Zoom kısayolunun adımı — kaydırıcının %5'i. */
export const ZOOM_STEP = 0.25;
