/**
 * Politika motorunun TypeScript ikizini besleyen vendor zincirini kurar (T-033).
 *
 * Desen `sync-crop-geometry.mjs` + `sync-simulator.mjs` ile AYNIDIR — yeni bir
 * desen icat edilmedi:
 *
 *   1. VERİ — 9 slot politikası (`tradehub_core/.../policy/slots/*.json`)
 *      `src/lib/media/policy/vendor/slot_policies.js` içine HAM hâliyle taşınır.
 *      Panelin `upload/vendor/slotPolicy.js` zinciri ön kontrolün DAMITILMIŞ
 *      alt kümesini taşıyor (on_violation/messages/master/profiles yok); ikiz
 *      motor ham politikayı ister, o vendor'a DOKUNULMAZ.
 *   2. FLOAT REPR — JSON'daki tam sayı değerli float'lar (`2.0`) JS'te ayırt
 *      edilemez ama Python mesajlarında `str(2.0)="2.0"` olarak görünür.
 *      Gömülü Python bu yolları `FLOAT_REPRS` olarak çıkarır; ikiz motor mesaj
 *      üretirken oradan okur.
 *   3. VEKTÖRLER — referans motor (`policy/engine.py`) GERÇEKTEN KOŞTURULUR:
 *      51 ölçülmüş fixture künyesi + canlı ffprobe künyeleri + her slotun her
 *      eşiğinin ±1 sınır künyeleri `evaluate()`'ten geçirilir ve kararlar
 *      `vendor/policy_vectors.json`'a dökülür. Kararı Python verir, JS değil.
 *   4. TÜRETİLMİŞ İKİZ — `engine.ts` tipleri silinerek `vendor/engine.js`
 *      üretilir (crop zincirinin aynı gerekçesi: parite kapısı Node'un tip
 *      soyma desteğine bağlı kalmamalı; konteynerde ölçülen Node v20.19.2'de
 *      `--experimental-strip-types` yok).
 *
 * Kaynakların sha256'sı `vendor.manifest.json`'a yazılır;
 * `__tests__/policyEngineParity.test.js` her koşuda zinciri yeniden doğrular.
 * Kaynak deposu ortamda yoksa "ÖLÇÜLMEDİ" denir, "geçti" denmez.
 *
 * Kullanım:
 *   node scripts/sync-policy-engine.mjs           # senkronla (python3 gerekir)
 *   node scripts/sync-policy-engine.mjs --check   # yalnız doğrula (CI)
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { transformWithEsbuild, version as viteVersion } from "vite";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, "..");
const POLICY = join(FRONTEND, "src/lib/media/policy");
const VENDOR = join(POLICY, "vendor");

/** İstoç çalışma alanı kökü: admin-panel/frontend → admin-panel → istoc */
const CORE_REPO = resolve(FRONTEND, "../../tradehub_core");
const CORE = join(CORE_REPO, "tradehub_core");
const SLOTS = join(CORE, "media/pipeline/policy/slots");

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const rel = (abs) => `tradehub_core/${abs.slice(CORE_REPO.length + 1)}`;

/** Hash'i izlenen KARAR kaynakları — biri değişirse vektörler bayatlar. */
const TRACKED = [
  join(CORE, "media/pipeline/policy/engine.py"),
  join(CORE, "media/pipeline/core/errors.py"),
  join(CORE, "media/pipeline/core/probe.py"),
  join(CORE, "tests/fixtures/media/manifest.json"),
  join(CORE, "tests/fixtures/media/live-probe.json"),
];

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");

if (!existsSync(SLOTS)) {
  console.error(`[sync-policy-engine] kaynak depo yok: ${SLOTS}`);
  console.error("[sync-policy-engine] ÖLÇÜLMEDİ — vendor/ dosyaları olduğu gibi bırakıldı.");
  process.exit(checkOnly ? 0 : 1);
}

