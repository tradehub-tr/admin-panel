/**
 * Önizleme simülatörünün verisini `tradehub_core`'dan panele senkronlar.
 *
 * **Neden Faz 10'dan farklı bir yol.** `scripts/sync-crop-geometry.mjs` kırpma
 * geometrisini kopyalayabiliyordu çünkü kaynağın hazır bir TypeScript ikizi
 * vardı (`media/pipeline/core/crop_geometry.ts`). Simülatörün kaynağı
 * `media/pipeline/simulator/srcset.py` — `find`/`grep` ile arandı, **JS/TS
 * ikizi YOK** (bkz. `src/lib/media/simulator/index.js` başlığı). Bu yüzden
 * görev tanımının ikinci yolu seçildi:
 *
 *   1. `devices.json` + `placements.json` **birebir** vendor'lanır (VERİ),
 *   2. seçim mantığı panelde JavaScript olarak yazılır (`select.js`,
 *      `layout.js`),
 *   3. `srcset.py`'nin KENDİSİ koşturulup 195 + 13 vektörlük beklenti dosyası
 *      üretilir (`gen_simulator_vectors.py`), ve
 *      `src/lib/media/simulator/__tests__/srcsetParity.test.js` panelin
 *      hesabını her koşuda o beklentiyle karşılaştırır.
 *
 * Yani panelde matematik VAR ama **denetimsiz değil**: referans uygulamayla
 * arasındaki sapma her `npm test`'te ölçülür.
 *
 * **T-071 eki — video karar tablosu.** Aynı desenin ikinci uygulaması:
 * `video_decision.json`'ın KURAL TABLOSU (eşikler, gerekçeler, fayda kapısı)
 * veri olarak türetilir, kararın KENDİSİ ise referans motor
 * (`media/pipeline/video/decision.py`) KOŞTURULARAK vektörleştirilir. Panelde
 * bir JavaScript yorumlayıcı var ama denetimsiz değil: her `npm test`'te 7
 * ölçülmüş künye + 16 kural örneği referans motorun verdiği kararla
 * karşılaştırılır (`src/components/media/simulator/__tests__/videoDecision.test.js`).
 *
 * Kullanım:
 *   node scripts/sync-simulator.mjs           # senkronla (python3 gerekir)
 *   node scripts/sync-simulator.mjs --check   # yalnız doğrula (CI)
 *   node scripts/sync-simulator.mjs --video   # YALNIZ video karar çıktısı;
 *                                             # devices/placements/parite
 *                                             # vektörleri ve manifest
 *                                             # DOKUNULMADAN kalır
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, "..");
const VENDOR = join(FRONTEND, "src/lib/media/simulator/vendor");

/** İstoç çalışma alanı kökü: admin-panel/frontend → admin-panel → istoc */
const CORE_REPO = resolve(FRONTEND, "../../tradehub_core");
const CORE = join(CORE_REPO, "tradehub_core");
const SIM = join(CORE, "media/pipeline/simulator");

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const rel = (abs) => `tradehub_core/${abs.slice(CORE_REPO.length + 1)}`;

/** Birebir kopyalanan VERİ dosyaları — burada yorum yok, bayt kopyası. */
const COPIES = [
  { from: join(SIM, "devices.json"), to: join(VENDOR, "devices.json") },
  { from: join(SIM, "placements.json"), to: join(VENDOR, "placements.json") },
];

/**
 * Kopyalanmayan ama hash'i İZLENEN kaynaklar. `srcset.py` panele girmez
 * (Python), `video_decision.json`'dan `poster` bloğu ve (T-071) kural tablosu
 * türetilir. Hepsi değişirse vektörler bayatlar; manifest bunu yakalar.
 *
 * T-071'de dört kaynak daha eklendi: karar motoru, künye çıkarıcı, kodlayıcı
 * (fayda kapısı + hız tavanı buradan hesaplanır) ve ölçülmüş künye korpusu.
 * Bunlardan herhangi biri değişirse vendor'lanmış karar vektörleri artık
 * referans uygulamayı temsil etmez.
 */
