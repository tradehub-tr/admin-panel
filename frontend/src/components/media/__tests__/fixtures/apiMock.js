/**
 * `@/utils/api` yerine geçen test sahtesi.
 *
 * Testte Vite alias'ı bu dosyayı gösterir; gerçek `api.js` yüklenmez, yani
 * ne fetch ne CSRF ne de 401 yönlendirmesi devreye girer. Davranış testten
 * teste değiştiği için gövde `globalThis`'teki kancaya devrediyor — modül
 * ESM önbelleğinde tek örnek, her test kendi yanıtını kurar.
 *
 * İki ayrı kanca var, çünkü iki ayrı taşıma yolu var:
 *   `__mediaApiMock`     → `getList` (genel REST; gezgin/çekmece listeleri)
 *   `__mediaApiCallMock` → `callMethod` (whitelist uçları; ör. T-083 toplu
 *                          türev manifesti `media_manifest.manifest_batch`)
 * Tek kancaya sıkıştırmak, "hangi yol çağrıldı" sorusunu görünmez yapardı —
 * türev testlerinin ölçtüğü şey tam olarak bu.
 */
const api = {
  async getList(doctype, params) {
    const impl = globalThis.__mediaApiMock;
    if (typeof impl !== "function") throw new Error("api sahtesi kurulmadı");
    return impl(doctype, params);
  },
  async callMethod(method, args) {
    const impl = globalThis.__mediaApiCallMock;
    if (typeof impl !== "function") throw new Error("api sahtesi kurulmadı (callMethod)");
    return impl(method, args);
  },
};

export default api;
