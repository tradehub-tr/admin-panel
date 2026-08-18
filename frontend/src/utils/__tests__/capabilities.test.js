// Capability normalizasyonunu kilitler.
//
// Bu testin var olma sebebi somut: uç sözlük döndürürken store dizi
// varsayıyordu ve panel herkesi salt-okunur gösteriyordu. Hata iki katmanın
// arasında yaşadığı için ne backend ne frontend testi görüyordu.

import assert from "node:assert/strict";
import test from "node:test";

import { normalizeCapabilities } from "../capabilities.js";

test("SÖZLÜK biçimi — uçların bugünkü yanıtı", () => {
  // get_logistics_permissions'ın gerçek çıktısı (ölçüldü 2026-08-18).
  const payload = {
    "shipment.create": true,
    "shipment.write": true,
    "shipment.cancel": true,
    "shipment.split": true,
    "view.logistics_cost": true,
    "view.tracking": true,
    "carrier_credential.manage": true,
    "view.carrier_secret": true,
  };
  const caps = normalizeCapabilities(payload);
  assert.equal(caps.length, 8);
  assert.ok(caps.includes("shipment.write"));
});

test("sözlükte FALSE olanlar dışarıda kalıyor", () => {
  const caps = normalizeCapabilities({ "shipment.write": true, "shipment.cancel": false });
  assert.deepEqual(caps, ["shipment.write"]);
});

test("dizi biçimi olduğu gibi geçiyor — sözleşme değişirse kırılmasın", () => {
  assert.deepEqual(normalizeCapabilities(["shipment.write"]), ["shipment.write"]);
});

test("tanınmayan yük YETKİSİZ sayılıyor", () => {
  // Yetkili varsaymak, yetkisiz varsaymaktan tehlikeli.
  for (const bad of [null, undefined, "shipment.write", 42, true]) {
    assert.deepEqual(normalizeCapabilities(bad), [], `${String(bad)} boş dönmeli`);
  }
});

test("dizideki string olmayan öğeler eleniyor", () => {
  assert.deepEqual(normalizeCapabilities(["shipment.write", null, 7]), ["shipment.write"]);
});

test("dönüş her zaman .includes() destekliyor — asıl kırılma noktası", () => {
  for (const payload of [{ a: true }, ["a"], null, "x"]) {
    const caps = normalizeCapabilities(payload);
    assert.equal(typeof caps.includes, "function");
  }
});