const VIDEO_TABLE = join(CORE, "media/pipeline/policy/video_decision.json");
const VIDEO_PROBE_FIXTURES = join(CORE, "tests/fixtures/media/live-probe.json");
const TRACKED = [
  join(SIM, "srcset.py"),
  VIDEO_TABLE,
  join(CORE, "media/pipeline/video/decision.py"),
  join(CORE, "media/pipeline/video/probe.py"),
  join(CORE, "media/pipeline/video/transcode.py"),
  VIDEO_PROBE_FIXTURES,
];

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
/**
 * `--video`: yalnız T-071 çıktısını üret.
 *
 * Neden var: `devices.json` / `placements.json` / `parity_vectors.json` /
 * `vendor.manifest.json` başka görevlerin sahipliğinde olabiliyor. Video karar
 * tablosunu tazelemek için o dosyaları yeniden yazmak gerekmez ve yazmak
 * başkasının işini sessizce üzerine alır.
 */
const videoOnly = args.has("--video");

if (!existsSync(SIM)) {
  console.error(`[sync-simulator] kaynak depo yok: ${SIM}`);
  console.error("[sync-simulator] ÖLÇÜLMEDİ — vendor/ dosyaları olduğu gibi bırakıldı.");
  process.exit(checkOnly ? 0 : 1);
}

const manifest = {
  schema_version: "1.0.0",
  // Kaynak doküman numarası. `devices.json` + `placements.json` **tek** görevin
  // çıktısıdır: T-110 "Cihaz **ve yerleşim** kataloğunun veri olarak tanımı".
  // İç kayıt bunu bir ara "cihaz kataloğu" ve "yerleşim kataloğu" diye ikiye
  // bölmüştü (bkz. docs/reports/31-gorev-numara-hizalama.md); burada kaynağın
  // numarası kullanılıyor. Üst sınır T-115, çünkü aynı vendor zinciri
  // simülatörün tüm görevlerini besliyor.
  gorev: "T-110…T-115",
  aciklama:
    "Bu klasördeki dosyalar tradehub_core'dan senkronlanmıştır. ELLE DÜZENLEME. " +
    "Kaynağı değiştir, sonra `npm run sync:simulator` koştur.",
  uretici: "admin-panel/frontend/scripts/sync-simulator.mjs",
  senkron_tarihi: new Date().toISOString().slice(0, 10),
  kaynaklar: {},
};

let drift = 0;

for (const c of COPIES) {
  const raw = readFileSync(c.from);
  manifest.kaynaklar[rel(c.from)] = sha256(raw);
  if (videoOnly) continue;
  const current = existsSync(c.to) ? readFileSync(c.to) : null;
  if (current && current.equals(raw)) continue;
  drift += 1;
  if (checkOnly) console.error(`[sync-simulator] AYRIŞMA: ${rel(c.from)}`);
  else {
    writeFileSync(c.to, raw);
    console.log(`[sync-simulator] yazıldı: ${c.to}`);
  }
}

for (const abs of TRACKED) manifest.kaynaklar[rel(abs)] = sha256(readFileSync(abs));

// ── Panelin okuduğu tek modül ────────────────────────────────────────
// JSON değil, ES modülü: Node'un `import ... with { type: "json" }` şartı ile
// Vite'ın JSON içe aktarımı aynı sözdiziminde buluşmuyor (aynı gerekçe
// sync-crop-geometry.mjs'de de yazılı).
const videoTable = JSON.parse(readFileSync(VIDEO_TABLE, "utf8"));
const devices = JSON.parse(readFileSync(COPIES[0].from, "utf8"));
const placements = JSON.parse(readFileSync(COPIES[1].from, "utf8"));
const posterBlok = videoTable.poster || {};

const poster = {
  width: posterBlok.width ?? null,
  format: posterBlok.format ?? null,
  maxBytes: posterBlok.max_bytes ?? null,
  qualityLadder: posterBlok.quality_ladder || [],
  windowStartS: posterBlok.window_start_s ?? null,
  windowEndExpr: posterBlok.window_end_expr ?? "",
  thumbnailFrames: posterBlok.thumbnail_frames ?? null,
  brightnessGate: posterBlok.brightness_gate || {},
  maxRetries: posterBlok.max_retries ?? null,
  onFinalFailure: posterBlok.on_final_failure ?? "",
};

