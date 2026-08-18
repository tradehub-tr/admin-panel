// Mock çıktısının SÖZLEŞMEYE uyduğunu kilitler.
//
// NEDEN AYRI TEST:
//   `packagingMock.test.js` davranışı ölçüyor ("iş akışı kapanıyor mu").
//   Bu dosya ŞEKLİ ölçüyor: hangi alanlar hangi tipte dönüyor. İkisi farklı
//   şeyler — akış doğru çalışırken alan adı sapmış olabilir ve sapma ancak
//   gerçek uca bağlanınca, yani en pahalı anda ortaya çıkar.
//
// 13-BE İÇİN NE İŞE YARIYOR:
//   Uçları yazan kişi "mock ne döndürüyordu" sorusunu buradan cevaplıyor.
//   Sözleşme belgesi (`docs/lojistik/13-FE-VERI-SOZLESMESI.md`) anlatıyor,
//   bu test **zorluyor**. Belge bayatlayabilir; test bayatlayamaz.
//
//   Uç canlıya alındığında bu dosya SİLİNMEZ — `USE_MOCK` kapandıktan sonra
//   gerçek yanıt üzerinde çalışacak bir entegrasyon testine dönüştürülür.

import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";

const store = new Map();
const session = new Map();
const shim = (m) => ({
  getItem: (k) => (m.has(k) ? m.get(k) : null),
  setItem: (k, v) => m.set(k, String(v)),
  removeItem: (k) => m.delete(k),
});
globalThis.localStorage = shim(store);
globalThis.sessionStorage = shim(session);
globalThis.Blob = class Blob {};
globalThis.URL = { ...globalThis.URL, createObjectURL: () => "blob:contract" };

const { packagingMock, resetMockData } = await import("../packagingMock.js");

const SHP = "SHP-2026-00042";

beforeEach(() => {
  store.clear();
  session.clear();
  resetMockData();
});

/** Alan varlığı + tip denetimi. `null` kabul edilebilir alanlar `?` ile. */
function assertShape(obj, shape, path = "") {
  for (const [key, expected] of Object.entries(shape)) {
    const optional = expected.endsWith("?");
    const type = optional ? expected.slice(0, -1) : expected;
    const at = `${path}${key}`;
    assert.ok(key in obj, `${at} alanı eksik`);
    const value = obj[key];
    if (value === null || value === undefined) {
      assert.ok(optional, `${at} null olamaz`);
      continue;
    }
    if (type === "array") assert.ok(Array.isArray(value), `${at} dizi olmalı`);
    else assert.equal(typeof value, type, `${at} tipi ${type} olmalı`);
  }
}

test("get_packing_queue — sözleşme §2.1 şekli", async () => {
  const res = await packagingMock.getPackingQueue({ bucket: "partial" });
  assertShape(res, { items: "array", total: "number", page: "number", page_size: "number", buckets: "object" });
  assertShape(res.items[0], {
    shipment: "string", order: "string", buyer_name: "string", seller_name: "string",
    item_count: "number", package_count: "number", waiting_hours: "number",
    carrier: "string", bucket: "string", status: "string",
  });
  // Kova adları sözleşmedeki dördü — ekran bunlara göre pill çiziyor.
  assert.deepEqual(
    Object.keys(res.buckets).sort().filter((k) => !["unpacked", "partial", "awaiting_label", "ready"].includes(k)),
    [],
    "sözleşme dışı kova adı"
  );
});

test("get_shipment_packing — sözleşme §2.2 şekli", async () => {
  const doc = await packagingMock.getShipmentPacking(SHP);
  assertShape(doc, {
    shipment: "string", order: "string", buyer_name: "string", status: "string",
    modified: "string", is_locked: "boolean", desi_divisor: "number",
    packing_completed_at: "string?",
    items: "array", packages: "array", totals: "object", package_types: "array",
  });

  assertShape(doc.items[0], {
    row_id: "string", order_item: "string", listing: "string",
    item_name: "string", variation: "string", qty: "number",
    uom: "string", scan_code: "string?",
  });

  assertShape(doc.packages[0], {
    row_id: "string", package_code: "string", sequence: "number",
    package_type: "string", length_cm: "number", width_cm: "number", height_cm: "number",
    weight_kg: "number", qty: "number", desi: "number", chargeable_kg: "number",
    barcode: "string", contents: "array", label: "object",
  });

  assertShape(doc.packages[0].contents[0], { shipment_item: "string", qty: "number" });

  assertShape(doc.packages[0].label, {
    status: "string", url: "string?", barcode_url: "string?", format: "string?",
    generated_at: "string?", printed_at: "string?", print_count: "number",
    carrier_tracking: "string?",
  });

  assertShape(doc.totals, {
    package_count: "number", total_weight: "number",
    total_desi: "number", chargeable_weight: "number",
  });

  assertShape(doc.package_types[0], {
    name: "string", package_name: "string",
    length_cm: "number", width_cm: "number", height_cm: "number",
    max_weight_kg: "number", max_desi: "number", is_default: "number",
  });
});

