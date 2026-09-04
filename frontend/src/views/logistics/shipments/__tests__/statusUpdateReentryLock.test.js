import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * C2 durum geçişi — YENİDEN-GİRİŞ KİLİDİ (denetim 2026-09-04, C1 emsali).
 *
 * Uç CANLI (`update_shipment_status`): çifte tıklama çifte geçiş + çifte
 * Shipment Event üretirdi. Kaynak-metin testi: kilit satırı silinirse
 * burası söyler.
 */
const source = readFileSync(new URL("../StatusUpdateView.vue", import.meta.url), "utf8");

test("apply store.saving açıkken ikinci isteği başlatmaz", () => {
  assert.match(source, /async function apply\(payload\) \{[\s\S]*?if \(store\.saving\) return;/);
  // Kilit, changeShipmentStatus çağrısından ÖNCE gelmeli.
  const guard = source.indexOf("if (store.saving) return;");
  const call = source.indexOf("store.changeShipmentStatus(");
  assert.ok(guard !== -1 && call !== -1 && guard < call);
});
