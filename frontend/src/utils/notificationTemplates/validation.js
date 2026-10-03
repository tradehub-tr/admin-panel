// Bildirim şablonları — doğrulama ve TEK hata sözlüğü (saf, DOM'suz).
//
// Alan altı mesaj, önizleme notu ve yayın modalı aynı cümleyi buradan alır.
// `kind` adları API sözleşmesindeki `blocking[] / warnings[]` türleridir
// (UYGULAMA-PLANI.md); sözleşmede olmayan türler aşağıda "EK" notuyla işaretli —
// backend'in aynı adları kullanması gerekir (teslim raporunda listelendi).
//
// Engelleyici / uyarı ayrımı tasarım önerisidir; "hazır olmayan çeviri"nin
// hangi tarafta duracağı `notificationTemplatePolicy.js` içinden okunur.

import {
  FIELDS,
  LANGS,
  PRIMARY_FIELD,
  SOURCE_LANG,
  channelOf,
  fieldOf,
  langOf,
} from "../../constants/notificationTemplates.js";
import { NOTIFICATION_TEMPLATE_POLICY } from "../../constants/notificationTemplatePolicy.js";
import { sentChannels } from "./catalog.js";
import { smsInfo } from "./sms.js";
import {
  MAX_DEPTH,
  knownNames,
  renderedText,
  sampleScope,
  structureIssue,
  tokens,
  visibleText,
} from "./template.js";

export const ISSUE_KINDS = Object.freeze({
  unknown_variable: "blocking",
  missing_required_variable: "blocking",
  empty_required_field: "blocking",
  invalid_url: "blocking",
  missing_action_label: "blocking", // EK
  missing_action_url: "blocking", // EK
  unclosed_loop: "blocking", // EK
  unclosed_condition: "blocking", // EK — `{{#if}}` bloğu (sunucuyla aynı ad)
  too_long: "warning",
  missing_translation: "warning",
  sms_unicode: "warning", // EK
  sms_segments: "warning", // EK
  missing_event_data: "info", // EK — şablon hatası değil, olay verisi eksik
});

/** Türün ciddiyeti: "blocking" | "warning" | "info". */
export function severityOf(kind, policy = NOTIFICATION_TEMPLATE_POLICY) {
  if (kind === "missing_translation" && policy.missingTranslationBlocksPublish) return "blocking";
  return ISSUE_KINDS[kind] || "warning";
}

export const isBlocking = (issue) => issue.severity === "blocking";
export const isWarning = (issue) => issue.severity === "warning";

const short = (lang) => langOf(lang)?.short || String(lang || "").toUpperCase();
const token = (name) => `{{${name}}}`;

const TRANSLATION_TEXT = {
  eksik: (L) => ({
    title: "Çeviri eksik",
    text: `${L} içeriği yok; bu dildeki kullanıcıya TR içerik gider.`,
    fix: "Kaynak dilden kopyalayıp çeviri isteyin.",
  }),
  kopya: (L) => ({
    title: "Çevrilmemiş kopya",
    text: `${L} içeriği kaynak dilden kopya; kullanıcı Türkçe metin görür.`,
    fix: "Çeviri isteyin.",
  }),
  bekliyor: (L) => ({
    title: "Çeviri bekliyor",
    text: `${L} çevirisi henüz gözden geçirilmedi.`,
    fix: "Gözden geçirip hazır olarak işaretleyin.",
  }),
};

