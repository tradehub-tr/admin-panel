// Bildirim şablonları — şablon dili: ayrıştırma, doğrulama ve örnek veriyle doldurma (saf).
//
// Sözdizimi: {{ad}}  {{nesne.alan}}  {{#each liste}} … {{/each}}  {{#if ad}} … {{/if}}
//
// SUNUCUYLA AYNI DİL: `tradehub_core/notifications/template_lang.py` bu dosyanın eşidir.
// `render`, `structureIssue`, `truthy`, `lookup` ve `alias` iki tarafta aynı sonucu verir;
// kanıt ortak fixture'dır (`__tests__/fixtures/notification_template_cases.json`, sunucudaki
// `tests/fixtures/` kopyasıyla bayt bayt aynı) ve `__tests__/parity.test.js` onu okur.
//
// DOM kullanmaz; `node --test` ile sınanır. Önizleme, doğrulama ve zengin metin aynı
// belirteç tanımını okur.

const NAME = "[A-Za-z_][\\w.]*";
const TOKEN_SRC = `\\{\\{\\s*(#each\\s+${NAME}|#if\\s+${NAME}|\\/each|\\/if|${NAME})\\s*\\}\\}`;
export const tokenRe = () => new RegExp(TOKEN_SRC, "g");

/** İç içe blok sınırı (sunucu `MAX_DEPTH`). */
export const MAX_DEPTH = 4;
/** Tek döngüde en çok öğe (sunucu `MAX_LOOP_ITEMS`). */
export const MAX_LOOP_ITEMS = 200;
/** Render çıktısı üst sınırı, karakter (sunucu `MAX_OUTPUT`). */
export const MAX_OUTPUT = 200_000;

// Python `html.escape(quote=True)` ile aynı: tek tırnak `&#x27;`.
const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" };
export const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

/** Şablon yapısı bozuk (kapanmamış blok, derinlik aşımı). `kind` sunucudaki issue türüdür. */
export class TemplateError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = "TemplateError";
    this.kind = kind;
  }
}

/** Render sınırları aşıldı (çıktı boyutu, döngü uzunluğu). */
export class RenderLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = "RenderLimitError";
  }
}

/** Eşleşen belirteç gövdesi → `{ type, name }`. */
function classify(body) {
  if (body.startsWith("#each")) return { type: "open", name: body.slice(5).trim() };
  if (body.startsWith("#if")) return { type: "if", name: body.slice(3).trim() };
  if (body === "/each") return { type: "close", name: "" };
  if (body === "/if") return { type: "endif", name: "" };
  return { type: "var", name: body };
}

/** Blok belirteci türü → ağaç düğümü türü. */
const BLOCK_OF = { open: "each", if: "if", close: "each", endif: "if" };
const unclosedKind = (blockType) => (blockType === "each" ? "unclosed_loop" : "unclosed_condition");

/**
 * Metindeki belirteçler: `[{ type: "var" | "open" | "close" | "if" | "endif", name, raw, index }]`.
 * Sunucudaki `template_lang.tokens` ile aynı biçim.
 */
export function tokens(text) {
  const out = [];
  const re = tokenRe();
  const source = String(text ?? "");
  let m;
  while ((m = re.exec(source))) out.push({ ...classify(m[1]), raw: m[0], index: m.index });
  return out;
}

/**
 * Şablonu ağaca çevirir — sunucudaki `parse` ile birebir. Bozuk yapıda `TemplateError`.
 * Düğüm: `{ type: "text" | "var" | "each" | "if", value, raw, children }`.
 */
export function parse(text) {
  const root = [];
  const stack = [];
  const source = String(text ?? "");
  const sink = () => (stack.length ? stack[stack.length - 1].children : root);
  const re = tokenRe();
  let pos = 0;
  let m;
  while ((m = re.exec(source))) {
    if (m.index > pos) sink().push({ type: "text", value: source.slice(pos, m.index) });
    pos = m.index + m[0].length;
    const t = classify(m[1]);
    if (t.type === "open" || t.type === "if") {
      if (stack.length >= MAX_DEPTH)
        throw new TemplateError("too_deep", `İç içe blok sınırı ${MAX_DEPTH}`);
      const node = { type: BLOCK_OF[t.type], value: t.name, raw: m[0], children: [] };
      sink().push(node);
      stack.push(node);
    } else if (t.type === "close" || t.type === "endif") {
      const kind = BLOCK_OF[t.type];
      if (!stack.length || stack[stack.length - 1].type !== kind) {
        // Çapraz kapanışta hata, açık kalan (en içteki) bloğun türüdür.
        const open = stack.length ? stack[stack.length - 1].type : kind;
        throw new TemplateError(unclosedKind(open), `Karşılığı olmayan ${m[0]}`);
      }
      stack.pop();
    } else {
      sink().push({ type: "var", value: t.name, raw: m[0] });
    }
  }
  if (pos < source.length) sink().push({ type: "text", value: source.slice(pos) });
  if (stack.length) {
    const open = stack[stack.length - 1];
    throw new TemplateError(unclosedKind(open.type), `Kapatılmamış ${open.raw}`);
  }
  return root;
}

