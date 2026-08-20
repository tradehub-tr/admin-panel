// ÜRETİLMİŞ DOSYA — elle düzenleme. Kaynak: src/lib/media/policy/engine.ts (tipleri silinmiş hâli).
// Yeniden üret: npm run sync:policy · Doğrula: npm test
const ACTION_PASS = "pass";
const ACTION_IGNORE = "ignore";
const ACTION_WARN = "warn";
const ACTION_AUTO_FIX = "auto_fix";
const ACTION_REVIEW = "review";
const ACTION_MANUAL_REVIEW = "manual_review";
const ACTION_REJECT = "reject";
const ACTION_RANK = {
  [ACTION_PASS]: 0,
  [ACTION_IGNORE]: 0,
  [ACTION_WARN]: 1,
  [ACTION_AUTO_FIX]: 2,
  [ACTION_REVIEW]: 3,
  [ACTION_MANUAL_REVIEW]: 3,
  [ACTION_REJECT]: 4
};
const BLOCKING_ACTIONS = /* @__PURE__ */ new Set([ACTION_REVIEW, ACTION_MANUAL_REVIEW, ACTION_REJECT]);
const SILENT_ACTIONS = /* @__PURE__ */ new Set([ACTION_PASS, ACTION_IGNORE]);
function highestAction(actions) {
  let best = ACTION_PASS;
  for (const a of actions) {
    if ((ACTION_RANK[a] ?? 0) > ACTION_RANK[best]) best = a;
  }
  return best;
}
function truthy(v) {
  if (v === null || v === void 0 || v === false || v === "") return false;
  if (typeof v === "number") return v !== 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return true;
}
function asDict(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}
function asList(v) {
  return Array.isArray(v) ? v : [];
}
function pyRound(value, ndigits = 0) {
  if (!Number.isFinite(value)) return value;
  if (Number.isInteger(value)) return value;
  const neg = value < 0;
  const abs = Math.abs(value);
  if (abs >= 1e16) return value;
  const digits = pyRoundDigits(abs, ndigits);
  const out = parseFloat(digits);
  if (out === 0) return 0;
  return neg ? -out : out;
}
function pyRoundDigits(abs, nd) {
  const s = abs.toFixed(80);
  const dot = s.indexOf(".");
  const intPart = s.slice(0, dot);
  const frac = s.slice(dot + 1);
  const keep = frac.slice(0, nd);
  const rest = frac.slice(nd);
  const next = rest[0] ?? "0";
  const restAfter = rest.slice(1);
  let roundUp = false;
  if (next > "5") roundUp = true;
  else if (next === "5") {
    if (/[1-9]/.test(restAfter)) roundUp = true;
    else {
      const base = intPart + keep;
      const last = base[base.length - 1] ?? "0";
      roundUp = (last.charCodeAt(0) - 48) % 2 === 1;
    }
  }
  let arr = (intPart + keep).split("");
  if (roundUp) {
    let i = arr.length - 1;
    while (i >= 0) {
      if (arr[i] === "9") {
        arr[i] = "0";
        i -= 1;
      } else {
        arr[i] = String.fromCharCode(arr[i].charCodeAt(0) + 1);
        break;
      }
    }
    if (i < 0) arr.unshift("1");
  }
  const joined = arr.join("");
  const ip = nd ? joined.slice(0, joined.length - nd) || "0" : joined;
  const fp = nd ? joined.slice(joined.length - nd) : "";
  return fp ? `${ip}.${fp}` : ip;
}
function pyFixed(value, nd) {
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value) && Math.abs(value) < 1e16) {
    return nd ? `${value}.${"0".repeat(nd)}` : String(value);
  }
  return pyRoundDigits(Math.abs(value), nd);
}
function pyFloatStr(x) {
  return Number.isInteger(x) ? x.toFixed(1) : String(x);
}
function pyNum(v) {
  return String(v);
}
function fmt(text, params) {
  return text.replace(
    /\{([A-Za-z0-9_]+)\}/g,
    (_m, key) => Object.prototype.hasOwnProperty.call(params, key) ? params[key] : `{${key}}`
  );
}
function parseRatio(text) {
  const s = String(text ?? "");
  const idx = s.indexOf(":");
  if (idx < 0) return 0;
  const w = Number(s.slice(0, idx));
  const h = Number(s.slice(idx + 1));
  if (!Number.isFinite(w) || !Number.isFinite(h)) return 0;
  return h ? w / h : 0;
}
function ratioStr(value) {
  return pyFixed(value, 3).replace(/0+$/, "").replace(/\.$/, "");
}
const MESSAGE_KEYS = {
  short_edge_too_small: ["short_edge_too_small", "too_small", "cozunurluk_dusuk"],
  short_edge_too_large: ["short_edge_too_large"],
  long_edge_too_large: ["long_edge_too_large", "max_edge_exceeded"],
  area_too_small: ["area_too_small"],
  ratio_not_allowed: ["ratio_not_allowed", "oran_16_9_degil"],
  aspect_out_of_band: ["aspect_out_of_band"],
  too_many_pixels: ["too_many_pixels"],
  too_large_bytes: ["too_large_bytes", "too_large", "cok_buyuk"],
  format_not_supported: ["format_not_supported", "bicim_desteklenmiyor"],
  mime_not_supported: ["mime_not_supported", "format_not_supported"],
  extension_rejected: ["extension_rejected", "format_not_supported"],
  extension_conditional_closed: ["svg_dtd_forbidden", "format_not_supported"],
  animated: ["animated", "format_animated"],
  unreadable: ["unreadable", "ffprobe_okunamadi"],
  truncated: ["unreadable"],
  data_uri_forbidden: ["data_uri_forbidden"],
  content_type_mismatch: ["content_type_mismatch"],
  container_invalid: ["container_invalid"],
  executable_content: ["executable_content"],
  appended_payload: ["appended_payload"],
  low_resolution: ["low_resolution"],
  master_under_spec: ["master_under_spec"],
  too_many_items: ["too_many_items"],
  too_few_items: ["too_few_items"],
  duration_too_long: ["sure_uzun", "duration_too_long"],
  duration_too_short: ["duration_too_short"],
  bitrate_too_high: ["bitrate_isleniyor", "bitrate_too_high"],
  frame_rate_not_allowed: ["frame_rate_not_allowed"],
  role_not_allowed: ["role_not_allowed"]
};
const FALLBACK = {
  short_edge_too_small: {
    tr: "K\u0131sa kenar {kisa_kenar} piksel; en az {gerekli_kisa_kenar} piksel gerekiyor.",
    en: "Short edge is {kisa_kenar}px; at least {gerekli_kisa_kenar}px is required.",
    hint_tr: "Orijinal (k\u0131rp\u0131lmam\u0131\u015F, s\u0131k\u0131\u015Ft\u0131r\u0131lmam\u0131\u015F) dosyay\u0131 y\xFCkleyin.",
    hint_en: "Upload the original file instead of a resized or messaging-app copy."
  },
  short_edge_too_large: {
    tr: "K\u0131sa kenar {kisa_kenar} piksel; \xFCst s\u0131n\u0131r {gerekli_kisa_kenar} piksel.",
    en: "Short edge is {kisa_kenar}px; the maximum is {gerekli_kisa_kenar}px.",
    hint_tr: "Dosyay\u0131 y\xFCklemeden \xF6nce k\xFC\xE7\xFClt\xFCn.",
    hint_en: "Downscale the file before uploading."
  },
  long_edge_too_large: {
    tr: "Uzun kenar {uzun_kenar} piksel; \xFCst s\u0131n\u0131r {gerekli_uzun_kenar} piksel.",
    en: "Long edge is {uzun_kenar}px; the maximum is {gerekli_uzun_kenar}px.",
    hint_tr: "Uzun kenar\u0131 {gerekli_uzun_kenar} piksele indirip yeniden y\xFCkleyin.",
    hint_en: "Resize the long edge down to {gerekli_uzun_kenar}px and upload again."
  },
  area_too_small: {
    tr: "Toplam piksel alan\u0131 {mp} MP; en az {max_mp} MP gerekiyor.",
    en: "Total pixel area is {mp} MP; at least {max_mp} MP is required.",
    hint_tr: "Ekran g\xF6r\xFCnt\xFCs\xFC de\u011Fil, orijinal foto\u011Fraf dosyas\u0131n\u0131 y\xFCkleyin.",
    hint_en: "Upload the original photo, not a screenshot or thumbnail."
  },
  ratio_not_allowed: {
    tr: "En-boy oran\u0131 {oran}; kabul edilen oranlar {izinli_oranlar}.",
    en: "Aspect ratio is {oran}; accepted ratios are {izinli_oranlar}.",
    hint_tr: "G\xF6rseli izinli oranlardan birine k\u0131rp\u0131n; bo\u015Flu\u011Fu d\xFCz renkle tamamlamak da ge\xE7erlidir.",
    hint_en: "Crop to one of the accepted ratios, or pad with a flat background colour."
  },
  aspect_out_of_band: {
    tr: "Oran band\u0131 d\u0131\u015F\u0131nda ({oran}); izinli bant {izinli_oranlar}.",
    en: "Aspect ratio {oran} is outside the accepted band {izinli_oranlar}.",
    hint_tr: "Geni\u015F bir kelime markan\u0131z varsa kare (simge) s\xFCr\xFCm\xFCn\xFC y\xFCkleyin.",
    hint_en: "If you have a wide wordmark, upload its square (icon) variant instead."
  },
  too_many_pixels: {
    tr: "G\xF6rsel {mp} MP; i\u015Flenebilir \xFCst s\u0131n\u0131r {max_mp} MP.",
    en: "Image is {mp} MP; the processable maximum is {max_mp} MP.",
    hint_tr: "Uzun kenar\u0131 {gerekli_uzun_kenar} piksele indirip yeniden y\xFCkleyin.",
    hint_en: "Downscale the long edge to {gerekli_uzun_kenar}px and upload again."
  },
  too_large_bytes: {
    tr: "Dosya {mb} MB; bu slot i\xE7in \xFCst s\u0131n\u0131r {max_mb} MB.",
    en: "File is {mb} MB; the limit for this slot is {max_mb} MB.",
    hint_tr: "JPEG veya WebP olarak kaydedin; bu slotta {max_mb} MB alt\u0131 beklenir.",
    hint_en: "Save as JPEG or WebP; this slot expects under {max_mb} MB."
  },
  format_not_supported: {
    tr: "{bicim} bi\xE7imi bu slotta kabul edilmiyor. Kabul edilenler: {izinli_bicimler}.",
    en: "Format {bicim} is not accepted here. Accepted: {izinli_bicimler}.",
    hint_tr: "Dosyay\u0131 {izinli_bicimler} bi\xE7imlerinden birine d\xF6n\xFC\u015Ft\xFCr\xFCp y\xFCkleyin.",
    hint_en: "Convert the file to one of {izinli_bicimler} and upload again."
  },
  mime_not_supported: {
    tr: "Dosya t\xFCr\xFC ({bicim}) bu slotta kabul edilmiyor.",
    en: "Content type ({bicim}) is not accepted in this slot.",
    hint_tr: "Kabul edilen t\xFCrler: {izinli_bicimler}.",
    hint_en: "Accepted types: {izinli_bicimler}."
  },
  extension_rejected: {
    tr: "{bicim} uzant\u0131s\u0131 bu slotta a\xE7\u0131k\xE7a reddediliyor.",
    en: "Extension {bicim} is explicitly rejected in this slot.",
    hint_tr: "Kabul edilen uzant\u0131lar: {izinli_bicimler}.",
    hint_en: "Accepted extensions: {izinli_bicimler}."
  },
  extension_conditional_closed: {
    tr: "{bicim} uzant\u0131s\u0131 yaln\u0131z ko\u015Fullu kabul ediliyor ve ko\u015Ful bug\xFCn a\xE7\u0131k de\u011Fil.",
    en: "Extension {bicim} is only conditionally accepted, and the condition is not met.",
    hint_tr: "Dosyay\u0131 PNG veya WebP olarak d\u0131\u015Fa aktar\u0131p y\xFCkleyin.",
    hint_en: "Export the file as PNG or WebP and upload that instead."
  },
  animated: {
    tr: "Hareketli g\xF6rsel bu slotta kullan\u0131lamaz.",
    en: "Animated images are not allowed in this slot.",
    hint_tr: "Tek kareli bir g\xF6rsel y\xFCkleyin; hareket i\xE7in video alan\u0131n\u0131 kullan\u0131n.",
    hint_en: "Upload a single-frame image; use the video field for motion."
  },
  unreadable: {
    tr: "Dosya bir medya dosyas\u0131 olarak a\xE7\u0131lamad\u0131.",
    en: "The file could not be opened as a media file.",
    hint_tr: "Dosyay\u0131 a\xE7\u0131p g\xF6r\xFCnt\xFClenebildi\u011Fini do\u011Frulay\u0131n, 'Farkl\u0131 kaydet' ile yeniden kaydedin.",
    hint_en: "Open the file to confirm it renders, then re-save it and upload again."
  },
  truncated: {
    tr: "Dosya eksik aktar\u0131lm\u0131\u015F; ba\u015Fl\u0131\u011F\u0131 sa\u011Flam ama verisi kesik.",
    en: "The file is truncated: the header is intact but the pixel data is incomplete.",
    hint_tr: "Y\xFCklemeyi tekrarlay\u0131n; sorun s\xFCrerse dosyay\u0131 yeniden d\u0131\u015Fa aktar\u0131n.",
    hint_en: "Retry the upload; if it persists, re-export the file."
  },
  data_uri_forbidden: {
    tr: "G\xF6m\xFCl\xFC veri (data: URI) kabul edilmiyor; dosya olarak y\xFCkleyin.",
    en: "Embedded data (data: URI) is not accepted; upload an actual file.",
    hint_tr: "G\xF6rseli diske kaydedip dosya se\xE7icisinden y\xFCkleyin.",
    hint_en: "Save the image to disk and upload it through the file picker."
  },
  content_type_mismatch: {
    tr: "Dosya uzant\u0131s\u0131 i\xE7eri\u011Fiyle uyu\u015Fmuyor (uzant\u0131 {bicim}, i\xE7erik {gercek}).",
    en: "The extension does not match the content (extension {bicim}, content {gercek}).",
    hint_tr: "Dosyay\u0131 ger\xE7ek bi\xE7imine uygun uzant\u0131yla yeniden kaydedin.",
    hint_en: "Re-save the file with the extension matching its real format."
  },
  container_invalid: {
    tr: "Dosyan\u0131n i\xE7i beklenen belge yap\u0131s\u0131nda de\u011Fil.",
    en: "The file's internal structure is not the expected document format.",
    hint_tr: "Belgeyi kaynak program\u0131ndan yeniden d\u0131\u015Fa aktar\u0131n.",
    hint_en: "Re-export the document from its source application."
  },
  executable_content: {
    tr: "Dosya \xE7al\u0131\u015Ft\u0131r\u0131labilir ya da betik i\xE7erik ta\u015F\u0131yor.",
    en: "The file carries executable or script content.",
    hint_tr: "Yaln\u0131z g\xF6rsel/belge dosyas\u0131 y\xFCkleyin.",
    hint_en: "Upload an image or document file only."
  },
  appended_payload: {
    tr: "G\xF6rselin sonuna dosya d\u0131\u015F\u0131 i\xE7erik eklenmi\u015F.",
    en: "Content has been appended after the end of the image data.",
    hint_tr: "G\xF6rseli bir d\xFCzenleyicide a\xE7\u0131p 'Farkl\u0131 kaydet' ile temiz bir kopya \xFCretin.",
    hint_en: "Open the image in an editor and re-save it to produce a clean copy."
  },
  low_resolution: {
    tr: "\xC7\xF6z\xFCn\xFCrl\xFCk d\xFC\u015F\xFCk ({w}\xD7{h}); \xF6nerilen en az {gerekli_kisa_kenar} piksel.",
    en: "Resolution is low ({w}\xD7{h}); at least {gerekli_kisa_kenar}px is recommended.",
    hint_tr: "Bu bir engel de\u011Fil \u2014 dosya kaydedildi.",
    hint_en: "This is not blocking \u2014 the file was saved."
  },
  master_under_spec: {
    tr: "Uzun kenar {uzun_kenar} piksel; tam kalite i\xE7in {gerekli_uzun_kenar} piksel \xF6neriliyor.",
    en: "Long edge is {uzun_kenar}px; {gerekli_uzun_kenar}px is recommended for full quality.",
    hint_tr: "G\xF6rsel kabul edildi; b\xFCy\xFCtme yap\u0131lmaz, yak\u0131nla\u015Ft\u0131rmada yumu\u015Fak g\xF6r\xFCnebilir.",
    hint_en: "Accepted as-is; no upscaling is performed, so zoom may look soft."
  },
  too_many_items: {
    tr: "Bu slotta en fazla {max_adet} dosya olabilir; \u015Fu an {adet} var.",
    en: "This slot accepts at most {max_adet} files; {adet} are present.",
    hint_tr: "\xD6nce mevcut dosyalardan silin.",
    hint_en: "Remove an existing file first."
  },
  too_few_items: {
    tr: "Bu slot en az {min_adet} dosya ister; \u015Fu an {adet} var.",
    en: "This slot requires at least {min_adet} files; {adet} are present.",
    hint_tr: "Eksik dosyalar\u0131 y\xFCkleyin.",
    hint_en: "Upload the missing files."
  },
  duration_too_long: {
    tr: "Video {sure} saniye; \xFCst s\u0131n\u0131r {max_sure} saniye.",
    en: "The video is {sure}s long; the maximum is {max_sure}s.",
    hint_tr: "S\xFCreyi k\u0131saltmak dosyay\u0131 k\xFC\xE7\xFCltmenin en etkili yoludur.",
    hint_en: "Trimming the duration is the most effective way to shrink the file."
  },
  duration_too_short: {
    tr: "Video {sure} saniye; en az {min_sure} saniye gerekiyor.",
    en: "The video is {sure}s long; at least {min_sure}s is required.",
    hint_tr: "Daha uzun bir \xE7ekim y\xFCkleyin.",
    hint_en: "Upload a longer clip."
  },
  bitrate_too_high: {
    tr: "Bit h\u0131z\u0131 {bitrate} kbps; tavan {max_bitrate} kbps \u2014 sunucuda yeniden s\u0131k\u0131\u015Ft\u0131r\u0131lacak.",
    en: "Bitrate is {bitrate} kbps; the cap is {max_bitrate} kbps \u2014 it will be re-encoded.",
    hint_tr: "Y\xFCkleme kabul edildi; i\u015Flem arka planda tamamlan\u0131yor.",
    hint_en: "The upload was accepted; processing continues in the background."
  },
  frame_rate_not_allowed: {
    tr: "Kare h\u0131z\u0131 {fps}; kabul edilenler {izinli_fps} \u2014 {max_fps} fps'e indirilecek.",
    en: "Frame rate is {fps}; accepted are {izinli_fps} \u2014 it will be capped at {max_fps} fps.",
    hint_tr: "Y\xFCkleme kabul edildi.",
    hint_en: "The upload was accepted."
  },
  role_not_allowed: {
    tr: "'{rol}' rol\xFC bu slota dosya y\xFCkleyemez.",
    en: "Role '{rol}' is not allowed to upload to this slot.",
    hint_tr: "Yetkili bir hesapla deneyin.",
    hint_en: "Try again with an authorised account."
  },
  no_alpha_channel: {
    tr: "Dosya saydam zeminli de\u011Fil.",
    en: "The file has no transparent background.",
    hint_tr: "Saydam zeminli PNG ya da WebP olarak yeniden kaydedip y\xFCkleyin; bu bir engel de\u011Fil.",
    hint_en: "Re-save as PNG or WebP with transparency; this is a warning, not a block."
  },
  frame_width: {
    tr: "Video geni\u015Fli\u011Fi {w} piksel; sunucu {max_genislik} piksele k\xFC\xE7\xFCltecek.",
    en: "Video width is {w}px; the server will downscale it to {max_genislik}px.",
    hint_tr: "Y\xFCkleme kabul edildi; i\u015Flem arka planda tamamlan\u0131yor.",
    hint_en: "The upload was accepted; processing continues in the background."
  },
  bitrate_bps: {
    tr: "Bit h\u0131z\u0131 y\xFCksek; sunucuda yeniden s\u0131k\u0131\u015Ft\u0131r\u0131lacak.",
    en: "The bitrate is high; the file will be re-encoded on the server.",
    hint_tr: "Y\xFCkleme kabul edildi; haz\u0131r olunca sayfada g\xF6r\xFCnecek.",
    hint_en: "The upload was accepted; it will appear once processing finishes."
  },
  duration_seconds: {
    tr: "Video s\xFCresi uzun.",
    en: "The video duration is long.",
    hint_tr: "S\xFCreyi k\u0131saltmak dosyay\u0131 k\xFC\xE7\xFCltmenin en etkili yoludur.",
    hint_en: "Trimming the duration is the most effective way to shrink the file."
  },
  is_private: {
    tr: "Dosya gizli (private) kaydedildi; sunucu s\u0131k\u0131\u015Ft\u0131rma ad\u0131m\u0131 atlan\u0131r.",
    en: "The file was stored as private; the server compression step is skipped.",
    hint_tr: "Bu slota herkese a\xE7\u0131k (public) y\xFCkleyin.",
    hint_en: "Upload to this slot as public instead."
  },
  ffprobe_readable: {
    tr: "Dosyan\u0131n teknik bilgileri okunamad\u0131.",
    en: "The file's technical metadata could not be read.",
    hint_tr: "Dosya bozuk olabilir; kaynak program\u0131ndan yeniden d\u0131\u015Fa aktar\u0131n.",
    hint_en: "The file may be corrupt; re-export it from its source application."
  },
  _default: {
    tr: "Kural ihlali: {kural}.",
    en: "Policy violation: {kural}.",
    hint_tr: "Ayr\u0131nt\u0131 i\xE7in slot kurallar\u0131na bak\u0131n; dosyay\u0131 d\xFCzeltip yeniden y\xFCkleyin.",
    hint_en: "See the slot rules for details, then fix the file and upload again."
  }
};
const PROBE_DEFAULTS = {
  filename: "",
  extension: "",
  byte_size: 0,
  sha256: "",
  kind: "unknown",
  detected: "",
  mime: "",
  fmt: "",
  width: 0,
  height: 0,
  exif_orientation: null,
  mode: "",
  has_alpha: null,
  animated: null,
  dpi: null,
  has_icc: null,
  readable: false,
  loadable: null,
  extension_matches_content: null,
  leading_marker: null,
  appended_payload: null,
  container_valid: null,
  is_data_uri: null,
  duration_s: null,
  bitrate_bps: null,
  frame_rate: null,
  has_audio: null,
  audio_codec: "",
  video_codec: "",
  existing_count: null,
  is_private: null,
  scan_clean: null,
  extra: {}
};
const KIND_VIDEO = "video";
function normalizeProbe(input) {
  const out = { ...PROBE_DEFAULTS };
  for (const key of Object.keys(PROBE_DEFAULTS)) {
    if (Object.prototype.hasOwnProperty.call(input, key)) out[key] = input[key];
  }
  return out;
}
function displaySize(p) {
  if (p.exif_orientation !== null && [5, 6, 7, 8].includes(Number(p.exif_orientation))) {
    return [p.height, p.width];
  }
  return [p.width, p.height];
}
function megapixels(p) {
  return p.width * p.height / 1e6;
}
function skipped(rule, block, missing) {
  return { rule, block, reason: "not_measurable", missing_input: missing };
}
class PolicyNotFoundError extends Error {
}
const CONTENT_METRICS = {
  animated: "animated",
  unreadable: "_unreadable",
  ffprobe_readable: "readable",
  no_alpha_channel: "_no_alpha",
  frame_width: "width",
  bitrate_bps: "bitrate_bps",
  duration_seconds: "duration_s",
  is_private: "is_private"
};
class PolicyEngine {
  constructor(policies, options = {}) {
    this.policies = {};
    const list = Array.isArray(policies) ? policies : Object.values(policies);
    for (const p of list) {
      const key = String(p.slot_key ?? "");
      if (!key) throw new Error("slot_key yok: politika kay\u0131t defterine giremez");
      if (key in this.policies) throw new Error(`slot_key iki kez: ${key}`);
      this.policies[key] = p;
    }
    this.floatReprs = options.floatReprs ?? {};
  }
  slots() {
    return Object.keys(this.policies).sort();
  }
  get(slot) {
    const p = this.policies[slot];
    if (!p) {
      throw new PolicyNotFoundError(
        `Bilinmeyen slot: '${slot}'. Tan\u0131ml\u0131 slotlar: ${this.slots().join(", ")}`
      );
    }
    return p;
  }
  // ── genel yardımcılar ────────────────────────────────────────────
  actionFor(policy, block) {
    const ov = asDict(policy.on_violation);
    const v = truthy(ov[block]) ? ov[block] : truthy(ov.default) ? ov.default : ACTION_REJECT;
    return String(v);
  }
  code(policy, rule) {
    const ov = asDict(policy.on_violation);
    const prefix = truthy(ov.error_code_prefix) ? String(ov.error_code_prefix) : "media";
    return `${prefix}_${rule}`;
  }
  /**
   * Politika değerinin Python `str()`/f-string karşılığı.
   * `path` FLOAT_REPRS anahtarıdır (ör. "require.aspect_band.max_w_over_h").
   */
  polStr(slot, path, value) {
    if (value === null || value === void 0) return "None";
    if (typeof value === "number") {
      const r = this.floatReprs[slot]?.[path];
      if (r !== void 0) return r;
      return pyNum(value);
    }
    return String(value);
  }
  /** Python `dict.get(key, "")` + format: anahtar YOKSA boş dizge. */
  polParam(slot, block, key, path) {
    if (!Object.prototype.hasOwnProperty.call(block, key)) return "";
    return this.polStr(slot, path, block[key]);
  }
  message(policy, rule, params) {
    let tr = "";
    const policyTr = asDict(asDict(policy.messages).tr);
    for (const key of MESSAGE_KEYS[rule] ?? [rule]) {
      if (truthy(policyTr[key])) {
        tr = String(policyTr[key]);
        break;
      }
    }
    const cat = FALLBACK[rule] ?? FALLBACK._default;
    if (!tr) tr = cat.tr;
    const message = { tr: fmt(tr, params), en: fmt(cat.en, params) };
    const hint = {
      tr: fmt(cat.hint_tr ?? "", params),
      en: fmt(cat.hint_en ?? "", params)
    };
    return [message, hint];
  }
  violation(policy, opts) {
    const params = { ...opts.params };
    if (!Object.prototype.hasOwnProperty.call(params, "kural")) params.kural = opts.rule;
    const [message, hint] = this.message(policy, opts.rule, params);
    return {
      code: this.code(policy, opts.rule),
      rule: opts.rule,
      block: opts.block,
      action: opts.action ?? this.actionFor(policy, opts.block),
      message,
      hint,
      observed: opts.observed ?? null,
      expected: opts.expected ?? null,
      retryable: false,
      source: opts.source ?? ""
    };
  }
  // ── giriş noktası ────────────────────────────────────────────────
  evaluate(slot, probeInput, role = "") {
    const probe = normalizeProbe(probeInput);
    const policy = this.get(slot);
    const violations = [];
    const skippedRules = [];
    const p = this.params(slot, policy, probe, role);
    this.checkRole(policy, role, p, violations);
    this.checkSecurity(policy, probe, p, violations, skippedRules);
    this.checkAccept(slot, policy, probe, p, violations, skippedRules);
    this.checkRequire(slot, policy, probe, p, violations, skippedRules);
    this.checkVideo(slot, policy, probe, p, violations, skippedRules);
    this.checkMaster(slot, policy, probe, p, violations);
    this.checkContentRules(policy, probe, p, violations, skippedRules);
    const shown = violations.filter((v) => !SILENT_ACTIONS.has(v.action));
    const action = shown.length ? highestAction(shown.map((v) => v.action)) : ACTION_PASS;
    const allow = !shown.some((v) => BLOCKING_ACTIONS.has(v.action));
    const targets = allow ? this.normalizedTargets(policy, probe) : {};
    return {
      allow,
      slot,
      role,
      action,
      violations: shown,
      normalized_targets: targets,
      skipped: skippedRules,
      policy_version: String(policy.schema_version ?? ""),
      policy_status: String(policy.status ?? "")
    };
  }
  // ── mesaj değişkenleri (engine.py _params aynası) ────────────────
  params(slot, policy, probe, role) {
    const accept = asDict(policy.accept);
    const require2 = asDict(policy.require);
    const master = asDict(policy.master);
    const [w, h] = displaySize(probe);
    const izinli = asList(accept.extensions);
    const izinliOranlar = asList(require2.allowed_ratios).map(String);
    const fr = probe.frame_rate;
    let fps = "-";
    if (truthy(fr)) {
      const v = pyRound(fr, 2);
      fps = Number.isInteger(fr) ? String(v) : pyFloatStr(v);
    }
    return {
      rol: role || "-",
      w: String(w),
      h: String(h),
      kisa_kenar: String(w && h ? Math.min(w, h) : 0),
      uzun_kenar: String(w && h ? Math.max(w, h) : 0),
      gerekli_kisa_kenar: this.polParam(slot, require2, "min_short_edge", "require.min_short_edge"),
      gerekli_uzun_kenar: this.polParam(slot, master, "max_long_edge", "master.max_long_edge"),
      mp: pyFloatStr(pyRound(megapixels(probe), 2)),
      max_mp: this.polParam(slot, accept, "max_megapixels_hard", "accept.max_megapixels_hard"),
      mb: pyFloatStr(pyRound(probe.byte_size / 1048576, 2)),
      max_mb: pyFloatStr(
        pyRound((truthy(accept.max_bytes) ? accept.max_bytes : 0) / 1048576, 2)
      ),
      oran: h ? ratioStr(w / h) : "-",
      izinli_oranlar: izinliOranlar.join(", ") || "-",
      bicim: probe.extension || probe.fmt || probe.detected || "-",
      gercek: probe.detected || "-",
      izinli_bicimler: izinli.map(String).join(", ") || "-",
      adet: probe.existing_count !== null && probe.existing_count !== void 0 ? String(probe.existing_count) : "-",
      max_adet: this.polParam(slot, require2, "max_count", "require.max_count"),
      min_adet: this.polParam(slot, require2, "min_count", "require.min_count"),
      sure: probe.duration_s !== null && probe.duration_s !== void 0 ? String(probe.duration_s) : "-",
      bitrate: truthy(probe.bitrate_bps) ? String(Math.trunc(probe.bitrate_bps / 1e3)) : "-",
      fps,
      max_genislik: this.polParam(slot, master, "max_long_edge", "master.max_long_edge")
    };
  }
  // ── bloklar ──────────────────────────────────────────────────────
  checkRole(policy, role, p, out) {
    const roles = asList(policy.roles).map(String);
    if (role && roles.length && !roles.includes(role)) {
      out.push(
        this.violation(policy, {
          rule: "role_not_allowed",
          block: "policy",
          params: p,
          observed: role,
          expected: roles,
          action: ACTION_REJECT,
          source: "policy.roles"
        })
      );
    }
  }
  checkSecurity(policy, probe, p, out, skips) {
    const block = "accept";
    if (truthy(probe.leading_marker)) {
      out.push(
        this.violation(policy, {
          rule: "executable_content",
          block,
          params: p,
          observed: "leading_marker",
          action: ACTION_REJECT,
          source: "core/probe.py DANGEROUS_MARKERS (upload_policy.py:187 aynas\u0131)"
        })
      );
    }
    if (probe.detected === "executable") {
      out.push(
        this.violation(policy, {
          rule: "executable_content",
          block,
          params: p,
          observed: probe.detected,
          action: ACTION_REJECT,
          source: "core/probe.py sniff() MZ/ELF"
        })
      );
    }
    if (truthy(probe.appended_payload)) {
      out.push(
        this.violation(policy, {
          rule: "appended_payload",
          block,
          params: p,
          observed: "appended_payload",
          action: ACTION_REJECT,
          source: "\xDCRET\u0130MDE YOK: upload_policy.is_dangerous() yaln\u0131z dosya ba\u015F\u0131na bak\u0131yor"
        })
      );
    }
    if (probe.container_valid === false) {
      out.push(
        this.violation(policy, {
          rule: "container_invalid",
          block,
          params: p,
          observed: probe.detected,
          action: ACTION_REJECT,
          source: "kyb.py:46-53 referans uygulamas\u0131"
        })
      );
    }
    if (probe.scan_clean === false) {
      out.push(
        this.violation(policy, {
          rule: "executable_content",
          block,
          params: p,
          observed: "av_scan",
          action: ACTION_REJECT,
          source: "tradehub_core/media/av.py karantina sonucu"
        })
      );
    } else if (probe.scan_clean === null || probe.scan_clean === void 0) {
      skips.push(skipped("av_scan", block, "scan_clean"));
    }
  }
  checkAccept(slot, policy, probe, p, out, skips) {
    const accept = asDict(policy.accept);
    const block = "accept";
    const ext = (probe.extension || "").toLowerCase();
    const rejected = asList(accept.rejected_extensions).map((e) => String(e).toLowerCase());
    const allowed = asList(accept.extensions).map((e) => String(e).toLowerCase());
    const conditional = asList(accept.conditional_extensions).map(
      (e) => String(e).toLowerCase()
    );
    if (ext && rejected.includes(ext)) {
      out.push(
        this.violation(policy, {
          rule: "extension_rejected",
          block,
          params: p,
          observed: ext,
          expected: allowed,
          action: ACTION_REJECT,
          source: "accept.rejected_extensions"
        })
      );
    } else if (ext && conditional.includes(ext) && !allowed.includes(ext)) {
      if (!conditionalOpen(policy, ext)) {
        out.push(
          this.violation(policy, {
            rule: "extension_conditional_closed",
            block,
            params: p,
            observed: ext,
            expected: allowed,
            action: ACTION_REJECT,
            source: "accept.conditional_extensions + logo.svg_policy.enabled"
          })
        );
      }
    } else if (ext && allowed.length && !allowed.includes(ext)) {
      out.push(
        this.violation(policy, {
          rule: "format_not_supported",
          block,
          params: p,
          observed: ext,
          expected: allowed,
          source: "accept.extensions"
        })
      );
    }
    const mimes = asList(accept.mime).map(String);
    if (probe.mime && mimes.length && !mimes.includes(probe.mime)) {
      out.push(
        this.violation(policy, {
          rule: "mime_not_supported",
          block,
          params: p,
          observed: probe.mime,
          expected: mimes,
          source: "accept.mime"
        })
      );
    } else if (!probe.mime && mimes.length) {
      skips.push(skipped("mime", block, "mime"));
    }
    if (probe.extension_matches_content === false) {
      out.push(
        this.violation(policy, {
          rule: "content_type_mismatch",
          block,
          params: p,
          observed: probe.detected,
          expected: ext,
          action: ACTION_REJECT,
          source: "FR-009 magic_byte_matches_extension"
        })
      );
    }
    let maxBytes = accept.max_bytes;
    if (ext === ".svg" && truthy(accept.max_bytes_svg)) {
      maxBytes = accept.max_bytes_svg;
    }
    if (truthy(maxBytes) && probe.byte_size > maxBytes) {
      const pp = { ...p, max_mb: pyFloatStr(pyRound(maxBytes / 1048576, 2)) };
      out.push(
        this.violation(policy, {
          rule: "too_large_bytes",
          block,
          params: pp,
          observed: probe.byte_size,
          expected: maxBytes,
          source: "accept.max_bytes"
        })
      );
    }
    const hardMp = accept.max_megapixels_hard;
    if (truthy(hardMp) && probe.width && probe.height && megapixels(probe) > hardMp) {
      out.push(
        this.violation(policy, {
          rule: "too_many_pixels",
          block,
          params: p,
          observed: pyRound(megapixels(probe), 3),
          expected: hardMp,
          source: "accept.max_megapixels_hard"
        })
      );
    }
    const allowAnimated = Object.prototype.hasOwnProperty.call(accept, "allow_animated") ? accept.allow_animated : false;
    if (truthy(probe.animated) && !truthy(allowAnimated)) {
      out.push(
        this.violation(policy, {
          rule: "animated",
          block,
          params: p,
          observed: true,
          expected: false,
          source: "accept.allow_animated"
        })
      );
    }
    if (truthy(probe.is_data_uri) && accept.allow_data_uri === false) {
      out.push(
        this.violation(policy, {
          rule: "data_uri_forbidden",
          block,
          params: p,
          observed: true,
          expected: false,
          action: ACTION_REJECT,
          source: "accept.allow_data_uri"
        })
      );
    }
    if (!truthy(probe.readable)) {
      out.push(
        this.violation(policy, {
          rule: "unreadable",
          block,
          params: p,
          observed: false,
          expected: true,
          action: ACTION_REJECT,
          source: "engine.probe(readable=False)"
        })
      );
    } else if (probe.loadable === false) {
      out.push(
        this.violation(policy, {
          rule: "truncated",
          block,
          params: p,
          observed: false,
          expected: true,
          action: ACTION_REJECT,
          source: "\xD6L\xC7\xDCLD\xDC: engine.probe True der, optimize OSError ile d\xFC\u015Fer"
        })
      );
    }
  }
  checkRequire(slot, policy, probe, p, out, skips) {
    const require2 = asDict(policy.require);
    const block = "require";
    const [w, h] = displaySize(probe);
    if (!(w && h)) {
      skips.push(skipped("geometry", block, "width/height"));
      this.checkCounts(policy, probe, p, out, skips);
      return;
    }
    const short = Math.min(w, h);
    const long = Math.max(w, h);
    if (truthy(require2.min_short_edge) && short < require2.min_short_edge) {
      out.push(
        this.violation(policy, {
          rule: "short_edge_too_small",
          block,
          params: p,
          observed: short,
          expected: require2.min_short_edge,
          source: "require.min_short_edge"
        })
      );
    } else if (truthy(require2.low_resolution_warn_below) && short < require2.low_resolution_warn_below) {
      const pp = {
        ...p,
        gerekli_kisa_kenar: this.polStr(
          slot,
          "require.low_resolution_warn_below",
          require2.low_resolution_warn_below
        )
      };
      out.push(
        this.violation(policy, {
          rule: "low_resolution",
          block,
          params: pp,
          observed: short,
          expected: require2.low_resolution_warn_below,
          action: ACTION_WARN,
          source: "require.low_resolution_warn_below"
        })
      );
    }
    if (truthy(require2.max_short_edge) && short > require2.max_short_edge) {
      const pp = {
        ...p,
        gerekli_kisa_kenar: this.polStr(slot, "require.max_short_edge", require2.max_short_edge)
      };
      out.push(
        this.violation(policy, {
          rule: "short_edge_too_large",
          block,
          params: pp,
          observed: short,
          expected: require2.max_short_edge,
          source: "require.max_short_edge"
        })
      );
    }
    if (truthy(require2.max_edge) && long > require2.max_edge) {
      const pp = {
        ...p,
        gerekli_uzun_kenar: this.polStr(slot, "require.max_edge", require2.max_edge)
      };
      out.push(
        this.violation(policy, {
          rule: "long_edge_too_large",
          block,
          params: pp,
          observed: long,
          expected: require2.max_edge,
          source: "require.max_edge"
        })
      );
    }
    if (truthy(require2.min_area) && w * h < require2.min_area) {
      const pp = {
        ...p,
        max_mp: pyFloatStr(pyRound(require2.min_area / 1e6, 3))
      };
      out.push(
        this.violation(policy, {
          rule: "area_too_small",
          block,
          params: pp,
          observed: w * h,
          expected: require2.min_area,
          source: "require.min_area"
        })
      );
    }
    const ratios = asList(require2.allowed_ratios).map(String);
    if (ratios.length) {
      const tolRaw = require2.ratio_tolerance;
      const tol = tolRaw === null || tolRaw === void 0 ? 0 : Number(tolRaw);
      const gercek = w / h;
      let enYakin = Infinity;
      for (const r of ratios) {
        const v = parseRatio(r);
        if (v) enYakin = Math.min(enYakin, Math.abs(gercek - v) / v);
      }
      if (enYakin > tol) {
        out.push(
          this.violation(policy, {
            rule: "ratio_not_allowed",
            block,
            params: p,
            observed: pyRound(gercek, 4),
            expected: ratios,
            source: "require.allowed_ratios + ratio_tolerance"
          })
        );
      }
    }
    const band = asDict(require2.aspect_band);
    if (truthy(band)) {
      const gercek = w / h;
      const alt = Object.prototype.hasOwnProperty.call(band, "min_w_over_h") ? band.min_w_over_h : null;
      const ust = Object.prototype.hasOwnProperty.call(band, "max_w_over_h") ? band.max_w_over_h : null;
      const altAsili = alt !== null && alt !== void 0 && gercek < alt;
      const ustAsili = ust !== null && ust !== void 0 && gercek > ust;
      if (altAsili || ustAsili) {
        const pp = {
          ...p,
          izinli_oranlar: `${this.polStr(slot, "require.aspect_band.min_w_over_h", alt)}\u2013${this.polStr(slot, "require.aspect_band.max_w_over_h", ust)}`
        };
        out.push(
          this.violation(policy, {
            rule: "aspect_out_of_band",
            block,
            params: pp,
            observed: pyRound(gercek, 4),
            expected: [alt ?? null, ust ?? null],
            source: "require.aspect_band"
          })
        );
      }
    }
    this.checkCounts(policy, probe, p, out, skips);
  }
  checkCounts(policy, probe, p, out, skips) {
    const require2 = asDict(policy.require);
    const block = "require";
    if (probe.existing_count === null || probe.existing_count === void 0) {
      if (truthy(require2.max_count) || truthy(require2.min_count)) {
        skips.push(skipped("count", block, "existing_count"));
      }
      return;
    }
    if (truthy(require2.max_count) && probe.existing_count > require2.max_count) {
      out.push(
        this.violation(policy, {
          rule: "too_many_items",
          block,
          params: p,
          observed: probe.existing_count,
          expected: require2.max_count,
          source: "require.max_count"
        })
      );
    }
    if (truthy(require2.min_count) && probe.existing_count < require2.min_count) {
      out.push(
        this.violation(policy, {
          rule: "too_few_items",
          block,
          params: p,
          observed: probe.existing_count,
          expected: require2.min_count,
          action: ACTION_WARN,
          source: "require.min_count"
        })
      );
    }
  }
  checkVideo(slot, policy, probe, p, out, skips) {
    const video = asDict(policy.video);
    if (!truthy(video)) return;
    const block = "require";
    if (probe.kind !== KIND_VIDEO) return;
    if (probe.duration_s === null || probe.duration_s === void 0) {
      skips.push(skipped("duration", block, "duration_s"));
    } else {
      if (truthy(video.duration_max_s) && probe.duration_s > video.duration_max_s) {
        const pp = {
          ...p,
          max_sure: this.polStr(slot, "video.duration_max_s", video.duration_max_s)
        };
        out.push(
          this.violation(policy, {
            rule: "duration_too_long",
            block,
            params: pp,
            observed: probe.duration_s,
            expected: video.duration_max_s,
            source: "video.duration_max_s"
          })
        );
      }
      if (truthy(video.duration_min_s) && probe.duration_s < video.duration_min_s) {
        const pp = {
          ...p,
          min_sure: this.polStr(slot, "video.duration_min_s", video.duration_min_s)
        };
        out.push(
          this.violation(policy, {
            rule: "duration_too_short",
            block,
            params: pp,
            observed: probe.duration_s,
            expected: video.duration_min_s,
            source: "video.duration_min_s"
          })
        );
      }
    }
    const cap = video.bitrate_cap_kbps;
    if (truthy(cap) && truthy(probe.bitrate_bps)) {
      if (probe.bitrate_bps > cap * 1e3) {
        const pp = { ...p, max_bitrate: this.polStr(slot, "video.bitrate_cap_kbps", cap) };
        out.push(
          this.violation(policy, {
            rule: "bitrate_too_high",
            block,
            params: pp,
            observed: probe.bitrate_bps,
            expected: cap * 1e3,
            action: ACTION_AUTO_FIX,
            source: "video.bitrate_cap_kbps"
          })
        );
      }
    } else if (truthy(cap)) {
      skips.push(skipped("bitrate", block, "bitrate_bps"));
    }
    const fr = asDict(video.frame_rate);
    const kabul = asList(fr.accepted);
    if (kabul.length && truthy(probe.frame_rate)) {
      const eslesen = kabul.some(
        (k) => Math.abs(probe.frame_rate - Number(k)) < 0.5
      );
      if (!eslesen) {
        const pp = {
          ...p,
          izinli_fps: kabul.map((k, i) => this.polStr(slot, `video.frame_rate.accepted[${i}]`, k)).join(", "),
          max_fps: this.polParam(slot, fr, "output_cap", "video.frame_rate.output_cap")
        };
        out.push(
          this.violation(policy, {
            rule: "frame_rate_not_allowed",
            block,
            params: pp,
            observed: probe.frame_rate,
            expected: kabul,
            action: ACTION_AUTO_FIX,
            source: "video.frame_rate.accepted"
          })
        );
      }
    }
  }
  checkMaster(slot, policy, probe, p, out) {
    const master = asDict(policy.master);
    const [w, h] = displaySize(probe);
    if (!(w && h)) return;
    const minLong = master.min_long_edge;
    if (truthy(minLong) && Math.max(w, h) < minLong && !truthy(master.allow_upscale)) {
      const pp = {
        ...p,
        gerekli_uzun_kenar: this.polStr(slot, "master.min_long_edge", minLong)
      };
      const af = this.actionFor(policy, "master");
      out.push(
        this.violation(policy, {
          rule: "master_under_spec",
          block: "master",
          params: pp,
          observed: Math.max(w, h),
          expected: minLong,
          action: af !== ACTION_REJECT ? af : ACTION_WARN,
          source: "master.min_long_edge (upscale yok)"
        })
      );
    }
  }
  metricValue(probe, name) {
    if (name === "_unreadable") {
      return probe.readable !== null && probe.readable !== void 0 ? !probe.readable : null;
    }
    if (name === "_no_alpha") {
      return probe.has_alpha !== null && probe.has_alpha !== void 0 ? !probe.has_alpha : null;
    }
    const v = probe[name];
    return v === void 0 ? null : v;
  }
  /** engine.py `_compare`: Python'ın TypeError'ı burada `false` — tip uyuşmazlığı kural tetiklemez. */
  compare(value, comparator, threshold) {
    const eq = (a, b) => {
      if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((x, i) => eq(x, b[i]));
      }
      if ((typeof a === "number" || typeof a === "boolean") && (typeof b === "number" || typeof b === "boolean")) {
        return Number(a) === Number(b);
      }
      return a === b;
    };
    const ordered = (a, b) => {
      if ((typeof a === "number" || typeof a === "boolean") && (typeof b === "number" || typeof b === "boolean")) {
        return [Number(a), Number(b)];
      }
      if (typeof a === "string" && typeof b === "string") return [a, b];
      return null;
    };
    switch (comparator) {
      case "eq":
        return eq(value, threshold);
      case "ne":
        return !eq(value, threshold);
      case "gt": {
        const o = ordered(value, threshold);
        return o !== null && o[0] > o[1];
      }
      case "gte": {
        const o = ordered(value, threshold);
        return o !== null && o[0] >= o[1];
      }
      case "lt": {
        const o = ordered(value, threshold);
        return o !== null && o[0] < o[1];
      }
      case "lte": {
        const o = ordered(value, threshold);
        return o !== null && o[0] <= o[1];
      }
      default:
        return false;
    }
  }
  checkContentRules(policy, probe, p, out, skips) {
    const block = "content_rules";
    for (const ruleRaw of asList(policy.content_rules)) {
      const rule = asDict(ruleRaw);
      const name = rule.rule ? String(rule.rule) : "";
      if (!name) continue;
      const alan = CONTENT_METRICS[name];
      if (alan === void 0) {
        skips.push(
          skipped(name, block, "k\xFCnyede kar\u015F\u0131l\u0131\u011F\u0131 yok (piksel analizi gerekir)")
        );
        continue;
      }
      const value = this.metricValue(probe, alan);
      if (value === null || value === void 0) {
        skips.push(skipped(name, block, alan));
        continue;
      }
      const comparator = truthy(rule.comparator) ? String(rule.comparator) : "eq";
      if (!this.compare(value, comparator, rule.threshold)) continue;
      const mesajKural = { animated: "animated", unreadable: "unreadable" }[name];
      if (mesajKural && out.some((v) => v.rule === mesajKural)) continue;
      const pp = { ...p };
      const mk = truthy(rule.message_key) ? String(rule.message_key) : name;
      const policyTr = asDict(asDict(policy.messages).tr);
      const messageTr = policyTr[mk] ? String(policyTr[mk]) : "";
      const action = truthy(rule.action) ? String(rule.action) : this.actionFor(policy, block);
      if (messageTr) {
        const cat = FALLBACK[mesajKural ?? name] ?? FALLBACK._default;
        const message = {
          tr: fmt(messageTr, pp),
          en: fmt(cat.en, { ...pp, kural: name })
        };
        const hint = {
          tr: fmt(cat.hint_tr ?? "", pp),
          en: fmt(cat.hint_en ?? "", pp)
        };
        out.push({
          code: this.code(policy, name),
          rule: name,
          block,
          action,
          message,
          hint,
          observed: value,
          expected: rule.threshold ?? null,
          retryable: false,
          source: rule.source ? String(rule.source) : ""
        });
      } else {
        out.push(
          this.violation(policy, {
            rule: mesajKural ?? name,
            block,
            params: pp,
            observed: value,
            expected: rule.threshold ?? null,
            action,
            source: rule.source ? String(rule.source) : ""
          })
        );
      }
    }
  }
  // ── hedef üretimi (engine.py normalized_targets aynası) ──────────
  normalizedTargets(policy, probeInput) {
    const probe = normalizeProbe(probeInput);
    const master = asDict(policy.master);
    const [w, h] = displaySize(probe);
    const out = {
      slot: String(policy.slot_key ?? ""),
      master: {},
      derivatives: []
    };
    if (!(w && h)) return out;
    let scale = 1;
    const cap = master.max_long_edge;
    if (truthy(cap) && Math.max(w, h) > cap) {
      scale = cap / Math.max(w, h);
    }
    const maxMp = master.max_megapixels;
    if (truthy(maxMp)) {
      const alan = w * scale * (h * scale);
      if (alan > maxMp * 1e6) {
        scale *= Math.sqrt(maxMp * 1e6 / alan);
      }
    }
    const allowUpscale = Object.prototype.hasOwnProperty.call(master, "allow_upscale") ? master.allow_upscale : false;
    if (!truthy(allowUpscale)) scale = Math.min(scale, 1);
    let tw = Math.max(1, Math.trunc(pyRound(w * scale)));
    let th = Math.max(1, Math.trunc(pyRound(h * scale)));
    const fit = truthy(master.fit) ? String(master.fit) : "contain";
    const hedefOran = master.target_ratio;
    if (fit === "pad" && truthy(hedefOran)) {
      const r = parseRatio(hedefOran);
      if (r) {
        const kutu = Math.max(tw, th);
        if (r >= 1) {
          tw = kutu;
          th = Math.trunc(pyRound(kutu / r));
        } else {
          tw = Math.trunc(pyRound(kutu * r));
          th = kutu;
        }
      }
    }
    out.master = {
      width: tw,
      height: th,
      scale: pyRound(scale, 6),
      resize_needed: scale < 1,
      format: Object.prototype.hasOwnProperty.call(master, "format") ? master.format : "preserve",
      encoding: Object.prototype.hasOwnProperty.call(master, "encoding") ? master.encoding : "",
      colorspace: Object.prototype.hasOwnProperty.call(master, "colorspace") ? master.colorspace : "preserve",
      dpi_out: master.dpi_out ?? null,
      fit,
      pad_color: master.pad_color ?? null,
      orientation: Object.prototype.hasOwnProperty.call(master, "orientation") ? master.orientation : "apply_exif",
      strip_metadata: truthy(master.strip_metadata) ? master.strip_metadata : {},
      allow_upscale: truthy(allowUpscale),
      source_size: [w, h]
    };
    const derivatives = [];
    for (const profileRaw of asList(policy.profiles)) {
      const profile = asDict(profileRaw);
      const pw = profile.width;
      if (!truthy(pw)) continue;
      let ph = profile.height;
      if (!truthy(ph)) {
        const r = parseRatio(truthy(profile.target_ratio) ? profile.target_ratio : "") || (th ? tw / th : 1);
        ph = r ? Math.trunc(pyRound(pw / r)) : pw;
      }
      derivatives.push({
        name: Object.prototype.hasOwnProperty.call(profile, "name") ? profile.name : `w${pw}`,
        width: pw,
        height: ph,
        formats: truthy(profile.formats) ? profile.formats : [
          Object.prototype.hasOwnProperty.call(master, "format") ? master.format : "webp"
        ],
        encoder_quality: truthy(profile.encoder_quality) ? profile.encoder_quality : {},
        fit: truthy(profile.fit) ? profile.fit : fit,
        pad_color: truthy(profile.pad_color) ? profile.pad_color : master.pad_color ?? null,
        max_bytes: profile.max_bytes ?? null,
        upscale: pw > tw,
        serves: truthy(profile.serves) ? profile.serves : []
      });
    }
    out.derivatives = derivatives;
    const video = asDict(policy.video);
    if (truthy(video)) {
      const fr = asDict(video.frame_rate);
      const ses = asDict(video.audio_policy);
      out.video = {
        max_width: master.max_long_edge ?? null,
        container: master.format ?? null,
        fps_cap: fr.output_cap ?? null,
        bitrate_cap_kbps: video.bitrate_cap_kbps ?? null,
        audio_codec: ses.codec ?? null,
        audio_bitrate_kbps: ses.bitrate_kbps ?? null,
        autoplay_mute_mandatory: ses.autoplay_mute_mandatory ?? null
      };
    }
    return out;
  }
}
function conditionalOpen(policy, ext) {
  if (ext === ".svg" || ext === ".svgz") {
    return truthy(asDict(asDict(asDict(policy.logo).svg_policy)).enabled);
  }
  return false;
}
export {
  ACTION_AUTO_FIX,
  ACTION_IGNORE,
  ACTION_MANUAL_REVIEW,
  ACTION_PASS,
  ACTION_REJECT,
  ACTION_REVIEW,
  ACTION_WARN,
  PolicyEngine,
  PolicyNotFoundError,
  highestAction,
  parseRatio,
  pyFixed,
  pyRound
};
