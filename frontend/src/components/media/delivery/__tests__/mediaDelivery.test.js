import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";

/**
 * T-120 — teslim bileşenlerinin SÖZLEŞMESİ.
 *
 *   ÖLÇÜLDÜ  — sunucu çıktısındaki öznitelikler: `<picture>` kaynak sırası,
 *              `srcset`/`sizes` eşleşmesi, `width`/`height`, `fetchpriority`,
 *              video'da `poster`/`playsinline`/`preload`/`muted`/`loop` ve
 *              tembel kaynak bağlama.
 *   ÖLÇÜLMEDİ — tarayıcının hangi adayı GERÇEKTE indirdiği, CLS SKORU,
 *              oynatmanın gerçekten başlayıp başlamadığı, HLS segment
 *              zamanlaması. Hepsi canlı tarayıcı ister; bu görevde tarayıcı
 *              doğrulaması YAPILMADI.
 */

const frontendRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
const IMAGE = "/src/components/media/MediaImage.vue";
const VIDEO = "/src/components/media/MediaVideo.vue";

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

async function render(path, props) {
  const { default: Component } = await server.ssrLoadModule(path);
  return renderToString(createSSRApp({ render: () => h(Component, props) }));
}

const RENDITIONS = [
  { width: 640, height: 360, format: "WEBP", fileUrl: "/f/a-640.webp" },
  { width: 320, height: 180, format: "AVIF", fileUrl: "/f/a-320.avif" },
  { width: 640, height: 360, format: "AVIF", fileUrl: "/f/a-640.avif" },
  { width: 320, height: 180, format: "WEBP", fileUrl: "/f/a-320.webp" },
  { width: 640, height: 360, format: "JPEG", fileUrl: "/f/a-640.jpg" },
];

const BASE = {
  src: "/files/vana.jpg",
  alt: "Küresel vana",
  width: 1600,
  height: 900,
  sizes: "(min-width: 768px) 300px, 100vw",
};

// ── MediaImage ────────────────────────────────────────────────────────

test("[FR-121] kaynaklar AVIF → WebP sırasıyla basılıyor, JPEG `<img>`'de kalıyor", async () => {
  const html = await render(IMAGE, { ...BASE, renditions: RENDITIONS });

  const avif = html.indexOf('type="image/avif"');
  const webp = html.indexOf('type="image/webp"');
  assert.ok(avif > -1 && webp > -1, html);
  // Tarayıcı EŞLEŞEN İLK `<source>`'u alır: sıra = tercih.
  assert.ok(avif < webp, "AVIF, WebP'den önce gelmeli");

  // JPEG ayrı bir `<source>` DEĞİL — aynı adayları iki kez ilan etmemek için
  // doğrudan `<img srcset>`'e konuyor.
  assert.doesNotMatch(html, /type="image\/jpeg"/);
  assert.match(html, /<img[^>]*srcset="[^"]*a-640\.jpg 640w/);
});

test("[FR-121] her `srcset` genişliğe göre artan ve tekilleştirilmiş", async () => {
  const html = await render(IMAGE, {
    ...BASE,
    renditions: [
      ...RENDITIONS,
      // Aynı genişlikte ikinci bir AVIF: tarayıcı için ayırt edilemez.
      { width: 640, height: 360, format: "AVIF", fileUrl: "/f/kopya-640.avif" },
    ],
  });
  const avifSet = html.match(/type="image\/avif" srcset="([^"]*)"/)[1];
  assert.equal(avifSet, "/f/a-320.avif 320w, /f/a-640.avif 640w");
  assert.doesNotMatch(avifSet, /kopya/);
});

