import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { createI18n } from "vue-i18n";
import { renderToString } from "@vue/server-renderer";

import messages from "../../../../lib/media/preview/messages.js";
import { placesFor, placeVisibility } from "../../../../lib/media/preview/places.js";
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
          find: /^@\/composables\/useScrollLock$/,
          replacement: `${frontendRoot}/src/components/media/preview/__tests__/fixtures/noopScrollLock.js`,
        },
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

async function render(path, props, locale = "tr") {
  const { default: C } = await server.ssrLoadModule(path);
  const app = createSSRApp({ render: () => h(C, props) });
  app.use(createI18n({ legacy: false, locale, fallbackLocale: "tr", messages }));
  return renderToString(app);
}

async function expectClean(html, label, lang = "tr") {
  const { violations } = await scanHtml(html, { lang });
  assert.equal(violations.length, 0, `${label}\n${describeAxe(violations)}`);
}

const ITEMS = placesFor("company.cover_image", "desktop").map((place) => ({
  id: `${place.device}:${place.key}`,
  place,
  label: place.label,
  visibility: placeVisibility(place, 2000 / 408),
}));

test("PlaceList (liste ve çip) 0 ihlal", async () => {
  for (const variant of ["list", "chips"]) {
    const html = await render("/src/components/media/preview/PlaceList.vue", {
      items: ITEMS,
      currentIndex: 0,
      src: "/files/ozgen.webp",
      focal: { x: 0.78, y: 0.45 },
      variant,
    });
    await expectClean(html, variant);
  }
});

test("FocalEditor (masaüstü, telefon, Arapça) 0 ihlal", async () => {
  for (const [compact, locale] of [
    [false, "tr"],
    [true, "tr"],
    [false, "ar"],
  ]) {
    const html = await render(
      "/src/components/media/preview/FocalEditor.vue",
      {
        src: "/files/ozgen.webp",
        imageRatio: 2000 / 408,
        focal: { x: 0.78, y: 0.45 },
        frame: { left: 0.43, top: 0, width: 0.44, height: 1 },
        compact,
        imageAlt: "Görselin tamamı",
      },
      locale
    );
    await expectClean(html, `compact=${compact} ${locale}`, locale);
  }
});

test("pencere kabuğu (açık, veri yüklenmeden) 0 ihlal", async () => {
  const html = await render("/src/components/media/preview/ImagePlacementModal.vue", {
    open: true,
    fileUrl: "/files/c2/ozgen-banner.webp",
    slotKey: "company.cover_image",
    context: { storeName: "Özgen Plastik" },
  });
  assert.match(html, /role="dialog"/);
  await expectClean(html, "modal");
});
