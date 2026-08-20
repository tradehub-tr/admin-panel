import assert from "node:assert/strict";
import { test } from "node:test";

import { BIG_SOURCE_MP, SEVERITY, cropWarnings, hasBlocker } from "../cropWarnings.js";
import { CONFIDENCE_THRESHOLD, METHOD, suggestFocal, toGray } from "../focusSuggest.js";
import { rect } from "../geometry.js";
import {
  isCroppable,
  profileTargetAR,
  ratioLabelMisleading,
  ratioOptions,
  slotIsCroppable,
  slotProfiles,
} from "../slotProfiles.js";

/**
 * Politika sarmalayıcı ve otomatik odak ÖNERİSİ.
 *
 *   ÖLÇÜLÜR  — hangi profilin kırpıldığı, hedef oranın boyuttan (etiketten
 *              değil) geldiği, 7 uyarının üretilmesi, önerinin gerçekten
 *              hesaplanan bir güven değeri döndürdüğü.
 *   ÖLÇÜLMEZ — `SMARTCROP_CONFIDENCE_THRESHOLD = 0.5` eşiğinin bu ölçüyle
 *              uyumu. T-041'den devralınan not aynen geçerli: KALİBRE
 *              EDİLMEDİ. Saliency modeli hâlâ yok; bu bir yer tutucu.
 */

const bul = (list, id) => list.filter((w) => w.id === id);

// ── Slot kataloğu · Bulgu 1 ───────────────────────────────────────

test("kırpma yalnız cover + yükseklik tanımlı profillerde gerçek", () => {
  assert.equal(isCroppable({ fit: "cover", width: 1000, height: 563 }), true);
  assert.equal(isCroppable({ fit: "cover", width: 1280, height: null }), false);
  assert.equal(isCroppable({ fit: "pad", width: 512, height: 512 }), false);
  assert.equal(isCroppable({ fit: "contain", width: 1920, height: null }), false);
});

test("9 slotta 36 profil var, yalnız 4'ü kırpılıyor — BUGÜN ölçüldü", () => {
  // NOT: `faz10-crop-studio.md §1` "34 profil" ve "pad + height: 10" diyor.
  // Politika dosyalarından 2026-08-19'da sayıldığında toplam **36**, pad+height
  // **12** çıkıyor (brand.logo ve seller.logo altışar pad profili taşıyor,
  // planda onar sayılmış). Kırpılan profil sayısı (4) ve hangileri olduğu
  // DEĞİŞMİYOR — plandaki sapma yalnız kırpılmayanların toplamında.
  const slotlar = ["brand.logo", "category.banner", "company.cover_image", "company.cover_video",
    "document.attachment", "product.image", "product.video", "seller.logo", "user.avatar"];
  const sayac = { coverH: 0, cover: 0, padH: 0, pad: 0, contain: 0 };
  let toplam = 0;
  const kirpilan = [];
  for (const k of slotlar) {
    for (const p of slotProfiles(k)) {
      toplam += 1;
      if (p.croppable) kirpilan.push(`${k}/${p.name}`);
      const h = Number(p.height) > 0;
      if (p.fit === "cover") sayac[h ? "coverH" : "cover"] += 1;
      else if (p.fit === "pad") sayac[h ? "padH" : "pad"] += 1;
      else sayac.contain += 1;
    }
  }
  assert.equal(toplam, 36);
  assert.deepEqual(sayac, { coverH: 4, cover: 12, padH: 12, pad: 5, contain: 3 });
  assert.deepEqual(kirpilan.sort(), [
    "company.cover_image/cover_16x9_1000",
    "company.cover_video/poster_1280",
    "company.cover_video/poster_854",
    "company.cover_video/thumb_192",
  ]);
});

test("hedef oran ETİKETTEN değil boyuttan gelir — Bulgu 1", () => {
  const p = slotProfiles("company.cover_image").find((x) => x.name === "cover_16x9_1000");
  assert.equal(p.ratioLabel, "16:9");
  assert.equal(profileTargetAR(p), 1000 / 563);
  assert.notEqual(profileTargetAR(p), 16 / 9);
  assert.ok(Math.abs(profileTargetAR(p) - 16 / 9) > 1e-4);
  assert.equal(ratioLabelMisleading(p), true, "kullanıcıya 'etiket ≠ sayı' denmeli");
});

