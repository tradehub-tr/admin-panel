// Sevkiyat zarf köprüsü — GERÇEK fonksiyonlar sınanıyor.
//
// `api/v1/shipment.py` bu istemciden ayrı yazıldı ve sözleşmesi farklı:
// 0-tabanlı `limit_start` ofseti vs 1-tabanlı `page`, `shipments` vs `items`.
// Çeviri sessizce bozulursa liste ekranı yanlış sayfayı gösterir — kimse
// fark etmez, çünkü veri gelir, sadece yanlış veri gelir.

import assert from "node:assert/strict";
import test from "node:test";

import { omitEmpty, toPageEnvelope, toPageParams } from "../shipmentEnvelope.js";

test("sayfa 1 sıfır ofsete karşılık gelir", () => {
  const { limit_start, limit_page_length } = toPageParams(1, 20);
  assert.equal(limit_start, 0);
  assert.equal(limit_page_length, 20);
});

test("sayfa 3, sayfa boyutu 20 → ofset 40", () => {
  assert.equal(toPageParams(3, 20).limit_start, 40);
});

test("sıfır ve negatif sayfa 1'e sabitlenir", () => {
  // Negatif ofset SQL sorgusunu kırar; sınırda sessizce 0'a inmeli.
  assert.equal(toPageParams(0, 20).limit_start, 0);
  assert.equal(toPageParams(-5, 20).limit_start, 0);
  assert.equal(toPageParams(0, 20).page, 1);
});

test("geçersiz sayfa boyutu varsayılana düşer", () => {
  assert.equal(toPageParams(1, 0).limit_page_length, 50);
  assert.equal(toPageParams(1, null).limit_page_length, 50);
});

test("yanıt anahtarı shipments → items", () => {
  const out = toPageEnvelope({ shipments: [{ name: "SHP-1" }], total: 7 }, { page: 2, pageSize: 10 });
  assert.deepEqual(out.items, [{ name: "SHP-1" }]);
  assert.equal(out.total, 7);
});

test("sayfa bilgisi yanıttan değil istekten gelir", () => {
  // Uç `page`/`page_size` döndürmüyor — köprü bunları istekten taşıyor.
  const out = toPageEnvelope({ shipments: [], total: 0 }, { page: 4, pageSize: 25 });
  assert.equal(out.page, 4);
  assert.equal(out.page_size, 25);
});

test("boş yanıtta items dizi kalır", () => {
  // Ekranlar `rows.length` okuyor; undefined gelirse render patlar.
  assert.deepEqual(toPageEnvelope({}, { page: 1, pageSize: 50 }).items, []);
  assert.deepEqual(toPageEnvelope(undefined, { page: 1, pageSize: 50 }).items, []);
  assert.equal(toPageEnvelope(undefined, { page: 1, pageSize: 50 }).total, 0);
});

test("boş filtreler istekten düşürülür", () => {
  // Uç `status=""` gelince ValidationError atıyor — hiç göndermemek gerek.
  assert.deepEqual(omitEmpty({ status: null, order: "", limit_start: 0 }), { limit_start: 0 });
});

test("sıfır ve false değerler KORUNUR", () => {
  // `limit_start: 0` geçerli bir değer — boş filtre elemesi onu düşürmemeli.
  assert.deepEqual(omitEmpty({ limit_start: 0, is_active: false }), {
    limit_start: 0,
    is_active: false,
  });
});
