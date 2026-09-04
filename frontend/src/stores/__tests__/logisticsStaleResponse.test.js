import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, test } from "node:test";
import { createServer } from "vite";
import { createPinia, setActivePinia } from "pinia";

/**
 * Lojistik store — BAYAT-YANIT KORUMASI (denetim 2026-09-04).
 *
 * NE ÖLÇÜLDÜ:
 *   • `fetchShipments` / `fetchShipment` / `fetchCatalog` / `fetchCatalogItem`
 *     yarışında yalnız SON isteğin sonucu state'e yazılıyor; geç dönen eski
 *     yanıt (başarı da hata da) sessizce düşürülüyor.
 *   • `loading` yalnız son istek tarafından kapatılıyor — eski isteğin
 *     erken dönüşü süren isteğin iskeletini söndürmüyor.
 *
 * NE ÖLÇÜLMEDİ:
 *   • Liste-vs-detay eşzamanlı çakışmasında paylaşılan `loading`/`error`
 *     davranışı — bilinçli minimum-değişiklik sınırı, store'daki fetchSeq
 *     yorumunda yazılı.
 *
 * HİÇBİR UÇ ÇAĞRILMAZ: `@/api/logistics` alias'la fixtures/logisticsApiStub'a
 * çevrilir; yanıt sırasını test elle kurar.
 */

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));

let server;
let stub;
let useLogisticsStore;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: {
      alias: [
        {
          find: "@/api/logistics",
          replacement: `${frontendRoot}/src/stores/__tests__/fixtures/logisticsApiStub.js`,
        },
        { find: "@", replacement: `${frontendRoot}/src` },
      ],
    },
    server: { middlewareMode: true },
    appType: "custom",
  });
  stub = await server.ssrLoadModule("/src/stores/__tests__/fixtures/logisticsApiStub.js");
  ({ useLogisticsStore } = await server.ssrLoadModule("/src/stores/logistics.js"));
});

after(async () => {
  await server?.close();
});

beforeEach(() => {
  setActivePinia(createPinia());
  stub.resetPending();
});

test("fetchShipments: geç dönen eski yanıt yeni listeyi ezmez", async () => {
  const store = useLogisticsStore();

  const first = store.fetchShipments({ status: "Draft" });
  const second = store.fetchShipments({ status: "In Transit" });
  assert.equal(stub.pending.listShipments.length, 2);

  // Yeni istek ÖNCE döner…
  stub.pending.listShipments[1].resolve({ items: [{ name: "SHP-YENI" }], total: 1 });
  await second;
  assert.deepEqual(
    store.shipmentRows.map((r) => r.name),
    ["SHP-YENI"]
  );
  assert.equal(store.loading, false);

  // …eski istek SONRA döner: state'e dokunmamalı.
  stub.pending.listShipments[0].resolve({ items: [{ name: "SHP-ESKI" }], total: 99 });
  await first;
  assert.deepEqual(
    store.shipmentRows.map((r) => r.name),
    ["SHP-YENI"]
  );
  assert.equal(store.shipmentTotal, 1);
  assert.equal(store.loading, false);
});

test("fetchShipments: bayat HATA da taze listeyi ve error'ı ezmez", async () => {
  const store = useLogisticsStore();

  const first = store.fetchShipments({ page: 1 });
  const second = store.fetchShipments({ page: 2 });

  stub.pending.listShipments[1].resolve({ items: [{ name: "SHP-1" }], total: 1 });
  await second;

  stub.pending.listShipments[0].reject(
    new stub.LogisticsApiError("PERMISSION_DENIED", "yetki yok")
  );
  await first;

  assert.deepEqual(
    store.shipmentRows.map((r) => r.name),
    ["SHP-1"]
  );
  assert.equal(store.error, null);
  assert.equal(store.loading, false);
});

