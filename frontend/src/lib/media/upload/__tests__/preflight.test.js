import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { isAnimated, isDangerous, readDimensions, readDpi, sniffSignature } from "../bytes.js";
import {
  ACTION,
  REASON,
  SEVERITY,
  evaluate,
  getSlotPolicy,
  hasBlocker,
  ratioDeviation,
  ratioValue,
  slotKeys,
  slotsForRole,
} from "../preflight.js";
import { VENDOR_MANIFEST } from "../vendor/slotPolicy.js";

/**
 * Yükleme ön kontrolü — kural, bayt okuyucular ve kaynak ayrışması.
 *
 *   ÖLÇÜLÜR  — 9 slotun kataloğa eksiksiz taşındığı, eşik karşılaştırmalarının
 *              sunucudaki referans uygulamayla (`fakes/policy.py`) aynı yönde
 *              olduğu, başlıktan boyut okumanın gerçek dosya baytlarıyla
 *              doğru sonuç verdiği, ölçülemeyenin `manual_review` ürettiği ve
 *              kopyalanan politikanın kaynağıyla hâlâ aynı olduğu.
 *   ÖLÇÜLMEZ — `createImageBitmap` / `OffscreenCanvas` / `mediabunny` yolları.
 *              Üçü de tarayıcı API'si; Node koşucusunda yoklar. Alfa tespiti,
 *              AVIF/HEIC çözümü ve video ölçümü bu testin KAPSAMI DIŞINDA —
 *              tarayıcıda DOĞRULANMADI.
 */

const FRONTEND = path.resolve(fileURLToPath(new URL("../../../../..", import.meta.url)));
const ISTOC = path.resolve(FRONTEND, "../..");

// ── Kopya ayrışması ────────────────────────────────────────────────

test("kopyalanan slot politikası kaynağıyla hâlâ aynı", () => {
  // Kopya sessizce eskirse ekrandaki kural sunucudakinden ayrışır ve
  // kullanıcı ekranda kabul edilen dosyanın sunucuda reddedildiğini görür.
  // Bu test o sessizliği bozuyor.
  for (const [goreli, ozet] of Object.entries(VENDOR_MANIFEST.kaynaklar)) {
    const tam = path.join(ISTOC, goreli);
    const simdi = createHash("sha256").update(readFileSync(tam)).digest("hex");
    assert.equal(simdi, ozet, `${goreli} değişmiş — node src/lib/media/upload/sync.mjs koştur`);
  }
});

test("9 slotun hepsi katalogda ve ölçülebilir alanları dolu", () => {
  const anahtarlar = slotKeys();
  assert.equal(anahtarlar.length, 9);
  assert.deepEqual([...anahtarlar].sort(), [
    "brand.logo",
    "category.banner",
    "company.cover_image",
    "company.cover_video",
    "document.attachment",
    "product.image",
    "product.video",
    "seller.logo",
    "user.avatar",
  ]);
  for (const k of anahtarlar) {
    const s = getSlotPolicy(k);
    assert.ok(s.accept.extensions.length, `${k}: uzantı listesi boş`);
    assert.ok(s.accept.maxBytes > 0, `${k}: bayt sınırı yok`);
  }
});

test("video slotları video bloğu taşıyor, görsel slotları taşımıyor", () => {
  assert.equal(getSlotPolicy("product.video").kind, "video");
  assert.equal(getSlotPolicy("product.video").video.durationMaxS, 33);
  assert.equal(getSlotPolicy("company.cover_video").video.durationMinS, 6);
  assert.equal(getSlotPolicy("product.image").video, null);
});

test("rol süzgeci — ürün videosunu yalnız satıcı yüklüyor", () => {
  const satici = slotsForRole("seller").map((s) => s.slotKey);
  const yonetici = slotsForRole("admin").map((s) => s.slotKey);
  assert.ok(satici.includes("product.video"));
  assert.ok(!yonetici.includes("product.video"));
  assert.ok(yonetici.includes("brand.logo"));
  assert.ok(!satici.includes("brand.logo"));
});

// ── Oran hesabı ────────────────────────────────────────────────────

test("oran etiketi çözülüyor, çözülemeyen null", () => {
  assert.equal(ratioValue("16:9"), 16 / 9);
  assert.equal(ratioValue("210:297"), 210 / 297);
  assert.equal(ratioValue("kare"), null);
  assert.equal(ratioValue("1:0"), null);
});

