/**
 * txResize — Textarea resize handle (alt-orta pill)
 * ─────────────────────────────────────────────────
 * Tüm <textarea>'ları otomatik sarmalayıp native sağ-alt köşe handle'ını
 * kapatır, yerine alt-ortada ortak bir pill handle ekler. MutationObserver
 * ile modal/route geçişlerinde DOM'a giren yeni textarea'ları da yakalar.
 *
 * Wire-up: src/main.js → app.use(txResize)
 * Stil:    src/assets/scss/forms.scss (.tx-resize-wrap, .tx-resize-handle)
 *
 * Opt-out: <textarea data-tx-resize="off"> — sarmalanmaz.
 */

const WRAP_CLASS = "tx-resize-wrap";
const HANDLE_CLASS = "tx-resize-handle";

function startDrag(handle, ta, e) {
  e.preventDefault();
  const startY = e.clientY;
  const startH = ta.getBoundingClientRect().height;

  const onMove = (ev) => {
    const next = Math.max(60, startH + (ev.clientY - startY));
    ta.style.height = next + "px";
  };
  const onUp = () => {
    handle.classList.remove("is-dragging");
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
  };

  handle.classList.add("is-dragging");
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}

// Handle'ı textarea'nın gerçek yatay merkezine hizalar. Wrap parent'ı
// dolduran block element olduğunda (örn. modal'da fixed-width textarea),
// `left: 50%` wrap'in ortasına gelir ama textarea daha dar olduğu için
// handle textarea'nın yanına düşer. Bu fonksiyon her boyut değişiminde
// handle.left'i textarea'nın merkezine taşır.
function positionHandle(handle, ta) {
  const taRect = ta.getBoundingClientRect();
  const wrapRect = handle.parentElement.getBoundingClientRect();
  if (taRect.width === 0 || wrapRect.width === 0) return;
  const center = taRect.left - wrapRect.left + taRect.width / 2;
  handle.style.left = center + "px";
}

function wrapTextarea(ta) {
  if (ta.dataset.txResize === "off") return;
  if (ta.parentElement?.classList?.contains(WRAP_CLASS)) return;
  if (!ta.parentNode) return;

  const wrap = document.createElement("div");
  wrap.className = WRAP_CLASS;
  ta.parentNode.insertBefore(wrap, ta);
  wrap.appendChild(ta);
  ta.style.resize = "none";

  const handle = document.createElement("div");
  handle.className = HANDLE_CLASS;
  handle.setAttribute("title", "Sürükle: yeniden boyutlandır");
  handle.addEventListener("pointerdown", (e) => startDrag(handle, ta, e));
  wrap.appendChild(handle);

  // İlk render sonrası ölçü için bir frame bekle, sonra hizala.
  requestAnimationFrame(() => positionHandle(handle, ta));

  // Textarea boyut değişirse handle takipte kalır (kullanıcı sürüklerken
  // veya parent layout güncellenirse).
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => positionHandle(handle, ta));
    ro.observe(ta);
  }
}

function scan(root) {
  if (!root || root.nodeType !== 1) return;
  if (root.tagName === "TEXTAREA") {
    wrapTextarea(root);
    return;
  }
  if (typeof root.querySelectorAll === "function") {
    root.querySelectorAll("textarea").forEach(wrapTextarea);
  }
}

function cleanupEmptyWrap(parent) {
  if (parent?.classList?.contains(WRAP_CLASS) && !parent.querySelector("textarea")) {
    parent.remove();
  }
}

export default {
  install() {
    if (typeof window === "undefined") return;

    const init = () => {
      scan(document.body);
      const mo = new MutationObserver((mutations) => {
        for (const m of mutations) {
          m.addedNodes.forEach(scan);
          m.removedNodes.forEach((n) => {
            if (n.nodeType === 1 && n.tagName === "TEXTAREA") {
              cleanupEmptyWrap(m.target);
            }
          });
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
  },
};
