/**
 * T-122 — LCP adayı görsel için `<link rel="preload">` (panel).
 *
 *   ÖLÇÜLÜR  — üst sınırın (bir tane) yapısal olduğu; `w` tanımlayıcılı
 *              `srcset`te `imagesrcset` + `imagesizes` ikilisinin birlikte
 *              yazıldığı; belirsiz her durumda HİÇ basılmadığı; ve
 *              `MediaImage.vue`'nun bastığı bağlantının kendi ürettiği
 *              `<source>` ile BİREBİR aynı `srcset`/`sizes`/`type` taşıdığı
 *              (gerçek SSR çıktısı ile karşılaştırılıyor, elle yazılan bir
 *              beklenti dizgesiyle değil).
 *
 *   ÖLÇÜLMEZ — GERÇEK bir tarayıcıda tek istek atılıp atılmadığı. Burada ağ
 *              yok; kanıtlanan şey "preload özniteliği `<picture>`ınkiyle
 *              aynı dizge", "Chrome tek indirdi" DEĞİL. Ayrıca `<img>`in DOM
 *              sırasına göre preload'un GERÇEKTEN daha erken keşfedildiği de
 *              ölçülmedi — bu DevTools ağ şelalesi ister ve yapılmadı.
 *              Vue'nun `onBeforeUnmount` zinciri de burada koşturulmuyor.
 */

import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, test } from "node:test";

import { JSDOM } from "jsdom";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";

import {
  LCP_PRELOAD_MARKER,
  MAX_LCP_PRELOADS,
  hasLcpPreload,
  preloadLcpImage,
  releaseLcpPreload,
  useLcpImagePreload,
} from "../useLcpImagePreload.js";

const SRCSET_AVIF = "/f/a-320.avif 320w, /f/a-640.avif 640w";
const SIZES = "(min-width: 768px) 300px, 100vw";

let dom;
let doc;

beforeEach(() => {
  dom = new JSDOM("<!doctype html><html><head></head><body></body></html>");
  doc = dom.window.document;
});

function baglantilar(d = doc) {
  return Array.from(d.head.querySelectorAll(`link[${LCP_PRELOAD_MARKER}]`));
}

// ── Üst sınır (1. tuzak) ──────────────────────────────────────────────

test("üst sınır BİR — sabit kodda, yorumda değil", () => {
  assert.equal(MAX_LCP_PRELOADS, 1);
});

test("ikinci çağrı hiçbir şey basmaz", () => {
  assert.equal(preloadLcpImage({ src: "/f/a.jpg" }, doc), true);
  assert.equal(preloadLcpImage({ src: "/f/b.jpg" }, doc), false);
  assert.equal(preloadLcpImage({ src: "/f/c.jpg" }, doc), false);
  assert.equal(baglantilar().length, 1);
});

test("sayaç DOM'da: elle konmuş işaretçi de sınırı doldurur", () => {
  const link = doc.createElement("link");
  link.setAttribute("rel", "preload");
  link.setAttribute(LCP_PRELOAD_MARKER, "");
  doc.head.appendChild(link);
  assert.equal(hasLcpPreload(doc), true);
  assert.equal(preloadLcpImage({ src: "/f/a.jpg" }, doc), false);
  assert.equal(baglantilar().length, 1);
});

test("releaseLcpPreload sınırı serbest bırakır (SPA rota değişimi)", () => {
  preloadLcpImage({ src: "/f/a.jpg" }, doc);
  releaseLcpPreload(doc);
  assert.equal(baglantilar().length, 0);
  assert.equal(preloadLcpImage({ src: "/f/b.jpg" }, doc), true);
});

// ── srcset / sizes (2. tuzak) ─────────────────────────────────────────

test("`w` srcset'te `imagesrcset` VE `imagesizes` birlikte yazılır, `href` yazılmaz", () => {
  assert.equal(
    preloadLcpImage(
      { src: "/f/a.jpg", srcset: SRCSET_AVIF, sizes: SIZES, type: "image/avif" },
      doc
    ),
    true
  );
  const link = baglantilar()[0];
  assert.equal(link.getAttribute("imagesrcset"), SRCSET_AVIF);
  assert.equal(link.getAttribute("imagesizes"), SIZES);
  assert.equal(link.hasAttribute("href"), false);
});

test("`sizes` yoksa `w` srcset'li preload BASILMAZ", () => {
  assert.equal(preloadLcpImage({ src: "/f/a.jpg", srcset: SRCSET_AVIF, sizes: "" }, doc), false);
  assert.equal(baglantilar().length, 0);
});

test("`x` tanımlayıcılı srcset'te preload BASILMAZ", () => {
  const ok = preloadLcpImage(
    { src: "/f/a.jpg", srcset: "/f/a.jpg 1x, /f/a2.jpg 2x", sizes: SIZES },
    doc
  );
  assert.equal(ok, false);
  assert.equal(baglantilar().length, 0);
});

test("srcset yokken adres birebir `src`", () => {
  preloadLcpImage({ src: "/f/tek.jpg" }, doc);
  const link = baglantilar()[0];
  assert.equal(link.getAttribute("href"), "/f/tek.jpg");
  assert.equal(link.hasAttribute("imagesrcset"), false);
});

// ── Format (3. tuzak) ─────────────────────────────────────────────────

