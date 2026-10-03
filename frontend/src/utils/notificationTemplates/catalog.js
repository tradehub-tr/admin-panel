// Bildirim şablonları — olay kataloğu türetmeleri (saf, `node --test` ile sınanır).
//
// Sayaçlar, arama, filtre ve kural cümlesi HER ZAMAN olay listesinden türetilir;
// ayrı bir sayaç ya da "olay zorunlu" anahtarı tutulmaz (tasarım T29, T32).
// Olay biçimi API'dekiyle aynıdır (`list_events` → `events[]`).

import {
  CATEGORIES,
  CHANNELS,
  CHANNEL_STATES,
  DELIVERY,
  LANGS,
  PUBLISH_STATES,
  TRANSLATION_STATES,
} from "../../constants/notificationTemplates.js";

/**
 * Türkçe duyarlı arama anahtarı: "SİPARİŞ", "sipariş" ve "siparis" aynı
 * anahtara iner. `toLocaleLowerCase("tr-TR")` İ→i ve I→ı çevirir; ardından
 * Türkçe harfler ASCII karşılığına katlanır ve kalan aksanlar atılır.
 */
export function fold(value) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export const channelState = (event, channel) => event?.channels?.[channel] || "kapali";
export const sends = (event, channel) => channelState(event, channel) !== "kapali";
export const sentChannels = (event) => CHANNELS.filter((c) => sends(event, c.id));
export const missingLangs = (event) =>
  LANGS.filter((l) => event?.langs?.[l.id] !== "hazir").map((l) => l.id);

const moduleOf = (event) => CATEGORIES.find((c) => c.id === event.category)?.module || "";

/** Sayaçlar — verilen olay listesinden türer. */
export function stats(list = []) {
  const s = {
    total: list.length,
    email: 0,
    push: 0,
    sms: 0,
    published: 0,
    draft: 0,
    pendingDraft: 0,
    missingLang: 0,
  };
  for (const e of list) {
    if (sends(e, "email")) s.email += 1;
    if (sends(e, "push")) s.push += 1;
    if (sends(e, "sms")) s.sms += 1;
    if (e.publish?.state === "taslak") s.draft += 1;
    else s.published += 1;
    if (e.publish?.state === "yayinda-taslak") s.pendingDraft += 1;
    if (missingLangs(e).length) s.missingLang += 1;
  }
  return s;
}

export const EMPTY_FILTERS = Object.freeze({
  q: "",
  module: "",
  channel: "",
  publish: "",
  translation: "",
  delivery: "",
});

/**
 * Olay listesini süzer. Filtre anahtarları `list_events` girdisiyle aynıdır.
 *   publish: "yayinda" (taslak olmayanların tümü) | "yayinda-taslak" | "taslak"
 *   translation: "tam" | "var" | "bekliyor" | "kopya" | "eksik"
 */
export function filterEvents(list = [], filters = {}) {
  const f = { ...EMPTY_FILTERS, ...filters };
  const q = fold(String(f.q).trim());
  return list.filter((e) => {
    if (q && ![e.name, e.key, moduleOf(e)].some((v) => fold(v).includes(q))) return false;
    if (f.module && e.category !== f.module) return false;
    if (f.channel && !sends(e, f.channel)) return false;
    if (f.publish === "yayinda" && e.publish?.state === "taslak") return false;
    if (f.publish && f.publish !== "yayinda" && e.publish?.state !== f.publish) return false;
    if (f.delivery && e.delivery !== f.delivery) return false;
    const miss = missingLangs(e);
    if (f.translation === "tam" && miss.length) return false;
    if (f.translation === "var" && !miss.length) return false;
    if (
      ["bekliyor", "kopya", "eksik"].includes(f.translation) &&
      !Object.values(e.langs || {}).includes(f.translation)
    )
      return false;
    return true;
  });
}

/** Filtre seçenekleri (değer, etiket) — açılır listeler ve çipler aynı kaynağı okur. */
export const FILTER_DEFS = Object.freeze({
  module: { label: "Modül", options: () => CATEGORIES.map((c) => [c.id, c.title]) },
  channel: { label: "Kanal", options: () => CHANNELS.map((c) => [c.id, c.label]) },
  publish: {
    label: "Yayın durumu",
    options: () => [
      ["yayinda", "Yayında (tümü)"],
      ["yayinda-taslak", PUBLISH_STATES["yayinda-taslak"].label],
      ["taslak", PUBLISH_STATES.taslak.label],
    ],
  },
  translation: {
    label: "Çeviri durumu",
    options: () => [
      ["tam", "Tüm diller hazır"],
      ["var", "Hazır olmayan dil var"],
      ...["bekliyor", "kopya", "eksik"].map((k) => [k, TRANSLATION_STATES[k].label]),
    ],
  },
  delivery: {
    label: "Gönderim",
    options: () => Object.entries(DELIVERY).map(([k, d]) => [k, d.label]),
  },
});

