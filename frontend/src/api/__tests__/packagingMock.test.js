// Mock'un backend DAVRANIŞINI taklit ettiğini kilitler.
//
// Bu testin ölçtüğü şey "veri dönüyor mu" değil, **iş akışı kapanıyor mu**:
// kaydedilen kalıyor mu, tamamlanan listeye yansıyor mu, üretilen belge
// açılabilir mi, hatalar tetiklenebiliyor mu
// (`docs/lojistik/FE-MOCK-DISIPLINI.md` §5 kabul ölçüsü).
//
// Mock kaldırıldığında bu dosya da silinir.

import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";

// Tarayıcı API'leri — mock localStorage ve Blob kullanıyor.
const store = new Map();
const session = new Map();
const shim = (m) => ({
  getItem: (k) => (m.has(k) ? m.get(k) : null),
  setItem: (k, v) => m.set(k, String(v)),
  removeItem: (k) => m.delete(k),
});
globalThis.localStorage = shim(store);
// Hata senaryosu sekme ömrü kadar yaşıyor (sessionStorage) — kalıcı kilit
// olmasın diye; mock o yüzden ikisini de kullanıyor.
globalThis.sessionStorage = shim(session);
let blobSeq = 0;
globalThis.Blob = class Blob {
  constructor(parts) {
    this.parts = parts;
  }
};
globalThis.URL = { ...globalThis.URL, createObjectURL: () => `blob:mock/${++blobSeq}` };

const { packagingMock, resetMockData, setFault, clearFault } = await import("../packagingMock.js");

const SHP = "SHP-2026-00042";
const EMPTY = "SHP-2026-00043";

beforeEach(() => {
  store.clear();
  session.clear();
  resetMockData();
});

// ── kalıcılık ────────────────────────────────────────────────────────

test("KALICILIK — kaydedilen koli yeniden okumada duruyor", async () => {
  const before = await packagingMock.getShipmentPacking(SHP);
  const next = [
    ...before.packages,
    { package_code: null, package_type: "Koli-M", length_cm: 40, width_cm: 30, height_cm: 25, weight_kg: 7, qty: 1, contents: [{ shipment_item: "a4", qty: 60 }] },
  ];
  await packagingMock.saveShipmentPackages(SHP, next, before.modified);

  // Yeni bir okuma = sayfa yenilenmesi. Depoda duruyor mu?
  const after = await packagingMock.getShipmentPacking(SHP);
  assert.equal(after.packages.length, before.packages.length + 1);
  assert.equal(after.packages.at(-1).contents[0].shipment_item, "a4");
});

test("sunucu koli kodu ve sırasını KENDİSİ üretiyor", async () => {
  const doc = await packagingMock.getShipmentPacking(EMPTY);
  const saved = await packagingMock.saveShipmentPackages(EMPTY, [
    { package_code: null, package_type: "Koli-M", length_cm: 40, width_cm: 30, height_cm: 25, weight_kg: 5, qty: 1, contents: [{ shipment_item: "b1", qty: 12 }] },
  ], doc.modified);
  assert.equal(saved.packages[0].package_code, `${EMPTY}-01`);
  assert.equal(saved.packages[0].sequence, 1);
  assert.ok(saved.packages[0].barcode, "barkod üretilmeli");
});

test("desi ve ücret sunucuda hesaplanıyor — istemci değerine güvenilmiyor", async () => {
  const doc = await packagingMock.getShipmentPacking(SHP);
  const pkg = doc.packages.find((p) => p.package_code.endsWith("-02"));
  assert.equal(pkg.desi, 32, "60×40×40 / 3000");
  assert.equal(pkg.chargeable_kg, 32, "desi ağırlıktan büyük");
});

// ── durum geçişleri ──────────────────────────────────────────────────

test("DURUM GEÇİŞİ — kuyruk kovası sevkiyattan türetiliyor", async () => {
  const initial = await packagingMock.getPackingQueue();
  const row = initial.items.find((r) => r.shipment === SHP);
  assert.equal(row.bucket, "partial", "2 kalem eksik");

  // Kalan iki kalemi de paketle.
  const doc = await packagingMock.getShipmentPacking(SHP);
  const packages = doc.packages.map((p) => ({ ...p }));
  packages[2].contents = [{ shipment_item: "a3", qty: 300 }];
  packages.push({ package_code: null, package_type: "Koli-M", length_cm: 40, width_cm: 30, height_cm: 25, weight_kg: 6, qty: 1, contents: [{ shipment_item: "a1", qty: 600 }, { shipment_item: "a4", qty: 60 }] });
  await packagingMock.saveShipmentPackages(SHP, packages, doc.modified);

  const after = await packagingMock.getPackingQueue();
  const updated = after.items.find((r) => r.shipment === SHP);
  assert.equal(updated.bucket, "awaiting_label", "tüm kalemler paketli, etiket eksik");
  assert.equal(updated.package_count, 4, "koli sayısı listeye yansıdı");
});

