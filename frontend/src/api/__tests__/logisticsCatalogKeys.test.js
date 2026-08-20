// Katalog anahtar normalizasyonu — REGRESYON testi.
//
// NEDEN VAR (ölçülmüş hata):
//   `list_catalog_keys` data'sı bir NESNE:
//     { catalogs: [{ key, doctype, searchable, filters, has_active_flag }, …] }
//   Store bunu olduğu gibi `catalogKeys`'e atıyordu, `CatalogListView` ise
//   STRING dizisi bekleyip `catalogKeys.map(...)` / `catalogKeys[0]` yazıyordu:
//   `TypeError: catalogKeys.map is not a function`. Katalog seçici boş/kırık.
//
//   Bu hata tam da "CANLI YANIT ŞEKLİ testi yok" diye kaçtı. Aşağıdaki ilk
//   vaka uçtan birebir alınmış gövdeyi kullanıyor — şekil değişirse burası
//   kırmızı olur, üretimde `TypeError` olmaz.

import assert from "node:assert/strict";
import test from "node:test";

import { normalizeCatalogKeys } from "../logisticsCatalogKeys.js";

/** `list_catalog_keys` yanıtının `data` yükü — uçtan birebir. */
const LIVE_PAYLOAD = {
  catalogs: [
    { key: "carrier_branch", doctype: "Carrier Branch", searchable: [], filters: [] },
    {
      key: "carrier_service",
      doctype: "Carrier Service",
      searchable: ["service_name"],
      filters: ["provider"],
      has_active_flag: true,
    },
    {
      key: "logistics_provider",
      doctype: "Logistics Provider",
      searchable: ["provider_name", "provider_code"],
      filters: ["provider_type", "integration_type", "country"],
      has_active_flag: true,
    },
  ],
};

test("canlı nesne şekli → string dizisi", () => {
  const result = normalizeCatalogKeys(LIVE_PAYLOAD);

  assert.ok(Array.isArray(result), "dizi değil — `.map` yine fırlar");
  assert.deepEqual(result, ["carrier_branch", "carrier_service", "logistics_provider"]);
  for (const key of result) assert.equal(typeof key, "string");
});

test("tüketicinin iki kullanımı da çalışır — `.map` ve `[0]`", () => {
  // `CatalogListView`: `catalogKeys.map(k => ({value: k, …}))` ve
  // `route.query.catalog || catalogKeys[0]`.
  const result = normalizeCatalogKeys(LIVE_PAYLOAD);

  assert.doesNotThrow(() => result.map((key) => ({ value: key })));
  assert.equal(result[0], "carrier_branch");
});

test("zaten string dizisiyse aynen kabul edilir", () => {
  // Savunmacı: sözleşme sadeleşirse tüketen taraf kırılmasın.
  assert.deepEqual(normalizeCatalogKeys(["a", "b"]), ["a", "b"]);
});

test("anahtarsız/bozuk girişler elenir, sıra korunur", () => {
  const result = normalizeCatalogKeys({
    catalogs: [{ key: "a" }, { doctype: "X" }, null, { key: "" }, { key: 5 }, "b"],
  });

  assert.deepEqual(result, ["a", "b"]);
});

test("boş katalog listesi boş dizi üretir", () => {
  assert.deepEqual(normalizeCatalogKeys({ catalogs: [] }), []);
});

test("tip dışı girdilerin hiçbiri FIRLATMAZ", () => {
  // Katalog seçici güvenlik sınırı değil; bozuk yanıt ekranı kilitlememeli.
  for (const bad of [null, undefined, 0, 42, "", "logistics_provider", true, {}, { catalogs: 1 }]) {
    let result;
    assert.doesNotThrow(
      () => {
        result = normalizeCatalogKeys(bad);
      },
      `${JSON.stringify(bad)} fırlattı`
    );
    assert.deepEqual(result, [], `${JSON.stringify(bad)} anahtar üretti`);
  }
});