const DICTIONARY = {
  missing_required_variable: (it) => ({
    title: "İçerikte kullanılmayan zorunlu değişken",
    text: `${token(it.variable)} bu kanalın içeriğinde geçmiyor.`,
    fix: "Değişkeni metne ekleyin.",
  }),
  unknown_variable: (it) => ({
    title: "Tanımsız değişken",
    text: `${token(it.variable)} bu olayın değişkenleri arasında yok; gönderimde boş kalır.`,
    fix: it.suggestion ? `${token(it.suggestion)} ile değiştirin.` : "Değişken listesinden seçin.",
  }),
  missing_event_data: (it) => ({
    title: "Olay verisinde eksik değer",
    text: `${token(it.variable)} boş geldi; bu kanaldan ileti gönderilmez ve olay kaydına "eksik veri" notu düşer.`,
    fix: "Olayı üreten veriyi düzeltin; şablonda değişiklik gerekmez.",
  }),
  empty_required_field: (it) => ({
    title: "Zorunlu alan boş",
    text: `${it.label} yazılmamış.`,
    fix: `${it.label} alanını doldurun.`,
  }),
  invalid_url: (it) => ({
    title: "Geçersiz bağlantı",
    text: it.value ? `${it.value} açılabilir bir adres değil.` : "Bağlantı adresi boş.",
    fix: "https:// ile başlayan adres, / ile başlayan yol ya da bir bağlantı değişkeni kullanın.",
  }),
  missing_action_label: () => ({
    title: "Düğme metni eksik",
    text: "Bağlantısı olan düğmenin metni boş.",
    fix: "Düğme metni yazın ya da bağlantıyı kaldırın.",
  }),
  missing_action_url: () => ({
    title: "Düğme bağlantısı eksik",
    text: "Düğme metni var, bağlantısı boş.",
    fix: "Bağlantı ekleyin ya da düğme metnini silin.",
  }),
  unclosed_loop: (it) =>
    it.deep
      ? {
          title: "Çok derin iç içe blok",
          text: `En çok ${MAX_DEPTH} döngü/koşul iç içe olabilir.`,
          fix: "İç içe blokları azaltın.",
        }
      : {
          title: "Kapatılmamış döngü",
          text: "{{#each …}} ile {{/each}} eşleşmiyor.",
          fix: "Döngü başı ve sonunu eşleştirin.",
        },
  unclosed_condition: () => ({
    title: "Kapatılmamış koşul",
    text: "{{#if …}} ile {{/if}} eşleşmiyor.",
    fix: "Koşul başı ve sonunu eşleştirin.",
  }),
  too_long: (it) => ({
    title: "Uzun metin",
    // Sunucu sorunu uzunluğu taşımaz; o durumda alanın önerilen üst sınırı yazılır.
    text:
      it.length !== undefined
        ? `${it.length}/${it.max} karakter; istemciler fazlasını kırpar.`
        : `Önerilen ${it.max ? `${it.max} karakter` : "uzunluk"} aşılıyor; istemciler fazlasını kırpar.`,
    fix: "Metni kısaltın.",
  }),
  sms_unicode: (it) => ({
    title: "Unicode SMS",
    text: `Metin GSM-7 dışı karakter içeriyor (${it.chars}); segment sınırı 160 yerine 70 karakter olur.`,
    fix: it.turkish
      ? "Türkçe karakterleri sadeleştirin."
      : it.lang === "tr" || it.lang === "en"
        ? "Karakter değişken değerinden geliyorsa (ör. ₺) değeri GSM-7 karşılığıyla (TL) gönderin ya da metni kısa tutun."
        : "Bu dilde kaçınılmaz; metni kısa tutun.",
  }),
  sms_segments: (it) => ({
    title: "Çok parçalı SMS",
    text: `Örnek veriyle ${it.length} karakter; ${it.segments} segment olarak ücretlendirilir.`,
    fix: "Metni kısaltın.",
  }),
  missing_translation: (it) =>
    TRANSLATION_TEXT[it.state]
      ? TRANSLATION_TEXT[it.state](short(it.lang))
      : {
          // Sunucu sorunu çeviri durumunu taşımaz.
          title: "Çeviri hazır değil",
          text: `${short(it.lang)} çevirisi hazır olarak işaretlenmedi; hazır olana kadar kullanıcıya TR içerik gidebilir.`,
          fix: "Çeviriyi tamamlayıp hazır olarak işaretleyin.",
        },
};

