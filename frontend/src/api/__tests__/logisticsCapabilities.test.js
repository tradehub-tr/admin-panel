import assert from "node:assert/strict";
import test from "node:test";

// Capability normalizasyonu — REGRESYON testi.
//
// NEDEN VAR (ölçülmüş hata):
//   `get_logistics_permissions` yanıtındaki `capabilities` bir SÖZLÜK
//   (`{ "shipment.write": true, ... }`), store ise DİZİ bekleyip
//   `includes(...)` çağırıyordu. Fetch dönünce `can` computed'ı
//   `TypeError: capabilities.value.includes is not a function` fırlatıyor,
//   fırlayan computed bir daha değerlendirilemediği için DOM son iyi hâlinde
//   donuyor ve `can.*` KALICI olarak `false` kalıyordu. Görünen sonuç:
//   katalog formundaki "Kaydet", sevkiyat detayındaki "Durum Güncelle" /
//   "İptal" düğmeleri hiç çizilmiyordu.
//
//   Buradaki vakalar o hatanın geri gelmesini engelliyor: hiçbir girdi
//   fırlatmamalı ve `false` değerli capability yetki SAYILMAMALI.
//
// Test GERÇEK kodu çağırıyor — modül saf, `@/utils/api` import etmiyor
// (bkz. `logisticsEnvelope.js` başındaki aynı gerekçe).
import { LOGISTICS_CAPABILITIES, normalizeCapabilities } from "../logisticsCapabilities.js";

test("canlı sözlük şekli — yalnız truthy anahtarlar geçer", () => {
  // Uçtan birebir alınmış şekil; bazı yetkiler kapalı.
  const result = normalizeCapabilities({
    "shipment.create": true,
    "shipment.write": true,
    "shipment.cancel": false,
    "shipment.split": false,
    "view.logistics_cost": true,
    "view.tracking": true,
    "carrier_credential.manage": false,
    "view.carrier_secret": false,
  });

  assert.ok(result instanceof Set);
  assert.deepEqual(
    [...result].sort(),
    ["shipment.create", "shipment.write", "view.logistics_cost", "view.tracking"].sort()
  );
});

test("false değerli capability Set'e GİRMEZ", () => {
  // Asıl tuzak: anahtarın VARLIĞI değil DEĞERİ belirleyici. `Object.keys`
  // ile normalize edilseydi kapalı yetkiler açık görünürdü.
  const result = normalizeCapabilities({ "shipment.cancel": false, "view.carrier_secret": true });

  assert.equal(result.has("shipment.cancel"), false, "kapalı yetki açık görünüyor");
  assert.equal(result.has("view.carrier_secret"), true);
  assert.equal(result.size, 1);
});

test("falsy varyantları da yetki sayılmaz", () => {
  const result = normalizeCapabilities({ a: 0, b: "", c: null, d: undefined, e: 1, f: "yes" });

  assert.deepEqual([...result].sort(), ["e", "f"]);
});

test("eski dizi şekli aynen kabul edilir", () => {
  // Sözleşme değişirse ya da başka bir uç dizi döndürürse tüketen taraf
  // kırılmasın.
  const result = normalizeCapabilities(["shipment.write", "shipment.create"]);

  assert.ok(result instanceof Set);
  assert.equal(result.has("shipment.write"), true);
  assert.equal(result.has("shipment.create"), true);
  assert.equal(result.size, 2);
});

test("boş dizi boş Set üretir", () => {
  assert.equal(normalizeCapabilities([]).size, 0);
});

test("boş sözlük boş Set üretir", () => {
  assert.equal(normalizeCapabilities({}).size, 0);
});

test("null ve undefined boş Set — ilk render bu yoldan geçiyor", () => {
  // Yetki yanıtı gelmeden önceki durum: hiçbir düğme görünmemeli, ekran
  // yine de ayakta kalmalı.
  assert.equal(normalizeCapabilities(null).size, 0);
  assert.equal(normalizeCapabilities(undefined).size, 0);
});

test("tip dışı girdilerin hiçbiri FIRLATMAZ", () => {
  // Bu bir güvenlik sınırı değil (asıl kontrol backend'de); bozuk bir yanıtın
  // tüm lojistik ekranını kilitlemesi yanlış takas olurdu.
  for (const bad of [0, 42, "", "shipment.write", true, false, NaN]) {
    let result;
    assert.doesNotThrow(
      () => {
        result = normalizeCapabilities(bad);
      },
      `${String(bad)} fırlattı`
    );
    assert.ok(result instanceof Set, `${String(bad)} Set döndürmedi`);
    assert.equal(result.size, 0, `${String(bad)} yetki üretti`);
  }
});

test("LOGISTICS_CAPABILITIES dondurulmuş ve 8 anahtar taşıyor", () => {
  // Kaynak: `logistics_admin.LOGISTICS_CAPABILITIES`. Sapma burada görünsün.
  assert.equal(Object.isFrozen(LOGISTICS_CAPABILITIES), true);
  assert.equal(LOGISTICS_CAPABILITIES.length, 8);
  assert.deepEqual(LOGISTICS_CAPABILITIES, [
    "shipment.create",
    "shipment.write",
    "shipment.cancel",
    "shipment.split",
    "view.logistics_cost",
    "view.tracking",
    "carrier_credential.manage",
    "view.carrier_secret",
  ]);
});

test("store'un `can` computed'ında geçen 6 anahtar sözleşmede VAR", () => {
  // `stores/logistics.js` bu 6 adı ELLE yazıyor (okunabilirlik kararı: hangi
  // düğmenin hangi yetkiye baktığı computed'a bakınca görünsün). Bedeli,
  // sabitle sapma riski: bir yazım hatası ya da backend'de yeniden adlandırma
  // sessizce KALICI `false` üretir — düğme hiç çizilmez, hata da vermez.
  // Kopya buradan denetleniyor; store'u node:test'te import etmek Pinia + Vue
  // runtime gerektirdiği için (bu dosyanın saf kalma kuralı) yapılmıyor.
  const USED_BY_STORE = [
    "shipment.write",
    "shipment.create",
    "shipment.cancel",
    "view.logistics_cost",
    "carrier_credential.manage",
    "view.carrier_secret",
  ];

  const unknown = USED_BY_STORE.filter((cap) => !LOGISTICS_CAPABILITIES.includes(cap));
  assert.deepEqual(unknown, [], `store bilinmeyen capability sorguluyor: ${unknown.join(", ")}`);
});

test("bilinen 8 capability açıkken hepsi Set'e girer", () => {
  const allTrue = Object.fromEntries(LOGISTICS_CAPABILITIES.map((cap) => [cap, true]));
  const result = normalizeCapabilities(allTrue);

  assert.equal(result.size, 8);
  for (const cap of LOGISTICS_CAPABILITIES) {
    assert.equal(result.has(cap), true, `${cap} eksik`);
  }
});
