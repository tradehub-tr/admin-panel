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
  PAGES,
  boxWidth,
  containerWidth,
  deviceFrame,
  frameScale,
  MIN_SCALE,
  pageTemplate,
  regionLayout,
  containerParts,
} from "../../../../lib/media/simulator/index.js";

/**
 * T-111 — render motoru GERÇEKTEN RENDER EDİYOR MU.
 *
 * Bu görevin başlangıç durumu şuydu: 65 kombinasyon **tabloda basılıyordu**,
 * çizilmiyordu. Cihaz çerçevesi yoktu, `transform: scale()` yoktu, sayfa
 * şablonu yoktu, ölçek yüzdesi yoktu. Bu dosya dördünün de sunucu çıktısında
 * bulunduğunu ölçer — "yazdım" demek yetmez, çıktıda görünmeli.
 *
 *   ÖLÇÜLÜR  — sunucu tarafı render (SSR) çıktısında cihaz çerçevesinin
 *              varlığı, sahnenin GERÇEK CSS genişliğinde kurulduğu,
 *              `transform: scale(...)` dönüşümünün ve ölçek yüzdesinin
 *              basıldığı, CSS `zoom`un HİÇ kullanılmadığı, sayfa şablonunun
 *              veri ile aynı sütun sayısını çizdiği, 5 sayfa × 13 cihaz = 65
 *              çerçevenin ve 195 bölge hücresinin hatasız üretildiği; ve
 *              render motorunun kutu genişliği hesabını 195 kombinasyonda
 *              DEĞİŞTİRMEDİĞİ.
 *   ÖLÇÜLMEZ — gerçek tarayıcıda boyama süresi, ölçeklenmiş sahnenin
 *              piksel görünümü, `IntersectionObserver`'ın kazandırdığı süre
 *              ve `placements.json` değerlerinin gerçek sayfayla uyumu
 *              (T-115). Bu görevde tarayıcı doğrulaması YAPILMADI, süre ve
 *              FPS iddiası YOK.
 */

const frontendRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
const HERE = fileURLToPath(new URL(".", import.meta.url));

const FRAME = "/src/components/media/simulator/SimDeviceFrame.vue";
const TEMPLATE = "/src/components/media/simulator/SimPageTemplate.vue";
const GRID = "/src/components/media/simulator/SimFrameGrid.vue";

const frameSrc = readFileSync(`${HERE}../SimDeviceFrame.vue`, "utf8");
const templateSrc = readFileSync(`${HERE}../SimPageTemplate.vue`, "utf8");
const viewSrc = readFileSync(`${frontendRoot}/src/views/system/MediaSimulatorView.vue`, "utf8");
const enginePath = `${frontendRoot}/src/lib/media/simulator/frame.js`;

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

const i18n = () =>
  createI18n({ legacy: false, locale: "tr", fallbackLocale: "tr", messages: { tr } });

async function render(path, props) {
  const { default: Component } = await server.ssrLoadModule(path);
  const app = createSSRApp({ render: () => h(Component, props) });
  app.use(i18n());
  return renderToString(app);
}

const phone = DEVICES.find((d) => d.id === "iphone-14");
const desktop = DEVICES.find((d) => d.id === "desktop-1080p");
const home = PAGES.find((p) => p.page === "home");
const listing = PAGES.find((p) => p.page === "listing");

// ── 1. Cihaz çerçevesi VAR ────────────────────────────────────────

test("çerçeve sahneyi cihazın GERÇEK CSS ölçüsünde kuruyor", async () => {
  const html = await render(FRAME, { device: phone, page: home, availableWidth: 300 });
  assert.match(html, /width:390px/, "sahne 390px olmalı — daraltma yok");
  assert.match(html, /height:844px/, "sahne cihazın CSS yüksekliğinde olmalı");
});

test("kabuk ölçeklenmiş ölçüyü taşıyor — çerçeve sayfada fazla yer kaplamıyor", async () => {
  // `transform` yer kaplamayı değiştirmez; kabuk ölçüyü elle almazsa 390px
  // genişliğinde bir boşluk kalır.
  const html = await render(FRAME, { device: phone, page: home, availableWidth: 300 });
  assert.match(html, /width:300px/, "kabuk 390 × 0.769 = 300px olmalı");
});

