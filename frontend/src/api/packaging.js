// Paketleme / etiket API istemcisi.
// Backend: tradehub_core.api.v1.packaging  (13-BE — HENÜZ YAZILMADI)
// Sözleşme: docs/lojistik/13-FE-VERI-SOZLESMESI.md
//
// AYRI DOSYA, `api/logistics.js`'e EKLENMEDİ:
//   Lojistik dosyaları iki geliştirici arasında bölüşüldü (LOGISTICS-TASK-SPLIT
//   §3). `logistics.js` ortak yüzey; paketleme uçlarını oraya yazmak her PR'da
//   çakışma üretirdi. Zarf açma mantığı ise paylaşılıyor — kopyalanmadı.
//
// MOCK MODU:
//   `USE_MOCK` açıkken istekler `packagingMock`'a gidiyor. Uçlar yazıldıkça
//   bayrak kapanır; ekranlarda ve store'da hiçbir değişiklik gerekmez, çünkü
//   mock sözleşmedeki yükün aynısını üretiyor.

import api from "@/utils/api";

import { LogisticsApiError, unwrap } from "./logistics";
import { packagingMock } from "./packagingMock";

// Demo verisi ve hata tetikleyicisi — yalnız mock modunda anlamlı.
// `USE_MOCK` kapandığında bu yeniden dışa aktarımlar da silinir.
export { clearFault, getFault, resetMockData, setFault } from "./packagingMock";

const PACKAGING = "tradehub_core.api.v1.packaging";

/**
 * Gerçek uçlar yazılana kadar açık.
 *
 * Kapatma sırası sözleşme §8'de: her uç canlıya alındığında ilgili mock
 * çağrısı silinir. Tek seferde kapatmak, yazılmamış uçlara istek atıp
 * ekranı hata durumunda bırakır.
 */
export const USE_MOCK = true;

/** Mock hatalarını sözleşmedeki tipli hataya çevirir. */
async function viaMock(fn) {
  try {
    return await fn();
  } catch (e) {
    throw new LogisticsApiError({ code: e.code || "INTERNAL_ERROR", message: e.message });
  }
}

// ---------------------------------------------------------------------------
// Kuyruk (P1)
// ---------------------------------------------------------------------------

/**
 * Paketleme kuyruğu.
 *
 * `buckets` sayaçları listeyle AYNI yanıttan geliyor (sözleşme §2.1). Ayrı
 * istekle çekmek sayaçları listeden kaydırır: kullanıcı "Paketlenmedi 2"
 * görür, tıklar, 3 kayıt gelir.
 *
 * @returns {Promise<{items: object[], total: number, page: number, page_size: number, buckets: object}>}
 */
export async function getPackingQueue({
  bucket = null,
  seller = null,
  carrier = null,
  dateFrom = null,
  dateTo = null,
  search = null,
  page = 1,
  pageSize = 50,
} = {}) {
  if (USE_MOCK) return viaMock(() => packagingMock.getPackingQueue({ bucket, page, pageSize }));

  return unwrap(
    await api.callMethodGET(`${PACKAGING}.get_packing_queue`, {
      bucket,
      seller,
      carrier,
      date_from: dateFrom,
      date_to: dateTo,
      search,
      page,
      page_size: pageSize,
    })
  );
}

// ---------------------------------------------------------------------------
// Paketleme (P2)
// ---------------------------------------------------------------------------

/** Çalışma alanının tam yükü — kalemler, koliler, toplamlar, paket tipleri. */
export async function getShipmentPacking(shipment) {
  if (USE_MOCK) return viaMock(() => packagingMock.getShipmentPacking(shipment));
  return unwrap(await api.callMethodGET(`${PACKAGING}.get_shipment_packing`, { shipment }));
}

/**
 * Koli taslağını kaydeder.
 *
 * `modified` OPTİMİSTİK KİLİT: yükle birlikte gelen damga geri gönderiliyor.
 * Aradan başka biri kaydettiyse sunucu `CONFLICT` döndürür. Damgayı
 * göndermemek "son yazan kazanır" demek olurdu — iki operatör aynı sevkiyatı
 * paketlerken birinin işi sessizce silinirdi.
 *
 * Dönüş TAM YÜK: desi, ücret, `package_code` ve toplamlar sunucuda yeniden
 * hesaplanıyor. Çağıran yerel taslağı yamamaz, dönen yükü kullanır.
 */