test("gerçekten 16:9 olan profil yanıltıcı işaretlenmez", () => {
  const p = slotProfiles("company.cover_video").find((x) => x.name === "poster_1280");
  assert.equal(profileTargetAR(p), 16 / 9);
  assert.equal(ratioLabelMisleading(p), false);
});

test("product.image kırpılmıyor — Crop Studio onun çözümü değil", () => {
  assert.equal(slotIsCroppable("product.image"), false);
  assert.deepEqual(ratioOptions("product.image"), []);
});

test("oran seçenekleri yalnız kırpılan profillerden türer", () => {
  const o = ratioOptions("company.cover_video");
  assert.equal(o.length, 3);
  assert.deepEqual(
    o.map((x) => x.profiles).flat(),
    ["poster_1280", "poster_854", "thumb_192"]
  );
});

// ── Uyarılar ──────────────────────────────────────────────────────

const COVER = "company.cover_image";

test("kadraj profilin istediği pikseli üretemiyorsa ENGELLER", () => {
  // 1000×563 isteyen profil; kadraj 400×225.
  const w = cropWarnings({
    sourceW: 4000,
    sourceH: 3000,
    win: rect(0, 0, 400, 225.2),
    slotKey: COVER,
  });
  const b = bul(w, "tooSmallForProfile");
  assert.equal(b.length, 1);
  assert.equal(b[0].severity, SEVERITY.BLOCK);
  assert.equal(b[0].params.need, "1000×563");
  assert.equal(hasBlocker(w), true);
});

test("yeterli kadrajda engel YOK", () => {
  const w = cropWarnings({
    sourceW: 4000,
    sourceH: 3000,
    win: rect(0, 0, 2000, 1126),
    slotKey: COVER,
  });
  assert.equal(hasBlocker(w), false);
});

test("politikanın kısa kenar şartı kadrajdan SONRA uygulanır", () => {
  const w = cropWarnings({
    sourceW: 4000,
    sourceH: 3000,
    win: rect(0, 0, 1200, 300),
    slotKey: COVER,
  });
  const s = bul(w, "shortEdge");
  assert.equal(s.length, 1);
  assert.equal(s[0].params.need, 400);
  assert.equal(s[0].params.got, 300);
});

test("20 MP üstü kaynak UYARIR, engellemez", () => {
  const w = cropWarnings({ sourceW: 8000, sourceH: 6000, win: null, slotKey: COVER });
  const b = bul(w, "bigSource");
  assert.equal(b.length, 1);
  assert.equal(b[0].severity, SEVERITY.WARN);
  assert.equal(b[0].params.limit, BIG_SOURCE_MP);
  assert.equal(hasBlocker(w), false);
});

test("CMYK ve alfa uyarıları YALNIZ sonda varsa üretilir — uydurulmaz", () => {
  const sonda_yok = cropWarnings({ sourceW: 2000, sourceH: 1500, win: null, slotKey: "brand.logo" });
  assert.equal(bul(sonda_yok, "cmyk").length, 0);
  assert.equal(bul(sonda_yok, "alphaToJpeg").length, 0);

  const sonda = cropWarnings({
    sourceW: 2000,
    sourceH: 1500,
    win: null,
    slotKey: "brand.logo",
    probe: { mode: "CMYK", hasAlpha: true },
  });
  assert.equal(bul(sonda, "cmyk")[0].severity, SEVERITY.WARN);
  // brand.logo · og1200x630 JPEG üretiyor → alfa düşecek.
  assert.equal(bul(sonda, "alphaToJpeg")[0].params.profiles, 1);
});

test("kırpılmayan profiller BİLGİ olarak sayılır", () => {
  const w = cropWarnings({ sourceW: 2000, sourceH: 1500, win: null, slotKey: COVER });
  const i = bul(w, "notCropped")[0];
  assert.equal(i.severity, SEVERITY.INFO);
  assert.equal(i.params.count, 4);
  assert.equal(i.params.total, 5);
});

test("etiket ≠ sayı bilgisi kullanıcıya ulaşır", () => {
  const w = cropWarnings({ sourceW: 2000, sourceH: 1500, win: null, slotKey: COVER });
  const i = bul(w, "ratioFromSize")[0];
  assert.equal(i.severity, SEVERITY.INFO);
  assert.equal(i.params.label, "16:9");
  assert.equal(i.params.real, "1.77620");
});

test("slot uyumsuzluğu uyarır", () => {
  const w = cropWarnings({
    sourceW: 2000,
    sourceH: 1500,
    win: null,
    slotKey: COVER,
    slotMismatch: true,
  });
  assert.equal(bul(w, "slotMismatch")[0].severity, SEVERITY.WARN);
});