test("verilen `type` aynen taşınır; verilmezse UYDURULMAZ", () => {
  preloadLcpImage({ src: "/f/a.jpg", srcset: SRCSET_AVIF, sizes: SIZES, type: "image/avif" }, doc);
  assert.equal(baglantilar()[0].getAttribute("type"), "image/avif");

  releaseLcpPreload(doc);
  preloadLcpImage({ src: "/f/tek.avif" }, doc);
  assert.equal(baglantilar()[0].hasAttribute("type"), false);
});

// ── Güvenlik / dayanıklılık ───────────────────────────────────────────

test("güvensiz şema preload'lanmaz, FIRLATMAZ", () => {
  assert.doesNotThrow(() => {
    assert.equal(preloadLcpImage({ src: "javascript:alert(1)" }, doc), false);
    assert.equal(preloadLcpImage({ src: "//evil.example/a.jpg" }, doc), false);
    assert.equal(
      preloadLcpImage(
        { src: "/f/a.jpg", srcset: "/f/a.jpg 320w, javascript:x 640w", sizes: SIZES },
        doc
      ),
      false
    );
  });
  assert.equal(baglantilar().length, 0);
});

test("belge yokken (SSR) sessizce hiçbir şey yapmaz", () => {
  assert.doesNotThrow(() => {
    assert.equal(preloadLcpImage({ src: "/f/a.jpg" }, null), false);
    releaseLcpPreload(null);
  });
});

test("useLcpImagePreload component dışından çağrılabilir", () => {
  const onceki = globalThis.document;
  globalThis.document = doc;
  try {
    assert.doesNotThrow(() => {
      assert.equal(useLcpImagePreload({ src: "/f/a.jpg" }), true);
    });
    assert.equal(baglantilar().length, 1);
  } finally {
    if (onceki === undefined) delete globalThis.document;
    else globalThis.document = onceki;
  }
});

// ── MediaImage.vue entegrasyonu ───────────────────────────────────────

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));
const IMAGE = "/src/components/media/MediaImage.vue";

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

const RENDITIONS = [
  { width: 320, height: 180, format: "AVIF", fileUrl: "/f/a-320.avif" },
  { width: 640, height: 360, format: "AVIF", fileUrl: "/f/a-640.avif" },
  { width: 320, height: 180, format: "WEBP", fileUrl: "/f/a-320.webp" },
  { width: 640, height: 360, format: "JPEG", fileUrl: "/f/a-640.jpg" },
];

const BASE = { src: "/files/vana.jpg", alt: "vana", width: 1600, height: 900, sizes: SIZES };

/** Bileşeni, `document` global'i jsdom'a bağlıyken SSR ile çiz. */
async function renderWithDom(props) {
  const { default: Component } = await server.ssrLoadModule(IMAGE);
  const onceki = globalThis.document;
  globalThis.document = doc;
  try {
    const html = await renderToString(createSSRApp({ render: () => h(Component, props) }));
    return html;
  } finally {
    if (onceki === undefined) delete globalThis.document;
    else globalThis.document = onceki;
  }
}

/** SSR çıktısındaki bir özniteliği oku — beklenti ELLE yazılmasın diye. */
function attr(html, tag, name) {
  const etiket = new RegExp(`<${tag}\\b[^>]*>`).exec(html);
  if (!etiket) return null;
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(etiket[0]);
  return m ? m[1] : null;
}

test("MediaImage: `preload` bayrağı YOKKEN hiçbir bağlantı basılmaz", async () => {
  await renderWithDom({ ...BASE, renditions: RENDITIONS, priority: true });
  assert.equal(baglantilar().length, 0, "priority tek başına preload üretmemeli");
});

test("MediaImage: `priority` YOKKEN `preload` tek başına bağlantı basmaz", async () => {
  await renderWithDom({ ...BASE, renditions: RENDITIONS, preload: true });
  assert.equal(baglantilar().length, 0);
});

test("MediaImage: preload, kendi bastığı İLK `<source>` ile BİREBİR aynı", async () => {
  const html = await renderWithDom({
    ...BASE,
    renditions: RENDITIONS,
    priority: true,
    preload: true,
  });

  assert.equal(baglantilar().length, 1);
  const link = baglantilar()[0];

  // Beklentiler işaretlemeden okunuyor: iki taraf ıraksarsa test kırılır.
  assert.equal(link.getAttribute("imagesrcset"), attr(html, "source", "srcset"));
  assert.equal(link.getAttribute("imagesizes"), attr(html, "source", "sizes"));
  assert.equal(link.getAttribute("type"), attr(html, "source", "type"));
  assert.equal(link.getAttribute("as"), "image");
  assert.equal(link.getAttribute("rel"), "preload");
});

test("MediaImage: türev yokken preload adresi `<img src>` ile aynı", async () => {
  const html = await renderWithDom({ ...BASE, priority: true, preload: true });
  assert.equal(baglantilar().length, 1);
  assert.equal(baglantilar()[0].getAttribute("href"), attr(html, "img", "src"));
});

test("MediaImage: ızgara gibi çok örnek basılsa bile bağlantı TEK", async () => {
  for (let i = 0; i < 8; i += 1) {
    await renderWithDom({
      ...BASE,
      src: `/files/kare-${i}.jpg`,
      renditions: RENDITIONS,
      priority: true,
      preload: true,
    });
  }
  assert.equal(baglantilar().length, MAX_LCP_PRELOADS);
});