export async function saveShipmentPackages(shipment, packages, modified) {
  if (USE_MOCK) return viaMock(() => packagingMock.saveShipmentPackages(shipment, packages, modified));
  return unwrap(
    await api.callMethod(`${PACKAGING}.save_shipment_packages`, {
      shipment,
      packages: JSON.stringify(packages),
      modified,
    })
  );
}

/**
 * Paketlemeyi tamamlar — kova `awaiting_label`'a geçer.
 *
 * Kaydetmekten AYRI uç: kaydetmek yarım işi de saklayabilir, tamamlamak
 * "tüm kalemler kolilerde" sözünü verir ve sunucu bunu doğrular.
 * Sevkiyat durumu burada değişmiyor — o `markReady`'nin işi.
 */
export async function completePacking(shipment, modified) {
  if (USE_MOCK) return viaMock(() => packagingMock.completePacking(shipment, modified));
  return unwrap(await api.callMethod(`${PACKAGING}.complete_packing`, { shipment, modified }));
}

/**
 * Sevkiyatı "Alıma hazır" işaretler.
 *
 * Tüm kolilerin geçerli etiketi olmalı; eksikse sunucu `VALIDATION_FAILED`
 * döndürüyor — kargo şubesi etiketsiz koliyi kabul etmiyor.
 */
export async function markReady(shipment) {
  if (USE_MOCK) return viaMock(() => packagingMock.markReady(shipment));
  return unwrap(await api.callMethod(`${PACKAGING}.mark_shipment_ready`, { shipment }));
}

// ---------------------------------------------------------------------------
// Etiket (P3)
// ---------------------------------------------------------------------------

export async function generateLabels(shipment, packageCodes, format = "thermal_100x150") {
  if (USE_MOCK) return viaMock(() => packagingMock.generateLabels(shipment, packageCodes, format));
  return unwrap(
    await api.callMethod(`${PACKAGING}.generate_shipment_labels`, {
      shipment,
      package_codes: JSON.stringify(packageCodes),
      format,
    })
  );
}

/**
 * Yeniden basım.
 *
 * `reason` sözleşmede zorunlu ama İLK basımda `null` gidebiliyor: D2 kararı
 * gereği gerekçe 2. basımdan itibaren soruluyor. Zorunluluğu ekran uyguluyor,
 * sunucu her iki hâli de kabul ediyor.
 */
export async function reprintLabels(shipment, packageCodes, reason = null, reasonNote = null) {
  if (USE_MOCK) return viaMock(() => packagingMock.reprintLabels(shipment, packageCodes, reason));
  return unwrap(
    await api.callMethod(`${PACKAGING}.reprint_shipment_labels`, {
      shipment,
      package_codes: JSON.stringify(packageCodes),
      reason,
      reason_note: reasonNote,
    })
  );
}

export async function voidLabel(shipment, packageCode, reason = null) {
  if (USE_MOCK) return viaMock(() => packagingMock.voidLabel(shipment, packageCode, reason));
  return unwrap(
    await api.callMethod(`${PACKAGING}.void_shipment_label`, { shipment, package_code: packageCode, reason })
  );
}

// ---------------------------------------------------------------------------
// Palet (P4 · 19-BE)
// ---------------------------------------------------------------------------

export async function getPalletPlan(shipment) {
  if (USE_MOCK) return viaMock(() => packagingMock.getPalletPlan(shipment));
  return unwrap(await api.callMethodGET(`${PACKAGING}.get_pallet_plan`, { shipment }));
}

export async function savePalletPlan(shipment, pallets, modified) {
  if (USE_MOCK) return viaMock(() => packagingMock.savePalletPlan(shipment, pallets, modified));
  return unwrap(
    await api.callMethod(`${PACKAGING}.save_pallet_plan`, {
      shipment,
      pallets: JSON.stringify(pallets),
      modified,
    })
  );
}

/** İrsaliye (paket listesi) — etiketten ayrı belge. */
export async function getPackingSlip(shipment, packageCodes = null) {
  if (USE_MOCK) return viaMock(() => packagingMock.getPackingSlip(shipment, packageCodes));
  return unwrap(
    await api.callMethod(`${PACKAGING}.get_packing_slip`, {
      shipment,
      package_codes: packageCodes ? JSON.stringify(packageCodes) : null,
    })
  );
}