/**
 * Referans motoru koşturan Python programı — `python3 -c` ile geçilir
 * (sync-simulator.mjs'in VIDEO_VECTOR_PY deseni). Çıktı tek JSON:
 * { policies, float_reprs, vectors, engine }.
 *
 * Girdi örneklemi ÜÇ kaynaktan:
 *   manifest — 51 ölçülmüş fixture künyesi (görseller; kaynağı gerçek dosya ölçümü)
 *   ffprobe  — canlı konteynerde ölçülmüş video künyeleri (live-probe.json)
 *   sinir    — her slotun politikadaki HER sayısal eşiği için ±1/eşit künyeler
 *   ayrica rol/güvenlik/biçim mutasyonları
 *
 * TAM SAYI DEĞERLİ FLOAT KURALI: JSON `90.0` taşıyabilir ama JS `JSON.parse`
 * bunu 90'a indirger ve Python `str(90.0)="90.0"` mesajı JS'te "90" olurdu.
 * Bu temsil kaybı motor hatası değil JSON sınırıdır; vektör künyelerinde tam
 * sayı değerli float'lar int'e indirgenir (karar birebir aynı kalır) ki iki
 * taraf aynı girdiyi okusun.
 */
const GEN_PY = String.raw`import json
import math
import os
import sys

sys.path[:] = [p for p in sys.path if p not in ("", ".")]
sys.path.insert(0, sys.argv[1])

from tradehub_core.media.pipeline.core.probe import EXTENSION_KINDS, MIME_BY_KIND
from tradehub_core.media.pipeline.policy.engine import PolicyEngine

engine = PolicyEngine()
CORE = os.path.join(sys.argv[1], "tradehub_core")
MANIFEST = os.path.join(CORE, "tests/fixtures/media/manifest.json")
LIVE_PROBE = os.path.join(CORE, "tests/fixtures/media/live-probe.json")

FORMAT_DETECTED = {"JPEG": "jpeg", "PNG": "png", "GIF": "gif", "WEBP": "webp",
                   "TIFF": "tiff", "BMP": "bmp", "MPO": "jpeg"}
EXT_DETECTED = {".jpg": "jpeg", ".jpeg": "jpeg", ".png": "png", ".webp": "webp",
                ".gif": "gif", ".pdf": "pdf", ".docx": "docx", ".svg": "svg",
                ".mp4": "mp4", ".m4v": "mp4", ".mov": "mov", ".webm": "webm"}


def coerce(o):
    """JSON'un tasiyamadigi ayrimi kaldir: tam sayi degerli float -> int."""
    if isinstance(o, bool):
        return o
    if isinstance(o, float) and o.is_integer():
        return int(o)
    if isinstance(o, dict):
        return {k: coerce(v) for k, v in o.items()}
    if isinstance(o, list):
        return [coerce(v) for v in o]
    return o


# ── 1. politikalar + float repr'lari ─────────────────────────────────
policies = {}
float_reprs = {}
for slot in engine.registry.keys():
    raw = engine.registry.get(slot)
    policies[slot] = raw
    reprs = {}

    def walk(o, path):
        if isinstance(o, dict):
            for k, v in o.items():
                walk(v, f"{path}.{k}" if path else k)
        elif isinstance(o, list):
            for i, v in enumerate(o):
                walk(v, f"{path}[{i}]")
        elif isinstance(o, float) and not isinstance(o, bool) and o.is_integer():
            reprs[path] = repr(o)

    walk(raw, "")
    float_reprs[slot] = reprs

# ── 2. vektorler ─────────────────────────────────────────────────────
vectors = []


def add(kaynak, slot, probe, role, name):
    probe = coerce(dict(probe))
    karar = engine.evaluate(slot, dict(probe), role)
    vectors.append({
        "id": f"P{len(vectors) + 1:04d}",
        "kaynak": kaynak,
        "name": name,
        "slot": slot,
        "role": role,
        "probe": probe,
        "expected": karar.to_dict(),
    })


def image_probe(pol, **over):
    acc = pol.get("accept") or {}
    req = pol.get("require") or {}
    exts = acc.get("extensions") or [".jpg"]
    ext = str(exts[0]).lower()
    detected = EXT_DETECTED.get(ext, "")
    r = 1.0
    for t in req.get("allowed_ratios") or []:
        try:
            a, b = str(t).split(":", 1)
            r = float(a) / float(b)
            break
        except Exception:
            pass
    else:
        band = req.get("aspect_band") or {}
        lo, hi = band.get("min_w_over_h"), band.get("max_w_over_h")
        if lo is not None and hi is not None:
            r = (float(lo) + float(hi)) / 2.0
    kisa = int(req.get("min_short_edge") or 512)
    if r >= 1:
        h = kisa
        w = max(int(round(h * r)), 1)
    else:
        w = kisa
        h = max(int(round(w / r)), 1)
    probe = dict(
        filename=f"ornek{ext}", extension=ext, byte_size=min(int(acc.get("max_bytes") or 400000), 400000) - 7,
        kind="image", detected=detected, mime=MIME_BY_KIND.get(detected, ""),
        fmt=detected.upper(), width=w, height=h, animated=False,
        has_alpha=(detected == "png"), readable=True, loadable=True,
        extension_matches_content=True, leading_marker=False,
        appended_payload=False, is_data_uri=False, scan_clean=True,
        existing_count=1,
    )
    probe.update(over)
    return probe


def video_probe(pol, **over):
    vid = pol.get("video") or {}
    acc = pol.get("accept") or {}
    fr = (vid.get("frame_rate") or {}).get("accepted") or [25]
    dmin = vid.get("duration_min_s") or 0
    dmax = vid.get("duration_max_s") or 60
    cap = vid.get("bitrate_cap_kbps") or 2000
    rec = vid.get("resolution_recommended") or {}
    probe = image_probe(pol)
    probe.update(
        kind="video",
        width=int(rec.get("width") or 1280), height=int(rec.get("height") or 720),
        duration_s=int((dmin + dmax) // 2) or 1,
        bitrate_bps=int(cap) * 1000 - 1000,
        frame_rate=fr[0],
        has_audio=True, animated=True, has_alpha=None,
        byte_size=min(int(acc.get("max_bytes") or 8000000), 8000000) - 7,
    )
    probe.update(over)
    return probe


def sans(probe, *keys):
    return {k: v for k, v in probe.items() if k not in keys}


slots = list(engine.registry.keys())

# ── 2a. olculmus fixture kunyeleri (manifest) ────────────────────────
manifest = json.load(open(MANIFEST, encoding="utf-8"))
for rec in manifest.get("fixtures") or []:
    slot = rec.get("slot")
    o = rec.get("olculen") or {}
    if slot not in engine.registry or not o.get("width") or "engine_probe" not in o:
        continue
    pol = engine.registry.get(slot)
    role = (pol.get("roles") or [""])[0]
    ext = os.path.splitext(rec["file"])[1].lower()
    fmtname = str(o.get("format") or "")
    detected = FORMAT_DETECTED.get(fmtname, "")
    ep = o.get("engine_probe") or {}
    eo = o.get("engine_optimize") or {}
    probe = dict(
        filename=os.path.basename(rec["file"]), extension=ext,
        byte_size=int(o.get("bytes") or 0), kind="image", detected=detected,
        mime=MIME_BY_KIND.get(detected, ""), fmt=fmtname,
        width=int(o.get("width") or 0), height=int(o.get("height") or 0),
        animated=bool(o.get("animated")), has_alpha=o.get("has_alpha"),
        readable=bool(ep.get("readable", o.get("pil_readable"))),
        loadable=eo.get("ok"),
        extension_matches_content=(detected in EXTENSION_KINDS.get(ext, frozenset()))
        if detected else None,
        leading_marker=False, appended_payload=False, existing_count=1,
        scan_clean=True,
    )
    if o.get("exif_orientation"):
        probe["exif_orientation"] = int(o["exif_orientation"])
    add("manifest", slot, probe, role, os.path.basename(rec["file"]))

# ── 2b. canli ffprobe kunyeleri (video) ──────────────────────────────
def fps_of(text):
    t = str(text or "")
    if "/" in t:
        pay, bolen = t.split("/", 1)
        return float(pay) / float(bolen) if float(bolen) else 0.0
    return float(t or 0)


live = json.load(open(LIVE_PROBE, encoding="utf-8"))
video_slots = [s for s in slots if (engine.registry.get(s).get("video") or {})]
for name in sorted(live.get("ffprobe") or {}):
    f = live["ffprobe"][name]
    probe = dict(
        filename=name, extension=os.path.splitext(name)[1].lower() or ".mp4",
        byte_size=int(f["bytes"]), kind="video", detected="mp4",
        mime="video/mp4", width=int(f["width"]), height=int(f["height"]),
        readable=True, loadable=True, animated=True,
        extension_matches_content=True, leading_marker=False,
        appended_payload=False, duration_s=float(f["duration_s"]),
        bitrate_bps=int(f["bitrate_kbps"]) * 1000, frame_rate=fps_of(f["fps"]),
        has_audio=bool(f["has_audio"]), video_codec=str(f["video_codec"] or ""),
        audio_codec=str(f["audio_codec"] or ""), existing_count=1, scan_clean=True,
    )
    for slot in video_slots:
        role = (engine.registry.get(slot).get("roles") or [""])[0]
        add("ffprobe", slot, probe, role, name)

# ── 2c. sinir + mutasyon vektorleri (veri gudumlu, slot basina if yok) ──
for slot in slots:
    pol = engine.registry.get(slot)
    acc = pol.get("accept") or {}
    req = pol.get("require") or {}
    vid = pol.get("video") or {}
    roles = pol.get("roles") or []
    role = roles[0] if roles else ""
    base = video_probe(pol) if vid else image_probe(pol)

    add("sinir", slot, base, role, "taban")
    add("rol", slot, base, "davetsiz-rol", "rol_uyusmaz")
    add("rol", slot, base, "", "rol_bos")

    mb = acc.get("max_bytes")
    if mb:
        for d, nm in ((-1, "altinda"), (0, "esit"), (1, "ustunde")):
            add("sinir", slot, dict(base, byte_size=int(mb) + d), role, f"max_bytes_{nm}")

    hard = acc.get("max_megapixels_hard")
    if hard and not vid:
        kenar = int(math.isqrt(int(float(hard) * 1_000_000)))
        for d, nm in ((0, "esik"), (1, "ustunde")):
            add("sinir", slot, dict(base, width=kenar + d, height=kenar + d), role,
                f"max_megapixels_{nm}")

    for alan, kural in (("min_short_edge", "kisa_kenar"), ("max_short_edge", "kisa_tavan"),
                        ("max_edge", "uzun_tavan"), ("low_resolution_warn_below", "dusuk_cozunurluk")):
        v = req.get(alan)
        if not v:
            continue
        for d in (-1, 0, 1):
            s = int(v) + d
            if s <= 0:
                continue
            add("sinir", slot, dict(base, width=s, height=s), role, f"{kural}_{d:+d}")

    ma = req.get("min_area")
    if ma:
        kenar = math.isqrt(int(ma))
        for d, nm in ((0, "altinda"), (1, "esik_ustu")):
            add("sinir", slot, dict(base, width=kenar + d, height=kenar + d), role,
                f"min_area_{nm}")

    ratios = req.get("allowed_ratios") or []
    if ratios:
        try:
            a, b = str(ratios[0]).split(":", 1)
            r0 = float(a) / float(b)
        except Exception:
            r0 = 0.0
        tol = float(req.get("ratio_tolerance") or 0.0)
        if r0:
            h = 1000
            w_ic = int(r0 * h * (1.0 + tol))          # bandin hemen ici/kenari
            w_dis = int(math.ceil(r0 * h * (1.0 + tol))) + 21  # belirgin disi
            add("sinir", slot, dict(base, width=w_ic, height=h), role, "oran_band_ici")
            add("sinir", slot, dict(base, width=w_dis, height=h), role, "oran_band_disi")

    band = req.get("aspect_band") or {}
    if band:
        h = 1000
        lo, hi = band.get("min_w_over_h"), band.get("max_w_over_h")
        if lo is not None:
            add("sinir", slot, dict(base, width=int(math.ceil(float(lo) * h)) - 1, height=h),
                role, "band_alt_disi")
            add("sinir", slot, dict(base, width=int(math.ceil(float(lo) * h)), height=h),
                role, "band_alt_ici")
        if hi is not None:
            add("sinir", slot, dict(base, width=int(float(hi) * h), height=h),
                role, "band_ust_ici")
            add("sinir", slot, dict(base, width=int(float(hi) * h) + 1, height=h),
                role, "band_ust_disi")

    mc = req.get("max_count")
    if mc:
        add("sinir", slot, dict(base, existing_count=int(mc)), role, "adet_esit")
        add("sinir", slot, dict(base, existing_count=int(mc) + 1), role, "adet_ustunde")
    minc = req.get("min_count")
    if minc:
        add("sinir", slot, dict(base, existing_count=max(int(minc) - 1, 0)), role, "adet_eksik")
    add("sinir", slot, sans(base, "existing_count"), role, "adet_olculmedi")

    rej = acc.get("rejected_extensions") or []
    if rej:
        e = str(rej[0]).lower()
        add("bicim", slot, dict(base, extension=e, detected=EXT_DETECTED.get(e, ""),
                                mime=MIME_BY_KIND.get(EXT_DETECTED.get(e, ""), "")),
            role, "uzanti_reddedilen")
    cond = acc.get("conditional_extensions") or []
    if cond:
        e = str(cond[0]).lower()
        add("bicim", slot, dict(base, extension=e, detected=EXT_DETECTED.get(e, ""),
                                mime=MIME_BY_KIND.get(EXT_DETECTED.get(e, ""), "")),
            role, "uzanti_kosullu")
    add("bicim", slot, dict(base, extension=".xyz", detected="", mime=""), role, "uzanti_bilinmeyen")
    add("bicim", slot, dict(base, mime="application/octet-stream"), role, "mime_uyusmaz")
    add("bicim", slot, dict(base, extension_matches_content=False), role, "icerik_uzanti_uyusmaz")
    add("bicim", slot, dict(base, animated=True), role, "animasyonlu")

    add("guvenlik", slot, dict(base, leading_marker=True), role, "bas_isaretcisi")
    add("guvenlik", slot, dict(base, appended_payload=True), role, "kuyruk_yuku")
    add("guvenlik", slot, dict(base, container_valid=False), role, "kap_gecersiz")
    add("guvenlik", slot, dict(base, scan_clean=False), role, "av_kirli")
    add("guvenlik", slot, sans(base, "scan_clean"), role, "av_olculmedi")
    add("guvenlik", slot, dict(base, detected="executable"), role, "calistirilabilir")
    add("guvenlik", slot, dict(base, is_data_uri=True), role, "data_uri")

    add("kunye", slot, dict(base, readable=False), role, "okunamaz")
    add("kunye", slot, dict(base, loadable=False), role, "kesik")
    add("kunye", slot, dict(base, width=0, height=0), role, "geometri_olculmedi")
    add("kunye", slot, dict(base, exif_orientation=6), role, "exif_dondurulmus")
    add("kunye", slot, dict(base, is_private=True), role, "gizli")

    if vid:
        dmax = vid.get("duration_max_s")
        if dmax:
            for d, nm in ((-1, "altinda"), (0, "esit"), (1, "ustunde")):
                add("sinir", slot, dict(base, duration_s=int(dmax) + d), role, f"sure_max_{nm}")
        dmin = vid.get("duration_min_s")
        if dmin:
            for d, nm in ((-1, "altinda"), (0, "esit"), (1, "ustunde")):
                s = int(dmin) + d
                if s > 0:
                    add("sinir", slot, dict(base, duration_s=s), role, f"sure_min_{nm}")
        cap = vid.get("bitrate_cap_kbps")
        if cap:
            for d, nm in ((-1, "altinda"), (0, "esit"), (1, "ustunde")):
                add("sinir", slot, dict(base, bitrate_bps=int(cap) * 1000 + d), role,
                    f"bitrate_{nm}")
        kabul = (vid.get("frame_rate") or {}).get("accepted") or []
        if kabul:
            f0 = float(kabul[0])
            add("sinir", slot, dict(base, frame_rate=f0 + 0.4), role, "fps_tolerans_ici")
            add("sinir", slot, dict(base, frame_rate=f0 + 0.6), role, "fps_tolerans_disi")
        add("sinir", slot, sans(base, "duration_s"), role, "sure_olculmedi")
        add("sinir", slot, sans(base, "bitrate_bps"), role, "bitrate_olculmedi")
        add("sinir", slot, dict(base, kind="image"), role, "video_degil_kind")

dagilim = {}
for v in vectors:
    dagilim[v["kaynak"]] = dagilim.get(v["kaynak"], 0) + 1

print(json.dumps({
    "engine": {
        "kaynak": "tradehub_core/tradehub_core/media/pipeline/policy/engine.py",
        "slot_sayisi": len(slots),
        "slots": slots,
    },
    "policies": policies,
    "float_reprs": float_reprs,
    "kaynak_dagilimi": dagilim,
    "vectors": vectors,
}, ensure_ascii=False))
`;

