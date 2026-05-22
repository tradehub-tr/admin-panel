// Pure JS SEO + readability analyzer (21 check, 5 kategori).
// Browser+Node uyumlu (DOMParser browser-only — Node'da fallback regex).

import {
  containsTransitionWord,
  countWords,
  firstWordOf,
  normalizeForSlug,
  sentenceHasPassive,
  splitSentences,
} from "./turkishTextHelpers.js";

const STATUS = {
  PASS: "pass",
  WARN: "warn",
  FAIL: "fail",
  NA: "na",
};

const CATEGORIES = {
  KEYWORD: "keyword",
  LENGTH: "length",
  READABILITY: "readability",
  STRUCTURE: "structure",
  TECHNICAL: "technical",
};

const CATEGORY_LABELS = {
  keyword: "Anahtar Kelime",
  length: "Uzunluk",
  readability: "Okunabilirlik",
  structure: "Yapı",
  technical: "Teknik",
};

// Default boş input
const DEFAULT_INPUT = {
  title: "",
  meta_title: "",
  meta_description: "",
  description: "",
  slug: "",
  focus_keyword: "",
  primary_image_alt: "",
  og_image: "",
  noindex: 0,
};

// ──────────────────────────────────────────────────────────────────────────
// 1. Keyword (5 check)
// ──────────────────────────────────────────────────────────────────────────

function _check_keyword_in_title(input) {
  const fk = (input.focus_keyword || "").trim().toLowerCase();
  if (!fk) {
    return _check(
      CATEGORIES.KEYWORD,
      "keyword_in_title",
      "Anahtar kelime başlıkta",
      STATUS.NA,
      "Hedef anahtar kelime girilmemiş",
      'Önce "Hedef Anahtar Kelime" alanını doldur'
    );
  }
  const has = (input.meta_title || input.title || "").toLowerCase().includes(fk);
  return _check(
    CATEGORIES.KEYWORD,
    "keyword_in_title",
    "Anahtar kelime başlıkta",
    has ? STATUS.PASS : STATUS.FAIL,
    has ? `"${input.focus_keyword}" başlıkta geçiyor` : `"${input.focus_keyword}" başlıkta yok`,
    has ? null : "Meta başlığa hedef anahtar kelimeyi ekle"
  );
}

function _check_keyword_in_meta_desc(input) {
  const fk = (input.focus_keyword || "").trim().toLowerCase();
  if (!fk) return _na(CATEGORIES.KEYWORD, "keyword_in_meta_desc", "Açıklamada geçiyor");
  const has = (input.meta_description || "").toLowerCase().includes(fk);
  return _check(
    CATEGORIES.KEYWORD,
    "keyword_in_meta_desc",
    "Açıklamada geçiyor",
    has ? STATUS.PASS : STATUS.FAIL,
    has ? "Meta açıklamada geçiyor" : "Meta açıklamada yok",
    has ? null : "Meta açıklamaya hedef anahtar kelimeyi ekle"
  );
}

function _check_keyword_in_slug(input) {
  const fk = (input.focus_keyword || "").trim();
  if (!fk) return _na(CATEGORIES.KEYWORD, "keyword_in_slug", "URL'de geçiyor");
  const slugified = normalizeForSlug(fk);
  const has = (input.slug || "").toLowerCase().includes(slugified);
  return _check(
    CATEGORIES.KEYWORD,
    "keyword_in_slug",
    "URL'de geçiyor",
    has ? STATUS.PASS : STATUS.FAIL,
    has ? `Slug "${input.slug}" içinde "${slugified}" geçiyor` : `Slug'da "${slugified}" yok`,
    has ? null : `Slug'a "${slugified}" ekle`
  );
}

function _check_keyword_in_body(input) {
  const fk = (input.focus_keyword || "").trim().toLowerCase();
  if (!fk) return _na(CATEGORIES.KEYWORD, "keyword_in_body", "İçerikte geçiyor");
  const body = _stripHtml(input.description || "").toLowerCase();
  const has = body.includes(fk);
  return _check(
    CATEGORIES.KEYWORD,
    "keyword_in_body",
    "İçerikte geçiyor",
    has ? STATUS.PASS : STATUS.FAIL,
    has ? "İçerik metninde geçiyor" : "İçerik metninde yok",
    has ? null : "İçeriğin ilk paragrafına hedef anahtar kelimeyi ekle"
  );
}

