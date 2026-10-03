// Bildirim şablonları — önizleme modeli (saf).
//
// Hangi içeriğin çizileceğini (dil düşmesi dahil) ve örnek veriyle doldurulmuş
// metinleri üretir. Çıktıdaki `*Html` alanları GÜVENLİ HTML'dir: değişken
// değerleri kaçışlanır, düz metin alanlarının şablonu da kaçışlanır
// (`template.js` → `expand`). E-posta gövdesi ayrıca çağıranda DOMPurify'dan geçer.

import { PREVIEW_WIDTH, SOURCE_LANG } from "../../constants/notificationTemplates.js";
import { channelState } from "./catalog.js";
import { expand, firstRequiredVariable, knownNames, sampleScope } from "./template.js";

/** E-posta altbilgisi: kanal zorunlu mu, kullanıcı kapatabilir mi? */
const FOOTER = {
  zorunlu: {
    tr: "Bu e-posta hesabınızla ilgili zorunlu bir bildirimdir; kapatılamaz.",
    en: "This is a mandatory notice about your account and cannot be turned off.",
    ar: "هذه رسالة إلزامية تتعلق بحسابك ولا يمكن إيقافها.",
    ru: "Это обязательное уведомление о вашей учётной записи; отключить его нельзя.",
  },
  secmeli: {
    tr: "Bu bildirimi Ayarlar > Bildirimler sayfasından kapatabilirsiniz.",
    en: "You can turn this notification off under Settings > Notifications.",
    ar: "يمكنك إيقاف هذا الإشعار من الإعدادات > الإشعارات.",
    ru: "Отключить это уведомление можно в разделе «Настройки > Уведомления».",
  },
};

/** Önizleme çerçevesindeki sabit arayüz sözcükleri (alıcının dilinde). */
const CHROME = {
  tr: { notif: "Bildirimler", now: "Az önce", pushNow: "şimdi", sms: "Kısa mesaj · şimdi" },
  en: { notif: "Notifications", now: "Just now", pushNow: "now", sms: "Text message · now" },
  ar: { notif: "الإشعارات", now: "الآن", pushNow: "الآن", sms: "رسالة نصية · الآن" },
  ru: { notif: "Уведомления", now: "Только что", pushNow: "сейчас", sms: "SMS · сейчас" },
};

/**
 * İstenen dilde içerik yoksa kaynak dile (TR) düşer — gönderimdeki davranışla aynı.
 * @returns {{ data: object|null, lang: string, fell: boolean }}
 */
export function resolvePreviewContent(tree, channel, lang) {
  const own = tree?.[channel]?.[lang] ?? null;
  if (own) return { data: own, lang, fell: false };
  return {
    data: tree?.[channel]?.[SOURCE_LANG] ?? null,
    lang: SOURCE_LANG,
    fell: lang !== SOURCE_LANG,
  };
}

/** Kanalın gerçek önizleme genişliği (px). */
export const previewWidth = (channel, device) =>
  channel === "email" ? PREVIEW_WIDTH[device] || PREVIEW_WIDTH.mobile : PREVIEW_WIDTH.mobile;

/**
 * @param {object} o
 * @param {object} o.event
 * @param {object} o.tree içerik ağacı (`draft` ya da bir sürümün içeriği)
 * @param {string} o.channel
 * @param {string} o.lang istenen dil
 * @param {object[]} o.variables
 * @param {string[]} o.required kanalın zorunlu değişkenleri
 * @param {"normal"|"long"|"missing"} [o.sample]
 * @param {(html: string) => string} o.sanitize e-posta gövdesi için temizleyici
 * @returns {{ status: "ok"|"empty"|"missing-data", lang, fell, missingVariable?, parts? }}
 */
export function buildPreview({
  event,
  tree,
  channel,
  lang,
  variables = [],
  required = [],
  sample = "normal",
  sanitize,
}) {
  const resolved = resolvePreviewContent(tree, channel, lang);
  if (!resolved.data) return { status: "empty", lang: resolved.lang, fell: resolved.fell };

  if (sample === "missing") {
    // Olay verisinde zorunlu değer eksik: bu kanaldan ileti çıkmaz.
    const missingVariable = firstRequiredVariable(variables, required);
    if (missingVariable)
      return { status: "missing-data", lang: resolved.lang, fell: resolved.fell, missingVariable };
  }

  const known = knownNames(variables);
  const scope = sampleScope(variables, sample === "long" ? "long" : "normal");
  const text = (value) => expand(value, scope, known, false);
  const data = resolved.data;
  const chrome = CHROME[resolved.lang] || CHROME.tr;
  let parts;

  if (channel === "email") {
    const state = channelState(event, "email") === "zorunlu" ? "zorunlu" : "secmeli";
    parts = {
      subjectHtml: text(data.subject),
      preheaderHtml: text(data.preheader),
      // Önce şablon temizlenir, sonra değerler kaçışlanarak yerleştirilir.
      bodyHtml: expand(sanitize(String(data.html ?? "")), scope, known, true),
      footer: FOOTER[state][resolved.lang] || FOOTER[state].tr,
    };
  } else if (channel === "inapp") {
    parts = {
      heading: chrome.notif,
      titleHtml: text(data.title),
      messageHtml: text(data.message),
      actionHtml: data.action_label ? text(data.action_label) : "",
      time: chrome.now,
    };
  } else if (channel === "push") {
    parts = { titleHtml: text(data.title), bodyHtml: text(data.body), time: chrome.pushNow };
  } else {
    parts = { meta: chrome.sms, textHtml: text(data.text) };
  }
  return { status: "ok", lang: resolved.lang, fell: resolved.fell, parts };
}
