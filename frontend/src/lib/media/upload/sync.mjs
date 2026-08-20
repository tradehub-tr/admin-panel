#!/usr/bin/env node
/**
 * Slot politikasının ÖN KONTROL'e bakan yüzünü tradehub_core'dan üretir.
 *
 * **Neden kopyalanıyor.** Slot politikaları `tradehub_core/.../policy/slots/
 * *.json` içinde duruyor ve bunları paneldeki bir ekrana veren HİÇBİR HTTP UCU
 * YOK (`docs/api/openapi-http.yaml`, 87 uç, 2026-08-19 — `upload_limits` yalnız
 * uzantı ve bayt sınırı veriyor, megapiksel/oran/süre kuralları orada yok).
 * Ön kontrolün megapiksel tavanını, kısa kenar eşiğini ve video süresini
 * bilmesi için tek yol bugün kopyalamak.
 *
 * **Kopyalamanın bedeli ilan ediliyor.** Kaynak dosyanın sha256'sı üretilen
 * dosyaya yazılıyor. Kaynak değişip bu script koşturulmazsa ekrandaki kural
 * sunucudakinden sessizce ayrışır — `npm test` içindeki `preflightVendor`
 * testi bu ayrışmayı yakalar ve KIRILIR. Ayrışma sessiz kalmasın diye.
 *
 * **Bu kurallar KARAR VERMEZ, karar HIZLANDIRIR.** Son söz sunucunun; buradaki
 * her eşik yalnız kullanıcıyı 80 MB'lık bir yüklemenin sonunda reddedilmekten
 * kurtarmak için var. Sunucunun kendi kapısı (`upload_policy.check`) yerinde
 * duruyor ve bu dosya oraya dokunmuyor.
 *
 * Koşturma (frontend kökünden):
 *   node src/lib/media/upload/sync.mjs
 *   node src/lib/media/upload/sync.mjs --check   # ayrışma varsa exit 1
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, "../../../..");
const ISTOC = path.resolve(FRONTEND, "../..");
const SLOTS_DIR = path.join(ISTOC, "tradehub_core/tradehub_core/media/pipeline/policy/slots");
const OUT = path.join(HERE, "vendor/slotPolicy.js");

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function wh(o) {
  if (!o || typeof o !== "object") return null;
  const w = num(o.width);
  const h = num(o.height);
  return w && h ? { width: w, height: h } : null;
}

/** Ön kontrolün gerçekten ölçebildiği alanlar — gerisi taşınmıyor. */
function distil(raw) {
  const accept = raw.accept || {};
  const require_ = raw.require || {};
  const video = raw.video || null;

  const out = {
    slotKey: raw.slot_key,
    title: raw.title,
    roles: raw.roles || [],
    kind: video ? "video" : "image",
    accept: {
      mime: accept.mime || [],
      extensions: accept.extensions || [],
      conditionalExtensions: accept.conditional_extensions || [],
      rejectedExtensions: accept.rejected_extensions || [],
      maxBytes: num(accept.max_bytes),
      maxBytesSvg: num(accept.max_bytes_svg),
      maxMegapixelsHard: num(accept.max_megapixels_hard),
      allowAnimated: accept.allow_animated === true,
    },
    require: {
      minShortEdge: num(require_.min_short_edge),
      maxShortEdge: num(require_.max_short_edge),
      minArea: num(require_.min_area),
      maxEdge: num(require_.max_edge),
      recommendedEdge: num(require_.recommended_edge),
      lowResolutionWarnBelow: num(require_.low_resolution_warn_below),
      allowedRatios: require_.allowed_ratios || [],
      ratioTolerance: num(require_.ratio_tolerance),
      aspectBand: require_.aspect_band
        ? {
            minWOverH: num(require_.aspect_band.min_w_over_h),
            maxWOverH: num(require_.aspect_band.max_w_over_h),
          }
        : null,
      alphaChannel: require_.alpha_channel || null,
      minCount: num(require_.min_count),
      maxCount: num(require_.max_count),
    },
    video: null,
  };

  if (video) {
    out.video = {
      durationMinS: num(video.duration_min_s),
      durationMaxS: num(video.duration_max_s),
      resolutionMin: wh(video.resolution_min),
      resolutionMax: wh(video.resolution_max),
      resolutionRecommended: wh(video.resolution_recommended),
      bitrateCapKbps: num(video.bitrate_cap_kbps),
      frameRateAccepted: video.frame_rate?.accepted || [],
      frameRateOutputCap: num(video.frame_rate?.output_cap),
    };
  }
  return out;
}

const dosyalar = readdirSync(SLOTS_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

const slotlar = [];
const kaynaklar = {};
for (const dosya of dosyalar) {
  const tam = path.join(SLOTS_DIR, dosya);
  const ham = readFileSync(tam, "utf8");
  kaynaklar[`tradehub_core/tradehub_core/media/pipeline/policy/slots/${dosya}`] = createHash(
    "sha256"
  )
    .update(ham)
    .digest("hex");
  slotlar.push(distil(JSON.parse(ham)));
}

const govde = `// ÜRETİLMİŞ DOSYA — ELLE DÜZENLEME.
// Kaynak: tradehub_core/tradehub_core/media/pipeline/policy/slots/*.json
// Yeniden üret: node src/lib/media/upload/sync.mjs
//
// Yalnız ÖN KONTROL'ün ölçebildiği alanlar taşındı (bayt, megapiksel, kenar,
// oran, alfa, süre, çözünürlük, kare hızı). Render profilleri, mesaj metinleri
// ve transcode ayarları KASITLI dışarıda: ön kontrol onları kullanmıyor,
// taşımak ayrışacak ikinci bir kopya üretirdi.

/** Kaynak dosyaların senkron anındaki özetleri — ayrışma testi bunu kullanır. */
export const VENDOR_MANIFEST = ${JSON.stringify(
  {
    gorev: "T-081 · T-091",
    uretici: "src/lib/media/upload/sync.mjs",
    senkron_tarihi: new Date().toISOString().slice(0, 10),
    kaynaklar,
  },
  null,
  2
)};

/** 9 slot — ön kontrol kuralları. */
export const SLOT_POLICIES = ${JSON.stringify(slotlar, null, 2)};

export default SLOT_POLICIES;
`;

if (process.argv.includes("--check")) {
  let mevcut = "";
  try {
    mevcut = readFileSync(OUT, "utf8");
  } catch {
    /* yok sayılır — aşağıdaki karşılaştırma zaten düşer */
  }
  // Senkron tarihi her koşuda değişir; karşılaştırma ondan arındırılıyor.
  const soy = (s) => s.replace(/"senkron_tarihi": "[^"]*"/, "");
  if (soy(mevcut) !== soy(govde)) {
    console.error("slotPolicy.js kaynaktan AYRIŞMIŞ — `node src/lib/media/upload/sync.mjs` koştur.");
    process.exit(1);
  }
  console.log("slotPolicy.js güncel.");
} else {
  writeFileSync(OUT, govde, "utf8");
  console.log(`${slotlar.length} slot yazıldı → ${path.relative(FRONTEND, OUT)}`);
}
