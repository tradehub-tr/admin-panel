import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { createI18n } from "vue-i18n";
import { renderToString } from "@vue/server-renderer";

import messages from "../../../../lib/media/preview/messages.js";
import { PLACES } from "../../../../lib/media/vendor/placements.js";
import { describe as describeAxe, scanHtml } from "../../a11y/axeHarness.js";

const frontendRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
let server;
let CONTEXTS;

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
  ({ CONTEXTS } = await server.ssrLoadModule("/src/components/media/preview/contexts/index.js"));
});
after(async () => server?.close());

async function render(component, props) {
  const app = createSSRApp({ render: () => h(component, props) });
  app.use(createI18n({ legacy: false, locale: "tr", fallbackLocale: "tr", messages }));
  return renderToString(app);
}

const DATA = {
  storeName: "Özgen Plastik",
  productName: "17'lik Oto Yıkama Fırçası",
  price: "₺60,40",
};
const FOCAL = { x: 0.78, y: 0.45 };
const ALL = Object.values(PLACES).flat();

test("kayıttaki her bağlam adının bir bileşeni var", () => {
  for (const p of ALL) assert.ok(CONTEXTS[p.context], p.context);
});

test("her yer gerçek oranında ve odakla çizilir", async () => {
  for (const place of ALL) {
    const html = await render(CONTEXTS[place.context], {
      src: "/files/ozgen.webp",
      focal: FOCAL,
      place,
      device: place.device,
      scale: place.device === "desktop" ? 0.65 : 1,
      data: DATA,
    });
    const label = `${place.device}/${place.key}`;
    assert.match(html, /src="\/files\/ozgen\.webp"/, label);
    assert.match(html, new RegExp(`object-fit:\\s*${place.fit}`), label);
    if (place.fit === "cover") assert.match(html, /object-position:\s*78% 45%/, label);
    assert.match(html, /önizlemesi"/, `${label}: alt metin`);
    const veri =
      place.key.startsWith("store") || place.key === "shop_logo"
        ? DATA.storeName
        : DATA.productName;
    assert.ok(
      html.includes(veri.replace("'", "&#39;")) || html.includes(veri),
      `${label}: gerçek veri`
    );
  }
});

test("bağlamlar axe ile 0 ihlal", async () => {
  for (const place of ALL) {
    const html = await render(CONTEXTS[place.context], {
      src: "/files/ozgen.webp",
      focal: FOCAL,
      place,
      device: place.device,
      scale: 1,
      data: DATA,
    });
    const { violations } = await scanHtml(html);
    assert.equal(violations.length, 0, `${place.device}/${place.key}\n${describeAxe(violations)}`);
  }
});

test("iskelet öğelerinin hepsi aria-hidden=true taşır", async () => {
  for (const place of ALL) {
    const html = await render(CONTEXTS[place.context], {
      src: "/files/ozgen.webp",
      focal: FOCAL,
      place,
      device: place.device,
      scale: 1,
      data: DATA,
    });
    const doc = new JSDOM(`<body>${html}</body>`).window.document;
    for (const el of doc.querySelectorAll(".ctx-skel, .ctx-line, .ctx-tile")) {
      assert.equal(
        el.closest("[aria-hidden='true']") !== null,
        true,
        `${place.device}/${place.key}: ${el.className} aria-hidden değil`
      );
    }
  }
});
