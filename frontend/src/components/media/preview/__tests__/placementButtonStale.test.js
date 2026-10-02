import { teardownDom } from "../../__tests__/fixtures/jsdomGlobals.js";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { build } from "vite";

const frontendRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
let modPath;
before(async () => {
  // Çeviri motoru bu sınama için gereksiz: anahtarı döndüren küçük sahte.
  const dir = `${frontendRoot}/node_modules/.cache/ipb-test`;
  mkdirSync(dir, { recursive: true });
  const i18nStub = `${dir}/i18nStub.mjs`;
  writeFileSync(i18nStub, "export const useI18n = () => ({ t: (k) => k });\n");
  // İstemci (SSR olmayan) derleme: mount için ssrRender değil render gerekir.
  const out = await build({
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
        { find: /^vue-i18n$/, replacement: i18nStub },
        { find: "@", replacement: `${frontendRoot}/src` },
      ],
    },
    build: {
      write: false,
      lib: {
        entry: `${frontendRoot}/src/components/media/preview/ImagePlacementButton.vue`,
        formats: ["es"],
        fileName: "ipb",
      },
      rollupOptions: { external: ["vue"], output: { inlineDynamicImports: true } },
    },
  });
  const chunk = (Array.isArray(out) ? out[0] : out).output.find((o) => o.type === "chunk");
  modPath = `${dir}/ipb.mjs`;
  writeFileSync(modPath, chunk.code);
});

after(() => {
  rmSync(`${frontendRoot}/node_modules/.cache/ipb-test`, { recursive: true, force: true });
  teardownDom();
});

test("eski adresin geç ölçü yanıtı yenisini ezmez", async () => {
  const { createApp, h, nextTick, ref } = await import("vue");
  const { default: C } = await import(modPath);
  const waiting = {};
  const loadDims = (url) => new Promise((res) => (waiting[url] = res));
  const url = ref("/files/a.webp");
  const root = document.getElementById("app");
  const app = createApp({
    render: () => h(C, { fileUrl: url.value, slotKey: "product.image", loadDims }),
  });
  app.mount(root);
  await nextTick();
  url.value = "/files/b.webp";
  await nextTick();
  waiting["/files/b.webp"]({ width: 1000, height: 1000 }); // kare: rozet yok
  await new Promise((r) => setTimeout(r, 0));
  waiting["/files/a.webp"]({ width: 2000, height: 408 }); // geç gelen: rozet doğurur
  await new Promise((r) => setTimeout(r, 0));
  await nextTick();
  assert.doesNotMatch(root.innerHTML, /imagePlacement\.badge/);
  app.unmount();
});
