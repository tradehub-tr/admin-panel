/**
 * KD-F02 — Politika motoru paritesi + ön kontrol (preflight) doğrulaması.
 *
 * Panel, sunucudaki `PolicyEngine`in TS ikizini çalıştırıyor ve kullanıcıya
 * yükleme yapılmadan ÖNCE ret/uyarı gösteriyor. Bu dosyanın soruları:
 *
 *   1. İkiz motorun ürettiği HATA KODU, sunucunun ürettiğiyle aynı mı?
 *   2. Vendor kopyası bayat mı (kaynak değişip senkron koşulmamış mı)?
 *   3. Ön kontrol sınır değerlerinde doğru mu davranıyor?
 *
 * Ayrışan her kod, kullanıcının panelde gördüğü mesaj ile sunucunun
 * döndürdüğü kodun eşleşmemesi demek: mesaj kataloğu koda göre seçiliyorsa
 * kullanıcı "bilinmeyen hata" görür.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { evaluate, SLOT_POLICIES } from "../policy/index.js";
import {
  evaluate as preflightEvaluate,
  getSlotPolicy,
  hasBlocker,
  normalizeMeasure,
  ratioDeviation,
  ratioValue,
  REASON,
  signatureMatches,
  slotKeys,
  slotsForRole,
} from "../upload/preflight.js";

const BURASI = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_KOK = path.resolve(BURASI, "../../../..");

// ── Ortak künye kurucuları ────────────────────────────────────────────

const gorselKunye = (ustune = {}) => ({
  filename: "urun.jpg",
  extension: ".jpg",
  byte_size: 1_200_000,
  kind: "image",
  detected: "jpeg",
  mime: "image/jpeg",
  fmt: "JPEG",
  width: 2000,
  height: 2000,
  mode: "RGB",
  readable: true,
  loadable: true,
  extension_matches_content: true,
  leading_marker: false,
  appended_payload: false,
  animated: false,
  existing_count: 0,
  scan_clean: true,
  ...ustune,
});

const videoKunye = (ustune = {}) => ({
  filename: "kapak.mp4",
  extension: ".mp4",
  byte_size: 20_000_000,
  kind: "video",
  detected: "mp4",
  mime: "video/mp4",
  width: 1920,
  height: 1080,
  duration_s: 20,
  bitrate_bps: 4_000_000,
  frame_rate: 30,
  readable: true,
  loadable: true,
  extension_matches_content: true,
  animated: true,
  existing_count: 0,
  scan_clean: true,
  ...ustune,
});

// ══════════════════════════════════════════════════════════════════════
// 1. Vendor tazeliği
// ══════════════════════════════════════════════════════════════════════

describe("KD-F02/1 · vendor senkron durumu", () => {
  it("vendor kopyası kaynakla SENKRON (sync:policy:check yeşil)", () => {
    // F-13a düzeltildi. `npm run sync:policy:check` üreteci yeniden koşturup
    // çıktıyı diskteki dosyayla karşılaştırır. Ayrışma = backend değişmiş,
    // panel eski davranışı taşıyor.
    //
    // Ayrışma bulunduğunda taşıdığı şey ölçüldü (2026-08-28): vendor
    // vektörleri BAYAT HATA KODLARI taşıyordu — `cover_video_ratio_not_allowed`
    // yerine artık `cover_video_aspect_invalid` üretiliyor. Kod dış API
    // sözleşmesi olduğu için ayrışma sessiz değil, YANLIŞ.
    //
    // Kapının kendisi CI'da koşmuyor (kök CLAUDE.md §4.11'deki lojistik
    // üreteciyle aynı desen: "OTOMATİK KAPI YOK"); yakalayan tek şey bu test.
    let ayrisma = false;
    let cikti = "";
    try {
      cikti = execFileSync("npm", ["run", "--silent", "sync:policy:check"], {
        cwd: FRONTEND_KOK,
        encoding: "utf8",
        timeout: 120_000,
      });
    } catch (err) {
      ayrisma = true;
      cikti = String(err.stdout || "") + String(err.stderr || "");
    }
    assert.equal(ayrisma, false, `vendor kaynaktan ayrışmış — \`npm run sync:policy\` koştur:\n${cikti}`);
  });

  it("vendor manifesti hangi kaynaklardan türediğini kayıt altında tutuyor", () => {
    const yol = path.join(FRONTEND_KOK, "src/lib/media/policy/vendor/vendor.manifest.json");
    assert.ok(existsSync(yol), "manifest yok");
    const m = JSON.parse(readFileSync(yol, "utf8"));
    assert.ok(m.kaynaklar && Object.keys(m.kaynaklar).length >= 9, "kaynak listesi eksik");
    assert.ok(m.senkron_tarihi, "senkron tarihi yok");
    for (const [dosya, sha] of Object.entries(m.kaynaklar)) {
      assert.match(sha, /^[a-f0-9]{64}$/, dosya);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. Hata kodu paritesi — asıl bulgu
// ══════════════════════════════════════════════════════════════════════

describe("KD-F02/2 · hata kodu paritesi (istemci ↔ sunucu)", () => {
  const cv = SLOT_POLICIES["company.cover_video"];
  const kodTablosu = new Map(
    ((cv.video || {}).validation_codes || []).map((k) => [k.message_key, k.code]),
  );

  it("slot politikası `video.validation_codes` ilan ediyor", () => {
    assert.ok(kodTablosu.size >= 5, "validation_codes tablosu beklenenden küçük");
    assert.equal(kodTablosu.get("oran_16_9_degil"), "cover_video_aspect_invalid");
    assert.equal(kodTablosu.get("cozunurluk_dusuk"), "cover_video_resolution_too_low");
    assert.equal(kodTablosu.get("sure_uzun"), "cover_video_too_long");
  });

  it("istemci motoru `validation_codes` tablosunu OKUYOR", () => {
    // F-13b düzeltildi. Sunucu `PolicyEngine._code()` içinde önce
    // `video.validation_codes` tablosuna bakıyor; istemcinin `code()` metodu
    // doğrudan `${prefix}_${rule}` üretiyordu. Sonuç: AYNI ihlal, FARKLI kod —
    // ve kod dış API sözleşmesi, panelin gösterdiği hiçbir belgede yoktu.
    const karar = evaluate("company.cover_video", videoKunye({ width: 1920, height: 800 }), "seller");
    const oran = karar.violations.find((v) => v.rule === "ratio_not_allowed");
    assert.ok(oran, "oran ihlali üretilmedi — kurgu bozuldu");
    assert.equal(oran.code, kodTablosu.get("oran_16_9_degil"));
    assert.notEqual(oran.code, "cover_video_ratio_not_allowed", "türetilmiş kod hâlâ kullanılıyor");
  });

  it("süre ve çözünürlük kodları da SUNUCUYLA AYNI", () => {
    const uzun = evaluate("company.cover_video", videoKunye({ duration_s: 120 }), "seller");
    const sure = uzun.violations.find((v) => v.rule === "duration_too_long");
    assert.ok(sure);
    assert.equal(sure.code, kodTablosu.get("sure_uzun"));

    const kucuk = evaluate("company.cover_video", videoKunye({ width: 640, height: 360 }), "seller");
    const kenar = kucuk.violations.find((v) => v.rule === "short_edge_too_small");
    assert.ok(kenar);
    assert.equal(kenar.code, kodTablosu.get("cozunurluk_dusuk"));
  });

  it("MESSAGE_KEYS aynası Python ile aynı — F-30", () => {
    // İki kuralda ayna BAYATTI (`duration_too_short` → `sure_kisa`,
    // `too_many_pixels` → `cozunurluk_yuksek` eksikti). Sonuç yalnız yanlış kod
    // değil, yanlış METİN de oldu: politikanın kendi TR mesajı bulunamayınca
    // genel katalog metni gösteriliyordu.
    const kisa = evaluate("company.cover_video", videoKunye({ duration_s: 5 }), "seller");
    const v = kisa.violations.find((x) => x.rule === "duration_too_short");
    assert.ok(v, "kısa süre ihlali üretilmedi");
    assert.equal(v.code, kodTablosu.get("sure_kisa"));
    assert.match(v.message.tr, /Kapak videosu/, "politikanın kendi TR metni kullanılmıyor");
  });

  it("ayrışma YALNIZ cover_video slotunda — diğer slotlarda kod paritesi duruyor", () => {
    // `validation_codes` yalnız video slotlarında var; görsel slotlarında
    // iki taraf da `${prefix}_${rule}` üretiyor.
    const k = evaluate("product.image", gorselKunye({ width: 400, height: 400 }), "seller");
    const v = k.violations.find((x) => x.rule === "short_edge_too_small");
    assert.ok(v);
    assert.equal(v.code, "product_image_short_edge_too_small");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. İkiz motorun karar sözleşmesi
// ══════════════════════════════════════════════════════════════════════

describe("KD-F02/3 · ikiz motor karar sözleşmesi", () => {
  it("temiz ürün görseli kabul edilir ve hedef üretir", () => {
    const k = evaluate("product.image", gorselKunye(), "seller");
    assert.equal(k.allow, true, JSON.stringify(k.violations));
    assert.ok(k.normalized_targets && Object.keys(k.normalized_targets).length > 0);
  });

  it("reddedilen dosyada hedef ÜRETİLMEZ", () => {
    const k = evaluate("product.image", gorselKunye({ width: 200, height: 200 }), "seller");
    assert.equal(k.allow, false);
    assert.deepEqual(k.normalized_targets, {});
  });

  it("SINIR · kısa kenar tam 1000 geçer, 999 düşer", () => {
    assert.equal(evaluate("product.image", gorselKunye({ width: 1000, height: 1000 }), "seller").allow, true);
    assert.equal(evaluate("product.image", gorselKunye({ width: 999, height: 999 }), "seller").allow, false);
  });

  it("güvenlik bayrakları reddettiriyor", () => {
    for (const bayrak of [{ leading_marker: true }, { appended_payload: true }, { scan_clean: false }]) {
      const k = evaluate("product.image", gorselKunye(bayrak), "seller");
      assert.equal(k.allow, false, JSON.stringify(bayrak));
    }
  });

  it("bilinmeyen slot açık hata verir, sessizce kabul etmez", () => {
    assert.throws(() => evaluate("olmayan.slot", gorselKunye(), "seller"));
  });

  it("her ihlalde kod + mesaj dolu", () => {
    const k = evaluate("product.image", gorselKunye({ width: 100, height: 100 }), "seller");
    assert.ok(k.violations.length > 0);
    for (const v of k.violations) {
      assert.ok(v.code, "kod boş");
      assert.ok(v.message && (v.message.tr || v.message.en), `mesaj boş: ${v.rule}`);
    }
  });

  it("karar nesnesi sunucudaki alan adlarını taşıyor", () => {
    const k = evaluate("product.image", gorselKunye(), "seller");
    for (const alan of [
      "allow",
      "slot",
      "role",
      "action",
      "violations",
      "normalized_targets",
      "skipped",
      "policy_version",
      "policy_status",
    ]) {
      assert.ok(alan in k, `eksik alan: ${alan}`);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════
// 4. Ön kontrol (preflight)
// ══════════════════════════════════════════════════════════════════════

describe("KD-F02/4 · preflight yardımcıları", () => {
  it("ratioValue etiketleri çözer, bozukta null", () => {
    assert.equal(ratioValue("16:9"), 16 / 9);
    assert.equal(ratioValue("1:1"), 1);
    assert.equal(ratioValue("4 : 5"), 0.8);
    for (const kotu of ["", "abc", "16:0", "16/9", null, undefined, "16:"]) {
      assert.equal(ratioValue(kotu), null, String(kotu));
    }
  });

  it("ratioDeviation BAĞIL sapma verir (mutlak değil)", () => {
    // 1:1 için 0,02 ile 3:1 için 0,02 aynı şey değildir.
    assert.equal(ratioDeviation(1, ["1:1"]), 0);
    assert.ok(Math.abs(ratioDeviation(1.02, ["1:1"]) - 0.02) < 1e-9);
    assert.ok(Math.abs(ratioDeviation(3.06, ["3:1"]) - 0.02) < 1e-9);
    assert.equal(ratioDeviation(0, ["1:1"]), null);
    assert.equal(ratioDeviation(1, []), null);
  });

  it("normalizeMeasure türetilenleri hesaplar", () => {
    const m = normalizeMeasure({ width: 2000, height: 1000, size: 1_000_000, durationS: 10 });
    assert.equal(m.shortEdge, 1000);
    assert.equal(m.longEdge, 2000);
    assert.equal(m.area, 2_000_000);
    assert.equal(m.aspectRatio, 2);
    assert.equal(m.megapixels, 2);
    assert.equal(m.bitrateBps, Math.round((1_000_000 * 8) / 10));
  });

  it("normalizeMeasure ölçülemeyeni null bırakır — 0 DEĞİL", () => {
    const m = normalizeMeasure({ width: 0, height: 0 });
    for (const alan of ["width", "height", "shortEdge", "longEdge", "area", "aspectRatio", "megapixels"]) {
      assert.equal(m[alan], null, alan);
    }
    assert.equal(m.bitrateBps, null);
  });

  it("normalizeMeasure boş girdide patlamaz", () => {
    const m = normalizeMeasure();
    assert.equal(m.width, null);
    assert.equal(m.ext, "");
  });

  it("uzantı küçük harfe indirgenir", () => {
    assert.equal(normalizeMeasure({ ext: ".JPG" }).ext, ".jpg");
  });

  it("slot kataloğu ve rol süzgeci çalışır", () => {
    const anahtarlar = slotKeys();
    assert.ok(anahtarlar.includes("product.image"), anahtarlar.join(","));
    assert.equal(getSlotPolicy("olmayan.slot"), null);
    assert.ok(getSlotPolicy("product.image"));
    assert.ok(slotsForRole("seller").length > 0);
    assert.equal(slotsForRole("").length, slotKeys().length);
  });

  it("signatureMatches uzantı/içerik uyumunu doğrular", () => {
    assert.equal(signatureMatches(".jpg", "jpeg"), true);
    assert.equal(signatureMatches(".jpg", "png"), false);
    assert.equal(signatureMatches(".png", "png"), true);
  });

  it("hasBlocker yalnız BLOCK seviyesini sayar", () => {
    assert.equal(hasBlocker([]), false);
    assert.equal(hasBlocker([{ reason: REASON.TOO_LARGE, severity: "warn" }]), false);
    assert.equal(hasBlocker([{ reason: REASON.TOO_LARGE, severity: "block" }]), true);
  });
});

describe("KD-F02/5 · preflight değerlendirmesi", () => {
  // `decoded: true` ZORUNLU: ölçüm yapılmadıysa preflight geometri
  // kurallarını hiç uygulamıyor, `probe_unavailable` + manual_review dönüyor.
  const olcum = (ustune = {}) => ({
    decoded: true,
    width: 2000,
    height: 2000,
    size: 1_200_000,
    ext: ".jpg",
    mime: "image/jpeg",
    sniffed: "jpeg",
    ...ustune,
  });

  it("uygun dosya kabul edilir", () => {
    const r = preflightEvaluate(olcum(), { slotKey: "product.image", count: 1 });
    assert.equal(hasBlocker(r.findings), false, JSON.stringify(r.findings));
  });

  it("bilinmeyen slot: iz bırakır ama ENGELLEMEZ (bilinçli sözleşme)", () => {
    // Slotsuz serbest yükleme geçerli bir kullanım; ön kontrol bunu bloklamaz,
    // sunucunun genel politikasına bırakır. Sözleşme sabitleniyor.
    const r = preflightEvaluate(olcum(), { slotKey: "olmayan.slot" });
    assert.ok(r.findings.some((f) => f.reason === REASON.POLICY_NOT_FOUND));
    assert.equal(hasBlocker(r.findings), false);
  });

  it("ölçüm yapılmadıysa PROBE_UNAVAILABLE + manual_review", () => {
    const r = preflightEvaluate({ size: 100, ext: ".jpg" }, { slotKey: "product.image" });
    assert.ok(r.findings.some((f) => f.reason === REASON.PROBE_UNAVAILABLE));
    assert.equal(hasBlocker(r.findings), false, "ölçülemeyen dosya BLOK olmamalı");
  });

  it("BULGU F-16 · uzantı/içerik uyuşmazlığı istemcide UYARI, sunucuda RET", () => {
    // İstemci kodu bunu bilinçli olarak `warn` bırakıyor ve gerekçesinde
    // "sunucu da reddetmiyor (upload_policy.check)" diyor. Ama slot yolundaki
    // `PolicyEngine._check_accept` ve kabul kapısı `image/probe._guard`
    // uyuşmazlığı REDDEDİYOR (KD-06 `test_gv_uzanti_icerik_uyusmazligi`,
    // KD-01 `test_gv_uzanti_icerik_uyusmazligi`). Yani kullanıcı panelde
    // "uyarı" görüp yüklüyor, sunucu reddediyor.
    const r = preflightEvaluate(olcum({ sniffed: "png" }), { slotKey: "product.image" });
    const b = r.findings.find((f) => f.reason === REASON.EXT_CONTENT_MISMATCH);
    assert.ok(b, JSON.stringify(r.findings));
    assert.equal(b.severity, "warn", "F-16 kapanmış olabilir — artık block");

    const sunucu = evaluate(
      "product.image",
      gorselKunye({ extension_matches_content: false, detected: "png" }),
      "seller",
    );
    assert.equal(sunucu.allow, false, "sunucu ikizi artık reddetmiyorsa F-16 kapandı");
  });

  it("SINIR · çok küçük görsel engellenir", () => {
    const r = preflightEvaluate(olcum({ width: 100, height: 100 }), { slotKey: "product.image" });
    assert.equal(hasBlocker(r.findings), true);
  });

  it("SINIR · adet aşımı engellenir", () => {
    const az = preflightEvaluate(olcum(), { slotKey: "product.image", count: 12 });
    const cok = preflightEvaluate(olcum(), { slotKey: "product.image", count: 13 });
    assert.equal(
      cok.findings.some((f) => f.reason === REASON.COUNT_EXCEEDED),
      true,
      JSON.stringify(cok.findings),
    );
    assert.equal(az.findings.some((f) => f.reason === REASON.COUNT_EXCEEDED), false);
  });

  it("boş dosya bildirilir", () => {
    const r = preflightEvaluate(olcum({ size: 0 }), { slotKey: "product.image" });
    assert.ok(r.findings.some((f) => f.reason === REASON.EMPTY), JSON.stringify(r.findings));
  });

  it("her koşulda {action, findings, slot, measure} döner", () => {
    for (const g of [olcum(), olcum({ width: 0, height: 0 }), {}, { ext: ".xyz" }]) {
      const r = preflightEvaluate(g, { slotKey: "product.image" });
      assert.ok("action" in r && "findings" in r && "slot" in r && "measure" in r);
      assert.ok(Array.isArray(r.findings));
    }
  });

  it("hiçbir girdide istisna atmaz", () => {
    for (const g of [null, undefined, {}, { width: -1, height: -1 }, { size: -5 }]) {
      assert.doesNotThrow(() => preflightEvaluate(g, { slotKey: "product.image" }), String(g));
    }
  });
});
