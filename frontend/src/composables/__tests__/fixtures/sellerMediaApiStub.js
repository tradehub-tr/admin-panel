/**
 * `@/utils/api` yerine geçen test sahtesi (klasör testleri, T-094).
 *
 * Gerçek modül yüklenirken CSRF token için `fetch` kuruyor — Node'da ne
 * `fetch`'in gideceği sunucu var ne de test ağı görmeli. Sahte, çağrıları
 * kaydeder ve testin `resetApiStub` ile verdiği cevabı döndürür; cevabı
 * verilmemiş bir uca düşülürse patlar — test hangi ucu çağırdığını bilmek
 * zorunda, sessiz boş cevap yanlış geçen test üretir.
 */

export const calls = [];

let cevaplar = {};

/** @param {Record<string, unknown | (() => unknown)>} map uç kısa adı → cevap */
export function resetApiStub(map = {}) {
  calls.length = 0;
  cevaplar = map;
}

function yanit(method) {
  const kisa = method.split(".").pop();
  if (!(kisa in cevaplar)) {
    throw new Error(`beklenmeyen uç çağrıldı: ${method}`);
  }
  const v = cevaplar[kisa];
  return typeof v === "function" ? v() : v;
}

export default {
  async callMethod(method, params = {}) {
    calls.push({ http: "POST", method, params });
    return yanit(method);
  },
  async callMethodGET(method, params = {}) {
    calls.push({ http: "GET", method, params });
    return yanit(method);
  },
};
