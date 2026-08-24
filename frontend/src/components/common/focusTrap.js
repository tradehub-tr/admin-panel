// Odak tuzağı (focus trap) ortak yardımcıları — WCAG 2.1.2 (No Keyboard Trap
// tersi: modal içinde odak DIŞARI kaçmamalı) ve 2.4.3 (Focus Order).
//
// NEDEN AYRI DOSYA:
//   Aynı odaklanabilir-eleman seçici dizesi ConfirmDialog, DataTable filtre
//   popover'ı ve `views/logistics/exceptions/components/ResolveDialog.vue`
//   içinde ayrı ayrı kopyalanmıştı. Kopyalar zamanla ayrışıyor: birinde
//   `[contenteditable]` var, ötekinde yok. Sözleşme TEK yerde durur.
//
//   Dosya saf JS — Vue import etmez, `node --test` ile doğrudan test edilebilir
//   (`__tests__/focusTrap.test.js`, sahte `document`/kap ile). Bu yüzden tek
//   import'u `@/` alias'ı DEĞİL, göreli yol: alias'ı yalnız Vite çözüyor,
//   node çözemez ve iddia yalan olurdu.
import { PAGE_MAIN_ID } from "../../constants/layout.js";

/**
 * Doğal olarak odaklanabilir ögeler + açıkça tabindex verilmişler.
 * `tabindex="-1"` yalnız programatik odak içindir, Tab sırasına girmez.
 */
export const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"])';

/**
 * Kaptaki gerçekten odaklanabilir ögeler (disabled / aria-hidden elenir).
 *
 * @param {ParentNode|null|undefined} container
 * @returns {HTMLElement[]}
 */
export function focusablesIn(container) {
  return Array.from(container?.querySelectorAll(FOCUSABLE_SELECTOR) || []).filter(
    (el) => !el.disabled && el.getAttribute("aria-hidden") !== "true"
  );
}

/**
 * Tab / Shift+Tab olayını kabın içinde döndürür.
 * Kapta odaklanabilir öge yoksa olaya dokunmaz (tarayıcı davranışı sürer).
 *
 * @param {KeyboardEvent} e
 * @param {ParentNode|null|undefined} container
 */
export function trapTabKey(e, container) {
  const els = focusablesIn(container);
  if (!els.length) return;
  const first = els[0];
  const last = els[els.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * Kapanan katmandan odağı geri verir.
 *
 * `el.focus()` tek başına yetmez: tetikleyici `v-if` ile DOM'dan kalkmışsa
 * çağrı sessizce yutulur ve odak `<body>`'ye düşer — klavye kullanıcısı
 * sayfanın başına savrulur (WCAG 2.4.3). Bağlantısı kopmuş hedefte kalıcı
 * bir kaba (ana içerik) düşülür.
 *
 * YEDEK HEDEF PARAMETRE DEĞİL (SOLID denetimi, 2026-08-24): imza eskiden
 * `(target, fallback)` idi ve iki çağıran da aynı ifadeyi yazıyordu
 * (`document.getElementById(PAGE_MAIN_ID)`) — üçüncü katman bağlandığında
 * üçüncü kez yazılacaktı. Yedek teoride değişkendi, pratikte tekti: panelde
 * odağın iade edilebileceği tek kalıcı kap ana içerik. Farklı bir kap gerekirse
 * o gün ikinci bir parametre değil, ayrı bir sarmalayıcı eklenir.
 *
 * @param {Element|null} target Katman açılmadan önceki `document.activeElement`
 */
export function restoreFocus(target) {
  if (target?.isConnected && typeof target.focus === "function") {
    target.focus();
    return;
  }
  document.getElementById(PAGE_MAIN_ID)?.focus();
}