test("label.status yalnız sözleşmedeki beş değeri alıyor", async () => {
  const VALID = ["None", "Generated", "Printed", "Voided", "Stale"];
  const doc = await packagingMock.getShipmentPacking(SHP);
  for (const pkg of doc.packages) {
    assert.ok(VALID.includes(pkg.label.status), `geçersiz durum: ${pkg.label.status}`);
  }
});

test("save_shipment_packages TAM yükü döndürüyor — ekran yerel yama yapmıyor", async () => {
  const doc = await packagingMock.getShipmentPacking(SHP);
  const saved = await packagingMock.saveShipmentPackages(SHP, doc.packages, doc.modified);
  // Kaydetme yanıtı, okuma yanıtıyla aynı şekilde olmalı: ekran ikisini de
  // `adopt()` ile aynı yoldan yerleştiriyor.
  for (const key of ["items", "packages", "totals", "package_types", "modified", "desi_divisor"]) {
    assert.ok(key in saved, `kaydetme yanıtında ${key} yok`);
  }
  assert.notEqual(saved.modified, doc.modified, "modified damgası tazelenmeli");
});

test("generate_shipment_labels — sözleşme §2.4 şekli", async () => {
  const doc = await packagingMock.getShipmentPacking(SHP);
  const codes = [doc.packages[2].package_code];
  const res = await packagingMock.generateLabels(SHP, codes, "a4_single");
  assertShape(res, { labels: "array", batch_url: "string" });
  assertShape(res.labels[0], {
    package_code: "string", url: "string", barcode_url: "string?",
    format: "string", generated_at: "string",
  });
  assert.equal(res.labels[0].format, "a4_single", "istenen format geri dönmeli");
});

test("get_pallet_plan — sözleşme §2.8 şekli", async () => {
  const plan = await packagingMock.getPalletPlan(SHP);
  assertShape(plan, {
    shipment: "string", modified: "string",
    pallets: "array", pallet_types: "array", packages: "array",
  });
  assertShape(plan.pallets[0], {
    row_id: "string", pallet_code: "string", pallet_type: "string",
    max_weight_kg: "number", max_layers: "number", layer_count: "number",
    packages: "array", package_count: "number",
    loaded_weight_kg: "number", loaded_desi: "number", is_overloaded: "number",
  });
  assertShape(plan.pallet_types[0], {
    name: "string", length_cm: "number", width_cm: "number",
    max_weight_kg: "number", max_layers: "number", is_default: "number",
  });
});

test("hata nesneleri sözleşmedeki KODU taşıyor", async () => {
  // Ekranlar mesaja değil koda göre dallanıyor; kod kaybolursa hata ekranı
  // genel "bir şeyler ters gitti"ye düşer.
  await assert.rejects(
    () => packagingMock.getShipmentPacking("YOK"),
    (e) => {
      assert.equal(e.code, "NOT_FOUND");
      assert.ok(e.message.length > 0, "mesaj boş olamaz");
      return true;
    }
  );
});

test("desi ve ücret SUNUCUDA hesaplanıyor — istemci gönderse de ezilir", async () => {
  const doc = await packagingMock.getShipmentPacking(SHP);
  const tampered = doc.packages.map((p) => ({ ...p, desi: 9999, chargeable_kg: 9999 }));
  const saved = await packagingMock.saveShipmentPackages(SHP, tampered, doc.modified);
  assert.notEqual(saved.packages[0].desi, 9999, "istemci değeri kabul edilmemeli");
  assert.equal(saved.packages[0].desi, doc.packages[0].desi);
});

test("package_code ve sequence istemciden GELMEZ — sunucu üretir", async () => {
  const doc = await packagingMock.getShipmentPacking("SHP-2026-00043");
  const saved = await packagingMock.saveShipmentPackages("SHP-2026-00043", [
    { package_code: "İSTEMCİ-UYDURDU", sequence: 99, package_type: "Koli-M",
      length_cm: 40, width_cm: 30, height_cm: 25, weight_kg: 5, qty: 1, contents: [] },
  ], doc.modified);
  assert.equal(saved.packages[0].sequence, 1, "sıra sunucuda yeniden üretilmeli");
});