test("fetchShipments: eski istek erken dönerse loading'i söndürmez", async () => {
  const store = useLogisticsStore();

  const first = store.fetchShipments({ page: 1 });
  const second = store.fetchShipments({ page: 2 });

  // ESKİ istek önce döner: sonucu düşer, loading yeni istek için AÇIK kalır.
  stub.pending.listShipments[0].resolve({ items: [{ name: "SHP-ESKI" }], total: 9 });
  await first;
  assert.equal(store.loading, true);
  assert.deepEqual(store.shipmentRows, []);

  stub.pending.listShipments[1].resolve({ items: [{ name: "SHP-YENI" }], total: 1 });
  await second;
  assert.equal(store.loading, false);
  assert.deepEqual(
    store.shipmentRows.map((r) => r.name),
    ["SHP-YENI"]
  );
});

test("fetchShipment: geç dönen eski detay yeni detayı ezmez", async () => {
  const store = useLogisticsStore();

  const first = store.fetchShipment("SHP-ESKI");
  const second = store.fetchShipment("SHP-YENI");

  stub.pending.getShipment[1].resolve({ name: "SHP-YENI" });
  await second;
  stub.pending.getShipment[0].resolve({ name: "SHP-ESKI" });
  await first;

  assert.equal(store.currentShipment?.name, "SHP-YENI");
  assert.equal(store.loading, false);
});

test("fetchCatalogItem: geç dönen eski detay yeni kaydı ezmez", async () => {
  const store = useLogisticsStore();

  // Riskli senaryo (doğrulama turu 2026-09-04): kullanıcı A kaydından B'ye
  // hızla geçer, A'nın detayı GEÇ döner. `currentItem` formu doldurduğu için
  // ezilirse sonuç yanlış kayda yazımdır — liste yarışından daha tehlikeli.
  const first = store.fetchCatalogItem("logistics_provider", "PRV-ESKI");
  const second = store.fetchCatalogItem("logistics_provider", "PRV-YENI");
  assert.equal(stub.pending.getCatalogItem.length, 2);

  stub.pending.getCatalogItem[1].resolve({ name: "PRV-YENI" });
  await second;
  stub.pending.getCatalogItem[0].resolve({ name: "PRV-ESKI" });
  await first;

  assert.equal(store.currentItem?.name, "PRV-YENI");
  assert.equal(store.loading, false);
});

test("fetchCatalogItem: bayat HATA taze detayı ve error'ı ezmez", async () => {
  const store = useLogisticsStore();

  const first = store.fetchCatalogItem("logistics_provider", "PRV-ESKI");
  const second = store.fetchCatalogItem("logistics_provider", "PRV-YENI");

  stub.pending.getCatalogItem[1].resolve({ name: "PRV-YENI" });
  await second;

  // Eski isteğin hatası taze detayı null'a çekmemeli, ekrana hata basmamalı.
  stub.pending.getCatalogItem[0].reject(
    new stub.LogisticsApiError("PERMISSION_DENIED", "yetki yok")
  );
  await first;

  assert.equal(store.currentItem?.name, "PRV-YENI");
  assert.equal(store.error, null);
  assert.equal(store.loading, false);
});

test("fetchCatalogItem: eski istek erken dönerse loading'i söndürmez", async () => {
  const store = useLogisticsStore();

  const first = store.fetchCatalogItem("logistics_provider", "PRV-ESKI");
  const second = store.fetchCatalogItem("logistics_provider", "PRV-YENI");

  stub.pending.getCatalogItem[0].resolve({ name: "PRV-ESKI" });
  await first;
  assert.equal(store.loading, true, "yeni istek sürerken iskelet açık kalmalı");
  assert.equal(store.currentItem, null);

  stub.pending.getCatalogItem[1].resolve({ name: "PRV-YENI" });
  await second;
  assert.equal(store.loading, false);
  assert.equal(store.currentItem?.name, "PRV-YENI");
});

test("fetchCatalog: geç dönen eski katalog yeni satırları ezmez", async () => {
  const store = useLogisticsStore();

  const first = store.fetchCatalog("logistics_provider", {});
  const second = store.fetchCatalog("carrier_status_mapping", {});

  stub.pending.listCatalog[1].resolve({ items: [{ name: "MAP-1" }], total: 1 });
  await second;
  stub.pending.listCatalog[0].resolve({ items: [{ name: "PRV-1" }], total: 7 });
  await first;

  assert.deepEqual(
    store.catalogRows.map((r) => r.name),
    ["MAP-1"]
  );
  assert.equal(store.catalogTotal, 1);
  assert.equal(store.loading, false);
});
