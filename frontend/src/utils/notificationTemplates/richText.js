// Bildirim şablonları — zengin metin ↔ kod dönüşümü.
//
// Zengin metinde `{{degisken}}` okunur bir chip'tir ("Sipariş numarası"); döngü ve koşul
// blokları "Döngü: …" / "Koşul: …" ve "… sonu" chip'leridir. Kod'a
// dönüşte sözdizimi AYNEN geri gelir. Chip yalnız METİN düğümlerinde üretilir:
// `href="{{order_url}}"` gibi öznitelik içindeki belirteçlere dokunulmaz.
//
// DOM gerekir ama `document` ve temizleyici PARAMETREDİR — tarayıcıda
// `document` + `utils/sanitize.js` (DOMPurify), testte jsdom verilir.
//
// NEDEN Tiptap DEĞİL (repoda kurulu olduğu hâlde): StarterKit şeması e-posta
// gövdesindeki `<table>` ve `class="cta"` gibi yapıları atar; tablo eklentisi
// yeni bağımlılık ister. Burada kaynak HTML korunmalı, o yüzden prototipteki
// `contenteditable` yaklaşımı sürdürüldü.

import { tokens } from "./template.js";

export const CHIP_CLASS = "nt-chip";

const ZERO_WIDTH = new RegExp(String.fromCharCode(0x200b), "g");

/** Blok sonu belirteçleri: kod biçimi ve okunur ad. */
const BLOCK_END = {
  close: { token: "{{/each}}", text: "Döngü sonu" },
  endif: { token: "{{/if}}", text: "Koşul sonu" },
};

function chipElement(doc, token, variables) {
  const span = doc.createElement("span");
  span.className = CHIP_CLASS;
  span.setAttribute("contenteditable", "false");
  const def = variables.find((v) => v.name === token.name);
  const end = BLOCK_END[token.type];
  if (end) {
    span.classList.add(`${CHIP_CLASS}--loop`);
    span.dataset.token = end.token;
    span.textContent = end.text;
  } else if (!def) {
    span.classList.add(`${CHIP_CLASS}--bad`);
    span.dataset.token = token.raw;
    span.textContent = token.raw;
    span.title = "Tanımsız değişken";
    return span;
  } else if (token.type === "open") {
    span.classList.add(`${CHIP_CLASS}--loop`);
    span.dataset.token = `{{#each ${token.name}}}`;
    span.textContent = `Döngü: ${def.label}`;
  } else if (token.type === "if") {
    span.classList.add(`${CHIP_CLASS}--loop`);
    span.dataset.token = `{{#if ${token.name}}}`;
    span.textContent = `Koşul: ${def.label}`;
  } else {
    span.dataset.token = `{{${token.name}}}`;
    span.textContent = def.label;
  }
  span.title = span.dataset.token;
  return span;
}

/** Belirteç listesinden chip düğümleri (imlece değişken eklerken kullanılır). */
export function chipNodes(doc, tokenList, variables) {
  return tokenList.map((t) => chipElement(doc, t, variables));
}

/**
 * Kaynak HTML → zengin metin HTML'i (chip'li).
 *
 * @param {string} html kaynak şablon
 * @param {object[]} variables `[{ name, label, type }]`
 * @param {{ doc: Document, sanitize: (html: string) => string }} env
 */
export function toRichHtml(html, variables, { doc, sanitize }) {
  const tpl = doc.createElement("template");
  tpl.innerHTML = sanitize(String(html ?? ""));
  const walker = doc.createTreeWalker(tpl.content, 4 /* NodeFilter.SHOW_TEXT */);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  for (const node of textNodes) {
    const text = node.nodeValue;
    const found = tokens(text);
    if (!found.length) continue;
    const parts = [];
    let i = 0;
    for (const t of found) {
      if (t.index > i) parts.push(doc.createTextNode(text.slice(i, t.index)));
      parts.push(chipElement(doc, t, variables));
      i = t.index + t.raw.length;
    }
    if (i < text.length) parts.push(doc.createTextNode(text.slice(i)));
    node.replaceWith(...parts);
  }
  return tpl.innerHTML;
}

/**
 * Zengin metin öğesi → kaynak HTML. Chip'ler `{{…}}` metnine döner;
 * düzenleyicinin eklediği `contenteditable` ve satır içi `style` atılır.
 *
 * @param {Element} element contenteditable kök
 * @param {{ sanitize?: (html: string) => string }} env
 */
export function fromRichElement(element, { sanitize } = {}) {
  const doc = element.ownerDocument;
  const clone = element.cloneNode(true);
  clone
    .querySelectorAll(`.${CHIP_CLASS}`)
    .forEach((chip) => chip.replaceWith(doc.createTextNode(chip.dataset.token || "")));
  clone.querySelectorAll("[contenteditable]").forEach((x) => x.removeAttribute("contenteditable"));
  clone.querySelectorAll("[style]").forEach((x) => x.removeAttribute("style"));
  const html = clone.innerHTML
    .replace(ZERO_WIDTH, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  return sanitize ? sanitize(html) : html;
}

/** Kaynak → zengin → kaynak turu (test ve "dokunulmadı mı" karşılaştırması için). */
export function roundTrip(html, variables, env) {
  const host = env.doc.createElement("div");
  host.innerHTML = toRichHtml(html, variables, env);
  return fromRichElement(host, env);
}
