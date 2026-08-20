import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { createI18n } from "vue-i18n";
import { renderToString } from "@vue/server-renderer";

import tr from "../../../../i18n/locales/tr.js";
import {
  DEVICES,
  deviceById,
  regionByKey,
  renditionsFor,
  simulate,
} from "../../../../lib/media/simulator/index.js";

/**
 * T-112 (srcset göstergesi + yeterlilik uyarısı) ve T-113 (video posteri)
 * kartlarının sözleşmesi.
 *
 *   ÖLÇÜLDÜ  — sunucu çıktısındaki metin ve sayılar, hükmün tonu, LCP
 *              işaretlemesi, kutu/viewport taşması, baytın YALNIZ gerçek
 *              türev satırından gelmesi, video özniteliklerinin kaynak
 *              künyesi, örtme yüzdesinin cihazla değişmesi.
 *   ÖLÇÜLMEDİ — tarayıcıdaki gerçek yerleşim, gerçek video dosyası,
 *              `prefers-reduced-motion` altındaki gerçek davranış, bayt
 *              tahmininin gerçek indirmeyle tutması. Bu görevde tarayıcı
 *              doğrulaması YAPILMADI.
 */

const HERE = fileURLToPath(new URL(".", import.meta.url));
const frontendRoot = fileURLToPath(new URL("../../../../..", import.meta.url));

const RESULT = "/src/components/media/simulator/SimResultCard.vue";
const POSTER = "/src/components/media/simulator/SimPosterCard.vue";

let server;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    plugins: [vue()],
    resolve: { alias: { "@": `${frontendRoot}/src` } },
    server: { middlewareMode: true },
    appType: "custom",
  });
});

after(async () => {
  await server?.close();
});

// Eksik anahtarlar ekranda anahtar yolu olarak basılır; testler METİN değil
// ANAHTAR arar, çünkü çeviri dosyaları bu görevde dokunulmaz listesindedir.
const i18n = () =>
  createI18n({
    legacy: false,
    locale: "tr",
    fallbackLocale: "tr",
    missingWarn: false,
    fallbackWarn: false,
    messages: { tr },
  });

async function render(path, props) {
  const { default: Component } = await server.ssrLoadModule(path);
  const app = createSSRApp({ render: () => h(Component, props) });
  app.use(i18n());
  return renderToString(app);
}

const sel = (deviceId, regionKey, sourceWidth = 2160) => {
  const device = deviceById(deviceId);
  const region = regionByKey(regionKey);
  return simulate(device, region, renditionsFor(region.slotKey, sourceWidth));
};

// ── T-112 · LCP işaretlemesi ──────────────────────────────────────

test("LCP adayı işaretleniyor ve lazy-load edilmemesi gerektiği yazıyor", async () => {
  const lcp = sel("iphone-14", "product_detail/main_image");
  assert.equal(lcp.region.lcpCandidate, true, "bu bölge LCP adayı olmalı");
  const html = await render(RESULT, { selection: lcp, sizes: "", srcset: "" });
  assert.match(html, /class="simres__lcp"/, "LCP rozeti yok");
  assert.match(html, /simres__lcpNote/, "lazy-load notu yok");
  assert.match(html, /lazy-load/i, "notta lazy-load uyarısı geçmeli");
  assert.match(html, /fetchpriority/i, "notta fetchpriority önerisi geçmeli");
});

