/**
 * HTML sanitizer — v-html ile render edilen untrusted içerik için.
 *
 * Backend Frappe bleach ile sanitize eder, bu fonksiyon defence-in-depth
 * (ikinci katman) olarak çalışır.
 *
 * İzin verilen tag'ler Frappe bleach whitelist'iyle uyumludur.
 */

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "b",
  "i",
  "u",
  "strong",
  "em",
  "s",
  "strike",
  "sub",
  "sup",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "code",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "div",
  "span",
]);

const ALLOWED_ATTRS = new Set([
  "href",
  "src",
  "alt",
  "title",
  "class",
  "style",
  "target",
  "rel",
  "width",
  "height",
  "colspan",
  "rowspan",
]);

/**
 * Sanitize HTML string — script, style, event handler'ları ve izin
 * verilmeyen tag/attribute'ları temizler.
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== "string") return "";

  // 1. script ve style tag'lerini tamamen kaldır
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  // 2. Event handler attribute'larını kaldır (onclick, onerror vb.)
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");

  // 3. javascript: ve data: URI'larını temizle
  clean = clean.replace(/(?:href|src)\s*=\s*(?:"(?:javascript|data|vbscript):[^"]*"|'(?:javascript|data|vbscript):[^']*')/gi, "");

  // 4. İzin verilmeyen tag'leri kaldır (içeriği koru)
  clean = clean.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
    if (ALLOWED_TAGS.has(tag.toLowerCase())) {
      // İzin verilen tag — sadece izin verilen attribute'ları koru
      return match.replace(/\s+([a-z-]+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, (attrMatch, attrName) => {
        return ALLOWED_ATTRS.has(attrName.toLowerCase()) ? attrMatch : "";
      });
    }
    return ""; // İzin verilmeyen tag'i kaldır
  });

  return clean;
}