test("[FR-016] sapma EN YAKIN hedefe göre ve BAĞIL — sunucudaki formülün aynısı", () => {
  // `min(|ar - hedef| / hedef)`. Mutlak fark kullanılsaydı 1:1 için 0,02 ile
  // 3:1 için 0,02 aynı şeyi ifade etmezdi.
  const sapma = ratioDeviation(1.0, ["1:1", "4:5", "3:4"]);
  assert.equal(sapma, 0);
  const yakin = ratioDeviation(1.01, ["1:1", "4:5"]);
  assert.ok(yakin > 0 && yakin < 0.02);
  assert.equal(ratioDeviation(null, ["1:1"]), null);
});

// ── Kural kapıları ─────────────────────────────────────────────────

const gorsel = (extra = {}) => ({
  name: "urun.jpg",
  ext: ".jpg",
  mime: "image/jpeg",
  size: 2_000_000,
  width: 2000,
  height: 2000,
  decoded: true,
  animated: false,
  hasAlpha: null,
  sniffed: "jpeg",
  ...extra,
});

test("kurallara uyan ürün görseli kabul ediliyor", () => {
  const { action, findings } = evaluate(gorsel(), { slotKey: "product.image" });
  assert.equal(action, ACTION.ACCEPT);
  assert.equal(hasBlocker(findings), false);
});

test("[FR-011] megapiksel tavanı `>` ile reddediyor — eşitlik geçerli", () => {
  const tavan = getSlotPolicy("product.image").accept.maxMegapixelsHard; // 80
  // Tam tavanda: 80 MP → geçer.
  const tam = evaluate(gorsel({ width: 8000, height: 10_000 }), { slotKey: "product.image" });
  assert.equal(tam.measure.megapixels, tavan);
  assert.equal(
    tam.findings.some((f) => f.reason === REASON.MEGAPIXEL_BOMB),
    false
  );
  // Bir piksel üstünde: reddedilir.
  const asan = evaluate(gorsel({ width: 8001, height: 10_000 }), { slotKey: "product.image" });
  const bulgu = asan.findings.find((f) => f.reason === REASON.MEGAPIXEL_BOMB);
  assert.equal(asan.action, ACTION.REJECT);
  assert.equal(bulgu.severity, SEVERITY.BLOCK);
  assert.equal(bulgu.params.limit, tavan);
});

test("[FR-015] kısa kenar `>=` ile geçerli", () => {
  // Sunucu testi (`test_e2e_scenarios.py:169`) 999'un REDDEDİLDİĞİNİ söylüyor.
  const tam = evaluate(gorsel({ width: 1000, height: 1000 }), { slotKey: "product.image" });
  assert.equal(
    tam.findings.some((f) => f.reason === REASON.SHORT_EDGE_TOO_SMALL),
    false
  );
  const eksik = evaluate(gorsel({ width: 999, height: 999 }), { slotKey: "product.image" });
  assert.ok(eksik.findings.some((f) => f.reason === REASON.SHORT_EDGE_TOO_SMALL));
  assert.equal(eksik.action, ACTION.REJECT);
});

test("[FR-016] izinsiz oran reddediliyor, tolerans içi geçiyor", () => {
  // product.image: 1:1, 4:5, 3:4 · tolerans 0,02
  const kare = evaluate(gorsel({ width: 2000, height: 2000 }), { slotKey: "product.image" });
  assert.equal(
    kare.findings.some((f) => f.reason === REASON.RATIO_NOT_ALLOWED),
    false
  );
  const genis = evaluate(gorsel({ width: 3000, height: 1000 }), { slotKey: "product.image" });
  assert.ok(genis.findings.some((f) => f.reason === REASON.RATIO_NOT_ALLOWED));
});

test("logo oran BANDI ayrı kural — 0,5…2,0 dışı reddediliyor", () => {
  const iyi = evaluate(
    gorsel({
      ext: ".png",
      mime: "image/png",
      sniffed: "png",
      width: 512,
      height: 512,
      size: 90_000,
    }),
    { slotKey: "seller.logo" }
  );
  assert.equal(iyi.action, ACTION.ACCEPT);
  const uzun = evaluate(
    gorsel({
      ext: ".png",
      mime: "image/png",
      sniffed: "png",
      width: 2000,
      height: 300,
      size: 90_000,
    }),
    { slotKey: "seller.logo" }
  );
  assert.ok(uzun.findings.some((f) => f.reason === REASON.RATIO_NOT_ALLOWED));
});

