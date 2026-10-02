import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { createI18n } from "vue-i18n";
import { renderToString } from "@vue/server-renderer";

import messages from "../../../../lib/media/preview/messages.js";
import { describe as describeAxe, scanHtml } from "../../a11y/axeHarness.js";

const frontendRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
let server;
before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    plugins: [vue()],
    resolve: {
      alias: [
        {
          find: /^@\/utils\/api$/,
          replacement: `${frontendRoot}/src/components/media/__tests__/fixtures/apiMock.js`,
        },
        { find: "@", replacement: `${frontendRoot}/src` },
      ],
    },
    server: { middlewareMode: true },
    appType: "custom",
  });
});
after(async () => server?.close());

async function render(props, locale = "tr") {
  const { default: C } = await server.ssrLoadModule(
    "/src/components/media/preview/ImagePlacementButton.vue"
  );
  const app = createSSRApp({ render: () => h(C, props) });
  app.use(createI18n({ legacy: false, locale, fallbackLocale: "tr", messages }));
  return renderToString(app);
}

test("Özgen banner'ı: düğme + '4 yerde kenarlar kesiliyor' rozeti", async () => {
  const html = await render({
    fileUrl: "/files/c2/ozgen-banner.webp",
    slotKey: "company.cover_image",
    dims: { width: 2000, height: 408 },
  });
  assert.match(html, /Nerelerde görünecek\?/);
  assert.match(html, /4 yerde kenarlar kesiliyor/);
  assert.match(html, /data-placement-url="\/files\/c2\/ozgen-banner\.webp"/);
  const { violations } = await scanHtml(html);
  assert.equal(violations.length, 0, describeAxe(violations));
});

test("kare ürün görselinde rozet yok", async () => {
  const html = await render({
    fileUrl: "/files/p.webp",
    slotKey: "product.image",
    dims: { width: 1000, height: 1000 },
  });
  assert.doesNotMatch(html, /kenarlar kesiliyor/);
});

test("İngilizce tekil/çoğul", async () => {
  const html = await render(
    { fileUrl: "/files/logo.png", slotKey: "seller.logo", dims: { width: 400, height: 200 } },
    "en"
  );
  assert.match(html, /Edges cut in 1 place\b/);
  assert.doesNotMatch(html, /Edges cut in 1 places/);
});

test("adres yoksa düğme devre dışı", async () => {
  const html = await render({ fileUrl: "", slotKey: "product.image" });
  assert.match(html, /<button[^>]*disabled/);
});
