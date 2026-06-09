// TR-spesifik metin yardımcıları (pure JS, browser+Node uyumlu).
// SEO analyzer için cümle/kelime sayım, geçiş kelimesi tespit, pasif ses heuristic.

// Geçiş kelimeleri (TR — 50+ yaygın kelime/öbek).
export const TR_TRANSITION_WORDS = [
  "ayrıca",
  "bununla birlikte",
  "böylece",
  "sonuç olarak",
  "ancak",
  "fakat",
  "ama",
  "lakin",
  "yine de",
  "halbuki",
  "oysa",
  "çünkü",
  "zira",
  "dolayısıyla",
  "bu nedenle",
  "bu yüzden",
  "örneğin",
  "mesela",
  "özellikle",
  "başta",
  "ilk olarak",
  "ikincisi",
  "son olarak",
  "kısacası",
  "özetle",
  "genel olarak",
  "aslında",
  "gerçekten",
  "tabii ki",
  "elbette",
  "hatta",
  "üstelik",
  "buna karşın",
  "aksine",
  "tersine",
  "aynı zamanda",
  "bir yandan",
  "diğer yandan",
  "öte yandan",
  "nitekim",
  "gerçi",
  "şu halde",
  "o halde",
  "demek ki",
  "kuşkusuz",
  "şüphesiz",
  "belki",
  "belki de",
  "olasılıkla",
  "bir başka deyişle",
  "yani",
  "kısaca",
];

const SENTENCE_END_REGEX = /[.!?]+\s+|[.!?]+$/g;

/**
 * Metni cümlelere böler. Nokta, soru ve ünlem sonrası ayırır.
 * @param {string} text
 * @returns {string[]} Boş cümleler atılır.
 */
export function splitSentences(text) {
  if (!text) return [];
  return text
    .split(SENTENCE_END_REGEX)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Bir string'i kelimelere böler. Whitespace + noktalama temizlenir.
 */
/** TR lowercase: İ→i, I→ı, ardından combining dot temizliği. */
function _trLower(text) {
  if (!text) return "";
  return text.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase().replace(/̇/g, ""); // combining dot above
}

export function splitWords(text) {
  if (!text) return [];
  return _trLower(text)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

export function countWords(text) {
  return splitWords(text).length;
}

/**
 * Bir cümlede TR geçiş kelimesi var mı?
 */
export function containsTransitionWord(sentence) {
  if (!sentence) return false;
  const lower = sentence.toLowerCase();
  return TR_TRANSITION_WORDS.some((w) => lower.includes(w));
}

/**
 * Heuristic: kelime pasif çatıyla bitiyor mu? (TR -il/-in/-ul/-ün/-l/-n suffix).
 * Doğruluk ~%70 — birçok aktif fiili de yakalayabilir.
 */
export function isPassiveWord(word) {
  if (!word) return false;
  const w = _trLower(word);
  if (w.length < 5) return false;
  // Pasif suffix: -il/-ıl/-ul/-ül + d/m/y (zaman eki)
  //           VEYA -n + d/m + ünlü (eklen-di, yapıl-an, satıl-an)
  return (
    /(il|ıl|ul|ül|in|ın|un|ün)(d[ıiuü]|m[ıiuü]|y[oö]r|miş|mış|muş|müş)/i.test(w) ||
    /[aeıioöuü]n(d[ıiuü]|m[ıiuü]|miş|mış|muş|müş)/i.test(w)
  );
}

/**
 * Bir cümlede en az 1 pasif kelime var mı?
 */
export function sentenceHasPassive(sentence) {
  if (!sentence) return false;
  return splitWords(sentence).some(isPassiveWord);
}

/**
 * Türkçe karakter normalize edip URL-safe slug formatına çevirir.
 * (slugify_tr backend versiyonu ile uyumlu.)
 */
export function normalizeForSlug(text) {
  if (!text) return "";
  const trMap = {
    ç: "c",
    Ç: "c",
    ğ: "g",
    Ğ: "g",
    ı: "i",
    I: "i",
    İ: "i",
    ö: "o",
    Ö: "o",
    ş: "s",
    Ş: "s",
    ü: "u",
    Ü: "u",
  };
  return text
    .split("")
    .map((c) => trMap[c] ?? c)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Slug stop-word'leri: anlam taşımayan bağlaç/edat (TR) + yaygın EN.
 * DİKKAT: Ürün terimleri (toptan, premium, kalite, kargo, hızlı…) STOP-WORD
 * DEĞİLDİR — bunlar gerçek anahtar kelimedir, slug'dan silinmez.
 */
export const TR_STOP_WORDS = [
  "ve",
  "ile",
  "için",
  "ya",
  "veya",
  "ama",
  "fakat",
  "ancak",
  "da",
  "de",
  "ki",
  "mi",
  "mı",
  "mu",
  "mü",
  "bir",
  "bu",
  "şu",
  "the",
  "and",
  "or",
  "a",
  "an",
  "of",
  "for",
  "to",
  "in",
  "on",
  "with",
  "by",
];

/**
 * SEO-dostu temiz slug üretir: TR karakter normalize + stop-word at +
 * kelime sınırında maxLen'e (varsayılan 60) kes. Ürün terimleri korunur;
 * sadece bağlaç/edat ve aşırı uzunluk budanır.
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
export function cleanSlug(text, maxLen = 60) {
  if (!text) return "";
  const tokens = normalizeForSlug(text)
    .split("-")
    .filter((w) => w && !TR_STOP_WORDS.includes(w));
  let out = "";
  for (const w of tokens) {
    const next = out ? `${out}-${w}` : w;
    if (next.length > maxLen) break;
    out = next;
  }
  // İlk kelime tek başına maxLen'i aşıyorsa yine de bir şey döndür.
  return out || (tokens[0] || "").slice(0, maxLen);
}

/**
 * Bir metinde anahtar kelimenin (tek veya çok kelimeli) kaç kez geçtiğini sayar.
 * TR-lowercase normalize ile case-insensitive, örtüşmeyen sayım.
 */
export function countOccurrences(text, phrase) {
  const hay = _trLower(text);
  const needle = _trLower(phrase);
  if (!hay || !needle) return 0;
  let count = 0;
  let idx = hay.indexOf(needle);
  while (idx !== -1) {
    count++;
    idx = hay.indexOf(needle, idx + needle.length);
  }
  return count;
}

/**
 * Cümlenin ilk kelimesini döner (lowercase).
 */
export function firstWordOf(sentence) {
  const words = splitWords(sentence);
  return words[0] || "";
}