/**
 * Hoşgörülü ayrıştırma (önizleme): bozuk yapıda hata fırlatmaz. Eşi olmayan ya da
 * derinlik sınırını aşan belirteç `bad` düğümü olur; kapanmamış bloğun içeriği bloğun
 * dışına açılır ki yazılan metin önizlemede kaybolmasın.
 */
function parseLoose(text) {
  const root = [];
  const stack = [];
  const source = String(text ?? "");
  const sink = () => (stack.length ? stack[stack.length - 1].children : root);
  const re = tokenRe();
  let pos = 0;
  let m;
  while ((m = re.exec(source))) {
    if (m.index > pos) sink().push({ type: "text", value: source.slice(pos, m.index) });
    pos = m.index + m[0].length;
    const t = classify(m[1]);
    if (t.type === "open" || t.type === "if") {
      if (stack.length >= MAX_DEPTH) {
        sink().push({ type: "bad", raw: m[0] });
        continue;
      }
      const node = { type: BLOCK_OF[t.type], value: t.name, raw: m[0], children: [] };
      sink().push(node);
      stack.push(node);
    } else if (t.type === "close" || t.type === "endif") {
      if (stack.length && stack[stack.length - 1].type === BLOCK_OF[t.type]) stack.pop();
      else sink().push({ type: "bad", raw: m[0] });
    } else {
      sink().push({ type: "var", value: t.name, raw: m[0] });
    }
  }
  if (pos < source.length) sink().push({ type: "text", value: source.slice(pos) });
  while (stack.length) {
    const node = stack.pop();
    const parent = stack.length ? stack[stack.length - 1].children : root;
    parent.splice(parent.indexOf(node), 1, { type: "bad", raw: node.raw }, ...node.children);
  }
  return root;
}

/** Blok yapısı bozuksa issue türü (`unclosed_loop` | `unclosed_condition` | `too_deep`), değilse `null`. */
export function structureIssue(text) {
  try {
    parse(text);
    return null;
  } catch (e) {
    if (e instanceof TemplateError) return e.kind;
    throw e;
  }
}

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Noktalı yol yalnız düz nesne anahtarlarından çözülür; `_` ile başlayan ve kalıtılan anahtar yok. */
export function lookup(path, scope) {
  let cur = scope;
  for (const part of String(path).split(".")) {
    if (!isPlainObject(cur) || part.startsWith("_")) return undefined;
    cur = Object.prototype.hasOwnProperty.call(cur, part) ? cur[part] : undefined;
  }
  return cur;
}

/** groups → group, group.items → item (sunucuyla aynı). */
export function alias(name) {
  const last = String(name).split(".").pop();
  return last.endsWith("s") ? last.slice(0, -1) : last;
}

/** Koşul doğruluğu: boş olmayan dize/liste/nesne, true, sıfır olmayan sayı. */
export function truthy(value) {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return Boolean(value);
}

/**
 * Değerin metin karşılığı — sunucudaki `_escape_value` ile aynı: yok → "", nesne/liste
 * yazılmaz, mantıksal değer Python yazımıyla ("True"/"False").
 */
function valueText(value) {
  if (value === null || value === undefined || typeof value === "object") return "";
  if (typeof value === "boolean") return value ? "True" : "False";
  return String(value);
}

/**
 * Şablonu doldurur — sunucudaki `render` ile birebir (parity testi bunu sınar).
 *
 *   mode "html": şablon önceden temizlenmiş HTML; değerler HTML kaçışlanır.
 *   mode "text": düz metin; değerler olduğu gibi (SMS, push, konu).
 * Bilinmeyen değişken boş dize olur. Bozuk yapıda `TemplateError`, sınır aşımında
 * `RenderLimitError` fırlar.
 */
export function render(text, scope = {}, mode = "text") {
  const tree = parse(text);
  const out = [];
  let size = 0;
  const emit = (s) => {
    size += s.length;
    if (size > MAX_OUTPUT) throw new RenderLimitError("Çıktı boyutu sınırı aşıldı");
    out.push(s);
  };
  const walk = (nodes, sc) => {
    for (const n of nodes) {
      if (n.type === "text") emit(n.value);
      else if (n.type === "var") {
        const v = valueText(lookup(n.value, sc));
        emit(mode === "html" ? escapeHtml(v) : v);
      } else if (n.type === "if") {
        if (truthy(lookup(n.value, sc))) walk(n.children, sc);
      } else if (n.type === "each") {
        const items = lookup(n.value, sc);
        if (!Array.isArray(items)) continue;
        if (items.length > MAX_LOOP_ITEMS)
          throw new RenderLimitError("Döngü uzunluğu sınırı aşıldı");
        const name = alias(n.value);
        for (const item of items) walk(n.children, { ...sc, [name]: item });
      }
    }
  };
  walk(tree, scope || {});
  return out.join("");
}

