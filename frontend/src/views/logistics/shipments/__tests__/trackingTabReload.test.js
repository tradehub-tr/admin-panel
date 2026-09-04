import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * B6 takip sekmesi — SEVKİYAT DEĞİŞİNCE YENİDEN YÜKLEME (denetim 2026-09-04).
 *
 * Detay ekranı sevkiyat değişiminde remount etmiyor (bilinçli tasarım);
 * sekme yalnız `onMounted(load)` ile kalsaydı yeni sevkiyatın altında eski
 * sevkiyatın olayları görünürdü. Kaynak-metin testi: watch silinirse burası
 * söyler.
 */
const source = readFileSync(new URL("../tabs/ShipmentTrackingTab.vue", import.meta.url), "utf8");

test("sekme shipment.name değişimini izleyip load çağırıyor", () => {
  assert.match(source, /watch\(\(\) => props\.shipment\?\.name, load\);/);
});

test("açılış yüklemesi de duruyor (watch onun yerine geçmedi)", () => {
  assert.match(source, /onMounted\(load\);/);
});

test("load bayat-yanıt korumalı veri katmanına bağlı (doğrulama turu 2026-09-04)", () => {
  // Yarışın kendisi DAVRANIŞ olarak useShipmentEvents'te ölçülüyor
  // (tabs/__tests__/shipmentEventsStale.test.js) — burada yalnız sekmenin
  // o katmana bağlı kaldığı kilitleniyor: bağ kopar, guard'sız elle fetch'e
  // dönülürse burası söyler.
  assert.match(source, /useShipmentEvents\(\)/);
  assert.match(source, /loadEvents\(props\.shipment\?\.name\)/);
});
