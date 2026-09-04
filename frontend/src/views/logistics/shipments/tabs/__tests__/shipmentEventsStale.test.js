import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, test } from "node:test";
import { createServer } from "vite";

/**
 * B6 takip sekmesi veri katmanı — BAYAT-YANIT KORUMASI (doğrulama turu
 * 2026-09-04).
 *
 * NE ÖLÇÜLDÜ (GERÇEK `useShipmentEvents` koşuyor, kopyası değil):
 *   • A→B hızlı geçişte geç dönen A yanıtı (başarı da hata da) B'nin olay
 *     listesini, takip linkini ve sessizlik damgasını (`loadedAt`) ezmiyor.
 *   • `loading` yalnız son istek tarafından kapatılıyor.
 *   • TAZE hata olayları ve takip linkini temizliyor, ekrana hata veriyor.
 *   • Sevkiyat adı boşken istek hiç atılmıyor (onMounted erken dönüşü).
 *
 * NE ÖLÇÜLMEDİ:
 *   • Sekmenin `watch(shipment.name) → load` bağlantısı — SFC `node --test`
 *     altında yalnız SSR ile yüklenebiliyor ve SSR'de watch koşmuyor
 *     (dataTableRowLink sınırı). Bağlantı kaynak sözleşmesi olarak
 *     `trackingTabReload.test.js`'te kilitli.
 *
 * HİÇBİR UÇ ÇAĞRILMAZ: `@/api/shipmentEvents` alias'la
 * fixtures/shipmentEventsStub'a çevrilir; yanıt sırasını test elle kurar.
 */

const frontendRoot = fileURLToPath(new URL("../../../../../..", import.meta.url));

let server;
let stub;
let useShipmentEvents;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: {
      alias: [
        {
          find: "@/api/shipmentEvents",
          replacement: `${frontendRoot}/src/views/logistics/shipments/tabs/__tests__/fixtures/shipmentEventsStub.js`,
        },
        { find: "@", replacement: `${frontendRoot}/src` },
      ],
    },
    server: { middlewareMode: true },
    appType: "custom",
  });
  stub = await server.ssrLoadModule(
    "/src/views/logistics/shipments/tabs/__tests__/fixtures/shipmentEventsStub.js"
  );
  ({ useShipmentEvents } = await server.ssrLoadModule(
    "/src/views/logistics/shipments/tabs/useShipmentEvents.js"
  ));
});

after(async () => {
  await server?.close();
});

beforeEach(() => {
  stub.resetPending();
});

test("A→B geçişi: geç dönen A yanıtı B'nin olaylarını ve linkini ezmez", async () => {
  const { events, trackingUrl, loadedAt, loading, load } = useShipmentEvents();

  const first = load("SHP-A");
  const second = load("SHP-B");
  assert.equal(stub.pending.listShipmentEvents.length, 2);
  assert.deepEqual(stub.pending.listShipmentEvents[1].args, ["SHP-B"]);

  // Yeni istek ÖNCE döner…
  stub.pending.listShipmentEvents[1].resolve({
    items: [{ dedupe_key: "ev-B", event_time: "2026-09-01 10:00:00", status: "In Transit" }],
    tracking_url: "https://carrier.example/track/B",
  });
  assert.equal(await second, true);
  const freshLoadedAt = loadedAt.value;
  assert.ok(freshLoadedAt > 0);

  // …eski istek SONRA döner: hiçbir state'e dokunmamalı.
  stub.pending.listShipmentEvents[0].resolve({
    items: [{ dedupe_key: "ev-A", event_time: "2026-08-01 10:00:00", status: "Delivered" }],
    tracking_url: "https://carrier.example/track/A",
  });
  assert.equal(await first, false, "bayat istek sessizce düşmeli");

  assert.deepEqual(
    events.value.map((e) => e.dedupe_key),
    ["ev-B"]
  );
  assert.equal(trackingUrl.value, "https://carrier.example/track/B");
  assert.equal(loadedAt.value, freshLoadedAt, "bayat yanıt sessizlik damgasını oynatmamalı");
  assert.equal(loading.value, false);
});

test("bayat HATA da taze olay listesini ve error'ı ezmez", async () => {
  const { events, error, loading, load } = useShipmentEvents();

  const first = load("SHP-A");
  const second = load("SHP-B");

  stub.pending.listShipmentEvents[1].resolve({ items: [{ dedupe_key: "ev-B" }] });
  await second;

  stub.pending.listShipmentEvents[0].reject(new Error("ağ koptu"));
  assert.equal(await first, false);

  assert.deepEqual(
    events.value.map((e) => e.dedupe_key),
    ["ev-B"]
  );
  assert.equal(error.value, null);
  assert.equal(loading.value, false);
});

test("eski istek erken dönerse süren yeninin iskeletini söndürmez", async () => {
  const { events, loading, load } = useShipmentEvents();

  const first = load("SHP-A");
  const second = load("SHP-B");

  stub.pending.listShipmentEvents[0].resolve({ items: [{ dedupe_key: "ev-A" }] });
  assert.equal(await first, false);
  assert.equal(loading.value, true, "yeni istek sürerken iskelet açık kalmalı");
  assert.deepEqual(events.value, []);

  stub.pending.listShipmentEvents[1].resolve({ items: [{ dedupe_key: "ev-B" }] });
  assert.equal(await second, true);
  assert.equal(loading.value, false);
});

test("TAZE hata olayları ve takip linkini temizler, ekrana hata verir", async () => {
  const { events, trackingUrl, error, loading, load } = useShipmentEvents();

  // Önce dolu bir sevkiyat…
  const ok = load("SHP-A");
  stub.pending.listShipmentEvents[0].resolve({
    items: [{ dedupe_key: "ev-A" }],
    tracking_url: "https://carrier.example/track/A",
  });
  await ok;

  // …sonra yeni sevkiyat hata döner: A'nın verisi B'nin hatası altında kalmasın.
  const fail = load("SHP-B");
  stub.pending.listShipmentEvents[1].reject(new Error("sunucu 500"));
  assert.equal(await fail, true, "taze hata uygulanmış sayılır");

  assert.deepEqual(events.value, []);
  assert.equal(trackingUrl.value, null);
  assert.equal(error.value?.code, "INTERNAL_ERROR", "toScreenError biçimi ekrana gitmeli");
  assert.equal(loading.value, false);
});

test("sevkiyat adı boşken istek atılmaz (onMounted erken dönüşü)", async () => {
  const { loading, load } = useShipmentEvents();

  assert.equal(await load(""), false);
  assert.equal(await load(undefined), false);
  assert.equal(stub.pending.listShipmentEvents.length, 0);
  assert.equal(loading.value, false);
});
