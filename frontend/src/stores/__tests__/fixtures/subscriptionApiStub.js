/**
 * `@/utils/api` yerine geçen test sahtesi — subscriptionCancellation.test.js
 * + subscriptionDunning.test.js.
 *
 * Vite alias'ı store'un api importunu buraya çevirir: gerçek `api.js`
 * yüklenmez (fetch/CSRF/401 yönlendirmesi yok). Gövde `globalThis`
 * kancalarına devreder — modül ESM önbelleğinde tek örnek, her test kendi
 * yanıtını kurar (mediaAssetName/apiMock deseni).
 *
 *   `__subApiCallMock` → `callMethod`   (POST uçları: request/revoke_cancellation)
 *   `__subApiGetMock`  → `callMethodGET` (get_seller_access_state)
 */
const api = {
  async callMethod(method, args) {
    const impl = globalThis.__subApiCallMock;
    if (typeof impl !== "function") throw new Error("api sahtesi kurulmadı (callMethod)");
    return impl(method, args);
  },
  async callMethodGET(method, args) {
    const impl = globalThis.__subApiGetMock;
    if (typeof impl !== "function") throw new Error("api sahtesi kurulmadı (callMethodGET)");
    return impl(method, args);
  },
};

export default api;