test("[FR-023] uyarı türlerinin her biri en az bir fixture'da üretiliyor", () => {
  const hepsi = new Set(
    [
      ...cropWarnings({ sourceW: 8000, sourceH: 6000, win: rect(0, 0, 400, 225), slotKey: COVER,
        probe: { mode: "CMYK", hasAlpha: true }, slotMismatch: true }),
      ...cropWarnings({ sourceW: 8000, sourceH: 6000, win: rect(0, 0, 1200, 300), slotKey: COVER }),
      ...cropWarnings({ sourceW: 2000, sourceH: 1500, win: null, slotKey: "brand.logo",
        probe: { hasAlpha: true } }),
      // Odak kadrajın sol kenarında → güvenli alanın dışında.
      ...cropWarnings({ sourceW: 4000, sourceH: 3000, win: rect(0, 0, 1000, 563), slotKey: COVER,
        focal: { x: 0, y: 0.5 } }),
      // Öneri devrede → eşiğin kalibre edilmediği söylenir.
      ...cropWarnings({ sourceW: 4000, sourceH: 3000, win: rect(0, 0, 1000, 563), slotKey: COVER,
        suggestion: { thresholdCalibrated: false, threshold: 0.5, source: "server",
          reason: "measured", measured: true } }),
    ].map((w) => w.id)
  );
  assert.deepEqual(
    [...hepsi].sort(),
    ["alphaToJpeg", "bigSource", "cmyk", "notCropped", "ratioFromSize", "safeBand",
      "safeBandActive", "shortEdge", "slotMismatch", "suggestionUncalibrated",
      "tooSmallForProfile"].sort()
  );
});

// ── Otomatik odak önerisi ─────────────────────────────────────────

/** Tek noktada kenar enerjisi olan sentetik görsel. */
function nokta(w, h, px, py, r = 3) {
  const g = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      g[y * w + x] = Math.abs(x - px) <= r && Math.abs(y - py) <= r ? 255 : 0;
    }
  }
  return g;
}

test("öneri enerjinin toplandığı yere düşer", () => {
  const s = suggestFocal(nokta(64, 64, 16, 48), 64, 64);
  assert.ok(Math.abs(s.x - 16 / 64) < 0.03, `x=${s.x}`);
  assert.ok(Math.abs(s.y - 48 / 64) < 0.03, `y=${s.y}`);
  assert.equal(s.isSuggestion, true);
  assert.equal(s.method, METHOD);
});

test("güven SABİT DEĞİL — toplanmış enerji dağınıktan yüksek güven verir", () => {
  const toplu = suggestFocal(nokta(64, 64, 32, 32), 64, 64);

  // Dağınık: bütün karede satranç deseni → enerji her yerde.
  const dagınık = new Uint8Array(64 * 64);
  for (let i = 0; i < dagınık.length; i += 1) dagınık[i] = (i + Math.floor(i / 64)) % 2 ? 255 : 0;
  const dagınıkS = suggestFocal(dagınık, 64, 64);

  assert.ok(toplu.confidence > dagınıkS.confidence, `${toplu.confidence} > ${dagınıkS.confidence}`);
  assert.ok(toplu.confidence >= CONFIDENCE_THRESHOLD, "tek nesne eşiği geçmeli");
  assert.ok(dagınıkS.confidence < CONFIDENCE_THRESHOLD, "tekdüze enerji eşiği geçmemeli");
  assert.notEqual(toplu.confidence, dagınıkS.confidence);
});

test("düz zeminde güven SIFIR — 'bilmiyorum' demek uydurmaktan iyidir", () => {
  const s = suggestFocal(new Uint8Array(64 * 64), 64, 64);
  assert.equal(s.confidence, 0);
  assert.equal(s.x, 0.5);
  assert.equal(s.y, 0.5);
});

test("geçersiz girdide merkez + sıfır güven", () => {
  assert.equal(suggestFocal(null, 64, 64).confidence, 0);
  assert.equal(suggestFocal(new Uint8Array(4), 2, 2).confidence, 0);
});

test("toGray Rec. 601 luma uygular", () => {
  const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
  const { gray } = toGray({ data, width: 2, height: 1 });
  assert.equal(gray[0], Math.trunc((255 * 299) / 1000));
  assert.equal(gray[1], Math.trunc((255 * 587) / 1000));
});
