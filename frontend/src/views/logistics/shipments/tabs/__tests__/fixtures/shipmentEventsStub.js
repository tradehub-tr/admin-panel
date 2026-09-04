/**
 * `@/api/shipmentEvents` SAHTESİ — yalnız shipmentEventsStale.test.js için.
 *
 * Test Vite alias'ıyla composable'ın importunu buraya çevirir: gerçek modül
 * mock kapalıyken ağa çıkıyor, testte ağ yok. Uç ELLE ÇÖZÜLEN promise
 * döndürür — yarış senaryosu ancak yanıt sırası testin elindeyken
 * kurulabiliyor (stores/__tests__/fixtures/logisticsApiStub.js deseni).
 */

/** Bekleyen istekler (çağrı sırasıyla). Test dışarıdan çözer. */
export const pending = { listShipmentEvents: [] };

export function resetPending() {
  pending.listShipmentEvents = [];
}

export function listShipmentEvents(...args) {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  pending.listShipmentEvents.push({ resolve, reject, args });
  return promise;
}

/** Gerçek modülün export'uyla şekil paritesi — import kırılmasın. */
export const MOCK = { list_shipment_events: false };
