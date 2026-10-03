// Bildirim şablonları — sürüm/taslak farkı (saf).
//
// Fark sözcük (tek satır alanlar) ve satır (gövde, düz metin) düzeyinde LCS'tir;
// HTML'i anlamsal karşılaştırmaz. Çıktı HTML DEĞİL, parça listesidir — bileşen
// `<ins>` / `<del>` ile kendi çizer (v-html gerekmez).

import { FIELDS, LANGS } from "../../constants/notificationTemplates.js";
import { sentChannels } from "./catalog.js";

function lcsOps(a, b) {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i -= 1)
    for (let j = n - 1; j >= 0; j -= 1)
      d[i][j] = a[i] === b[j] ? d[i + 1][j + 1] + 1 : Math.max(d[i + 1][j], d[i][j + 1]);
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      ops.push(["=", a[i]]);
      i += 1;
      j += 1;
    } else if (d[i + 1][j] >= d[i][j + 1]) ops.push(["-", a[i++]]);
    else ops.push(["+", b[j++]]);
  }
  while (i < m) ops.push(["-", a[i++]]);
  while (j < n) ops.push(["+", b[j++]]);
  return ops;
}

const MULTILINE_TYPES = new Set(["html", "text", "sms", "textarea"]);

/**
 * İki değerin farkı: `{ old: [{ op, text }], neu: [{ op, text }] }`.
 *   op: "=" aynı · "-" silindi (yalnız eski tarafta) · "+" eklendi (yalnız yeni tarafta)
 */
export function diffSegments(oldValue, newValue, multiline = false) {
  const split = (s) => (multiline ? String(s).split("\n") : String(s).split(/(\s+)/));
  const ops = lcsOps(split(oldValue), split(newValue));
  const sep = multiline ? "\n" : "";
  const side = (keep) =>
    ops
      .filter(([op]) => op === "=" || op === keep)
      .map(([op, text], i, list) => ({ op, text: text + (i < list.length - 1 ? sep : "") }));
  return { old: side("-"), neu: side("+") };
}

/**
 * Tek kapsam (kanal + dil) için alan satırları.
 * @returns {{ rows: object[], changed: number, empty: boolean }}
 *   rows[]: { id, label, mono, state: "aynı" | "değişti" | "eklendi" | "kaldırıldı", old, neu }
 */
export function fieldDiffs(channel, a, b, { onlyChanged = false } = {}) {
  if (!a && !b) return { rows: [], changed: 0, empty: true };
  let changed = 0;
  const rows = [];
  for (const f of FIELDS[channel] || []) {
    const ov = a ? String(a[f.id] ?? "") : null;
    const nv = b ? String(b[f.id] ?? "") : null;
    const state =
      ov === null ? "eklendi" : nv === null ? "kaldırıldı" : ov === nv ? "aynı" : "değişti";
    if (state !== "aynı") changed += 1;
    if (state === "aynı" && onlyChanged) continue;
    const segments =
      state === "değişti"
        ? diffSegments(ov, nv, MULTILINE_TYPES.has(f.type))
        : {
            old: ov === null ? [] : [{ op: "=", text: ov }],
            neu: nv === null ? [] : [{ op: "=", text: nv }],
          };
    rows.push({
      id: f.id,
      label: f.label,
      mono: f.type === "html" || f.type === "text" || !!f.mono,
      state,
      old: segments.old,
      neu: segments.neu,
    });
  }
  return { rows, changed, empty: false };
}

/**
 * İki içerik ağacı arasında fark olan kapsamlar (açık kanallar × diller).
 * @returns {{ channel, lang, count, kind: "eklendi" | "kaldırıldı" | "değişti" }[]}
 */
export function scopeChanges(event, oldContent, newContent) {
  const out = [];
  for (const channel of sentChannels(event))
    for (const lang of LANGS) {
      const a = oldContent?.[channel.id]?.[lang.id] ?? null;
      const b = newContent?.[channel.id]?.[lang.id] ?? null;
      if (!a && !b) continue;
      const fields = FIELDS[channel.id];
      const count =
        !a || !b ? fields.length : fields.filter((f) => (a[f.id] ?? "") !== (b[f.id] ?? "")).length;
      if (count)
        out.push({
          channel: channel.id,
          lang: lang.id,
          count,
          kind: !a ? "eklendi" : !b ? "kaldırıldı" : "değişti",
        });
    }
  return out;
}

/**
 * Yayın modalındaki "Değişen alanlar" listesi (yayındaki → taslak).
 * @returns {{ icon: string, text: string, tag: "yeni" | "silindi" | "değişti" }[]}
 */
export function changedFieldList(event, published, draft) {
  const out = [];
  for (const channel of sentChannels(event))
    for (const lang of LANGS) {
      const a = published?.[channel.id]?.[lang.id] ?? null;
      const b = draft?.[channel.id]?.[lang.id] ?? null;
      const tag = `${channel.label} · ${lang.short}`;
      if (!a && !b) continue;
      if (!a) out.push({ icon: "plus", text: `${tag} eklendi`, tag: "yeni" });
      else if (!b) out.push({ icon: "x", text: `${tag} kaldırıldı`, tag: "silindi" });
      else
        for (const f of FIELDS[channel.id])
          if ((a[f.id] ?? "") !== (b[f.id] ?? ""))
            out.push({ icon: "pencil", text: `${f.label} (${tag})`, tag: "değişti" });
    }
  return out;
}

/** Taslakta yayındakinden farklı bir şey var mı? */
export const hasDraftDiff = (published, draft) =>
  !published || JSON.stringify(draft) !== JSON.stringify(published);
