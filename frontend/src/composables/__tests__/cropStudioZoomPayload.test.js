import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { createServer } from "vite";

import { ZOOM_MAX, ZOOM_MIN } from "../../lib/media/crop/geometry.js";

/**
 * T-105 B/C/E — zoom + pan merkezi kaydetme yüküne girer.
 *
 * Ölçülmüş arka plan: yük yalnız odak taşırken sunucu pencereyi daima tam
 * kadrajdan kuruyordu ve `cropPixelParity` B sınıfı 120 vakanın 119'unda
 * 7391 px'e kadar sapıyordu. Bu dosya, o kaybı kapatan sözleşmeyi sabitler:
 *
 *   1. `savePayload` zoom üçlüsünü (zoom, center_x, center_y) taşır.
 *   2. Üçlü 6 basamağa yuvarlanır — 1e-6'lık zoom hatası ölçülen en büyük
 *      kaynakta (8688 px) bile ~0,005 px'tir, kadraj kaymaz.
 *   3. `validateIntentPayload` sunucunun kurallarının ALT KÜMESİNİ önden
 *      uygular: üçlü birlikte, zoom [ZOOM_MIN, ZOOM_MAX], merkez 0-1.
 *
 * Piksel paritesinin kendisi burada DEĞİL, `cropPixelParity.test.js`te
 * ölçülür (B: sapan 3 · en büyük 1 px). Burada yalnız yükün sözleşmesi var —
 * iki testin işi ayrıdır ve biri diğerinin yerine geçmez.
 */

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));

let server;
let useCropStudio;
let validateIntentPayload;

before(async () => {
  // `@/` alias'ı için Vite; composable uygulama yollarını kullanıyor
  // (cropStudio.test.js ile aynı yükleme deseni).
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: { alias: { "@": `${frontendRoot}/src` } },
    server: { middlewareMode: true },
    appType: "custom",
  });
  ({ useCropStudio, validateIntentPayload } = await server.ssrLoadModule(
    "/src/composables/useCropStudio.js"
  ));
});

after(async () => {
  await server?.close();
});

const COVER = "company.cover_image";
const make = (opts = {}) =>
  useCropStudio({ source: { width: 4000, height: 3000 }, slotKey: COVER, ...opts });

test("savePayload zoom üçlüsünü taşır — varsayılanda zoom=1, merkez ortada", () => {
  const p = make().savePayload.value;
  assert.equal(p.zoom, 1);
  assert.equal(p.center_x, 0.5);
  assert.equal(p.center_y, 0.5);
});

test("setZoom + pan yüke birebir yansır (6 basamak yuvarlama)", () => {
  const s = make();
  s.setZoom(2.7182818284);
  s.pan(400, -300); // kaynak pikseli: 400/4000 = +0.1, -300/3000 = -0.1
  const p = s.savePayload.value;
  assert.equal(p.zoom, Number((2.7182818284).toFixed(6)));
  assert.equal(p.center_x, 0.6);
  assert.equal(p.center_y, 0.4);
});

test("zoom kaydırıcının sınırları yükte de görünür — kelepçe jest katmanında", () => {
  const s = make();
  s.setZoom(99);
  assert.equal(s.savePayload.value.zoom, ZOOM_MAX);
  s.setZoom(0.2);
  assert.equal(s.savePayload.value.zoom, ZOOM_MIN);
});

test("üretilen yük sözleşme kapısından geçer", () => {
  const s = make();
  s.setZoom(3.5);
  s.pan(200, 200);
  s.dragFocal(0.7, 0.3);
  assert.deepEqual(validateIntentPayload(s.savePayload.value, { slotKey: COVER }), []);
});

test("validateIntentPayload: aralık dışı zoom reddedilir — kelepçelenmez", () => {
  const taban = { focal_x: 0.5, focal_y: 0.5, center_x: 0.5, center_y: 0.5 };
  const kucuk = validateIntentPayload({ ...taban, zoom: 0.5 });
  assert.ok(
    kucuk.some((h) => h.includes("zoom")),
    `zoom=0.5 geçti: ${JSON.stringify(kucuk)}`
  );
  const buyuk = validateIntentPayload({ ...taban, zoom: ZOOM_MAX + 1 });
  assert.ok(
    buyuk.some((h) => h.includes("zoom")),
    "zoom>ZOOM_MAX geçti"
  );
  const sayiDegil = validateIntentPayload({ ...taban, zoom: "yakın" });
  assert.ok(
    sayiDegil.some((h) => h.includes("zoom")),
    "sayı olmayan zoom geçti"
  );
});

test("validateIntentPayload: yarım üçlü reddedilir — zoom merkezsiz taşınamaz", () => {
  const yalnizZoom = validateIntentPayload({ focal_x: 0.5, focal_y: 0.5, zoom: 2 });
  assert.ok(
    yalnizZoom.some((h) => h.includes("birlikte")),
    `merkezsiz zoom geçti: ${JSON.stringify(yalnizZoom)}`
  );
  const yalnizMerkez = validateIntentPayload({
    focal_x: 0.5,
    focal_y: 0.5,
    center_x: 0.5,
    center_y: 0.5,
  });
  assert.ok(
    yalnizMerkez.some((h) => h.includes("birlikte")),
    "zoom'suz merkez geçti"
  );
});

test("validateIntentPayload: merkez 0-1 dışıysa reddedilir", () => {
  const bulgular = validateIntentPayload({
    focal_x: 0.5,
    focal_y: 0.5,
    zoom: 2,
    center_x: 1.4,
    center_y: 0.5,
  });
  assert.ok(
    bulgular.some((h) => h.includes("center_x")),
    `center_x=1.4 geçti: ${JSON.stringify(bulgular)}`
  );
});

test("üçlü hiç verilmemişse kapı susar — eski yükler geçerli kalır", () => {
  // Geriye uyumluluk: zoom bilmeyen bir çağıranın yükü (yalnız odak) bugün de
  // sözleşmeye uygundur; sunucu da parametresiz çağrıda kayıtlı üçlüyü korur.
  assert.deepEqual(validateIntentPayload({ focal_x: 0.25, focal_y: 0.75 }), []);
});

test("endpoint.fields zoom üçlüsünü belgeler", () => {
  const s = make();
  assert.ok(
    s.endpoint.fields.some((f) => f.includes("zoom") && f.includes("center_x")),
    "endpoint alan listesi zoom üçlüsünü söylemiyor"
  );
});
