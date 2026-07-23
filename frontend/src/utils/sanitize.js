/**
 * HTML sanitizer — v-html ile render edilen untrusted içerik için.
 *
 * Backend Frappe bleach ile sanitize eder, bu fonksiyon defence-in-depth
 * (ikinci katman) olarak çalışır.
 *
 * F-019/F-020: Regex tabanlı sanitizer DOMPurify ile değiştirildi.
 */

import DOMPurify from "dompurify";

const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "b", "i", "u", "strong", "em", "s", "strike", "sub", "sup",
    "ul", "ol", "li", "a", "img",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "blockquote", "pre", "code",
    "table", "thead", "tbody", "tr", "th", "td",
    "div", "span",
  ],
  ALLOWED_ATTR: [
    "href", "src", "alt", "title", "class", "style",
    "target", "rel", "width", "height", "colspan", "rowspan",
  ],
};

/**
 * Sanitize HTML string — DOMPurify ile script, event handler ve
 * izin verilmeyen tag/attribute'ları temizler.
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== "string") return "";
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}