// ── 2. `transform: scale()` VAR, `zoom` YOK ───────────────────────

test("ölçek transform ile uygulanıyor", async () => {
  const html = await render(FRAME, { device: phone, page: home, availableWidth: 300 });
  assert.match(html, /transform:scale\(0\.76923/, "transform: scale() yok");
  assert.match(html, /transform-origin:top left/, "origin sol üst olmalı");
});

test("CSS `zoom` HİÇBİR YERDE kullanılmıyor", () => {
  // `zoom` düzeni yeniden hesaplatır: 390px'lik cihazın kırılımı yerine
  // 234px'lik sahte bir kırılım simüle edilirdi.
  for (const [name, src] of [
    ["SimDeviceFrame", frameSrc],
    ["SimPageTemplate", templateSrc],
    ["frame.js", readFileSync(enginePath, "utf8")],
  ]) {
    assert.doesNotMatch(src, /(^|[^-\w])zoom\s*:/m, `${name}: CSS zoom kullanılmış`);
  }
});

test("sahne genişliği cihaz genişliğinden BAĞIMSIZ olarak ölçeklenmiyor", () => {
  // Aynı cihaz, iki farklı ekran genişliği: CSS ölçüsü DEĞİŞMEZ, yalnız
  // ölçek değişir. Değişseydi kırılım noktası kayardı.
  const dar = deviceFrame(phone, 200);
  const genis = deviceFrame(phone, 380);
  assert.equal(dar.cssWidth, genis.cssWidth);
  assert.equal(dar.cssWidth, 390);
  assert.ok(dar.scale < genis.scale, "dar ekranda ölçek küçülmeli");
});

// ── 3. Ölçek yüzdesi kullanıcıya GÖRÜNÜR ──────────────────────────

test("ölçek yüzdesi çerçevenin başlığında yazıyor", async () => {
  const html = await render(FRAME, { device: phone, page: home, availableWidth: 300 });
  assert.match(html, /%77/, "yüzde yazılmalı (390 → 300 = %77)");
  assert.match(html, /scale\(0\.77\)/, "CSS karşılığı da yazılmalı");
  assert.match(html, /390×844/, "cihazın gerçek CSS ölçüsü yazılmalı");
  assert.match(html, /DPR 3/, "DPR yazılmalı");
});

test("ölçek 1'i AŞMIYOR ve tabana kelepçeleniyor", () => {
  // Büyütmek olmayan bir çözünürlük uydurmaktır.
  assert.equal(frameScale(390, 5000).scale, 1);
  assert.equal(frameScale(2560, 10).scale, MIN_SCALE);
  // Ölçülemeyen genişlik (0) çerçeveyi yok etmemeli.
  assert.equal(frameScale(390, 0).scale, 1);
});

// ── 4. Sayfa şablonu gerçek grid mantığını taklit ediyor ──────────

test("şablon veri ile AYNI sütun sayısını çiziyor", async () => {
  // 1920px'te ana sayfa vitrini 7 sütun (min_vw 1536 adımı kazanır),
  // telefonda 2. İkisi de `placements.json`'dan gelir, bileşenden değil.
  const hero = home.regions[0];
  const wide = regionLayout(hero, desktop);
  const narrow = regionLayout(hero, phone);
  assert.equal(wide.cols, 7);
  assert.equal(narrow.cols, 2);

  const html = await render(TEMPLATE, { page: home, device: desktop });
  const band = html.slice(html.indexOf(`data-region="${hero.key}"`));
  const tiles = (band.slice(0, band.indexOf("</div></div></div>")).match(/simpage__tile/g) || [])
    .length;
  assert.equal(tiles, wide.cols, `${wide.cols} sütunluk bant o kadar karo çizmeli`);
});

test("her karo kutunun GERÇEK px genişliğinde çiziliyor", async () => {
  const html = await render(TEMPLATE, { page: home, device: desktop });
  const box = boxWidth(home.regions[0], desktop);
  assert.match(html, new RegExp(`width:${box}px`), `karo ${box}px olmalı`);
});

test("filtre kolonu / rezerve sütun çiziliyor, gizlenmiyor", async () => {
  // listing/card_grid 1280px+'te 280px'lik bir sütunu rezerve eder.
  const card = listing.regions.find((r) => r.region === "card_grid");
  const layout = regionLayout(card, desktop);
  assert.equal(layout.reservePx, 280);
  const html = await render(TEMPLATE, { page: listing, device: desktop });
  assert.match(html, /simpage__reserve/, "rezerve şerit çizilmeli");
  assert.match(html, /width:280px/, "rezerve genişliği px olarak verilmeli");
});

test("kapsayıcının sağ rayı (PDP) çiziliyor", async () => {
  const pdp = PAGES.find((p) => p.page === "product_detail");
  const slider = pdp.regions.find((r) => r.region === "related_slider");
  const layout = regionLayout(slider, desktop);
  assert.equal(layout.container.subtractPx, 410, "1280px+ sağ ray 394+16");
  const html = await render(TEMPLATE, { page: pdp, device: desktop });
  assert.match(html, /simpage__rail/, "sağ ray çizilmeli");
});

test("kutuya sığmayan bölge SESSİZCE sığdırılmıyor, rozetleniyor", async () => {
  // product_detail/lightbox_main kutusunu YÜKSEKLİKTEN alır: 390px'lik
  // telefonda 608px çıkar — viewport'tan geniş. Bu veri gerçeği; şablon
  // kırpar ama üstüne yazar.
  const pdp = PAGES.find((p) => p.page === "product_detail");
  const lightbox = pdp.regions.find((r) => r.region === "lightbox_main");
  const layout = regionLayout(lightbox, phone);
  assert.ok(layout.overflows, "608px > 390px olmalı");
  const html = await render(TEMPLATE, { page: pdp, device: phone });
  assert.match(html, /simpage__over/, "taşma rozeti basılmalı");
});

test("kırılım bandı ve LCP adayı şablonda görünüyor", async () => {
  const html = await render(TEMPLATE, { page: home, device: desktop });
  assert.match(html, /≥1024px/, "kazanan bandın alt sınırı yazılmalı");
  assert.match(html, /simpage__lcp/, "LCP adayı işaretlenmeli");
});

// ── 5. 65 kombinasyonun tamamı hatasız render oluyor ──────────────

test("5 sayfa × 13 cihaz = 65 çerçeve, sunucuda hatasız", async () => {
  assert.equal(DEVICES.length, 13);
  assert.equal(PAGES.length, 5);
  const html = await render(GRID, { devices: DEVICES, pages: PAGES, lazy: false });
  const frames = (html.match(/class="simfrm[ "]/g) || []).length;
  assert.equal(frames, 65, `65 çerçeve bekleniyordu, ${frames} çizildi`);
  // 15 bölge × 13 cihaz = 195 bölge şeridi.
  const bands = (html.match(/data-region="/g) || []).length;
  assert.equal(bands, 195, `195 bölge şeridi bekleniyordu, ${bands} çizildi`);
  assert.doesNotMatch(html, /NaN|undefinedpx/, "çıktıda NaN/undefined olmamalı");
});

test("65 kombinasyonun hepsinde ölçek ve sahne ölçüsü üretiliyor", () => {
  let n = 0;
  for (const page of PAGES) {
    for (const device of DEVICES) {
      const frame = deviceFrame(device, 200);
      assert.ok(frame.scale > 0 && frame.scale <= 1, `${device.id}: ölçek aralık dışı`);
      const tpl = pageTemplate(page, device);
      assert.equal(tpl.viewportPx, device.cssWidth, "sahne cihaz genişliğinde olmalı");
      assert.ok(tpl.blocks.length > 0, `${page.page}/${device.id}: boş şablon`);
      for (const b of tpl.blocks) {
        assert.ok(Number.isFinite(b.boxPx), `${b.regionKey}: kutu sayı değil`);
        assert.ok(b.count >= 1, `${b.regionKey}: karo sayısı 0`);
        assert.ok(Number.isFinite(b.tile.heightPx), `${b.regionKey}: karo yüksekliği sayı değil`);
      }
      n += 1;
    }
  }
  assert.equal(n, 65);
});

// ── 6. Render motoru HESABI DEĞİŞTİRMİYOR ─────────────────────────

test("195 kombinasyonda regionLayout().boxPx === boxWidth() — sapma 0", () => {
  let checked = 0;
  let drift = 0;
  for (const page of PAGES) {
    for (const region of page.regions) {
      for (const device of DEVICES) {
        const expected = boxWidth(region, device);
        const got = regionLayout(region, device).boxPx;
        if (got !== expected) {
          drift += 1;
          console.error(`SAPMA ${region.key} × ${device.id}: ${got} ≠ ${expected}`);
        }
        checked += 1;
      }
    }
  }
  assert.equal(checked, 195, "195 kombinasyon koşturulmalı");
  assert.equal(drift, 0, `${drift} kombinasyonda kutu genişliği sapmış`);
});

test("containerParts() kapsayıcı genişliğini containerWidth() ile aynı çözüyor", () => {
  const names = ["viewport", "boxed", "pdp_shell", "pdp_content_col", "seller_shell"];
  let checked = 0;
  for (const name of names) {
    for (const device of DEVICES) {
      const parts = containerParts(name, device.cssWidth);
      assert.equal(
        parts.contentPx,
        containerWidth(name, device.cssWidth),
        `${name} × ${device.id}: içerik genişliği sapmış`
      );
      checked += 1;
    }
  }
  assert.equal(checked, names.length * DEVICES.length);
});

test("çerçeve motoru kutu matematiğini kendi yazmıyor, layout.js'i çağırıyor", () => {
  const src = readFileSync(enginePath, "utf8");
  assert.match(src, /import \{[^}]*boxWidth[^}]*\} from "\.\/layout\.js"/s, "boxWidth çağrılmalı");
  // İkinci bir kutu hesabı yazılmış olsaydı parite testi bunu yakalamazdı:
  // burada aritmetiğin merdiven/DPR tarafına HİÇ girmediği doğrulanıyor.
  assert.doesNotMatch(src, /requiredPx|selectRendition|dpr\s*\*/, "seçim hesabı çerçeveye sızmış");
});

