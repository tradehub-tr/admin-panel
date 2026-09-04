import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createI18n } from "vue-i18n";

import tr from "../../../i18n/locales/tr.js";

/**
 * ErrorState "Yeniden dene" görünürlük sözleşmesi (denetim 2026-09-04, M1/M2).
 *
 * NEDEN BU TEST VAR: retry butonu kalıcı hatalarda ÖLÜ BUTONDU — bilinmeyen
 * katalog anahtarında (NOT_FOUND meta hatası) tıklanınca aynı hata yeniden
 * doğuyordu. "Ölü kontrol yasağı" panelin yazılı ilkesi; buton yalnız
 * yeniden denemenin işe yarayabileceği GEÇİCİ hatalarda çizilmeli.
 *
 * ÖLÇÜLEN: SSR çıktısında butonun hangi hata kodlarında var/yok olduğu.
 * ÖLÇÜLMEYEN: tıklama emit'i (SSR'de olay koşmaz — dataTableRowLink deseni).
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const ERROR_STATE = "/src/components/logistics/ErrorState.vue";
const RETRY_LABEL = tr.logistics.error.retry;

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

async function render(error) {
  const { default: ErrorState } = await server.ssrLoadModule(ERROR_STATE);
  const app = createSSRApp({ render: () => h(ErrorState, { error }) });
  app.use(createI18n({ legacy: false, locale: "tr", fallbackLocale: "tr", messages: { tr } }));
  return renderToString(app);
}

test("geçici hatada (kod yok / bilinmeyen kod) retry butonu VAR", async () => {
  const generic = await render({ message: "Sunucuya ulaşılamadı" });
  assert.ok(generic.includes(RETRY_LABEL), "kodsuz hatada retry görünmeli");

  const unknown = await render({ code: "TIMEOUT", message: "Zaman aşımı" });
  assert.ok(unknown.includes(RETRY_LABEL), "bilinmeyen kodda retry görünmeli");
});

test("NOT_FOUND kalıcıdır — retry butonu HİÇ çizilmez (ölü buton yasağı)", async () => {
  const html = await render({ code: "NOT_FOUND", message: "Katalog bulunamadı" });
  assert.ok(!html.includes(RETRY_LABEL), "NOT_FOUND'da retry ölü buton olurdu");
});

test("yetki ve kapalı özellik hatalarında retry butonu yok (mevcut davranış korunur)", async () => {
  for (const code of ["FEATURE_DISABLED", "PERMISSION_DENIED", "CAPABILITY_REQUIRED"]) {
    const html = await render({ code, message: "x" });
    assert.ok(!html.includes(RETRY_LABEL), `${code} hatasında retry görünmemeli`);
  }
});