function _check_keyword_in_image_alt(input) {
  const fk = (input.focus_keyword || "").trim().toLowerCase();
  if (!fk) return _na(CATEGORIES.KEYWORD, "keyword_in_image_alt", "Görsel alt metninde");
  const alt = (input.primary_image_alt || "").toLowerCase();
  if (!alt) {
    return _check(
      CATEGORIES.KEYWORD,
      "keyword_in_image_alt",
      "Görsel alt metninde",
      STATUS.WARN,
      "Primary image'in alt metni boş",
      "Primary image'e alt text ekle ve hedef anahtar kelimeyi içersin"
    );
  }
  const has = alt.includes(fk);
  return _check(
    CATEGORIES.KEYWORD,
    "keyword_in_image_alt",
    "Görsel alt metninde",
    has ? STATUS.PASS : STATUS.FAIL,
    has ? "Primary image alt'ta geçiyor" : "Primary image alt'ta yok",
    has ? null : "Primary image alt text'e hedef anahtar kelimeyi ekle"
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 2. Length (5 check)
// ──────────────────────────────────────────────────────────────────────────

function _check_meta_title_length(input) {
  const len = (input.meta_title || "").trim().length;
  if (len === 0) {
    return _check(
      CATEGORIES.LENGTH,
      "meta_title_length",
      "Meta başlık uzunluğu",
      STATUS.FAIL,
      "Meta başlık boş",
      "Meta başlığı 50-70 karakter arası doldur"
    );
  }
  if (len < 50) {
    return _check(
      CATEGORIES.LENGTH,
      "meta_title_length",
      "Meta başlık uzunluğu",
      STATUS.WARN,
      `${len} karakter (önerilen 50-70)`,
      "Daha uzun yaz, anahtar kelimeleri ekle"
    );
  }
  if (len > 70) {
    return _check(
      CATEGORIES.LENGTH,
      "meta_title_length",
      "Meta başlık uzunluğu",
      STATUS.WARN,
      `${len} karakter (önerilen 50-70)`,
      "Google 70 karakter sonrası keser, kısalt"
    );
  }
  return _check(
    CATEGORIES.LENGTH,
    "meta_title_length",
    "Meta başlık uzunluğu",
    STATUS.PASS,
    `${len} karakter`,
    null
  );
}

function _check_meta_desc_length(input) {
  const len = (input.meta_description || "").trim().length;
  if (len === 0) {
    return _check(
      CATEGORIES.LENGTH,
      "meta_desc_length",
      "Meta açıklama uzunluğu",
      STATUS.FAIL,
      "Meta açıklama boş",
      "Meta açıklamayı 120-160 karakter arası doldur"
    );
  }
  if (len < 120) {
    return _check(
      CATEGORIES.LENGTH,
      "meta_desc_length",
      "Meta açıklama uzunluğu",
      STATUS.WARN,
      `${len} karakter (önerilen 120-160)`,
      "Daha açıklayıcı yaz"
    );
  }
  if (len > 160) {
    return _check(
      CATEGORIES.LENGTH,
      "meta_desc_length",
      "Meta açıklama uzunluğu",
      STATUS.WARN,
      `${len} karakter (önerilen 120-160)`,
      "Google 160 karakter sonrası keser, kısalt"
    );
  }
  return _check(
    CATEGORIES.LENGTH,
    "meta_desc_length",
    "Meta açıklama uzunluğu",
    STATUS.PASS,
    `${len} karakter`,
    null
  );
}

function _check_description_min_length(input) {
  const len = _stripHtml(input.description || "").trim().length;
  if (len >= 300) {
    return _check(
      CATEGORIES.LENGTH,
      "description_min_length",
      "İçerik metni uzunluğu",
      STATUS.PASS,
      `${len} karakter`,
      null
    );
  }
  return _check(
    CATEGORIES.LENGTH,
    "description_min_length",
    "İçerik metni uzunluğu",
    STATUS.FAIL,
    `${len} karakter (önerilen ≥ 300)`,
    "İçerik metnini en az 300 karaktere çıkar"
  );
}

function _check_slug_length(input) {
  const len = (input.slug || "").length;
  if (len === 0) {
    return _check(
      CATEGORIES.LENGTH,
      "slug_length",
      "Slug uzunluğu",
      STATUS.FAIL,
      "Slug boş",
      "Slug otomatik veya manuel olarak doldurulmalı"
    );
  }
  if (len < 3 || len > 60) {
    return _check(
      CATEGORIES.LENGTH,
      "slug_length",
      "Slug uzunluğu",
      STATUS.WARN,
      `${len} karakter (önerilen 3-60)`,
      "Slug çok kısa veya çok uzun"
    );
  }
  return _check(
    CATEGORIES.LENGTH,
    "slug_length",
    "Slug uzunluğu",
    STATUS.PASS,
    `${len} karakter`,
    null
  );
}

function _check_focus_keyword_set(input) {
  const fk = (input.focus_keyword || "").trim();
  return _check(
    CATEGORIES.LENGTH,
    "focus_keyword_set",
    "Hedef anahtar kelime girilmiş",
    fk ? STATUS.PASS : STATUS.FAIL,
    fk ? `"${fk}"` : "Hedef anahtar kelime boş",
    fk ? null : "Skor analizi için hedef anahtar kelime girilmeli"
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 3. Readability (5 check, TR-spesifik)
// ──────────────────────────────────────────────────────────────────────────

function _check_sentence_length(input) {
  const text = _stripHtml(input.description || "");
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return _check(
      CATEGORIES.READABILITY,
      "sentence_length",
      "Ortalama cümle uzunluğu",
      STATUS.NA,
      "İçerik metni yok",
      "İçerik ekle"
    );
  }
  const avg = sentences.reduce((sum, s) => sum + countWords(s), 0) / sentences.length;
  if (avg <= 25) {
    return _check(
      CATEGORIES.READABILITY,
      "sentence_length",
      "Ortalama cümle uzunluğu",
      STATUS.PASS,
      `${avg.toFixed(1)} kelime/cümle`,
      null
    );
  }
  return _check(
    CATEGORIES.READABILITY,
    "sentence_length",
    "Ortalama cümle uzunluğu",
    STATUS.WARN,
    `${avg.toFixed(1)} kelime/cümle (önerilen ≤ 25)`,
    "Uzun cümleleri böl"
  );
}

function _check_paragraph_count(input) {
  const text = input.description || "";
  // <p> tag sayısı VEYA \n\n çift satır sonu (strip etmeden, whitespace collapse YAPMA)
  const pTags = (text.match(/<p[^>]*>/gi) || []).length;
  const tagsRemoved = text.replace(/<[^>]+>/g, "");
  const doubleNewlines = tagsRemoved.split(/\n\n+/).filter((p) => p.trim()).length;
  const paragraphs = Math.max(pTags, doubleNewlines);
  if (paragraphs >= 2) {
    return _check(
      CATEGORIES.READABILITY,
      "paragraph_count",
      "Paragraf sayısı",
      STATUS.PASS,
      `${paragraphs} paragraf`,
      null
    );
  }
  return _check(
    CATEGORIES.READABILITY,
    "paragraph_count",
    "Paragraf sayısı",
    STATUS.WARN,
    `${paragraphs} paragraf (önerilen ≥ 2)`,
    "İçeriği birden fazla paragrafa böl"
  );
}

function _check_transition_words(input) {
  const text = _stripHtml(input.description || "");
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return _na(CATEGORIES.READABILITY, "transition_words", "Geçiş kelimeleri");
  }
  const withTransition = sentences.filter(containsTransitionWord).length;
  const percent = (withTransition / sentences.length) * 100;
  if (percent >= 30) {
    return _check(
      CATEGORIES.READABILITY,
      "transition_words",
      "Geçiş kelimeleri",
      STATUS.PASS,
      `Cümlelerin %${percent.toFixed(0)}'sinde geçiş kelimesi`,
      null
    );
  }
  return _check(
    CATEGORIES.READABILITY,
    "transition_words",
    "Geçiş kelimeleri",
    STATUS.WARN,
    `Cümlelerin sadece %${percent.toFixed(0)}'sinde geçiş kelimesi (önerilen ≥ 30%)`,
    '"ayrıca", "böylece", "ancak" gibi geçiş kelimeleri ekle'
  );
}

function _check_passive_voice(input) {
  const text = _stripHtml(input.description || "");
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return _na(CATEGORIES.READABILITY, "passive_voice", "Pasif ses oranı");
  }
  const passive = sentences.filter(sentenceHasPassive).length;
  const percent = (passive / sentences.length) * 100;
  if (percent < 20) {
    return _check(
      CATEGORIES.READABILITY,
      "passive_voice",
      "Pasif ses oranı",
      STATUS.PASS,
      `%${percent.toFixed(0)} pasif (önerilen < 20%)`,
      null
    );
  }
  return _check(
    CATEGORIES.READABILITY,
    "passive_voice",
    "Pasif ses oranı",
    STATUS.WARN,
    `%${percent.toFixed(0)} pasif (önerilen < 20%)`,
    "Pasif cümleleri aktif yapıya çevir"
  );
}

function _check_consecutive_same_start(input) {
  const text = _stripHtml(input.description || "");
  const sentences = splitSentences(text);
  if (sentences.length < 2) {
    return _na(CATEGORIES.READABILITY, "consecutive_same_start", "Tekrarlayan başlangıç");
  }
  let consecutive = 0;
  for (let i = 1; i < sentences.length; i++) {
    if (firstWordOf(sentences[i]) && firstWordOf(sentences[i]) === firstWordOf(sentences[i - 1])) {
      consecutive++;
    }
  }
  if (consecutive === 0) {
    return _check(
      CATEGORIES.READABILITY,
      "consecutive_same_start",
      "Tekrarlayan başlangıç",
      STATUS.PASS,
      "Ardışık aynı kelimeyle başlayan cümle yok",
      null
    );
  }
  return _check(
    CATEGORIES.READABILITY,
    "consecutive_same_start",
    "Tekrarlayan başlangıç",
    STATUS.WARN,
    `${consecutive} ardışık cümle aynı kelimeyle başlıyor`,
    "Cümle başlangıçlarını çeşitlendir"
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 4. Structure (3 check)
// ──────────────────────────────────────────────────────────────────────────

function _check_heading_hierarchy(input) {
  const text = input.description || "";
  const h1Count = (text.match(/<h1[^>]*>/gi) || []).length;
  const h2Count = (text.match(/<h2[^>]*>/gi) || []).length;
  const h3Count = (text.match(/<h3[^>]*>/gi) || []).length;

  if (h1Count > 1) {
    return _check(
      CATEGORIES.STRUCTURE,
      "heading_hierarchy",
      "Başlık hiyerarşisi",
      STATUS.FAIL,
      `${h1Count} adet H1 var (1 olmalı)`,
      "Sadece bir H1 başlık kullan"
    );
  }
  if (h1Count === 0 && h2Count === 0 && h3Count === 0) {
    return _check(
      CATEGORIES.STRUCTURE,
      "heading_hierarchy",
      "Başlık hiyerarşisi",
      STATUS.WARN,
      "İçerikte hiç başlık yok",
      "H2/H3 başlıklarla içeriği bölümlendir"
    );
  }
  return _check(
    CATEGORIES.STRUCTURE,
    "heading_hierarchy",
    "Başlık hiyerarşisi",
    STATUS.PASS,
    `H1: ${h1Count}, H2: ${h2Count}, H3: ${h3Count}`,
    null
  );
}

function _check_image_alt_coverage(input) {
  const text = input.description || "";
  const imgs = text.match(/<img[^>]*>/gi) || [];
  if (imgs.length === 0) {
    return _na(CATEGORIES.STRUCTURE, "image_alt_coverage", "Görsel alt metni");
  }
  const withAlt = imgs.filter((img) => /\salt\s*=\s*['"][^'"]+['"]/.test(img)).length;
  const percent = (withAlt / imgs.length) * 100;
  if (percent >= 80) {
    return _check(
      CATEGORIES.STRUCTURE,
      "image_alt_coverage",
      "Görsel alt metni",
      STATUS.PASS,
      `${withAlt}/${imgs.length} görselde alt text var`,
      null
    );
  }
  return _check(
    CATEGORIES.STRUCTURE,
    "image_alt_coverage",
    "Görsel alt metni",
    STATUS.WARN,
    `Sadece ${withAlt}/${imgs.length} görselde alt text`,
    "Tüm görsellere alt metin ekle"
  );
}

function _check_internal_links(input) {
  const text = input.description || "";
  // İç link: href başlangıçta `/` veya `https://istoc` ile başlar
  const links = text.match(/<a[^>]*href=['"][^'"]+['"]/gi) || [];
  const internal = links.filter((l) => /href=['"](\/(?!\/)|https?:\/\/[^'"]*istoc)/i.test(l));
  if (internal.length >= 1) {
    return _check(
      CATEGORIES.STRUCTURE,
      "internal_links",
      "İç bağlantılar",
      STATUS.PASS,
      `${internal.length} iç link`,
      null
    );
  }
  return _check(
    CATEGORIES.STRUCTURE,
    "internal_links",
    "İç bağlantılar",
    STATUS.WARN,
    "İç link yok",
    "İçerikten ilgili kategori/ürün sayfalarına link ver"
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 5. Technical (3 check)
// ──────────────────────────────────────────────────────────────────────────

function _check_slug_ascii_safe(input) {
  const slug = input.slug || "";
  if (!slug) {
    return _check(
      CATEGORIES.TECHNICAL,
      "slug_ascii_safe",
      "Slug URL-safe",
      STATUS.FAIL,
      "Slug boş",
      "Slug doldurulmalı"
    );
  }
  if (/^[a-z0-9-]+$/.test(slug)) {
    return _check(
      CATEGORIES.TECHNICAL,
      "slug_ascii_safe",
      "Slug URL-safe",
      STATUS.PASS,
      `"${slug}"`,
      null
    );
  }
  return _check(
    CATEGORIES.TECHNICAL,
    "slug_ascii_safe",
    "Slug URL-safe",
    STATUS.FAIL,
    `"${slug}" geçersiz karakter içeriyor`,
    "Sadece küçük harf, rakam ve tire (-) kullan"
  );
}

function _check_og_image_set(input) {
  const og = (input.og_image || "").trim();
  if (og) {
    return _check(
      CATEGORIES.TECHNICAL,
      "og_image_set",
      "OG image",
      STATUS.PASS,
      "OG image set edilmiş",
      null
    );
  }
  return _check(
    CATEGORIES.TECHNICAL,
    "og_image_set",
    "OG image",
    STATUS.WARN,
    "OG image yok (site default kullanılır)",
    "Sosyal medya paylaşımı için özel OG image yükle"
  );
}

function _check_noindex_off(input) {
  if (Number(input.noindex) === 1) {
    return _check(
      CATEGORIES.TECHNICAL,
      "noindex_off",
      "Indekslenebilir",
      STATUS.FAIL,
      "Noindex aktif — arama motorları indekslemez",
      "Arama motorlarında görünmesi için noindex'i kapat"
    );
  }
  return _check(
    CATEGORIES.TECHNICAL,
    "noindex_off",
    "Indekslenebilir",
    STATUS.PASS,
    "Noindex kapalı",
    null
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Helper'lar + ana analyze() fonksiyonu
// ──────────────────────────────────────────────────────────────────────────

function _check(category, id, label, status, message, suggestion) {
  return { category, id, label, status, message, suggestion };
}

function _na(category, id, label) {
  return _check(category, id, label, STATUS.NA, "Geçerli değil", null);
}

/** Basit HTML strip (tag remove). DOMParser yerine regex — Node uyumlu. */
function _stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALL_CHECKERS = [
  _check_keyword_in_title,
  _check_keyword_in_meta_desc,
  _check_keyword_in_slug,
  _check_keyword_in_body,
  _check_keyword_in_image_alt,
  _check_meta_title_length,
  _check_meta_desc_length,
  _check_description_min_length,
  _check_slug_length,
  _check_focus_keyword_set,
  _check_sentence_length,
  _check_paragraph_count,
  _check_transition_words,
  _check_passive_voice,
  _check_consecutive_same_start,
  _check_heading_hierarchy,
  _check_image_alt_coverage,
  _check_internal_links,
  _check_slug_ascii_safe,
  _check_og_image_set,
  _check_noindex_off,
];

/**
 * Ana entry: input → tüm 21 check + skor + kategori breakdown.
 *
 * @param {object} input - {title, meta_title, meta_description, description,
 *                          slug, focus_keyword, primary_image_alt, og_image, noindex}
 * @returns {object} { total, grade, byCategory, checks }
 */
export function analyze(input) {
  const full = { ...DEFAULT_INPUT, ...input };
  const checks = ALL_CHECKERS.map((fn) => fn(full));

  const applicable = checks.filter((c) => c.status !== STATUS.NA);
  const passed = checks.filter((c) => c.status === STATUS.PASS).length;
  const total = applicable.length === 0 ? 0 : Math.round((passed / applicable.length) * 100);

  const grade = total >= 70 ? "iyi" : total >= 40 ? "orta" : "gelistirilmeli";

  const byCategory = {};
  for (const cat of Object.values(CATEGORIES)) {
    const catChecks = checks.filter((c) => c.category === cat);
    const catApplicable = catChecks.filter((c) => c.status !== STATUS.NA);
    const catPassed = catChecks.filter((c) => c.status === STATUS.PASS).length;
    byCategory[cat] = {
      label: CATEGORY_LABELS[cat],
      score: catPassed,
      max: catApplicable.length,
      checks: catChecks,
    };
  }

  return { total, grade, byCategory, checks };
}

// Export sabitler (test + UI için)
export { CATEGORIES, CATEGORY_LABELS, STATUS };
