import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";

/**
 * Düzen kayması (CLS) kanıtı — NE ÖLÇÜLDÜ, NE ÖLÇÜLMEDİ:
 *
 *   ÖLÇÜLDÜ  — görsellerin yerinin ÖNCEDEN ayrıldığı: `width`/`height`
 *              öznitelikleri ve `aspect-ratio` sunucu çıktısında basılıyor mu,
 *              ölçü bilinmediğinde bile kutu ayrılıyor mu.
 *   ÖLÇÜLMEDİ — gerçek tarayıcıdaki CLS SKORU. Bunun için düzen motoru gerekir
 *              (Chrome + LayoutShift observer); burada jsdom bile yok, SSR
 *              çıktısı okunuyor. "CLS = 0" demiyoruz; "kayma kaynağı olan
 *              ölçüsüz `<img>` kalmadı" diyoruz.
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const read = (p) => readFileSync(new URL(p, `file://${frontendRoot}/`), "utf8");

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

async function renderComponent(path, props) {
  const { default: Component } = await server.ssrLoadModule(path);
  const app = createSSRApp({ render: () => h(Component, props) });
  return renderToString(app);
}

const IMAGE = "/src/components/media/MediaImage.vue";

test("[FR-124][NFR-033] ölçüsü bilinen görsel intrinsic öznitelikleri basar", async () => {
  const html = await renderComponent(IMAGE, {
    src: "/files/vana.webp",
    alt: "Küresel vana",
    width: 1920,
    height: 1080,
  });

  // Tarayıcı yüksekliği bu iki öznitelikten türetir ve daha İLK düzen
  // geçişinde ayırır — kaynak inince satır kaymaz.
  assert.match(html, /width="1920"/);
  assert.match(html, /height="1080"/);
  // Kutu da aynı oranı taşır: CSS genişliği değişse bile oran korunur.
  assert.match(html, /aspect-ratio:\s*1920\s*\/\s*1080/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /decoding="async"/);
});

test("[FR-124] ölçüsü BİLİNMEYEN görselde de kutu ayrılır — yanlış oran, kaymayan orandır", async () => {
  const html = await renderComponent(IMAGE, { src: "/files/x.png", alt: "x" });

  assert.doesNotMatch(html, /\swidth="/);
  assert.doesNotMatch(html, /\sheight="/);
  // Yedek oran yine de yer ayırır; hiç ayırmamak tek gerçek hata.
  assert.match(html, /aspect-ratio:\s*1\s*\/\s*1/);
});

test("özel yedek oran uygulanır", async () => {
  const html = await renderComponent(IMAGE, { src: "/files/x.png", fallbackRatio: "16 / 9" });
  assert.match(html, /aspect-ratio:\s*16\s*\/\s*9/);
});

test("LQIP data URI yer tutucu olarak basılır", async () => {
  const html = await renderComponent(IMAGE, {
    src: "/files/x.png",
    width: 400,
    height: 300,
    lqip: "data:image/png;base64,iVBORw0KGgo=",
  });
  assert.match(html, /background-image:\s*url\(&quot;data:image\/png;base64,iVBORw0KGgo=&quot;\)/);
});

test("LQIP düz renk olarak da gelebilir (picture.py sözleşmesi)", async () => {
  const html = await renderComponent(IMAGE, { src: "/files/x.png", lqip: "#c0392b" });
  assert.match(html, /background-color:\s*#c0392b/);
});

test("uydurma LQIP değeri stil bağlamına enjeksiyon YAPAMAZ", async () => {
  const html = await renderComponent(IMAGE, {
    src: "/files/x.png",
    lqip: 'red"); position: fixed; top: 0; background-image: url("//evil/x.png',
  });
  assert.doesNotMatch(html, /position:\s*fixed/);
  assert.doesNotMatch(html, /evil/);
});

test("[FR-124][NFR-028] kaynak yokken kutu yine ayrılır — boş satır zıplamasın", async () => {
  const html = await renderComponent(IMAGE, { src: "", width: 200, height: 100 });
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /aspect-ratio:\s*200\s*\/\s*100/);
});

test("kart küçük resmi dosyanın GERÇEK piksel ölçüsünü basar", async () => {
  // `MediaThumb` kart ızgarasının önizlemesi; ölçü satıcı kütüphanesinin
  // üstverisinden geliyor (`th_media_width` / `th_media_height`).
  const html = await renderComponent("/src/components/media/MediaThumb.vue", {
    item: {
      fileUrl: "/files/vana.webp",
      fileName: "vana.webp",
      ext: "WEBP",
      kind: "image",
      width: 1600,
      height: 900,
    },
  });
  assert.match(html, /width="1600"/);
  assert.match(html, /height="900"/);
});

test("gezgin satırlarındaki 44px küçük resim de ölçüsünü bildirir", () => {
  // Satır küçük resmi sabit kutuda: öznitelik gerçek piksel değil, ayrılacak
  // kutunun ölçüsü — 1:1. CSS'teki değerle aynı sabitten geliyor.
  for (const path of [
    "src/views/system/MediaExplorerView.vue",
    "src/views/seller/SellerMediaExplorerView.vue",
  ]) {
    const src = read(path);
    assert.match(src, /const THUMB_PX = 44;/, path);
    assert.match(src, /:width="THUMB_PX"/, path);
    assert.match(src, /:height="THUMB_PX"/, path);
    // Ham img etiketi kalmadı: hepsi yer tutuculu bileşenden geçiyor.
    // Yalnız SFC şablonuna bakılıyor; yorumlarda etiket adı geçebilir.
    const template = src.slice(src.indexOf("\n<template>"));
    assert.doesNotMatch(template, /<img[\s>]/, path);
  }
});

test("[FR-124] medya ekranlarındaki her görsel kutusu ÖNCEDEN ayrılmış", () => {
  // Bu ekranlar (Medya Paneli, Denetim Kaydı) `MediaImage` kullanmıyor —
  // kutularını kendi CSS'leriyle ayırıyorlar. Ölçüt bileşen değil SONUÇ:
  // yükseklik içerikten türüyorsa görsel indiğinde altındaki her şey kayar.
  const optimize = read("src/views/system/MediaOptimizeView.vue");
  const audit = read("src/views/system/MediaAuditView.vue");

  // Sabit ölçülü satır küçük resimleri: iki boyut da yazılı.
  for (const [src, cls] of [
    [optimize, "mo__thumb"],
    [audit, "ma__thumb"],
  ]) {
    const block = src.slice(
      src.indexOf(`  .${cls} {`),
      src.indexOf("}", src.indexOf(`  .${cls} {`))
    );
    assert.match(block, /width:\s*34px/, cls);
    assert.match(block, /height:\s*34px/, cls);
  }

  // Kart önizlemeleri: kutuyu `aspect-ratio` ayırıyor.
  assert.match(optimize, /\.mo__card-thumb \{\s*\n\s*aspect-ratio: 1;/);
  assert.match(audit, /\.ma__card-thumb \{\s*\n\s*aspect-ratio: 1;/);

  // Denetim detay önizlemesi: `max-height` üst sınırdı, yükseklik yine
  // içerikten türüyordu — görsel inince altındaki rapor bloğu zıplıyordu.
  const detail = audit.slice(audit.indexOf("  .ma__detail-preview {"));
  assert.match(detail.slice(0, 600), /height:\s*15rem;/);
  assert.doesNotMatch(detail.slice(0, 600), /max-height:\s*15rem;/);

  // ÖLÇÜLMEDİ / KAPSAM DIŞI: `.ma__lightbox img` (tam ekran örtü). Oranı
  // önceden bilinmiyor ve altında akan içerik yok; kutuyu sabitlemek
  // görseli bozardı.
});