const dataModule =
  "// ÜRETİLMİŞ DOSYA — elle düzenleme. Kaynak: tradehub_core/media/pipeline/simulator/*.json\n" +
  "// Yeniden üret: npm run sync:simulator\n" +
  `export default ${JSON.stringify({ schema_version: "1.0.0", devices, placements, poster }, null, "\t")};\n`;

const dataPath = join(VENDOR, "simulator_data.js");
if (!videoOnly && (!existsSync(dataPath) || readFileSync(dataPath, "utf8") !== dataModule)) {
  drift += 1;
  if (checkOnly) console.error("[sync-simulator] AYRIŞMA: simulator_data.js");
  else {
    writeFileSync(dataPath, dataModule);
    console.log(`[sync-simulator] yazıldı: ${dataPath}`);
  }
}

/**
 * Referans motoru koşturan Python programı — `python3 -c` ile geçilir.
 *
 * Panelde ikinci bir uygulama var (JavaScript yorumlayıcı); bu program o
 * uygulamanın karşılaştırılacağı BEKLENTİYİ üretir. Kararı Python verir,
 * JavaScript değil. `scripts/` altına ikinci bir dosya eklemek yerine gömülü
 * olmasının nedeni bu görevin dosya sahipliği: yalnız bu betik bana ait.
 */