function runGenerator() {
  const run = spawnSync("python3", ["-c", GEN_PY, CORE_REPO], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (run.status !== 0) {
    console.error("[sync-policy-engine] ÖLÇÜLMEDİ: referans motor koşturulamadı.");
    console.error(run.stderr || run.error?.message || "python3 bulunamadı");
    return null;
  }
  return JSON.parse(run.stdout);
}

// ── kaynak hash'leri ──────────────────────────────────────────────────
const manifest = {
  schema_version: "1.0.0",
  gorev: "T-033 (TS ikizi + çapraz parite)",
  aciklama:
    "Bu klasördeki dosyalar tradehub_core'dan senkronlanmış/türetilmiştir. ELLE DÜZENLEME. " +
    "Kaynağı değiştir, sonra `npm run sync:policy` koştur.",
  uretici: "admin-panel/frontend/scripts/sync-policy-engine.mjs",
  senkron_tarihi: new Date().toISOString().slice(0, 10),
  kaynaklar: {},
  turetilmis: {},
};

for (const abs of TRACKED) manifest.kaynaklar[rel(abs)] = sha256(readFileSync(abs));
for (const f of readdirSync(SLOTS).filter((x) => x.endsWith(".json")).sort()) {
  const abs = join(SLOTS, f);
  manifest.kaynaklar[rel(abs)] = sha256(readFileSync(abs));
}

// ── türetilmiş ikiz: engine.ts → vendor/engine.js ─────────────────────
const tsPath = join(POLICY, "engine.ts");
const tsRaw = readFileSync(tsPath);

async function buildErasedTwin() {
  const out = await transformWithEsbuild(tsRaw.toString("utf8"), "engine.ts", {
    loader: "ts",
    target: "esnext",
    format: "esm",
    minify: false,
    sourcemap: false,
  });
  const banner =
    "// ÜRETİLMİŞ DOSYA — elle düzenleme. Kaynak: src/lib/media/policy/engine.ts (tipleri silinmiş hâli).\n" +
    "// Yeniden üret: npm run sync:policy · Doğrula: npm test\n";
  return banner + out.code;
}

const erased = await buildErasedTwin();
manifest.turetilmis["src/lib/media/policy/vendor/engine.js"] = {
  kaynak: "src/lib/media/policy/engine.ts",
  kaynak_sha256: sha256(tsRaw),
  sha256: sha256(Buffer.from(erased)),
  uretici: `vite@${viteVersion} transformWithEsbuild(loader=ts, target=esnext, format=esm)`,
  neden: "node 20.x'te tip soyma yok; parite kapısı Node sürümüne bağlı kalmamalı",
};

// ── Python çıktısından üretilen modüller ──────────────────────────────
const gen = runGenerator();
if (!gen && !checkOnly) process.exit(1);

function buildPolicyModule(g) {
  return (
    "// ÜRETİLMİŞ DOSYA — elle düzenleme. Kaynak: tradehub_core/.../media/pipeline/policy/slots/*.json\n" +
    "// Yeniden üret: npm run sync:policy\n" +
    "//\n" +
    "// HAM politikalar — upload/vendor/slotPolicy.js'in damıtılmış ön kontrol\n" +
    "// alt kümesinin AKSİNE, ikiz motor Python'la aynı ham sözlükleri okur.\n" +
    "// FLOAT_REPRS: JSON'da float yazılmış tam sayı değerlerin Python repr'ları\n" +
    "// (str(2.0)=\"2.0\") — mesaj paritesi bunlarsız kurulamaz.\n" +
    "\n" +
    `export const FLOAT_REPRS = ${JSON.stringify(g.float_reprs, null, "\t")};\n\n` +
    `export const SLOT_POLICIES = ${JSON.stringify(g.policies, null, "\t")};\n\n` +
    "export default SLOT_POLICIES;\n"
  );
}

function buildVectorDoc(g) {
  return `${JSON.stringify(
    {
      schema_version: "1.0.0",
      gorev: "T-033",
      uretici: "admin-panel/frontend/scripts/sync-policy-engine.mjs (gömülü Python)",
      motor: g.engine,
      kaynak_dagilimi: g.kaynak_dagilimi,
      count: g.vectors.length,
      vectors: g.vectors,
    },
    null,
    "\t"
  )}\n`;
}

const policyPath = join(VENDOR, "slot_policies.js");
const vectorPath = join(VENDOR, "policy_vectors.json");
const erasedPath = join(VENDOR, "engine.js");
const manifestPath = join(VENDOR, "vendor.manifest.json");

/** senkron_tarihi her koşuda değişir; karşılaştırma ondan arındırılır. */
const soy = (s) => s.replace(/"senkron_tarihi": "[^"]*"/, "");

let drift = 0;
const yaz = (path, icerik, ad) => {
  const mevcut = existsSync(path) ? readFileSync(path, "utf8") : null;
  if (mevcut === icerik) return;
  drift += 1;
  if (checkOnly) console.error(`[sync-policy-engine] AYRIŞMA: ${ad}`);
  else {
    writeFileSync(path, icerik);
    console.log(`[sync-policy-engine] yazıldı: ${path}`);
  }
};

if (gen) {
  yaz(policyPath, buildPolicyModule(gen), "slot_policies.js");
  yaz(vectorPath, buildVectorDoc(gen), "policy_vectors.json");
} else {
  console.error("[sync-policy-engine] slot_policies.js / policy_vectors.json ÖLÇÜLMEDİ — ayrışma sayılmadı.");
  if (!existsSync(policyPath) || !existsSync(vectorPath)) {
    console.error("[sync-policy-engine] AYRIŞMA: vendor çıktıları hiç yok — senkron koşulmalı.");
    drift += 1;
  }
}

yaz(erasedPath, erased, "engine.js");

const manifestIcerik = `${JSON.stringify(manifest, null, "\t")}\n`;
{
  const mevcut = existsSync(manifestPath) ? readFileSync(manifestPath, "utf8") : null;
  if (mevcut === null || soy(mevcut) !== soy(manifestIcerik)) {
    drift += 1;
    if (checkOnly) console.error("[sync-policy-engine] AYRIŞMA: vendor.manifest.json");
    else {
      writeFileSync(manifestPath, manifestIcerik);
      console.log(`[sync-policy-engine] yazıldı: ${manifestPath}`);
    }
  }
}

if (checkOnly) {
  if (drift) {
    console.error(`[sync-policy-engine] ${drift} dosya ayrışmış — \`npm run sync:policy\` koşulmalı.`);
    process.exit(1);
  }
  console.log("[sync-policy-engine] vendor zinciri güncel.");
} else if (gen) {
  console.log(
    `[sync-policy-engine] ${gen.vectors.length} vektör (${Object.entries(gen.kaynak_dagilimi)
      .map(([k, v]) => `${k}:${v}`)
      .join(" ")}) · ${Object.keys(gen.policies).length} slot`
  );
}
