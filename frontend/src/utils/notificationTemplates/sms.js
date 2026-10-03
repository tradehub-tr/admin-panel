// Bildirim şablonları — SMS ölçümü (saf).
//
// VARSAYIM: segment sınırları standart GSM 03.38 ile hesaplanır
// (GSM-7: 160 tek / 153 parçalı; Unicode: 70 / 67). Sağlayıcının Türkçe ulusal
// tablo desteği varsa sınırlar değişir.

import { NOTIFICATION_TEMPLATE_POLICY } from "../../constants/notificationTemplatePolicy.js";

const GSM =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€";
// GSM-7'de OLMAYAN Türkçe harfler (ö, ü, Ç, Ö, Ü tabloda var; dokunulmaz).
const TR_NON_GSM = "şŞğĞıİç";
const TR_MAP = { ş: "s", Ş: "S", ğ: "g", Ğ: "G", ı: "i", İ: "I", ç: "c" };

/**
 * Para simgesi kararı (onay bekliyor): `sendAsText` açıksa ölçüm de
 * sağlayıcıya gidecek metinle (₺ → TL) yapılır.
 */
export function applySmsCurrency(text, policy = NOTIFICATION_TEMPLATE_POLICY.smsCurrency) {
  if (!policy?.sendAsText) return String(text ?? "");
  return String(text ?? "")
    .split(policy.symbol)
    .join(policy.text);
}

/**
 * @returns {{ len: number, unicode: boolean, turkish: boolean, single: number,
 *   chars: string, segments: number, encoding: string }}
 */
export function smsInfo(text, policy = NOTIFICATION_TEMPLATE_POLICY.smsCurrency) {
  const source = applySmsCurrency(text, policy);
  let len = 0;
  let unicode = false;
  let turkish = false;
  const odd = new Set();
  for (const chr of source) {
    if (GSM.includes(chr)) len += 1;
    else if (GSM_EXT.includes(chr)) len += 2;
    else {
      unicode = true;
      odd.add(chr);
      if (TR_NON_GSM.includes(chr)) turkish = true;
    }
  }
  if (unicode) len = Array.from(source).length;
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  return {
    len,
    unicode,
    turkish,
    single,
    chars: Array.from(odd).slice(0, 6).join(" "),
    segments: len <= single ? (len ? 1 : 0) : Math.ceil(len / multi),
    encoding: unicode ? "Unicode (UCS-2)" : "GSM-7",
  };
}

/** Yalnız GSM-7'de olmayan Türkçe harfleri sadeleştirir. */
export const simplifyTurkish = (text) => String(text ?? "").replace(/[şŞğĞıİç]/g, (m) => TR_MAP[m]);