const VIDEO_VECTOR_PY = String.raw`import json
import sys
from dataclasses import replace

# python3 -c ile kosarken sys.path[0] cwd olur; oradaki bir modul stdlib'i golgeleyebilir.
sys.path[:] = [p for p in sys.path if p not in ("", ".")]
sys.path.insert(0, sys.argv[1])

from tradehub_core.media.pipeline.video import transcode as tc
from tradehub_core.media.pipeline.video.decision import DecisionTable
from tradehub_core.media.pipeline.video.probe import VideoFacts, container_family_of

probe_doc = json.load(open(sys.argv[2], encoding="utf-8"))
table = DecisionTable.load()
spec = tc.H264Spec.from_table()
ratio = tc.min_saving_ratio()

# live-probe.json'un ffprobe blogunun DOGRUDAN tasidigi alanlar. Geri kalani
# VideoFacts varsayilaninda kalir ve "defaulted" olarak isaretlenir — panel
# "bu alan vendor'lanmadi" demek zorunda, sessizce 0/false gostermek yasak.
SUPPLIED = (
    "size_bytes measured has_video width height duration_s fps video_codec pix_fmt "
    "video_bitrate_bps format_bitrate_bps container container_family has_audio audio_codec"
).split()
# probe.py'nin olculen alanlardan TURETTIGI degiskenler (VideoFacts property).
DERIVED = "pixels long_edge short_edge bpp".split()


def fps_of(text):
    """ffprobe kesirli kare hizi (ornek 30000/1001) -> float. probe.py ile ayni."""
    t = str(text or "")
    if "/" in t:
        pay, bolen = t.split("/", 1)
        return float(pay) / float(bolen) if float(bolen) else 0.0
    return float(t or 0)


def facts_of(name, f):
    return VideoFacts(
        path=name,
        size_bytes=int(f["bytes"]),
        measured=True,
        has_video=True,
        width=int(f["width"]),
        height=int(f["height"]),
        duration_s=float(f["duration_s"]),
        fps=fps_of(f["fps"]),
        video_codec=str(f["video_codec"] or ""),
        pix_fmt=str(f["pix_fmt"] or ""),
        video_bitrate_bps=int(f["video_bitrate_kbps"]) * 1000,
        format_bitrate_bps=int(f["bitrate_kbps"]) * 1000,
        container=str(f["container"] or ""),
        container_family=container_family_of(str(f["container"] or "")),
        has_audio=bool(f["has_audio"]),
        audio_codec=str(f["audio_codec"] or ""),
    )


def variables_of(facts):
    v = dict(facts.variables())
    v["bpp"] = round(facts.bpp, 6)
    return v


def vector(kind, name, facts, defaulted, extra):
    karar = table.evaluate(facts)
    uygulanir, neden = tc.remux_fallback_applies(facts)
    row = {
        "kind": kind,
        "name": name,
        "variables": variables_of(facts),
        "defaulted": sorted(defaulted),
        "derived": list(DERIVED),
        "decision": {
            "action": karar.action,
            "rule_id": karar.rule_id,
            "code": karar.code,
            "reason": karar.reason,
            "trace": [[rid, hit] for rid, hit in karar.trace],
        },
        "benefit_gate": {
            "min_saving_ratio": ratio,
            "src_bytes": int(facts.size_bytes),
            "max_output_bytes": int(facts.size_bytes * (1.0 - ratio)),
            "rate_ceiling_kbps": tc.rate_ceiling_kbps(spec, facts),
            "remux_fallback_applies": bool(uygulanir),
            "remux_fallback_reason": neden,
        },
    }
    row.update(extra)
    return row


vectors = []
olculen = {}
for name in sorted(probe_doc["ffprobe"]):
    facts = facts_of(name, probe_doc["ffprobe"][name])
    olculen[name] = facts
    kalan = [k for k in variables_of(facts) if k not in SUPPLIED and k not in DERIVED]
    vectors.append(
        vector(
            "measured",
            name,
            facts,
            kalan,
            {"today_needs_transcode": bool(probe_doc["needs_transcode"][name])},
        )
    )

# Olculen 7 kunyenin hicbiri REMUX kurallarini, kare hizi tavanini ya da
# verimlilik kuralini TETIKLEMIYOR. "Bu kural neye bakiyor" sorusu ekranda
# cevapsiz kalmasin diye her kural, olculmus bir taban kunyeden TEK ALAN
# degistirilerek tetiklenir. Bu kunyeler SENTETIKTIR — olcum degildir ve
# panelde oyle etiketlenir. Karari yine referans motor verir.
TABAN = "video_efficient_720p_750k.mp4"
MUTASYONLAR = [
    ("probe_unavailable", {"measured": False}, "ffprobe kunyeyi okuyamadi"),
    ("no_video_stream", {"has_video": False}, "dosyada video akisi yok"),
    ("resolution_over_max", {"width": 4096, "height": 2160}, "4K ustu kare (esik 3840x2160)"),
    ("duration_over_engine_max", {"duration_s": 901.0}, "15 dk ustu (esik 900 sn)"),
    ("codec_not_deliverable", {"video_codec": "hevc"}, "H.264 disi kodek"),
    ("pix_fmt_not_web", {"pix_fmt": "yuv422p10le"}, "10-bit 4:2:2 ornekleme"),
    ("width_over_cap", {"width": 1920, "height": 1080}, "genislik 1280 tavaninin ustunde"),
    (
        "bitrate_over_cap",
        {"video_bitrate_bps": 2600000, "format_bitrate_bps": 2707000},
        "video bitrate 2,5 Mbps tavaninin ustunde",
    ),
    ("fps_over_cap", {"fps": 60.0}, "60 fps — tavan 30"),
    (
        "inefficient_encoding",
        {"width": 640, "height": 360, "video_bitrate_bps": 2400000, "format_bitrate_bps": 2507000},
        "tablonun gap_today ornegi: 640x360 / 2,4 Mbps (bpp 0,35) bugun iki esigin de altinda kaliyor",
    ),
    ("audio_codec_not_deliverable", {"audio_codec": "opus"}, "mp4 kabinda tasinmayan ses kodegi"),
    ("audio_bitrate_over_cap", {"audio_bitrate_bps": 256000}, "256 kbps ses — tavan 192"),
    (
        "container_not_mp4",
        {"container": "matroska,webm", "container_family": "matroska"},
        "akislar teslim edilebilir, kap degil",
    ),
    ("moov_at_end", {"moov_at_end": True}, "moov atomu dosyanin SONUNDA"),
    ("extra_streams", {"nb_streams": 3}, "ikiden fazla akis (altyazi / ikinci ses / kapak)"),
    (None, {}, "hicbir kural eslesmedi — tablo default'a duser"),
]

taban = olculen[TABAN]
taban_kalan = [k for k in variables_of(taban) if k not in SUPPLIED and k not in DERIVED]
onceki = variables_of(taban)
for kural_id, mutasyon, neden in MUTASYONLAR:
    facts = replace(taban, **mutasyon) if mutasyon else taban
    vectors.append(
        vector(
            "synthetic",
            kural_id or "default",
            facts,
            [k for k in taban_kalan if k not in mutasyon],
            {
                "base": TABAN,
                "expects_rule": kural_id or "default",
                "mutation": [
                    {"var": k, "from": onceki.get(k), "to": v} for k, v in sorted(mutasyon.items())
                ],
                "mutation_why": neden,
            },
        )
    )

print(
    json.dumps(
        {
            "engine": {
                "table": "tradehub_core/media/pipeline/policy/video_decision.json",
                "evaluator": "tradehub_core/media/pipeline/video/decision.py",
                "gate": "tradehub_core/media/pipeline/video/transcode.py",
                "schema_version": table.schema_version,
                "rule_count": len(table.rules),
                "variable_names": sorted(VideoFacts().variables().keys()),
            },
            "vectors": vectors,
        },
        ensure_ascii=False,
        sort_keys=True,
    )
)
`;