test("LCP olmayan bölgede rozet basılmıyor — her kutu LCP değildir", async () => {
  const plain = sel("iphone-14", "cart_checkout/summary_strip");
  assert.equal(plain.region.lcpCandidate, false);
  const html = await render(RESULT, { selection: plain, sizes: "", srcset: "" });
  assert.doesNotMatch(html, /simres__lcp"/);
});

// ── T-112 · yeterlilik hükmü ──────────────────────────────────────

test("kaynak yetmediğinde hüküm KIRMIZI tonda ve eksik piksel yazılı", async () => {
  // p50 kaynak (1120 px) ile iPhone 14 ürün detay ana görselinde upscale
  // yasağı devreye giriyor — ölçülmüş vaka, uydurulmadı.
  const short = sel("iphone-14", "product_detail/main_image", 1120);
  assert.equal(short.sufficient, false);
  assert.ok(short.deficitPx > 0);
  const html = await render(RESULT, { selection: short, sizes: "", srcset: "" });
  assert.match(html, /simres__verdict--bad/, "yetersizlik kırmızı tonda olmalı");
  // Kaynak dokümandaki cümle birebir: "kaynak yetersiz — büyütme yapılmaz".
  assert.match(html, /Kaynak yetersiz/i);
  assert.match(html, /büyütme yapılmaz/i);
});

test("yeten kombinasyonda hüküm yeşil, uyarı üretilmiyor", async () => {
  const ok = sel("iphone-se-3", "home/hero_showcase_grid");
  assert.deepEqual(ok.warnings, []);
  const html = await render(RESULT, { selection: ok, sizes: "", srcset: "" });
  assert.match(html, /simres__verdict--ok/);
});

test("zoom yetersizliği ayrı bir ton — kaynak yetersizliğiyle karıştırılmıyor", async () => {
  const zoom = sel("macbook-air-13", "product_detail/main_image");
  assert.ok(zoom.sufficient, "kaynak yeterli olmalı");
  assert.equal(zoom.zoomSufficient, false, "zoom'da yetersiz olmalı");
  const html = await render(RESULT, { selection: zoom, sizes: "", srcset: "" });
  assert.match(html, /simres__verdict--warn/);
  assert.doesNotMatch(html, /simres__verdict--bad/);
});

// ── T-112 · kutu viewport'tan geniş ───────────────────────────────

test("kutu viewport'tan genişse taşma ekranda yazıyor", async () => {
  const wide = sel("iphone-14", "product_detail/lightbox_main");
  assert.ok(wide.cssBoxPx > wide.device.cssWidth, "bu vaka taşmalı");
  const html = await render(RESULT, { selection: wide, sizes: "", srcset: "" });
  assert.match(html, /simres__overflow/);
  assert.match(html, new RegExp(String(Math.round(wide.cssBoxPx))), "kutu genişliği yazılmalı");
  assert.match(html, new RegExp(String(wide.device.cssWidth)), "viewport genişliği yazılmalı");
});

test("kutu viewport'a sığıyorsa taşma satırı BASILMIYOR", async () => {
  const fits = sel("desktop-1080p", "listing/card_grid");
  assert.ok(fits.cssBoxPx <= fits.device.cssWidth);
  const html = await render(RESULT, { selection: fits, sizes: "", srcset: "" });
  assert.doesNotMatch(html, /simres__overflow/);
});

// ── T-112 · bayt yalnız gerçek satırdan ───────────────────────────

test("türev satırı yokken bayt TAHMİN EDİLMİYOR", async () => {
  const s = sel("iphone-14", "listing/card_grid");
  const html = await render(RESULT, { selection: s, sizes: "", srcset: "", probeState: "empty" });
  assert.match(html, /türev henüz üretilmedi/i);
  assert.doesNotMatch(html, /\d+[.,]\d\s*KB/, "bayt uydurulmamalı");
});

test("türev satırı varsa bayt onun `bytes` alanından okunuyor", async () => {
  const s = sel("iphone-14", "listing/card_grid");
  const html = await render(RESULT, {
    selection: s,
    sizes: "",
    srcset: "",
    probeState: "found",
    probeRow: { width: 640, height: 640, format: "webp", bytes: 51200 },
  });
  // Biçim yerelleştirilmiş (TR ondalık ayıracı virgül) — sayı orada, birim orada.
  assert.match(html, /50[.,]0\s*KB/i, "bayt gösterilmedi");
  assert.doesNotMatch(html, /türev henüz üretilmedi/i);
});

test("bayt kaynağı kartta yazılı — 'nereden geldi' sorusu açık bırakılmıyor", async () => {
  const s = sel("iphone-14", "listing/card_grid");
  const html = await render(RESULT, { selection: s, sizes: "", srcset: "" });
  assert.match(html, /TAHMİN EDİLMEZ/);
  assert.match(html, /Media Rendition/);
});

// ── T-113 · video yüzeyleri ───────────────────────────────────────

const posterProps = { devices: DEVICES, activeDeviceId: "iphone-14" };

test("iki video yüzeyi de kaynak dosya:satır künyesiyle gösteriliyor", async () => {
  const html = await render(POSTER, posterProps);
  assert.match(html, /StoreHeader\.ts:297-345/, "satıcı kapak videosunun künyesi yok");
  const src = readFileSync(`${HERE}../SimPosterCard.vue`, "utf8");
  assert.match(src, /ProductVideoSection\.ts:63/, "ürün videosunun künyesi yok");
});

test("üç önizleme durumu da düğme olarak var (poster / otomatik / reduced-motion)", async () => {
  const html = await render(POSTER, posterProps);
  assert.match(html, /Poster \(ilk kare\)/);
  assert.match(html, /Otomatik oynatma/);
  assert.match(html, /prefers-reduced-motion/);
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 2, "iki grupta birer aktif");
});