test("[FR-121] `sizes` her `srcset` ile birlikte basılıyor", async () => {
  const html = await render(IMAGE, { ...BASE, renditions: RENDITIONS });
  // `w` tanımlayıcılı `srcset` + `sizes` yok = tarayıcı 100vw sayar.
  const srcsetCount = (html.match(/srcset="/g) || []).length;
  const sizesCount = (html.match(/sizes="/g) || []).length;
  assert.ok(srcsetCount > 0);
  assert.equal(sizesCount, srcsetCount, html);
});

test("`sizes` YOKSA hiç `srcset` basılmaz — yanlış seçimden iyi", async () => {
  const html = await render(IMAGE, { ...BASE, sizes: "", renditions: RENDITIONS });
  assert.doesNotMatch(html, /srcset=/);
  assert.doesNotMatch(html, /<source/);
  // Görsel yine de görünür: orijinal `src` tek başına çalışır.
  assert.match(html, /src="\/files\/vana\.jpg"/);
});

test("türev yokken tek `<img>`'e sessizce düşülüyor", async () => {
  // Bugünkü gerçek hâl: `Media Rendition` tablosu boş.
  const html = await render(IMAGE, { ...BASE, renditions: [] });
  assert.doesNotMatch(html, /<source/);
  assert.match(html, /<img/);
  assert.match(html, /width="1600"/);
  assert.match(html, /height="900"/);
});

test("tanınmayan biçim sessizce atılıyor — uydurma MIME üretilmiyor", async () => {
  const html = await render(IMAGE, {
    ...BASE,
    renditions: [
      { width: 320, height: 180, format: "HEIC", fileUrl: "/f/a.heic" },
      { width: 320, height: 180, format: "jpg", fileUrl: "/f/a-320.jpg" },
    ],
  });
  assert.doesNotMatch(html, /heic/i);
  // `jpg` = `jpeg`; küçük harf de kabul.
  assert.match(html, /srcset="[^"]*a-320\.jpg 320w/);
});

test("`priority` LCP üçlüsünü kuruyor; varsayılan tembel", async () => {
  const normal = await render(IMAGE, BASE);
  assert.match(normal, /loading="lazy"/);
  assert.doesNotMatch(normal, /fetchpriority/i);

  const lcp = await render(IMAGE, { ...BASE, priority: true });
  assert.match(lcp, /fetchpriority="high"/i);
  assert.match(lcp, /loading="eager"/);
  // Ölçü öznitelikleri her iki durumda da duruyor — CLS koruması priority'ye
  // bağlı olamaz.
  assert.match(lcp, /width="1600"/);
});

// ── MediaVideo ────────────────────────────────────────────────────────

const VBASE = {
  src: "/files/v.mp4",
  type: "video/mp4",
  poster: "/files/v.jpg",
  width: 1280,
  height: 720,
  label: "Ürün tanıtım videosu",
};

test("[FR-124] video kutusu ÖNCEDEN ayrılıyor — poster tek başına yetmez", async () => {
  const html = await render(VIDEO, VBASE);
  assert.match(html, /width="1280"/);
  assert.match(html, /height="720"/);
  assert.match(html, /aspect-ratio:\s*1280\s*\/\s*720/);
  assert.match(html, /poster="\/files\/v\.jpg"/);
});

test("[FR-124] ölçüsü bilinmeyen videoda da kutu ayrılıyor", async () => {
  const html = await render(VIDEO, { src: "/files/v.mp4", label: "x" });
  assert.doesNotMatch(html, /\swidth="/);
  assert.match(html, /aspect-ratio:\s*16\s*\/\s*9/);
});

test("kaynaklar görünürlüğe kadar DOM'a hiç basılmıyor (HLS tembel)", async () => {
  const html = await render(VIDEO, { ...VBASE, hlsSrc: "/files/v.m3u8" });
  // Sunucu çıktısı = kavşak gözlemcisi daha çalışmadan önceki hâl.
  assert.doesNotMatch(html, /<source/);
  assert.doesNotMatch(html, /m3u8/);
  assert.match(html, /preload="none"/);
});

test("`priority` verilen video kaynaklarını beklemeden bağlıyor", async () => {
  // SSR'da `onMounted` koşmaz; bağlama kararı istemcide verilir. Ölçülen:
  // sunucu çıktısında hiçbir kaynağın OLMADIĞI — yani tembellik varsayılan.
  const html = await render(VIDEO, { ...VBASE, priority: true });
  assert.doesNotMatch(html, /<source/);
});

test("[FR-127] sessiz-döngü modu üç koşulu birden kuruyor", async () => {
  const html = await render(VIDEO, { ...VBASE, background: true });
  assert.match(html, /playsinline/);
  assert.match(html, /muted/);
  assert.match(html, /loop/);
  // Kontroller arka plan modunda gizli; `reduce` ayarında istemcide geri gelir.
  assert.doesNotMatch(html, /\scontrols/);
});

test("normal modda kontroller açık ve otomatik oynatma YOK", async () => {
  const html = await render(VIDEO, VBASE);
  assert.match(html, /controls/);
  assert.doesNotMatch(html, /autoplay/);
  assert.doesNotMatch(html, /\sloop/);
});

test("erişilebilir ad ve altyazı izi çağırandan geliyor", async () => {
  const html = await render(VIDEO, {
    ...VBASE,
    captionsSrc: "/files/v.vtt",
    captionsLang: "tr",
    captionsLabel: "Türkçe",
  });
  assert.match(html, /aria-label="Ürün tanıtım videosu"/);
  assert.match(html, /<track[^>]*kind="captions"[^>]*>/);
  assert.match(html, /srclang="tr"/);

  // Ad verilmezse UYDURULMAZ: boş bir `aria-label` basmak, adı olmayan bir
  // elemandan daha kötüdür (ekran okuyucu adı "boş" diye okur).
  const adsiz = await render(VIDEO, { src: "/files/v.mp4" });
  assert.doesNotMatch(adsiz, /aria-label/);
});

test("[FR-126] `prefers-reduced-motion` kararı CSS'te DEĞİL, JS'te veriliyor", async () => {
  // `autoplay` bir özniteliktir; `@media` onu kapatamaz. Kararın `matchMedia`
  // ile verildiği ve ayar oturum içinde değişirse video'nun DURDURULDUĞU
  // kaynakta yazılı olmalı — aksi hâlde "destekliyoruz" iddiası ölçülemez.
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("../../MediaVideo.vue", import.meta.url), "utf8");
  assert.match(source, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(source, /addEventListener\?\.\("change"/);
  assert.match(source, /pause\?\.\(\)/);
});

// ── MediaThumb ↔ türetilmiş `sizes` bağı ──────────────────────────────

const THUMB = "/src/components/media/MediaThumb.vue";
const THUMB_ITEM = {
  fileUrl: "/files/vana.webp",
  fileName: "vana.webp",
  ext: "WEBP",
  kind: "image",
  width: 1600,
  height: 900,
};

test("bölgesiz küçük resim ESKİ davranışta kalıyor — `sizes` yok", async () => {
  const html = await render(THUMB, { item: THUMB_ITEM });
  assert.doesNotMatch(html, /sizes=/);
  assert.doesNotMatch(html, /srcset=/);
  assert.match(html, /width="1600"/);
});

test("bölge verilen küçük resim türetilmiş `sizes`'ı basıyor", async () => {
  // `sizes` yalnız `srcset` ile birlikte anlamlı — türevsiz bir `<img>`'de
  // basılmaz (bkz. "`sizes` YOKSA hiç `srcset` basılmaz" testinin tersi).
  const item = { ...THUMB_ITEM, renditions: RENDITIONS };

  const rowHtml = await render(THUMB, { item, region: "rowThumb" });
  assert.match(rowHtml, /sizes="40px"/);

  const gridHtml = await render(THUMB, { item, region: "libraryGrid", density: 5 });
  // Elle yazılmış bir dizge değil: bant listesi ve sütun bölmesi içeriyor.
  assert.match(gridHtml, /sizes="[^"]*\(min-width: 1280px\)[^"]*\/ 5\)/);
});

test("türevi olan küçük resim bölgeyle birlikte `<source>` üretiyor", async () => {
  const html = await render(THUMB, {
    item: { ...THUMB_ITEM, renditions: RENDITIONS },
    region: "cellThumb",
  });
  assert.match(html, /type="image\/avif"/);
  assert.match(html, /sizes="36px"/);
});