// ── T-071 · video karar tablosu ──────────────────────────────────────
//
// İki parça:
//
//   1. TABLO — `video_decision.json`'ın kural listesi, eşikleri, gerekçeleri,
//      fayda kapısı ve kalite kapısı. Saf veri; Node kopyalar, yorumlamaz.
//   2. VEKTÖRLER — referans motor (`decision.py`) 7 ÖLÇÜLMÜŞ künye ve her
//      kuralı tetikleyen 16 örnek künye üzerinde KOŞTURULUR; verdiği karar,
//      kural izi, fayda kapısı sayıları ve REMUX geri çekilme hükmü dosyaya
//      dökülür. Panelin JavaScript yorumlayıcısı bu vektörlerle sınanır.
//
// Ölçülmüş künyeler `tests/fixtures/media/live-probe.json`'dan gelir — o dosya
// konteynerde gerçek ffprobe koşumuyla üretilmiştir, panelde uydurulmamıştır.

/** Kural nesnesinin karar dışı alanları: ekranda "gerekçe" olarak basılır. */
const RULE_NOTE_KEYS = [
  "source",
  "note",
  "gap_today",
  "diverges_from_today",
  "why_two_conditions",
  "measured",
  "cost",
];

const videoProbeDoc = JSON.parse(readFileSync(VIDEO_PROBE_FIXTURES, "utf8"));
const videoTargets = videoTable.targets || {};
const h264 = videoTargets.h264_primary || {};

/**
 * Referans motoru koştur ve karar vektörlerini al.
 *
 * `python3` yoksa `null` döner — çağıran "ÖLÇÜLMEDİ" der, uydurma vektör
 * üretmez. Program `-c` ile geçilir çünkü `scripts/` altına ikinci bir dosya
 * eklemek bu görevin dosya sahipliği dışında.
 */
