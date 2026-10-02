import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { createServer } from "vite";

/**
 * T-105 D3 — ÖNCE/SONRA hesabı + Otomatik/Manuel kip, birim düzeyinde.
 *
 *   ÖLÇÜLÜR  — `afterWin` sunucunun oran zorlamasını (`_fit_ratio_keeping_center`
 *              ikizi, `crop_geometry` vendor'ı ÇAĞRILARAK) yeniden üretiyor;
 *              serbest kırpmada "önce" ≠ "sonra" (vacuity: after bozulursa
 *              before=after olur ve bu dosya kırmızıya döner); kilitli kipte
 *              ikisi çakışıyor; kip seçici iki durumu değiştiriyor ve elle jest
 *              "Manuel"e, öneri "Otomatik"e çekiyor.
 *   ÖLÇÜLMEZ — tarayıcıdaki gerçek tıklama ve canvas çizimi.
 */

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));

let server;
let useCropStudio;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: { alias: { "@": `${frontendRoot}/src` } },
    server: { middlewareMode: true },
    appType: "custom",
  });
  ({ useCropStudio } = await server.ssrLoadModule("/src/composables/useCropStudio.js"));
});

after(async () => {
  await server?.close();
});

/**
 * Kırpılan profilleri olan slot. `company.cover_image` 2026-09-30'dan beri
 * oranı koruyor (`contain`, kırpılan profil yok); oran zorlaması kırpılan tek
 * slotta, kapak videosu posterlerinde ölçülüyor.
 */
const COVER = "company.cover_video";
/** 1280/720 — poster_1280'in boyutundan, etiketten değil. */
const AR = 1280 / 720;
const make = (over = {}) =>
  useCropStudio({
    source: { width: 4000, height: 3000, url: "/files/x.jpg" },
    slotKey: COVER,
    ...over,
  });

// ── ÖNCE / SONRA ──────────────────────────────────────────────────

test("kilitli kipte önce = sonra — oran zaten uyumlu, sürpriz yok", () => {
  const s = make();
  // Varsayılan: oran kilitli (options[0].targetAR).
  assert.equal(s.ratioForced.value, false, "kilitli kadraj oran zorlamaz");
  assert.deepEqual(s.afterPixelBox.value, s.pixelBox.value, "sonra = önce");
});

test("serbest kipte önce ≠ sonra — sunucu oranı zorlayacak", () => {
  const s = make();
  s.setRatio(null); // Serbest: pencere tam taban bölgesi (4000×3000).
  const before = s.pixelBox.value;
  const afterBox = s.afterPixelBox.value;

  assert.equal(s.ratioForced.value, true, "serbest kutu oran-uyumlu değil");
  // Vacuity kalbi: bozulmuş bir "after" (win döndüren) burada before=after
  // yapar ve iki iddia da düşer.
  assert.notDeepEqual(afterBox, before, "sonra önceden farklı olmalı");
  assert.equal(afterBox[2], before[2], "genişlik korunur (dikey daralır)");
  assert.ok(afterBox[3] < before[3], "yükseklik oran için daralır");
});

test("sonra kadrajı hedef orana UYUYOR — crop_geometry ile hesaplandı", () => {
  const s = make();
  s.setRatio(null);
  const a = s.afterWin.value;
  assert.ok(Math.abs(a.w / a.h - AR) < 1e-3, `sonra oranı ${a.w / a.h}, beklenen ${AR}`);
});

test("effectiveTargetAR serbest kipte ilk kırpılabilir profilin oranı", () => {
  const s = make();
  s.setRatio(null);
  assert.ok(Math.abs(s.effectiveTargetAR.value - AR) < 1e-9);
});

test("oranı KORUYAN slotta (company.cover_image) oran zorlaması yok — önce = sonra", () => {
  // 2026-09-30: mağaza kapağı 5 `contain` basamağı; kırpılan profil yok.
  // Stüdyo oran kilidi sunmaz, sunucu da kadrajı bir orana zorlamaz.
  const s = make({ slotKey: "company.cover_image" });
  assert.deepEqual(s.options, [], "kırpılan profil yokken oran seçeneği yok");
  assert.equal(s.lockedAR.value, null);
  assert.equal(s.effectiveTargetAR.value, null);
  assert.equal(s.ratioForced.value, false);
  assert.deepEqual(s.afterPixelBox.value, s.pixelBox.value, "sonra = önce");
  assert.deepEqual(s.pixelBox.value, [0, 0, 4000, 3000], "kaynağın tamamı korunur");
});

// ── Otomatik / Manuel kip ─────────────────────────────────────────

test("varsayılan kip Manuel", () => {
  assert.equal(make().mode.value, "manual");
});

test("setMode iki durumu değiştiriyor, geçersiz değeri yok sayıyor", () => {
  const s = make();
  s.setMode("auto");
  assert.equal(s.mode.value, "auto");
  s.setMode("manual");
  assert.equal(s.mode.value, "manual");
  s.setMode("çöp");
  assert.equal(s.mode.value, "manual", "bilinmeyen kip yok sayılır");
});

test("öneri uygulanınca kip Otomatik'e çekilir", () => {
  const s = make();
  s.applySuggestion({ x: 0.3, y: 0.7, confidence: 0.8, method: "edge_energy_v1" });
  assert.equal(s.mode.value, "auto");
});

test("elle jest kipi Manuel'e çeker — otomatik seçiliyken de", () => {
  const s = make();
  s.setMode("auto");
  s.setZoom(2.5); // elle bir jest
  assert.equal(s.mode.value, "manual", "elle müdahale otomatik'i bozar");
});

test("reset kipi Manuel'e döndürür", () => {
  const s = make();
  s.setMode("auto");
  s.reset();
  assert.equal(s.mode.value, "manual");
});