test("otomatik oynatma iddiası kaynaktan geliyor: satıcı kapağında autoplay YOK", () => {
  const src = readFileSync(`${HERE}../SimPosterCard.vue`, "utf8");
  const i = src.indexOf('id: "seller_shop/cover_video"');
  assert.ok(i > 0);
  const block = src.slice(i, i + 400);
  assert.match(block, /autoplay: false/, "StoreHeader.ts:308 autoplay taşımıyor");
  assert.match(block, /muted: true/);
  assert.match(block, /loop: false/);
  assert.match(block, /playsinline: true/);
});

test("ürün videosunda poster özniteliği YOK — profil tanımlı olsa da", () => {
  const src = readFileSync(`${HERE}../SimPosterCard.vue`, "utf8");
  const i = src.indexOf('id: "product_detail/gallery_video"');
  assert.ok(i > 0);
  assert.match(src.slice(i, i + 400), /poster: false/);
});

test("güvenli alan örtmesi cihazla DEĞİŞİYOR — dar kutuda pay büyür", async () => {
  const dar = await render(POSTER, { devices: DEVICES, activeDeviceId: "galaxy-s23" });
  const genis = await render(POSTER, { devices: DEVICES, activeDeviceId: "desktop-1080p" });
  const oku = (html) => {
    const m = html.match(/simpost__zonePct[^>]*>%([\d.]+)</);
    assert.ok(m, "örtme yüzdesi basılmamış");
    return Number(m[1]);
  };
  assert.ok(oku(dar) > oku(genis), `dar kutuda örtme daha büyük olmalı: ${oku(dar)} / ${oku(genis)}`);
});

test("ölçülemeyen bölge (yerel kontroller) yüzde uydurmuyor", async () => {
  const src = readFileSync(`${HERE}../SimPosterCard.vue`, "utf8");
  assert.match(src, /heightPx: null/, "yerel kontrol yüksekliği ölçülmemiş olmalı");
  const html = await render(POSTER, posterProps);
  assert.match(html, /simpost__zonePct/, "ölçülen bölgelerin payı basılmalı");
});

test("bit hızı girilmeden ilk 10 sn baytı TAHMİN EDİLMİYOR", async () => {
  const html = await render(POSTER, posterProps);
  assert.match(html, /Bit hızı girilmedi/i);
  assert.doesNotMatch(html, /iner \(bit hızı/, "bayt tahmini uydurulmamalı");
  assert.match(html, /video_decision\.json/, "karşılaştırma tavanının yokluğu yazılmalı");
});

test("poster kartı hâlâ uç uydurmuyor", () => {
  const src = readFileSync(`${HERE}../SimPosterCard.vue`, "utf8");
  assert.doesNotMatch(src, /api\.|fetch\(/);
});