/** Etkilenen kapsam: "E-posta · TR" ya da "Tüm kanallar · AR". */
export const issueScope = (issue) =>
  `${issue.channel ? channelOf(issue.channel)?.label || issue.channel : "Tüm kanallar"} · ${short(issue.lang)}`;

/**
 * Tür · açıklama · etkilenen kanal ve dil · çözüm.
 * Sözlükte olmayan (sunucudan gelen yeni) türde sunucunun `message` alanı gösterilir.
 */
export function describeIssue(issue) {
  const make = DICTIONARY[issue.kind];
  const parts = make
    ? make(issue)
    : { title: "Doğrulama sorunu", text: issue.message || issue.kind, fix: "" };
  return { ...parts, scope: issueScope(issue) };
}

/** Tek satırlık düz metin (toast, aria-label, test). */
export function issueSentence(issue) {
  const d = describeIssue(issue);
  return `${d.title}: ${d.text} ${d.scope}${d.fix ? ` Çözüm: ${d.fix}` : ""}`;
}

// ── Doğrulama ────────────────────────────────────────────────────────────

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j += 1) d[0][j] = j;
  for (let i = 1; i <= m; i += 1)
    for (let j = 1; j <= n; j += 1)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return d[m][n];
}

/** Yanlış yazılmış değişkene en yakın bilinen ad (uzaklık ≤ 2). */
export function suggestVariable(name, known) {
  let best = null;
  let bestDistance = 3;
  for (const candidate of known) {
    const distance = levenshtein(name, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

/**
 * Geçerli bağlantı: `https://…`, kök göreli `/yol`, `mailto:x@y` ya da bağlantı türünde
 * TEK değişken (`{{order_url}}`, `{{order_url}}?q=1`). `http://`, `//`, `javascript:`,
 * `data:` geçersiz — sunucudaki `template_lang.url_template_ok` ile aynı kural.
 */
export function validUrl(value, variables = []) {
  const v = String(value ?? "").trim();
  if (
    /^https:\/\/[^\s]+$/.test(v) ||
    /^\/(?![/\\])[^\s]*$/.test(v) ||
    /^mailto:[^\s@]+@[^\s@]+$/.test(v)
  )
    return true;
  const m = /^\{\{\s*([A-Za-z_][\w.]*)\s*\}\}[^\s]*$/.exec(v);
  if (!m) return false;
  return variables.find((x) => x.name === m[1])?.type === "url";
}

const ANCHOR_RE = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
const hrefOf = (attrs) => /href\s*=\s*"([^"]*)"|href\s*=\s*'([^']*)'/i.exec(attrs);

/**
 * Tek kapsamı (kanal × dil) doğrular.
 *
 * @param {object|null} data alan değerleri (`draft[kanal][dil]`); null → içerik yok, sorun üretilmez
 * @param {{ channel: string, lang: string, variables: object[], required: string[] }} ctx
 * @returns {object[]} issue listesi
 */
export function validateScope(data, { channel, lang, variables = [], required = [] }) {
  if (!data) return [];
  const known = knownNames(variables);
  const out = [];
  const used = new Set();
  const add = (kind, extra) =>
    out.push({ kind, severity: severityOf(kind), channel, lang, field: null, ...extra });

  for (const f of FIELDS[channel] || []) {
    const value = String(data[f.id] ?? "");
    const plain = f.type === "html" ? visibleText(value) : value;
    if (f.required && !plain.trim()) add("empty_required_field", { field: f.id, label: f.label });

    const structure = structureIssue(value);
    if (structure === "too_deep") add("unclosed_loop", { field: f.id, deep: true });
    else if (structure) add(structure, { field: f.id });
    const seen = new Set();
    for (const t of tokens(value)) {
      if (!t.name) continue;
      used.add(t.name);
      if (!known.has(t.name) && !seen.has(t.name)) {
        seen.add(t.name);
        add("unknown_variable", {
          field: f.id,
          variable: t.name,
          suggestion: suggestVariable(t.name, known),
        });
      }
    }
    if (f.max && value.length > f.max)
      add("too_long", { field: f.id, length: value.length, max: f.max });
    if (f.url && value.trim() && !validUrl(value, variables))
      add("invalid_url", { field: f.id, value: value.trim() });

    if (f.type === "html") {
      for (const m of value.matchAll(ANCHOR_RE)) {
        const href = hrefOf(m[1]);
        const address = href ? (href[1] ?? href[2] ?? "") : "";
        if (!validUrl(address, variables)) add("invalid_url", { field: f.id, value: address });
        if (!visibleText(m[2]).trim()) add("missing_action_label", { field: f.id });
      }
    }
  }

  if (channel === "inapp") {
    const label = String(data.action_label ?? "").trim();
    const url = String(data.action_url ?? "").trim();
    if (url && !label) add("missing_action_label", { field: "action_label" });
    if (label && !url) add("missing_action_url", { field: "action_url" });
  }

  for (const name of required)
    if (!used.has(name))
      add("missing_required_variable", { field: PRIMARY_FIELD[channel], variable: name });

  if (channel === "sms" && String(data.text ?? "").trim()) {
    const info = smsInfo(renderedText(data.text, sampleScope(variables)));
    if (info.unicode)
      add("sms_unicode", { field: "text", turkish: info.turkish, chars: info.chars });
    if (info.segments > 1)
      add("sms_segments", { field: "text", length: info.len, segments: info.segments });
  }
  return out;
}

/**
 * Olayın tümü: açık kanallar × içeriği olan diller + hazır olmayan diller.
 *
 * @param {object} event `{ channels, langs }`
 * @param {object} draft `{ <kanal>: { <dil>: alanlar | null } }`
 * @param {{ variables: object[], requiredByChannel: object }} ctx
 */
export function validateAll(event, draft, { variables = [], requiredByChannel = {} }) {
  const out = [];
  for (const channel of sentChannels(event)) {
    for (const lang of LANGS)
      out.push(
        ...validateScope(draft?.[channel.id]?.[lang.id] ?? null, {
          channel: channel.id,
          lang: lang.id,
          variables,
          required: requiredByChannel[channel.id] || [],
        })
      );
    // Açık kanalın kaynak dil içeriği hiç yoksa yayın yapılamaz (sunucu `validate_all` ile aynı).
    if (!draft?.[channel.id]?.[SOURCE_LANG]) {
      const field = PRIMARY_FIELD[channel.id];
      out.push({
        kind: "empty_required_field",
        severity: severityOf("empty_required_field"),
        channel: channel.id,
        lang: SOURCE_LANG,
        field,
        label: fieldOf(channel.id, field)?.label,
      });
    }
  }
  for (const lang of LANGS) {
    const state = event.langs?.[lang.id];
    if (state && state !== "hazir")
      out.push({
        kind: "missing_translation",
        severity: severityOf("missing_translation"),
        channel: null,
        lang: lang.id,
        field: null,
        state,
      });
  }
  return out;
}

/** Engelleyici / uyarı ayrımı — yayın modalı ve `validate` yanıtı aynı biçimi kullanır. */
export function splitIssues(issues = []) {
  return {
    blocking: issues.filter(isBlocking),
    warnings: issues.filter(isWarning),
  };
}

/** Sunucudan gelen sorunu (yalnız API alanları) sözlükle uyumlu biçime getirir. */
export function normalizeServerIssue(issue, severity) {
  const def = fieldOf(issue.channel, issue.field);
  const out = {
    label: def?.label,
    max: def?.max,
    ...issue,
    severity: severity || severityOf(issue.kind),
  };
  // Çeviri uyarısı dil düzeyindedir; sunucu kanal alanına "email" yazıyor (tüm kanalları kapsar).
  if (issue.kind === "missing_translation") out.channel = null;
  return out;
}