/** Etkin filtrelerin çipleri: `[{ key, text }]`. */
export function activeFilterChips(filters = {}) {
  const out = [];
  const q = String(filters.q || "").trim();
  if (q) out.push({ key: "q", text: `Arama: ${q}` });
  for (const [key, def] of Object.entries(FILTER_DEFS)) {
    if (!filters[key]) continue;
    const label = def.options().find(([v]) => v === filters[key])?.[1] ?? filters[key];
    out.push({ key, text: `${def.label}: ${label}` });
  }
  return out;
}

/**
 * Kanal durumlarından türeyen kural cümlesi.
 * "Kullanıcı kapatabilir: Push; zorunlu: Uygulama içi, E-posta; gönderilmiyor: SMS."
 */
export function ruleSentence(channels = {}) {
  const by = (state) =>
    CHANNELS.filter((c) => (channels[c.id] || "kapali") === state).map((c) => c.label);
  const optional = by("secmeli");
  const mandatory = by("zorunlu");
  const closed = by("kapali");
  const parts = [];
  if (optional.length) parts.push(`Kullanıcı kapatabilir: ${optional.join(", ")}`);
  else if (mandatory.length) parts.push("Zorunlu bildirim: kullanıcı hiçbir kanalı kapatamaz");
  if (mandatory.length) parts.push(`zorunlu: ${mandatory.join(", ")}`);
  if (closed.length) parts.push(`gönderilmiyor: ${closed.join(", ")}`);
  const s = parts.join("; ");
  if (!s) return "Hiçbir kanal açık değil.";
  return `${s.charAt(0).toLocaleUpperCase("tr-TR")}${s.slice(1)}.`;
}

/** Ekran okuyucu için kanal durumu metni. */
export const channelStateText = (event) =>
  CHANNELS.map((c) => `${c.label}: ${CHANNEL_STATES[channelState(event, c.id)].label}`).join("; ");

/** En az bir kanal gönderiyor mu? (Kanal çekmecesi kaydı için alt sınır.) */
export const hasOpenChannel = (channels = {}) =>
  CHANNELS.some((c) => (channels[c.id] || "kapali") !== "kapali");

/**
 * Çekmecedeki çalışma kopyasını `save_event_channels` gövdesine çevirir:
 * `defaults` yalnız seçmeli kanalları taşır.
 */
export function channelPayload(work) {
  const defaults = {};
  for (const c of CHANNELS) {
    if (work.channels[c.id] === "secmeli") defaults[c.id] = work.defaults[c.id] !== false;
  }
  return { channels: { ...work.channels }, defaults, delivery: work.delivery };
}

/** Çeviri özeti: "3/4 dil" + "AR eksik". */
export function translationSummary(event) {
  const total = LANGS.length;
  const miss = missingLangs(event);
  const parts = ["bekliyor", "kopya", "eksik"]
    .map((state) => {
      const shorts = LANGS.filter((l) => event.langs?.[l.id] === state).map((l) => l.short);
      return shorts.length ? `${shorts.join(", ")} ${TRANSLATION_STATES[state].short}` : "";
    })
    .filter(Boolean);
  const tone = miss.some((l) => event.langs?.[l] === "eksik") ? "err" : miss.length ? "warn" : "ok";
  return {
    ready: total - miss.length,
    total,
    tone,
    count: `${total - miss.length}/${total} dil`,
    rest: parts.join(" · ") || "tümü hazır",
  };
}

/** Listeyi modül (kategori) başlıklarıyla gruplar; sıra olay sırasını izler. */
export function groupByCategory(rows = [], all = rows) {
  const groups = [];
  for (const event of rows) {
    let group = groups[groups.length - 1];
    if (!group || group.id !== event.category) {
      group = {
        id: event.category,
        title: CATEGORIES.find((c) => c.id === event.category)?.title || event.category,
        total: all.filter((e) => e.category === event.category).length,
        events: [],
      };
      groups.push(group);
    }
    group.events.push(event);
  }
  return groups;
}

/** "26 olaydan 1–10 gösteriliyor" satırı. */
export function listCountLabel({ total, matched, shown, filtered }) {
  if (!matched) return `0 sonuç · ${total} olaydan`;
  if (filtered) return `${matched} sonuç (${total} olaydan) · 1–${shown} gösteriliyor`;
  return `${total} olaydan 1–${shown} gösteriliyor`;
}
