/**
 * `@/api/logistics` SAHTESİ — yalnız logisticsStaleResponse.test.js için.
 *
 * Test Vite alias'ıyla store'un api importunu buraya çevirir: gerçek modül
 * `utils/api` üzerinden ağa çıkıyor, testte ağ yok. Dört okuma ucu ELLE
 * ÇÖZÜLEN promise döndürür — yarış senaryosu ancak yanıt sırası testin
 * elindeyken kurulabiliyor. Diğer exportlar store'un import listesi
 * kırılmasın diye var; çağrılırlarsa test yanlış yerdedir, fırlatıyorlar.
 */

export class LogisticsApiError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

/** Uç adı → bekleyen istekler (çağrı sırasıyla). Test dışarıdan çözer. */
export const pending = {
  listCatalog: [],
  getCatalogItem: [],
  listShipments: [],
  getShipment: [],
};

export function resetPending() {
  pending.listCatalog = [];
  pending.getCatalogItem = [];
  pending.listShipments = [];
  pending.getShipment = [];
}

function deferred(bucket, args) {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  pending[bucket].push({ resolve, reject, args });
  return promise;
}

export const listCatalog = (...args) => deferred("listCatalog", args);
export const getCatalogItem = (...args) => deferred("getCatalogItem", args);
export const listShipments = (...args) => deferred("listShipments", args);
export const getShipment = (...args) => deferred("getShipment", args);

const unused = (name) => () => {
  throw new Error(`logisticsApiStub: ${name} bu testte çağrılmamalı`);
};

export const cancelShipment = unused("cancelShipment");
export const createCatalogItem = unused("createCatalogItem");
export const getLogisticsPermissions = unused("getLogisticsPermissions");
export const getLogisticsSettings = unused("getLogisticsSettings");
export const listCatalogKeys = unused("listCatalogKeys");
export const setCatalogItemActive = unused("setCatalogItemActive");
export const setFeatureFlag = unused("setFeatureFlag");
export const updateCatalogItem = unused("updateCatalogItem");
export const updateLogisticsSettings = unused("updateLogisticsSettings");
export const updateShipmentStatus = unused("updateShipmentStatus");