// ── 7. Ekran motoru gerçekten kullanıyor ──────────────────────────

test("ekran çerçeveyi ve çerçeve matrisini basıyor", () => {
  assert.match(viewSrc, /<SimDeviceFrame/, "tek çerçeve ekranda yok");
  assert.match(viewSrc, /<SimFrameGrid/, "çerçeve matrisi ekranda yok");
  assert.match(viewSrc, /:available-width="stageWidth"/, "ölçek ölçülen genişlikten gelmeli");
});

test("tembel montaj gözlemciye bağlı ama gözlemci yoksa içerik GİZLİ KALMIYOR", () => {
  assert.match(frameSrc, /IntersectionObserver/, "tembel montaj yok");
  assert.match(frameSrc, /!props\.lazy \|\| !hasObserver/, "gözlemci yoksa doğrudan kurulmalı");
  assert.match(frameSrc, /observer\?\.disconnect\(\)/, "gözlemci sökülmüyor — sızıntı");
});

test("ölçüm dürüstlüğü: süre iddiası yok, ÖLÇÜLMEDİ yazılı", () => {
  assert.match(frameSrc, /ÖLÇÜLMEDİ/, "çerçeve süresi ölçülmediği yazılmalı");
  assert.match(viewSrc, /ÖLÇÜLMEDİ/, "ekran ölçüm durumunu saklamamalı");
  assert.doesNotMatch(frameSrc, /1[.,]5\s*sn'?de|ms'de boyan/i, "ölçülmemiş süre iddiası");
});
