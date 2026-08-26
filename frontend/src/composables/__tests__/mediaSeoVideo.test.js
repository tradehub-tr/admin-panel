import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { createServer } from "vite";

/**
 * Medya SEO — video alanları (Task 8 / TUR-135 devamı).
 *
 * `isVideoFile` dosya uzantısından video olup olmadığına karar veriyor;
 * panelde SEO çekmecesinin video bölümünü (poster/transcript/altyazı) yalnız
 * video dosyalarında gösterebilmek için gerekli. Sorgu string'i (`?x=1`)
 * uzantı kontrolünü bozmamalı.
 */

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));

let server;
let isVideoFile;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: { alias: [{ find: "@", replacement: `${frontendRoot}/src` }] },
    server: { middlewareMode: true },
    appType: "custom",
  });
  ({ isVideoFile } = await server.ssrLoadModule("/src/composables/useMediaSeo.js"));
});

after(async () => {
  await server?.close();
});

test("isVideoFile uzantıdan video tanır", () => {
  assert.equal(isVideoFile("/files/a.webm"), true);
  assert.equal(isVideoFile("/files/a.mp4?x=1"), true);
  assert.equal(isVideoFile("/files/a.jpg"), false);
});

test("isVideoFile büyük/küçük harf ve eksik değeri tolere eder", () => {
  assert.equal(isVideoFile("/files/A.MOV"), true);
  assert.equal(isVideoFile("/files/a.m4v"), true);
  assert.equal(isVideoFile("/files/a.mkv"), true);
  assert.equal(isVideoFile(""), false);
  assert.equal(isVideoFile(undefined), false);
});
