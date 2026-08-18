// Lojistik CAPABILITY normalizasyonu — saf mantık, tarayıcı API'si yok.
//
// NEDEN AYRI DOSYA:
//   `src/api/logistics.js` `@/utils/api` üzerinden `localStorage`/`fetch`
//   çekiyor; `node --test` ortamında ikisi de yok. Kural
//   `logisticsEnvelope.js` ile aynı: bu modül `@/utils/api`'yi import
//   ETMEMELİ, ettiği an testten görünmez olur.
//
// NEDEN VAR — ÖLÇÜLMÜŞ GERÇEK:
//   `get_logistics_permissions` yanıtındaki `data.capabilities` bir SÖZLÜK:
//     { "shipment.create": true, "shipment.write": true, ... }
//   Store ise DİZİ bekliyordu ve `capabilities.value.includes(...)` yazıyordu.
//   İlk render'da ref boş dizi olduğu için tüm bayraklar `false` çiziliyor,
//   fetch dönüp sözlük atanınca `can` computed'ı `TypeError: ...includes is
//   not a function` FIRLATIYOR. Fırlayan computed yeniden değerlendirilemediği
//   için DOM son iyi hâlinde donuyor: `can.*` KALICI olarak `false` kalıyor.
//   Görünen sonuç, katalog formunda `v-if="can.write"` olan "Kaydet"
//   düğmesinin ve sevkiyat detayındaki "Durum Güncelle"/"İptal" düğmelerinin
//   hiç çizilmemesiydi. Backend doğru; hatalı olan tüketen taraftı.
//
// NEDEN `Set`:
//   Sözlük ve dizi biçimleri tek bir temsile indiriliyor ki store yalnız
//   `.has(...)` sorsun. `false` değerli anahtar "yetki yok" demek — anahtarın
//   VARLIĞI değil, DEĞERİ belirleyici; bu yüzden truthy filtresi şart.
//
// NEDEN ASLA FIRLATMAZ:
//   Bu bir GÜVENLİK SINIRI DEĞİL, yalnız arayüz kolaylığı (asıl kontrol
//   backend'de). Bozuk/eksik bir yanıtın tüm lojistik ekranını kilitlemesi
//   yanlış takas olurdu: bilinmeyen girdi boş `Set` döner, düğmeler gizlenir,
//   ekran ayakta kalır.

/**
 * Backend'in bildirdiği capability adları (`logistics_admin.LOGISTICS_CAPABILITIES`).
 *
 * BU LİSTE "TEK KAYNAK" DEĞİL — sözleşmenin TEST FIXTURE'ı.
 *   `stores/logistics.js`'teki `can` computed'ı kullandığı 6 anahtarı elle
 *   yazıyor ve bilerek öyle bırakıldı: `capabilities.value.has(CAPS[3])`
 *   biçiminde sabitten türetmek okunabilirliği yok ederdi — hangi düğmenin
 *   hangi yetkiye baktığı computed'a bakınca görünmeli.
 *
 *   Sapma riski testle kapatılıyor: `logisticsCapabilities.test.js` hem bu
 *   listenin backend'le birebir aynı 8 adı taşıdığını, hem de store'un
 *   kullandığı 6 adın bu listede GERÇEKTEN var olduğunu doğruluyor. Yani
 *   yazım hatası (`shipment.wrtie`) ya da backend'de yeniden adlandırma CI'da
 *   kırmızı olur, üretimde sessiz `false` olmaz.
 */
export const LOGISTICS_CAPABILITIES = Object.freeze([
  "shipment.create",
  "shipment.write",
  "shipment.cancel",
  "shipment.split",
  "view.logistics_cost",
  "view.tracking",
  "carrier_credential.manage",
  "view.carrier_secret",
]);

/**
 * Capability yükünü — hangi biçimde gelirse gelsin — `Set`'e indirger.
 *
 * @param {unknown} raw Sözlük (`{cap: bool}`), dizi (`[cap]`) veya başka bir şey.
 * @returns {Set<string>} Sahip olunan capability'ler. Asla `null`, asla throw.
 */
export function normalizeCapabilities(raw) {
  if (Array.isArray(raw)) return new Set(raw);

  // `typeof null === "object"` — null'ı ayrıca elemek gerekiyor.
  if (raw && typeof raw === "object") {
    return new Set(
      Object.entries(raw)
        .filter(([, granted]) => Boolean(granted))
        .map(([cap]) => cap)
    );
  }

  // null/undefined/sayı/string/boolean: yetki bilgisi yok → hiçbir düğme yok.
  return new Set();
}