test("düşük çözünürlük UYARIYOR, reddetmiyor", () => {
  // seller.logo: min 256, önerilen 512. 300 kabul sınırının üstünde.
  const sonuc = evaluate(
    gorsel({
      ext: ".png",
      mime: "image/png",
      sniffed: "png",
      width: 300,
      height: 300,
      size: 40_000,
    }),
    { slotKey: "seller.logo" }
  );
  const uyari = sonuc.findings.find((f) => f.reason === REASON.UNDER_SPEC);
  assert.equal(uyari.severity, SEVERITY.WARN);
  assert.equal(sonuc.action, ACTION.ACCEPT);
});

test("bayt sınırı aşımı reddediliyor ve MB olarak raporlanıyor", () => {
  const sinir = getSlotPolicy("category.banner").accept.maxBytes; // 5 MB
  const sonuc = evaluate(gorsel({ size: sinir + 1, width: 1600, height: 900 }), {
    slotKey: "category.banner",
  });
  const bulgu = sonuc.findings.find((f) => f.reason === REASON.TOO_LARGE);
  assert.equal(bulgu.severity, SEVERITY.BLOCK);
  assert.equal(bulgu.params.limitMb, "5.0");
});

test("izinsiz uzantı ve MIME ayrı ayrı reddediliyor", () => {
  const uzanti = evaluate(gorsel({ ext: ".gif", mime: "", sniffed: "gif" }), {
    slotKey: "product.image",
  });
  assert.ok(uzanti.findings.some((f) => f.reason === REASON.EXT_NOT_ALLOWED));

  const mime = evaluate(gorsel({ mime: "image/gif" }), { slotKey: "product.image" });
  assert.ok(mime.findings.some((f) => f.reason === REASON.MIME_NOT_ALLOWED));
});

test("boş MIME ihlal SAYILMIYOR — sürükle-bırakta sık", () => {
  const sonuc = evaluate(gorsel({ mime: "" }), { slotKey: "product.image" });
  assert.equal(
    sonuc.findings.some((f) => f.reason === REASON.MIME_NOT_ALLOWED),
    false
  );
});

test("[FR-012] animasyon yasağı yalnız animasyon ÖLÇÜLDÜYSE işliyor", () => {
  const bilinmiyor = evaluate(
    gorsel({ ext: ".webp", mime: "image/webp", sniffed: "webp", animated: null }),
    { slotKey: "product.image" }
  );
  assert.equal(
    bilinmiyor.findings.some((f) => f.reason === REASON.ANIMATED_NOT_ALLOWED),
    false
  );
  const animasyonlu = evaluate(
    gorsel({ ext: ".webp", mime: "image/webp", sniffed: "webp", animated: true }),
    { slotKey: "product.image" }
  );
  assert.ok(animasyonlu.findings.some((f) => f.reason === REASON.ANIMATED_NOT_ALLOWED));
});

test("uzantı/imza uyuşmazlığı UYARI — sunucu da reddetmiyor", () => {
  const sonuc = evaluate(gorsel({ ext: ".png", mime: "image/png", sniffed: "jpeg" }), {
    slotKey: "product.image",
  });
  const bulgu = sonuc.findings.find((f) => f.reason === REASON.EXT_CONTENT_MISMATCH);
  assert.equal(bulgu.severity, SEVERITY.WARN);
  assert.equal(sonuc.action, ACTION.ACCEPT);
});

test("tehlikeli içerik reddediliyor", () => {
  const sonuc = evaluate(gorsel({ dangerous: true }), { slotKey: "product.image" });
  assert.equal(sonuc.action, ACTION.REJECT);
  assert.ok(sonuc.findings.some((f) => f.reason === REASON.DANGEROUS_CONTENT));
});

test("[FR-018] max_count aşımı reddediliyor", () => {
  const limit = getSlotPolicy("product.image").require.maxCount; // 12
  const on2 = evaluate(gorsel(), { slotKey: "product.image", count: limit });
  assert.equal(
    on2.findings.some((f) => f.reason === REASON.COUNT_EXCEEDED),
    false
  );
  const on3 = evaluate(gorsel(), { slotKey: "product.image", count: limit + 1 });
  assert.ok(on3.findings.some((f) => f.reason === REASON.COUNT_EXCEEDED));
});