/**
 * Önizleme doldurması: örnek veriyle GÜVENLİ HTML döndürür.
 *
 * `render` ile aynı kuralları uygular (koşul, döngü, takma ad, kaçış); farkı hoşgörüdür:
 * tanımsız değişken ve eşi olmayan blok belirteci `<span class="nt-bad">` ile işaretlenir —
 * önizlemede yanlış yazılmış ad gözle görülür. `html: false` (düz metin alanı) ise
 * şablonun kendisi de kaçışlanır; `html: true` ise şablon ÖNCEDEN temizlenmiş HTML olmalıdır.
 *
 * @param {string} template
 * @param {object} scope örnek veri
 * @param {Set<string>} known bu olayın değişken adları
 * @param {boolean} html şablon HTML mi
 */
export function expand(template, scope, known, html = false) {
  const lit = (s) => (html ? s : escapeHtml(s));
  // `span`: e-posta gövdesi sonradan DOMPurify'dan geçiyor ve izinli etiketlerde `mark` yok.
  const bad = (raw) => `<span class="nt-bad" title="Tanımsız değişken">${escapeHtml(raw)}</span>`;
  let out = "";
  const walk = (nodes, sc) => {
    for (const n of nodes) {
      if (out.length > MAX_OUTPUT) return;
      if (n.type === "text") out += lit(n.value);
      else if (n.type === "bad") out += bad(n.raw);
      else if (!known.has(n.value)) out += bad(n.raw);
      else if (n.type === "var") out += escapeHtml(valueText(lookup(n.value, sc)));
      else if (n.type === "if") {
        if (truthy(lookup(n.value, sc))) walk(n.children, sc);
      } else {
        const items = lookup(n.value, sc);
        if (!Array.isArray(items)) continue;
        const name = alias(n.value);
        for (const item of items.slice(0, MAX_LOOP_ITEMS))
          walk(n.children, { ...sc, [name]: item });
      }
    }
  };
  walk(parseLoose(template), scope || {});
  return out;
}

/** Düz metin doldurma (alan altı SMS gösterimi): bilinen ve nesne olmayan değerler yerine konur. */
export function plainFill(template, scope, known) {
  return String(template ?? "").replace(tokenRe(), (raw, t) => {
    const value = known.has(t) ? lookup(t, scope) : undefined;
    return value !== undefined && typeof value !== "object" ? String(value ?? "") : raw;
  });
}

/**
 * Gönderimde çıkacak düz metin (SMS ölçümü): yapı sağlamsa sunucuyla aynı `render`,
 * bozuksa ham metin — sunucudaki `validate_scope` SMS dalıyla aynı karar.
 */
export function renderedText(template, scope) {
  const text = String(template ?? "");
  if (structureIssue(text)) return text;
  try {
    return render(text, scope, "text");
  } catch {
    return text;
  }
}

/** `variables[]` → bilinen ad kümesi. */
export const knownNames = (variables = []) => new Set(variables.map((v) => v.name));

/**
 * `variables[]` → örnek veri nesnesi. Yalnız kök değişkenler alınır
 * (`group.title` gibi kapsamlı adların değeri döngü örneğinin içindedir).
 *   mode: "normal" | "long" (uzun değerler)
 */
export function sampleScope(variables = [], mode = "normal") {
  const scope = {};
  for (const v of variables) {
    if (v.scope) continue;
    scope[v.name] = mode === "long" && v.sample_long !== undefined ? v.sample_long : v.sample;
  }
  return scope;
}

/** Değişkenin ekleme biçimi: döngü `{{#each}}…{{/each}}`, koşul `{{#if}}…{{/if}}`, değer `{{ad}}`. */
export function insertionTokens(variable) {
  const name = variable.name;
  if (variable.type === "loop")
    return [
      { type: "open", name, raw: `{{#each ${name}}}` },
      { type: "close", name: "", raw: "{{/each}}" },
    ];
  if (variable.type === "boolean")
    return [
      { type: "if", name, raw: `{{#if ${name}}}` },
      { type: "endif", name: "", raw: "{{/if}}" },
    ];
  return [{ type: "var", name, raw: `{{${name}}}` }];
}

/** Değişken listesinde gösterilen kısa kod (`{{#each liste}}`, `{{#if ad}}`, `{{ad}}`). */
export const variableCode = (variable) => insertionTokens(variable)[0].raw;

/** Değişken türü etiketi (zorunlu değilse gösterilir). */
export const variableKindLabel = (variable) =>
  variable.type === "loop" ? "döngü" : variable.type === "boolean" ? "koşul" : "";

/** Kanalın ilk zorunlu (döngü/koşul olmayan) değişkeni — "Eksik değer" örneği bunu boşaltır. */
export function firstRequiredVariable(variables = [], required = []) {
  return (
    required.find((name) => {
      const type = variables.find((v) => v.name === name)?.type;
      return type !== "loop" && type !== "boolean";
    }) || null
  );
}

/** HTML gövdeden düz metin: bağlantılar "metin: adres", blok sonları satır sonu. */
export function htmlToText(html) {
  return String(html ?? "")
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "$2: $1")
    .replace(/<\/(p|h1|h2|h3|h4|tr|li|ul|ol|div)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/td>\s*<td[^>]*>/gi, ": ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** HTML'in görünen metni (etiketler atılmış) — "zorunlu alan boş mu" denetimi için. */
export const visibleText = (html) =>
  String(html ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ");
