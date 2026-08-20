// Katalog ANAHTAR listesi normalizasyonu — saf mantık, tarayıcı API'si yok.
//
// NEDEN AYRI DOSYA:
//   `logisticsCapabilities.js` ile aynı gerekçe: `src/api/logistics.js`
//   `@/utils/api` üzerinden `localStorage`/`fetch` çekiyor, `node --test`
//   ortamında ikisi de yok. Bu modül `@/utils/api`'yi import ETMEMELİ —
//   ettiği an testten görünmez olur ve canlı yanıt şekli yine sınanmaz.
//
// NEDEN VAR — ÖLÇÜLMÜŞ GERÇEK:
//   `list_catalog_keys` ucu bir NESNE döndürüyor:
//     { "catalogs": [ { key, doctype, searchable, filters, has_active_flag }, … ] }
//   Store bunu olduğu gibi `catalogKeys`'e atıyordu; `CatalogListView` ise
//   STRING dizisi bekleyip `catalogKeys.map(...)` ve `catalogKeys[0]` yazıyordu.
//   Sonuç: `TypeError: catalogKeys.map is not a function`. Fırlayan computed
//   yeniden değerlendirilemediği için katalog seçici boş/kırık kalıyordu.
//   Backend doğru; hatalı olan tüketen taraftı.
//
// NEDEN NORMALİZASYON TEK YERDE:
//   Şekli her tüketicinin ayrı ayrı çözmesi, bir sonraki tüketicinin aynı
//   tuzağa düşmesi demek. Store'a giren değerin sözleşmesi tek cümle:
//   **`catalogKeys` her zaman string dizisidir.**
//
// NEDEN ASLA FIRLATMAZ:
//   Katalog seçici bir güvenlik sınırı değil. Bozuk bir yanıt tüm ekranı
//   kilitlememeli; bilinmeyen girdi boş dizi döner, seçici boş kalır, ekran
//   ayakta kalır (`CatalogListView` varsayılan kataloğa düşer).

/**
 * `list_catalog_keys` yükünü — hangi biçimde gelirse gelsin — string dizisine indirger.
 *
 * @param {unknown} raw Uç yükü (`{catalogs:[{key,…}]}`), string dizisi ya da başka bir şey.
 * @returns {string[]} Katalog anahtarları. Asla `null`, asla throw.
 */
export function normalizeCatalogKeys(raw) {
  // Savunmacı: sözleşme sadeleşirse ya da başka bir uç düz dizi döndürürse.
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.catalogs) ? raw.catalogs : [];

  return list
    .map((entry) => (typeof entry === "string" ? entry : entry?.key))
    .filter((key) => typeof key === "string" && key.length > 0);
}