test("ölçülemeyen ne reddediliyor ne sessizce geçiyor", () => {
  const sonuc = evaluate(gorsel({ decoded: false, width: null, height: null }), {
    slotKey: "product.image",
  });
  assert.equal(sonuc.action, ACTION.MANUAL_REVIEW);
  assert.ok(sonuc.findings.some((f) => f.reason === REASON.PROBE_UNAVAILABLE));

  const bozuk = evaluate(gorsel({ decoded: false, decodeFailed: true, width: null }), {
    slotKey: "product.image",
  });
  assert.ok(bozuk.findings.some((f) => f.reason === REASON.DECODE_FAILED));
});

test("slot verilmezse kural uygulanmıyor — serbest yükleme yolu", () => {
  const sonuc = evaluate(gorsel({ width: 50, height: 50 }), {});
  assert.equal(sonuc.action, ACTION.ACCEPT);
  assert.equal(sonuc.slot, null);
  assert.equal(sonuc.findings.length, 0);
});

test("bilinmeyen slot anahtarı sessizce geçmiyor", () => {
  const sonuc = evaluate(gorsel(), { slotKey: "yok.boyle" });
  assert.ok(sonuc.findings.some((f) => f.reason === REASON.POLICY_NOT_FOUND));
});

// ── Video kapıları ─────────────────────────────────────────────────

const video = (extra = {}) => ({
  name: "tanitim.mp4",
  ext: ".mp4",
  mime: "video/mp4",
  size: 4_000_000,
  width: 1280,
  height: 720,
  durationS: 20,
  decoded: true,
  sniffed: "mp4",
  ...extra,
});

test("süre üst sınırı reddediyor — ürün videosu 33 sn", () => {
  assert.equal(
    evaluate(video({ durationS: 33 }), { slotKey: "product.video" }).action,
    ACTION.ACCEPT
  );
  const uzun = evaluate(video({ durationS: 34 }), { slotKey: "product.video" });
  assert.equal(uzun.action, ACTION.REJECT);
  assert.ok(uzun.findings.some((f) => f.reason === REASON.DURATION_OUT_OF_RANGE));
});

test("kapak videosunda ALT süre sınırı da var", () => {
  const kisa = evaluate(video({ durationS: 4, size: 9_000_000, width: 1920, height: 1080 }), {
    slotKey: "company.cover_video",
  });
  assert.ok(kisa.findings.some((f) => f.reason === REASON.DURATION_OUT_OF_RANGE));
});

test("çözünürlük alt sınırı reddediyor", () => {
  const dusuk = evaluate(video({ width: 480, height: 270 }), { slotKey: "product.video" });
  assert.ok(dusuk.findings.some((f) => f.reason === REASON.SHORT_EDGE_TOO_SMALL));
});

test("bit hızı tavanı UYARIYOR, reddetmiyor — transcode zaten düşürüyor", () => {
  // 10 MB / 5 sn ≈ 16 Mbps; tavan 2500 kbps.
  const sonuc = evaluate(video({ size: 10_000_000, durationS: 5 }), { slotKey: "product.video" });
  const bulgu = sonuc.findings.find((f) => f.reason === REASON.BITRATE_EXCEEDED);
  assert.equal(bulgu.severity, SEVERITY.WARN);
});

test("süre ölçülemezse ret değil uyarı", () => {
  const sonuc = evaluate(video({ durationS: null }), { slotKey: "product.video" });
  assert.ok(sonuc.findings.some((f) => f.reason === REASON.PROBE_UNAVAILABLE));
  assert.notEqual(sonuc.action, ACTION.REJECT);
});

// ── Bayt okuyucular ────────────────────────────────────────────────

const png = (w, h, extra = []) => {
  const bas = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13];
  const ihdr = [0x49, 0x48, 0x44, 0x52];
  const b = (n) => [(n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];
  return Uint8Array.from([...bas, ...ihdr, ...b(w), ...b(h), 8, 6, 0, 0, 0, ...extra]);
};

const ascii = (s) => Array.from(s, (c) => c.charCodeAt(0));

