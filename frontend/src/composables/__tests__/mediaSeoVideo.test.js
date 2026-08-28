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
let useMediaSeo;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: { alias: [{ find: "@", replacement: `${frontendRoot}/src` }] },
    server: { middlewareMode: true },
    appType: "custom",
  });
  ({ isVideoFile, useMediaSeo } = await server.ssrLoadModule("/src/composables/useMediaSeo.js"));
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

/**
 * Task 6 (2026-08-26 medya-watch-page) — `changeWatchSlug` panel ucu.
 *
 * `regeneratePoster`/`uploadCaptions` gibi bu dosyanın diğer video aksiyonları
 * da yalnız VARLIK/şekil düzeyinde test ediliyor (gerçek `api.callMethod`
 * ağ çağrısını mock'lamak bu composable için hiç kurulmamış, kapsam dışı
 * bırakılıyor — aynı sınır burada da geçerli). Asıl davranış (backend
 * `change_watch_slug` çağrısı + `slug`/`canonical` tazeleme) `row` yokken
 * no-op olmalı; bu, ağ çağrısı olmadan doğrulanabilen tek dal.
 */
test("useMediaSeo değişkeni changeWatchSlug aksiyonunu dışa aktarır", () => {
  const s = useMediaSeo();
  assert.equal(typeof s.changeWatchSlug, "function");
});

test("changeWatchSlug row olmadan no-op döner, ağ çağrısı yapmaz", async () => {
  const s = useMediaSeo();
  const sonuc = await s.changeWatchSlug(null, "her-hangi-bir-slug");
  assert.equal(sonuc, null);
  assert.equal(s.acting.value, "");
});