test("kova sayaçları listeyle AYNI yanıttan geliyor", async () => {
  const res = await packagingMock.getPackingQueue({ bucket: "unpacked" });
  const total = Object.values(res.buckets).reduce((a, b) => a + b, 0);
  assert.ok(total > 0);
  assert.equal(res.items.every((r) => r.bucket === "unpacked"), true);
  // Sayaç filtreden BAĞIMSIZ: kullanıcı "2" görüp tıklayınca 3 kayıt gelmemeli.
  assert.equal(res.buckets.unpacked, res.total);
});

test("teslim edilmiş sevkiyat paketleme kuyruğunda görünmüyor", async () => {
  const res = await packagingMock.getPackingQueue();
  assert.equal(res.items.some((r) => r.shipment === "SHP-2026-00047"), false);
});

test("eksik kalem varken TAMAMLANAMIYOR", async () => {
  await assert.rejects(
    () => packagingMock.completePacking(SHP, null),
    (e) => e.code === "VALIDATION_FAILED"
  );
});

test("TAM AKIŞ — paketle → tamamla → etiketle → hazır işaretle", async () => {
  // 1. Tüm kalemleri paketle
  const doc = await packagingMock.getShipmentPacking(SHP);
  const packages = doc.packages.map((p) => ({ ...p }));
  packages[2].contents = [{ shipment_item: "a3", qty: 300 }];
  packages.push({ package_code: null, package_type: "Koli-M", length_cm: 40, width_cm: 30, height_cm: 25, weight_kg: 6, qty: 1, contents: [{ shipment_item: "a1", qty: 600 }, { shipment_item: "a4", qty: 60 }] });
  const saved = await packagingMock.saveShipmentPackages(SHP, packages, doc.modified);

  // 2. Tamamla
  const completed = await packagingMock.completePacking(SHP, saved.modified);
  assert.ok(completed.packing_completed_at, "tamamlanma damgası düştü");

  // 3. Etiketsizken hazır işaretlenemez
  await assert.rejects(
    () => packagingMock.markReady(SHP),
    (e) => e.code === "VALIDATION_FAILED"
  );

  // 4. Tüm kolilere etiket üret
  const codes = completed.packages.map((p) => p.package_code);
  const result = await packagingMock.generateLabels(SHP, codes, "thermal_100x150");
  assert.equal(result.labels.length, codes.length);
  assert.ok(result.batch_url.startsWith("blob:"), "toplu belge açılabilir olmalı");

  // 5. Şimdi hazır işaretlenebilir
  const ready = await packagingMock.markReady(SHP);
  assert.equal(ready.status, "Ready for Pickup");

  // 6. Kuyrukta "ready" kovasına düştü
  const queue = await packagingMock.getPackingQueue();
  assert.equal(queue.items.find((r) => r.shipment === SHP).bucket, "ready");
});

// ── gerçek çıktı ─────────────────────────────────────────────────────

test("GERÇEK ÇIKTI — barkod her yükte üretiliyor", async () => {
  const doc = await packagingMock.getShipmentPacking(SHP);
  for (const pkg of doc.packages) {
    assert.match(pkg.label.barcode_url, /^data:image\/svg\+xml,/, `${pkg.package_code} barkodsuz`);
  }
});

test("etiketi olan kolinin açılabilir belgesi var, olmayanın yok", async () => {
  const doc = await packagingMock.getShipmentPacking(SHP);
  const printed = doc.packages.find((p) => p.label.status === "Printed");
  const none = doc.packages.find((p) => p.label.status === "None");
  assert.ok(printed.label.url.startsWith("blob:"));
  assert.equal(none.label.url, null, "üretilmemiş etiketin adresi olmamalı");
});

test("irsaliye belgesi üretiliyor", async () => {
  const { url } = await packagingMock.getPackingSlip(SHP, null);
  assert.ok(url.startsWith("blob:"));
});

test("yeniden basım sayacı artıyor ve denetim izi düşüyor", async () => {
  const before = await packagingMock.getShipmentPacking(SHP);
  const pkg = before.packages.find((p) => p.label.status === "Printed");
  const countBefore = pkg.label.print_count;

  await packagingMock.reprintLabels(SHP, [pkg.package_code], "damaged", "yırtıldı");
  const after = await packagingMock.getShipmentPacking(SHP);
  const updated = after.packages.find((p) => p.package_code === pkg.package_code);
  assert.equal(updated.label.print_count, countBefore + 1);
  assert.equal(updated.label.status, "Printed");
});

