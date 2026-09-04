/**
 * `@/api/shipmentCreate` SAHTESİ — yalnız manualShipmentSave.test.js için.
 *
 * Uç ELLE ÇÖZÜLEN promise döndürür ve her çağrının payload'ını kaydeder:
 * idempotency anahtarının yaşam döngüsü (hatada aynı, başarıda yeni) ancak
 * ardışık çağrıların anahtarları karşılaştırılarak ölçülebiliyor
 * (stores/__tests__/fixtures/logisticsApiStub.js deseni).
 */

/** Bekleyen istekler (çağrı sırasıyla) — `payload` da burada. */
export const pending = { createManualShipment: [] };

export function resetPending() {
  pending.createManualShipment = [];
}

export function createManualShipment(payload) {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  pending.createManualShipment.push({ resolve, reject, payload });
  return promise;
}

/** Gerçek modülün export'uyla şekil paritesi — import kırılmasın. */
export const MOCK = { create_manual_shipment: false };