test("imza tablosu sunucunun tanıdığı türleri tanıyor", () => {
  assert.equal(sniffSignature(png(1, 1)), "png");
  assert.equal(sniffSignature(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), "jpeg");
  assert.equal(sniffSignature(Uint8Array.from(ascii("GIF89a"))), "gif");
  assert.equal(sniffSignature(Uint8Array.from(ascii("%PDF-1.7"))), "pdf");
  assert.equal(sniffSignature(Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3])), "webm");
  // RIFF: WEBP ile WAV aynı başlıkla başlıyor, ayrım 8. bayttan.
  const webp = Uint8Array.from([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBPVP8 ")]);
  assert.equal(sniffSignature(webp), "webp");
  const wav = Uint8Array.from([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WAVEfmt ")]);
  assert.equal(sniffSignature(wav), "");
  assert.equal(sniffSignature(new Uint8Array(0)), "");
});

test("tehlikeli içerik baştaki boşlukla atlatılamıyor", () => {
  assert.equal(isDangerous(Uint8Array.from(ascii("<svg xmlns="))), true);
  assert.equal(isDangerous(Uint8Array.from(ascii("   \n\t<SVG "))), true);
  assert.equal(isDangerous(Uint8Array.from([0xef, 0xbb, 0xbf, ...ascii("<html>")])), true);
  assert.equal(isDangerous(png(10, 10)), false);
  assert.equal(isDangerous(new Uint8Array(0)), false);
});

test("[FR-011] PNG boyutu başlıktan okunuyor — dosya ÇÖZÜLMEDEN", () => {
  assert.deepEqual(readDimensions(png(1234, 567)), { width: 1234, height: 567 });
});

test("JPEG boyutu SOF çerçevesinden okunuyor, DHT atlanıyor", () => {
  // FFD8 · APP0(uzunluk 16) · DHT(0xC4 — çerçeve DEĞİL) · SOF0
  const govde = [
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x10,
    ...ascii("JFIF\0"),
    0x01,
    0x01,
    0x00,
    0x00,
    0x48,
    0x00,
    0x48,
    0x00,
    0x00,
    0xff,
    0xc4,
    0x00,
    0x05,
    0,
    0,
    0,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    0x04,
    0xb0,
    0x07,
    0x80,
  ];
  assert.deepEqual(readDimensions(Uint8Array.from(govde)), { width: 1920, height: 1200 });
});

test("GIF boyutu mantıksal ekran tanımından okunuyor", () => {
  const gif = Uint8Array.from([...ascii("GIF89a"), 0x40, 0x01, 0xf0, 0x00]);
  assert.deepEqual(readDimensions(gif), { width: 320, height: 240 });
});

test("okunamayan biçimde boyut null — çözmeye düşülsün diye", () => {
  assert.equal(readDimensions(Uint8Array.from(ascii("ftypavif"))), null);
  assert.equal(readDimensions(new Uint8Array(0)), null);
});

test("APNG animasyon olarak, düz PNG statik olarak okunuyor", () => {
  const duz = png(10, 10, ascii("IDAT"));
  assert.equal(isAnimated(duz), false);
  const apng = png(10, 10, [...ascii("acTL"), 0, 0, 0, 2, ...ascii("IDAT")]);
  assert.equal(isAnimated(apng), true);
});

test("çok kareli GIF animasyon, tek kareli değil", () => {
  const tek = Uint8Array.from([...ascii("GIF89a"), 0, 0, 0, 0, 0x21, 0xf9, 0x04, 0]);
  assert.equal(isAnimated(tek), false);
  const cok = Uint8Array.from([
    ...ascii("GIF89a"),
    0,
    0,
    0,
    0,
    0x21,
    0xf9,
    0x04,
    0,
    0x2c,
    0,
    0x21,
    0xf9,
    0x04,
    0,
  ]);
  assert.equal(isAnimated(cok), true);
});

test("bilinmeyen biçimde animasyon `null` — `false` DEĞİL", () => {
  // AVIF/HEIC animasyonu bu kodla anlaşılmıyor; `false` demek animasyonlu bir
  // dosyayı statik saymak olurdu.
  assert.equal(isAnimated(Uint8Array.from([0, 0, 0, 0x18, ...ascii("ftypavif")])), null);
  assert.equal(isAnimated(new Uint8Array(0)), null);
});

test("JFIF yoğunluğu DPI olarak okunuyor, birim 0 sayılmıyor", () => {
  const jfif = (birim, x) =>
    Uint8Array.from([
      0xff,
      0xd8,
      0xff,
      0xe0,
      0x00,
      0x10,
      ...ascii("JFIF\0"),
      0x01,
      0x01,
      birim,
      (x >> 8) & 255,
      x & 255,
      0x00,
      0x48,
      0x00,
      0x00,
    ]);
  assert.equal(readDpi(jfif(1, 300)), 300);
  assert.equal(readDpi(jfif(2, 118)), Math.round(118 * 2.54));
  // Birim 0 = oransız; DPI anlamı yok.
  assert.equal(readDpi(jfif(0, 300)), null);
  assert.equal(readDpi(png(10, 10)), null);
});
