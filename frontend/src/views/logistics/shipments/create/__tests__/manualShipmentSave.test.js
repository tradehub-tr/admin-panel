import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, test } from "node:test";
import { createServer } from "vite";

/**
 * C1 kaydetme akışı — İDEMPOTENCY ANAHTARI + KİLİT (doğrulama turu
 * 2026-09-04).
 *
 * NE ÖLÇÜLDÜ (GERÇEK `useManualShipmentSave` koşuyor, kopyası değil):
 *   • Anahtar `manual-` önekli ve UUID gövdeli; hata sonrası tekrar AYNI
 *     anahtarı gönderiyor, başarı sonrası YENİ form YENİ anahtar üretiyor.
 *   • `crypto` YOKKEN (güvensiz origin: http + LAN IP) save fırlatmıyor,
 *     form kilitlenmiyor, anahtar yine üretiliyor — düzeltilen hatanın
 *     birebir senaryosu.
 *   • Yeniden-giriş kilidi: save sürerken ikinci çağrı istek atmıyor.
 *   • Başarı işleri (`onCreated`) hata verirse saveError doluyor ve kilit
 *     yine çözülüyor.
 *
 * NE ÖLÇÜLMEDİ:
 *   • View'ın toast/yönlendirme kararları (persisted bayrağı) — SFC
 *     `node --test` altında yalnız SSR ile yüklenebiliyor ve `permsReady`
 *     kapısı SSR'de açılmıyor (dataTableRowLink sınırı). O karar mock→gerçek
 *     geçiş sözleşmesiyle birlikte E2E'de yaşıyor.
 *
 * HİÇBİR UÇ ÇAĞRILMAZ: `@/api/shipmentCreate` alias'la
 * fixtures/shipmentCreateStub'a çevrilir.
 */

const frontendRoot = fileURLToPath(new URL("../../../../../..", import.meta.url));

let server;
let stub;
let useManualShipmentSave;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: {
      alias: [
        {
          find: "@/api/shipmentCreate",
          replacement: `${frontendRoot}/src/views/logistics/shipments/create/__tests__/fixtures/shipmentCreateStub.js`,
        },
        { find: "@", replacement: `${frontendRoot}/src` },
      ],
    },
    server: { middlewareMode: true },
    appType: "custom",
  });
  stub = await server.ssrLoadModule(
    "/src/views/logistics/shipments/create/__tests__/fixtures/shipmentCreateStub.js"
  );
  ({ useManualShipmentSave } = await server.ssrLoadModule(
    "/src/views/logistics/shipments/create/useManualShipmentSave.js"
  ));
});

after(async () => {
  await server?.close();
});

beforeEach(() => {
  stub.resetPending();
});

test("anahtar manual- önekli UUID; başarıda sıfırlanır, yeni kayıt yeni anahtar alır", async () => {
  const createdSeen = [];
  const { saving, saveError, save } = useManualShipmentSave({
    onCreated: (created) => createdSeen.push(created),
  });

  const first = save({ order: "SO-1" });
  assert.equal(saving.value, true);
  const key1 = stub.pending.createManualShipment[0].payload.idempotency_key;
  assert.match(key1, /^manual-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

  stub.pending.createManualShipment[0].resolve({ name: "SHP-1", order: "SO-1", status: "Draft" });
  assert.equal(await first, true);
  assert.equal(saving.value, false);
  assert.equal(saveError.value, null);
  assert.equal(createdSeen[0]?.name, "SHP-1");

  // Başarıdan sonraki kayıt YENİ anahtar taşımalı — eskisi tekrar giderse
  // sunucu ikinci taslağı "aynı istek" sanıp yutar.
  const second = save({ order: "SO-2" });
  const key2 = stub.pending.createManualShipment[1].payload.idempotency_key;
  assert.notEqual(key2, key1);
  stub.pending.createManualShipment[1].resolve({ name: "SHP-2", order: "SO-2", status: "Draft" });
  await second;
});

test("hata sonrası tekrar AYNI anahtarla gider (backend çift kayıt açmasın)", async () => {
  const { saving, saveError, save } = useManualShipmentSave();

  const first = save({ order: "SO-1" });
  const key1 = stub.pending.createManualShipment[0].payload.idempotency_key;
  stub.pending.createManualShipment[0].reject(new Error("sunucu 500"));
  assert.equal(await first, false);
  assert.equal(saving.value, false, "hata kilidi açık bırakmamalı");
  assert.equal(saveError.value?.code, "INTERNAL_ERROR");

  const retry = save({ order: "SO-1" });
  assert.equal(saveError.value, null, "yeni deneme eski hatayı temizlemeli");
  const key2 = stub.pending.createManualShipment[1].payload.idempotency_key;
  assert.equal(key2, key1, "hata sonrası anahtar korunmalı");
  stub.pending.createManualShipment[1].resolve({ name: "SHP-1", order: "SO-1", status: "Draft" });
  assert.equal(await retry, true);
});

test("crypto YOKKEN (güvensiz origin) save fırlatmaz ve formu kilitlemez", async () => {
  // Düzeltilen hatanın senaryosu: http + LAN IP altında `crypto.randomUUID`
  // tanımsız — eski kod senkron TypeError ile `saving`i açık bırakıyordu.
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
  try {
    const { saving, saveError, save } = useManualShipmentSave();

    const first = save({ order: "SO-1" });
    assert.equal(
      stub.pending.createManualShipment.length,
      1,
      "istek anahtar üretilemedi diye düşmemeli"
    );
    const key = stub.pending.createManualShipment[0].payload.idempotency_key;
    assert.match(key, /^manual-/, "önek sözleşmesi yedek üretimde de korunmalı");

    stub.pending.createManualShipment[0].resolve({ name: "SHP-1", order: "SO-1" });
    assert.equal(await first, true);
    assert.equal(saving.value, false, "form kilitli kalmamalı");
    assert.equal(saveError.value, null);
  } finally {
    Object.defineProperty(globalThis, "crypto", descriptor);
  }
});

test("yeniden-giriş kilidi: save sürerken ikinci çağrı istek atmaz", async () => {
  const { save } = useManualShipmentSave();

  const first = save({ order: "SO-1" });
  assert.equal(await save({ order: "SO-1" }), false, "ikinci tıklama sessizce düşmeli");
  assert.equal(stub.pending.createManualShipment.length, 1, "tek istek gitmeli — iki taslak değil");

  stub.pending.createManualShipment[0].resolve({ name: "SHP-1", order: "SO-1" });
  assert.equal(await first, true);
});

test("onCreated hata verirse saveError dolar, kilit yine çözülür", async () => {
  const { saving, saveError, save } = useManualShipmentSave({
    onCreated: () => {
      throw new Error("yönlendirme patladı");
    },
  });

  const first = save({ order: "SO-1" });
  stub.pending.createManualShipment[0].resolve({ name: "SHP-1", order: "SO-1" });
  assert.equal(await first, false);
  assert.equal(saving.value, false);
  assert.equal(saveError.value?.code, "INTERNAL_ERROR");
});