test("koli içeriği değişince üretilmiş etiket BAYATLIYOR", async () => {
  const doc = await packagingMock.getShipmentPacking(SHP);
  const packages = doc.packages.map((p) => ({ ...p }));
  // 1. koli "Printed" — içeriğini değiştir.
  packages[0].contents = [{ shipment_item: "a1", qty: 1200 }];
  const saved = await packagingMock.saveShipmentPackages(SHP, packages, doc.modified);
  assert.equal(saved.packages[0].label.status, "Stale");
});

test("etiket iptali takip numarasını da düşürüyor", async () => {
  const doc = await packagingMock.getShipmentPacking(SHP);
  const pkg = doc.packages.find((p) => p.label.carrier_tracking);
  const after = await packagingMock.voidLabel(SHP, pkg.package_code, "hatalı");
  const updated = after.packages.find((p) => p.package_code === pkg.package_code);
  assert.equal(updated.label.status, "Voided");
  assert.equal(updated.label.carrier_tracking, null);
  assert.equal(updated.label.url, null);
});

// ── tetiklenebilir hatalar ───────────────────────────────────────────

test("TETİKLENEBİLİR HATA — conflict kaydetmede çıkıyor", async () => {
  setFault("conflict");
  await assert.rejects(
    () => packagingMock.saveShipmentPackages(SHP, [], null),
    (e) => e.code === "CONFLICT"
  );
  clearFault();
});

test("carrier hatası yalnız etiket işleminde çıkıyor", async () => {
  setFault("carrier");
  await assert.rejects(
    () => packagingMock.generateLabels(SHP, [], "thermal_100x150"),
    (e) => e.code === "CARRIER_ERROR"
  );
  // Okuma etkilenmemeli — hata kapsamı dar.
  const doc = await packagingMock.getShipmentPacking(SHP);
  assert.ok(doc.packages.length);
  clearFault();
});

test("permission hatası her yerde çıkıyor", async () => {
  setFault("permission");
  await assert.rejects(
    () => packagingMock.getPackingQueue(),
    (e) => e.code === "PERMISSION_DENIED"
  );
  clearFault();
});

test("optimistik kilit — eski damgayla kaydetmek CONFLICT", async () => {
  const doc = await packagingMock.getShipmentPacking(SHP);
  await packagingMock.saveShipmentPackages(SHP, doc.packages, doc.modified);
  await assert.rejects(
    () => packagingMock.saveShipmentPackages(SHP, doc.packages, doc.modified),
    (e) => e.code === "CONFLICT"
  );
});

test("kilitli sevkiyat değiştirilemiyor", async () => {
  await assert.rejects(
    () => packagingMock.saveShipmentPackages("SHP-2026-00047", [], null),
    (e) => e.code === "SHIPMENT_LOCKED"
  );
});

test("olmayan sevkiyat NOT_FOUND", async () => {
  await assert.rejects(
    () => packagingMock.getShipmentPacking("SHP-YOK"),
    (e) => e.code === "NOT_FOUND"
  );
});

// ── palet ────────────────────────────────────────────────────────────

test("palet kapasitesi atanan kolilerden TÜRETİLİYOR", async () => {
  const plan = await packagingMock.getPalletPlan(SHP);
  const pallet = plan.pallets[0];
  assert.equal(pallet.package_count, 1);
  assert.equal(pallet.loaded_weight_kg, 18.5, "atanan kolinin ağırlığı");

  // İkinci koliyi de ekle → ağırlık artmalı.
  const next = [{ ...pallet, packages: [...pallet.packages, `${SHP}-02`] }];
  const saved = await packagingMock.savePalletPlan(SHP, next, plan.modified);
  assert.equal(saved.pallets[0].package_count, 2);
  assert.equal(saved.pallets[0].loaded_weight_kg, 30.5);
});

test("aşırı yük bayrağı SUNUCUDA hesaplanıyor", async () => {
  const plan = await packagingMock.getPalletPlan(SHP);
  const tiny = [{ ...plan.pallets[0], max_weight_kg: 10, is_overloaded: 0 }];
  const saved = await packagingMock.savePalletPlan(SHP, tiny, plan.modified);
  assert.equal(saved.pallets[0].is_overloaded, 1, "18.5 kg > 10 kg");
});

test("sıfırlama başlangıç durumuna dönüyor", async () => {
  const doc = await packagingMock.getShipmentPacking(EMPTY);
  await packagingMock.saveShipmentPackages(EMPTY, [
    { package_code: null, package_type: "Koli-M", length_cm: 40, width_cm: 30, height_cm: 25, weight_kg: 5, qty: 1, contents: [] },
  ], doc.modified);
  assert.equal((await packagingMock.getShipmentPacking(EMPTY)).packages.length, 1);

  resetMockData();
  assert.equal((await packagingMock.getShipmentPacking(EMPTY)).packages.length, 0);
});
