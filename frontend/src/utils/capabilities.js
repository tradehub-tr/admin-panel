// Lojistik capability yükünün tek normalizasyon noktası.
//
// NEDEN AYRI DOSYA:
//   ÖLÇÜLDÜ (2026-08-18): `get_logistics_permissions` capability'leri
//   `{"shipment.write": true, …}` SÖZLÜĞÜ olarak döndürüyor; store ise dizi
//   varsayıp `.includes()` çağırıyordu. Sözlükte o metot yok — çağrı
//   `TypeError` fırlatıyor, `fetchPermissions`'ın sessiz `catch`'i onu
//   yutuyor ve panel HER kullanıcıyı salt-okunur sanıyordu. Administrator
//   bile koli ekleyemiyordu.
//
//   Hata iki katmanın varsayımı arasında yaşadığı için ne backend ne frontend
//   testi görebiliyordu. Saf fonksiyona indirgemek onu sınanabilir yapıyor.

/**
 * Sunucu yanıtını capability ADLARI dizisine indirger.
 *
 * İki biçim de kabul ediliyor:
 *   - sözlük  `{ "shipment.write": true, "shipment.cancel": false }` → yalnız
 *     `true` olanların adları
 *   - dizi    `["shipment.write"]` → olduğu gibi
 *
 * Tanınmayan yük (null, string, sayı) boş dizi döner: yetkisiz varsaymak,
 * yetkili varsaymaktan güvenli.
 *
 * @param {unknown} payload
 * @returns {string[]}
 */
export function normalizeCapabilities(payload) {
  if (Array.isArray(payload)) return payload.filter((name) => typeof name === "string");
  if (payload && typeof payload === "object") {
    return Object.entries(payload)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([name]) => name);
  }
  return [];
}
