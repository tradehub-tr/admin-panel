import { onMounted, onUnmounted } from "vue";

/**
 * Medya Kütüphanesi klavye kısayolları — Drive/Lightroom benzeri gezinme.
 *
 *   /  veya  f   → aramaya odaklan
 *   ← → ↑ ↓      → ızgarada gezin
 *   Enter        → detay panelini aç
 *   Space        → seç / seçimi kaldır
 *   Shift+Space  → çapadan buraya kadar seç
 *   p            → önizleme
 *   Delete       → seçileni sil
 *   a            → arşivle
 *   Ctrl/Cmd+A   → görünenlerin tümünü seç
 *   Ctrl/Cmd+Z   → son işlemi geri al
 *   Escape       → seçim/panel/arama temizle
 *
 * Handler'lar dışarıdan verilir; composable yalnız tuş eşlemesini bilir.
 */
const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function useMediaShortcuts(handlers) {
  function isTyping(event) {
    const el = event.target;
    return TYPING_TAGS.has(el?.tagName) || el?.isContentEditable;
  }

  function onKeydown(event) {
    const mod = event.metaKey || event.ctrlKey;

    // Yazarken yalnız Escape geçer.
    if (isTyping(event)) {
      if (event.key === "Escape") handlers.blurSearch?.();
      return;
    }

    if (mod && event.key.toLowerCase() === "a") {
      event.preventDefault();
      handlers.selectAll?.();
      return;
    }
    if (mod && event.key.toLowerCase() === "z") {
      event.preventDefault();
      handlers.undo?.();
      return;
    }
    if (mod) return;

    switch (event.key) {
      case "/":
      case "f":
        event.preventDefault();
        handlers.focusSearch?.();
        break;
      case "ArrowRight":
        event.preventDefault();
        handlers.move?.(1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        handlers.move?.(-1);
        break;
      case "ArrowDown":
        event.preventDefault();
        handlers.moveRow?.(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        handlers.moveRow?.(-1);
        break;
      case "Enter":
        event.preventDefault();
        handlers.openDetail?.();
        break;
      case " ":
        event.preventDefault();
        if (event.shiftKey) handlers.selectRange?.();
        else handlers.toggleSelect?.();
        break;
      case "p":
      case "P":
        event.preventDefault();
        handlers.preview?.();
        break;
      case "a":
      case "A":
        event.preventDefault();
        handlers.archive?.();
        break;
      case "Delete":
      case "Backspace":
        event.preventDefault();
        handlers.remove?.();
        break;
      case "Escape":
        handlers.escape?.();
        break;
      default:
        break;
    }
  }

  onMounted(() => window.addEventListener("keydown", onKeydown));
  onUnmounted(() => window.removeEventListener("keydown", onKeydown));
}
