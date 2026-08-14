// Sevkiyat zarf köprüsünün SAF mantığı — tarayıcı API'si kullanmaz.
//
// NEDEN AYRI DOSYA:
//   `src/api/logistics.js` `@/utils/api`'yi import ediyor, o da localStorage
//   ve fetch kullanıyor — node:test ortamında yok. Sonuç: o dosya testten
//   import EDİLEMİYOR ve mevcut `logistics.test.js` sözleşmeyi *yeniden
//   yazarak* kilitliyor (dosyanın kendi yorumu bunu kabul ediyor).
//
//   Sayfalama çevirisi için bu yetersiz: yeniden yazılan bir kopya, gerçek
//   fonksiyondaki bir hesap hatasını yakalayamaz. Saf mantık buraya alındı,
//   test GERÇEK kodu çağırıyor.
//
// ÇEVİRİLEN SÖZLEŞME:
//   `tradehub_core.api.v1.shipment` → { ok, data: { shipments, total,
//   limit_start, limit_page_length }, meta }
//   Bu istemci                      → { items, total, page, page_size }

/**
 * 1-tabanlı sayfa numarasını 0-tabanlı ofsete çevirir.
 *
 * `page` kullanıcıya görünen sayfa (1'den başlar), `limit_start` SQL ofseti
 * (0'dan başlar). Sıfır veya negatif sayfa 1'e sabitleniyor — aksi hâlde
 * negatif ofset sorguyu kırar.
 */
export function toPageParams(page, pageSize) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.max(1, Number(pageSize) || 50);
  return {
    limit_start: (safePage - 1) * safeSize,
    limit_page_length: safeSize,
    page: safePage,
    pageSize: safeSize,
  };
}

/**
 * Uç yanıtını sayfalı zarfa çevirir.
 *
 * `page` / `page_size` yanıttan DEĞİL istekten geliyor — uç bunları geri
 * döndürmüyor, yalnız `limit_start` alıyor.
 */
export function toPageEnvelope(data, { page, pageSize }) {
  return {
    items: data?.shipments ?? [],
    total: data?.total ?? 0,
    page,
    page_size: pageSize,
  };
}

/**
 * Boş filtreleri parametre nesnesinden düşürür.
 *
 * Uç `status=""` geldiğinde `ValidationError` atıyor (geçerli durum
 * listesinde boş string yok) — filtreyi hiç göndermemek gerekiyor.
 */
export function omitEmpty(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== null && value !== undefined && value !== "")
  );
}