function videoVectors() {
  const run = spawnSync("python3", ["-c", VIDEO_VECTOR_PY, CORE_REPO, VIDEO_PROBE_FIXTURES], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (run.status !== 0) {
    console.error("[sync-simulator] ÖLÇÜLMEDİ: video karar vektörleri üretilemedi.");
    console.error(run.stderr || run.error?.message || "python3 bulunamadı");
    return null;
  }
  return JSON.parse(run.stdout);
}

function buildVideoModule(vectors) {
  const veri = {
    schema_version: "1.0.0",
    source: {
      tablo: rel(VIDEO_TABLE),
      motor: "tradehub_core/tradehub_core/media/pipeline/video/decision.py",
      kunyeKorpusu: rel(VIDEO_PROBE_FIXTURES),
      tabloSurumu: videoTable.schema_version || "",
      tabloDurumu: videoTable.status || "",
      olcum: videoTable.measured_on || "",
      kunyeOrtami: (videoProbeDoc._ortam || {}).konteyner || "",
      kunyeNotu: (videoProbeDoc._ortam || {}).aciklama || "",
      bugunkuHat: (videoProbeDoc._ortam || {}).transcode_sabitleri || {},
      bugunkuHatKaynagi: (videoProbeDoc._ortam || {}).transcode_kaynak || "",
    },
    actions: videoTable.actions || {},
    operators: videoTable.operators || [],
    variables: videoTable.variables || {},
    rules: (videoTable.rules || []).map((r) => ({
      id: r.id,
      action: r.action,
      code: r.code || "",
      reason: r.reason || "",
      when: r.when,
      notes: Object.fromEntries(RULE_NOTE_KEYS.filter((k) => k in r).map((k) => [k, r[k]])),
    })),
    fallbackRule: videoTable.default || {},
    benefitGate: videoTargets.benefit_gate || {},
    qualityGate: videoTargets.quality_gate || {},
    target: {
      id: h264.id ?? null,
      maxWidth: h264.max_width ?? null,
      container: h264.container ?? null,
      videoCodec: h264.video_codec ?? null,
      profile: h264.profile ?? null,
      level: h264.level ?? null,
      crf: h264.crf ?? null,
      preset: h264.preset ?? null,
      rateControl: h264.rate_control ?? null,
      maxrateKbps: h264.maxrate_kbps ?? null,
      minMaxrateKbps: h264.min_maxrate_kbps ?? null,
      budgetFromBenefitGate: h264.budget_from_benefit_gate ?? null,
      frameRateCap: h264.frame_rate_cap ?? null,
      faststart: h264.faststart ?? null,
      audioCodec: h264.audio_codec ?? null,
      audioBitrateKbps: h264.audio_bitrate_kbps ?? null,
      rateControlWhy: h264.rate_control_why || [],
      whyH264NotVp9: h264.why_h264_not_vp9 || [],
    },
    // Referans motorun kararları. `null` DEĞİL boş dizi olması, "koşturuldu ama
    // hiç künye yok" ile "hiç koşturulmadı"yı ayırt edemezdi; bu yüzden
    // vektörsüz modül hiç yazılmaz (aşağıda `if (vectors)`).
    engine: vectors.engine,
    vectors: vectors.vectors,
  };
  return (
    "// ÜRETİLMİŞ DOSYA — elle düzenleme. Kaynak: tradehub_core/media/pipeline/policy/video_decision.json\n" +
    "// Kararlar tradehub_core/media/pipeline/video/decision.py KOŞTURULARAK üretildi.\n" +
    "// Yeniden üret: npm run sync:simulator   (ya da: node scripts/sync-simulator.mjs --video)\n" +
    `export default ${JSON.stringify(veri, null, "\t")};\n`
  );
}

const videoPath = join(VENDOR, "video_decision.js");

if (checkOnly) {
  const vectors = videoVectors();
  if (!vectors) {
    console.error("[sync-simulator] video_decision.js ÖLÇÜLMEDİ — ayrışma sayılmadı.");
  } else if (
    !existsSync(videoPath) ||
    readFileSync(videoPath, "utf8") !== buildVideoModule(vectors)
  ) {
    console.error("[sync-simulator] AYRIŞMA: video_decision.js");
    drift += 1;
  }
} else {
  const vectors = videoVectors();
  if (!vectors) process.exit(1);
  const modul = buildVideoModule(vectors);
  if (!existsSync(videoPath) || readFileSync(videoPath, "utf8") !== modul) {
    drift += 1;
    writeFileSync(videoPath, modul);
    console.log(`[sync-simulator] yazıldı: ${videoPath}`);
  }
}

// ── Parite vektörleri: referans uygulamayı KOŞTUR ────────────────────
const vectorPath = join(VENDOR, "parity_vectors.json");
if (!checkOnly && !videoOnly) {
  const before = existsSync(vectorPath) ? readFileSync(vectorPath) : null;
  const run = spawnSync(
    "python3",
    [join(HERE, "gen_simulator_vectors.py"), CORE_REPO, vectorPath],
    { encoding: "utf8" }
  );
  if (run.status !== 0) {
    console.error("[sync-simulator] ÖLÇÜLMEDİ: parite vektörleri üretilemedi.");
    console.error(run.stderr || run.error?.message || "python3 bulunamadı");
    if (before) writeFileSync(vectorPath, before);
    process.exit(1);
  }
  process.stdout.write(run.stdout);
  writeFileSync(join(VENDOR, "vendor.manifest.json"), `${JSON.stringify(manifest, null, "\t")}\n`);
  console.log("[sync-simulator] manifest güncellendi.");
} else if (!existsSync(vectorPath)) {
  console.error("[sync-simulator] AYRIŞMA: parity_vectors.json yok — senkron koşulmalı.");
  drift += 1;
}

if (checkOnly && drift) {
  console.error(`[sync-simulator] ${drift} dosya ayrışmış — senkron koşulmalı.`);
  process.exit(1);
}
