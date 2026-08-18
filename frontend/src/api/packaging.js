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
//   `MOCK` haritasındaki uçlar `packagingMock`'a gidiyor. Uçlar yazıldıkça
//   ilgili satır `false` yapılır; ekranlarda ve store'da hiçbir değişiklik
//   gerekmez, çünkü mock sözleşmedeki yükün aynısını üretiyor.

import api from "@/utils/api";

import { LogisticsApiError, unwrap } from "./logistics";
import { packagingMock } from "./packagingMock";

// Demo verisi ve hata tetikleyicisi — yalnız mock modunda anlamlı.
// `USE_MOCK` kapandığında bu yeniden dışa aktarımlar da silinir.
export { clearFault, getFault, resetMockData, setFault } from "./packagingMock";

const PACKAGING = "tradehub_core.api.v1.packaging";

/**
 * Uç bazında mock anahtarı.
 *
 * TEK BAYRAK YETMİYOR: sözleşme §8, 13-BE'nin uçları SIRAYLA açmasını
 * öneriyor (önce P2 çalışma alanı, sonra P1 kuyruk, sonra P3 etiket…).
 * Tek `USE_MOCK` boolean'ıyla ara durum yok — ya hepsi mock ya hiçbiri, ve
 * yazılmamış uca istek atmak ekranı hata durumunda bırakıyor. Bu haritayla
 * Bora bir ucu bitirdiğinde tek satırı `false` yapıyor, kod düzenlemiyor.
 *
 * Anahtarlar SUNUCUDAKİ metot adları — sözleşme §2'deki başlıklarla birebir,
 * böylece "hangi satır hangi uç" sorusu doğmuyor.
 */
export const MOCK = {
  get_packing_queue: true,
  get_shipment_packing: true,
  save_shipment_packages: true,
  complete_packing: true,
  mark_shipment_ready: true,
  generate_shipment_labels: true,
  reprint_shipment_labels: true,
  void_shipment_label: true,
  get_packing_slip: true,
  get_pallet_plan: true,
  save_pallet_plan: true,
};

/** Hâlâ mock'ta olan uç var mı — DEMO paneli buna bakıyor. */
export const USE_MOCK = Object.values(MOCK).some(Boolean);

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
  if (MOCK.get_packing_queue) return viaMock(() => packagingMock.getPackingQueue({ bucket, page, pageSize }));

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
  if (MOCK.get_shipment_packing) return viaMock(() => packagingMock.getShipmentPacking(shipment));
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
  if (MOCK.save_shipment_packages) return viaMock(() => packagingMock.saveShipmentPackages(shipment, packages, modified));
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
  if (MOCK.complete_packing) return viaMock(() => packagingMock.completePacking(shipment, modified));
  return unwrap(await api.callMethod(`${PACKAGING}.complete_packing`, { shipment, modified }));
}

/**
 * Sevkiyatı "Alıma hazır" işaretler.
 *
 * Tüm kolilerin geçerli etiketi olmalı; eksikse sunucu `VALIDATION_FAILED`
 * döndürüyor — kargo şubesi etiketsiz koliyi kabul etmiyor.
 */
export async function markReady(shipment) {
  if (MOCK.mark_shipment_ready) return viaMock(() => packagingMock.markReady(shipment));
  return unwrap(await api.callMethod(`${PACKAGING}.mark_shipment_ready`, { shipment }));
}

// ---------------------------------------------------------------------------
// Etiket (P3)
// ---------------------------------------------------------------------------

export async function generateLabels(shipment, packageCodes, format = "thermal_100x150") {
  if (MOCK.generate_shipment_labels) return viaMock(() => packagingMock.generateLabels(shipment, packageCodes, format));
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
  if (MOCK.reprint_shipment_labels) return viaMock(() => packagingMock.reprintLabels(shipment, packageCodes, reason));
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
  if (MOCK.void_shipment_label) return viaMock(() => packagingMock.voidLabel(shipment, packageCode, reason));
  return unwrap(
    await api.callMethod(`${PACKAGING}.void_shipment_label`, { shipment, package_code: packageCode, reason })
  );
}

// ---------------------------------------------------------------------------
// Palet (P4 · 19-BE)
// ---------------------------------------------------------------------------

export async function getPalletPlan(shipment) {
  if (MOCK.get_pallet_plan) return viaMock(() => packagingMock.getPalletPlan(shipment));
  return unwrap(await api.callMethodGET(`${PACKAGING}.get_pallet_plan`, { shipment }));
}

export async function savePalletPlan(shipment, pallets, modified) {
  if (MOCK.save_pallet_plan) return viaMock(() => packagingMock.savePalletPlan(shipment, pallets, modified));
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
  if (MOCK.get_packing_slip) return viaMock(() => packagingMock.getPackingSlip(shipment, packageCodes));
  return unwrap(
    await api.callMethod(`${PACKAGING}.get_packing_slip`, {
      shipment,
      package_codes: packageCodes ? JSON.stringify(packageCodes) : null,
    })
  );
}
