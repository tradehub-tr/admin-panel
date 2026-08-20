// Teslim kanıtı / teslimat akışları API istemcisi.
// Backend: tradehub_core.api.v1.pod  (14-BE — HENÜZ YAZILMADI)
//   Modül adresi düzeltildi (tam denetim 2026-08-20): eski hedef v1.logistics
//   GUEST modülüydü (allow_guest uçlar) — admin ucu guest modülüne eklenmez;
//   split kuralına göre POD uçları modül sahibinin kendi dosyasına açılır.
// Sözleşme: docs/lojistik/14-FE-VERI-SOZLESMESI.md
//
// AYRI DOSYA, `api/logistics.js`'e EKLENMEDİ:
//   Lojistik dosyaları iki geliştirici arasında bölüşüldü (LOGISTICS-TASK-SPLIT
//   §3). `logistics.js` ortak yüzey; POD uçlarını oraya yazmak her PR'da
//   çakışma üretirdi. Zarf açma mantığı paylaşılıyor — kopyalanmadı.
//
// MOCK MODU:
//   `MOCK` haritasındaki uçlar `podMock`'a gidiyor. Uçlar yazıldıkça ilgili
//   satır `false` yapılır; ekranlarda ve store'da hiçbir değişiklik gerekmez,
//   çünkü mock sözleşmedeki yükün aynısını üretiyor.
//
// Tam denetim Tur-3 (2026-08-20): gerçek dallar tek geçide taşındı —
// `api.callMethod*` + `unwrap` ikilisi yerine `logisticsGet`/`logisticsPost`
// (zarf açma + HTTP 417 zarf kurtarma tek yerde). Mock dalları DEĞİŞMEDİ.

import { getCatalogItem, LogisticsApiError } from "./logistics";
import { LOGISTICS_METHOD, logisticsGet, logisticsPost } from "./logisticsClient";
import { podMock } from "./podMock.js";

// Demo verisi ve hata tetikleyicisi — yalnız mock modunda anlamlı.
// `USE_MOCK` kapandığında bu yeniden dışa aktarımlar da silinir.
export { clearFault, getFault, resetMockData, setFault } from "./podMock.js";

// Modül adının tek kaynağı `logisticsClient.js` — elle yazılmış yol denetimde
// yanlış modüle (guest v1.logistics) gitmişti (tam denetim 2026-08-20).
const POD = LOGISTICS_METHOD.POD;

/**
 * Uç bazında mock anahtarı.
 *
 * TEK BAYRAK YETMİYOR: sözleşme §9, 14-BE'nin uçları SIRAYLA açmasını
 * öneriyor (önce POD detay+kayıt, sonra kuyruk, sonra teslimat akışları).
 * Tek boolean'la ara durum yok — ya hepsi mock ya hiçbiri, ve yazılmamış uca
 * istek atmak ekranı hata durumunda bırakır.
 *
 * Anahtarlar SUNUCUDAKİ metot adları — sözleşme §2 başlıklarıyla birebir,
 * ve HER UÇ KENDİ ANAHTARINI taşır (tam denetim 2026-08-20): önceden
 * `get_shipment_exception_codes` ve `get_pod_audit` ilgisiz bayraklara
 * (`get_pod_queue` / `amend_proof_of_delivery`) bağlıydı — o uçlar canlıya
 * alınınca bunlar da sessizce canlıya düşer, yazılmamış uca istek atardı.
 *
 * `list_shipment_events` BURADAN ÇIKTI (tam denetim 2026-08-20): tek
 * sözleşme/tek mock kuralıyla `api/shipmentEvents.js`'e devredildi — B6
 * takip sekmesi ile H4 istasyon ekranı aynı olay verisini görür. Bayrağı
 * artık o dosyanın kendi `MOCK` haritasında.
 *
 * `get_catalog_item` ÖZEL DURUM: uç gerçek ve yazılmış (logistics_catalog),
 * ama mock kuyruğun/akışların ürettiği şube kodları (AK-06010…) yalnız
 * tohumda var — kuyruk mock'u kapanana kadar bu satır da kapanamaz. Bu bir
 * VERİ bağı, uç eksikliği değil; `get_pod_queue` false yapılırken bu da
 * false yapılır.
 */
export const MOCK = {
  get_pod_queue: true,
  get_proof_of_delivery: true,
  record_proof_of_delivery: true,
  amend_proof_of_delivery: true,
  list_delivery_flows: true,
  hand_over_shipment: true,
  get_shipment_exception_codes: true,
  get_pod_audit: true,
  get_catalog_item: true,
};

/** Hâlâ mock'ta olan uç var mı — DEMO paneli buna bakıyor. */
export const USE_MOCK = Object.values(MOCK).some(Boolean);

/** Mock hatalarını sözleşmedeki tipli hataya çevirir — `fields` korunur. */
async function viaMock(fn) {
  try {
    return await fn();
  } catch (e) {
    throw new LogisticsApiError({
      code: e.code || "INTERNAL_ERROR",
      message: e.message,
      // Alan bazlı doğrulama hatası tek genel mesaja çökmesin.
      details: e.fields ? { fields: e.fields } : undefined,
    });
  }
}

// ---------------------------------------------------------------------------
// Kanıt kuyruğu
// ---------------------------------------------------------------------------

/**
 * Teslim kanıtı kuyruğu — menüden girilen kapı.
 *
 * `buckets` sayaçları listeyle AYNI yanıttan geliyor (sözleşme §2.1). Ayrı
 * istekle çekmek sayaçları listeden kaydırır: kullanıcı "Tutarsızlık 2" görür,
 * tıklar, 3 kayıt gelir.
 */
export async function getPodQueue({
  bucket = null,
  search = null,
  carrier = null,
  seller = null,
  dateRange = "30d",
  start = 0,
  pageLength = 50,
  asSeller = false,
  sellerName = null,
} = {}) {
  if (MOCK.get_pod_queue)
    return viaMock(() =>
      podMock.getPodQueue({ bucket, q: search, carrier, seller, start, pageLength, asSeller, sellerName })
    );

  return logisticsGet(`${POD}.get_pod_queue`, {
    bucket,
    q: search,
    carrier,
    seller,
    date_range: dateRange,
    start,
    page_length: pageLength,
  });
}

// ---------------------------------------------------------------------------
// Kanıt detayı ve kaydı
// ---------------------------------------------------------------------------

/**
 * Tek sevkiyatın teslim kanıtı.
 *
 * POD yoksa HATA DEĞİL: `proof_of_delivery: null` döner. "Teslim edildi ama
 * kanıt yok" bir eksik veridir, hata değil — ekran bunu sorun olarak gösterip
 * çıkış yolunu verir, hata ekranı açmaz.
 *
 * Medya yetkisi yoksa URL alanları yanıtta HİÇ BULUNMAZ (sözleşme §6.2).
 */
export async function getProofOfDelivery(shipment, { canViewMedia = true, asSeller = false, sellerName = null } = {}) {
  if (MOCK.get_proof_of_delivery)
    return viaMock(() => podMock.getProofOfDelivery(shipment, { canViewMedia, asSeller, sellerName }));
  return logisticsGet(`${POD}.get_proof_of_delivery`, { shipment });
}

/**
 * Kanıt kaydeder.
 *
 * `source` damgasını SUNUCU belirler — istemci gönderemez (sözleşme §6.3).
 * `asSeller` yalnız mock'un damgayı doğru seçmesi için; gerçek uçta oturum
 * rolünden okunur ve bu alan gönderilmez.
 */
export async function recordProofOfDelivery(payload) {
  if (MOCK.record_proof_of_delivery) return viaMock(() => podMock.recordProofOfDelivery(payload));

  // `asSeller` ve `sellerName` yalnız mock'un işine yarıyor; gerçek uçta
  // sunucu ikisini de oturumdan okuyor ve istemci beyanına güvenmiyor.
  const { asSeller: _rol, sellerName: _ad, ...gonderilecek } = payload;
  return logisticsPost(`${POD}.record_proof_of_delivery`, gonderilecek);
}

/** Kaydı düzeltir — gerekçe zorunlu, iz bırakır, satıcıda yetki yok. */
export async function amendProofOfDelivery(payload) {
  if (MOCK.amend_proof_of_delivery) return viaMock(() => podMock.amendProofOfDelivery(payload));

  const { asSeller: _rol, sellerName: _ad, ...gonderilecek } = payload;
  return logisticsPost(`${POD}.amend_proof_of_delivery`, gonderilecek);
}

// ---------------------------------------------------------------------------
// İstasyonlar (11-BE · Bora)
// ---------------------------------------------------------------------------
//
// `listShipmentEvents` BURADAN SİLİNDİ (tam denetim 2026-08-20): aynı uç
// için ikinci bir adapter ve ikinci bir mock taşıyordu — B6 takip sekmesi
// ile H4 istasyon ekranı farklı olay verisi gösterebiliyordu. Tek sözleşme
// `api/shipmentEvents.js`'te ({ items, tracking_url }); istasyon tüketicisi
// (`stores/pod.js`) artık oradan import ediyor.

// ---------------------------------------------------------------------------
// Teslimat akışları (D1 / D2)
// ---------------------------------------------------------------------------

/** @param {"seller_delivery"|"buyer_pickup"} flowType */
export async function listDeliveryFlows(flowType, {
  search = null,
  status = null,
  appointment = null,
  start = 0,
  pageLength = 50,
  asSeller = false,
  sellerName = null,
} = {}) {
  if (MOCK.list_delivery_flows)
    return viaMock(() =>
      podMock.listDeliveryFlows({ flowType, q: search, status, appointment, start, pageLength, asSeller, sellerName })
    );

  return logisticsGet(`${POD}.list_delivery_flows`, {
    flow_type: flowType,
    q: search,
    status,
    appointment,
    start,
    page_length: pageLength,
  });
}

/**
 * Teslim eder — üç kapı SUNUCUDA da denetlenir.
 *
 * Ekranın "Teslim et" düğmesini hiç çizmemesi (K-K) kullanıcı arayüzü kararı;
 * kapının kendisi burada değil sunucuda. İstek doğrudan atılırsa yine
 * `PAYMENT_REQUIRED` / `DELIVERY_CODE_NOT_VERIFIED` döner.
 *
 * Başarıda sevkiyat `Delivered` olur ve POD kaydı tetiklenir — teslim
 * aksiyonu POD'u doğurur, iki iş ayrılamaz (K-F).
 */
export async function handOverShipment(payload) {
  if (MOCK.hand_over_shipment) return viaMock(() => podMock.handOverShipment(payload));

  const { asSeller: _rol, sellerName: _ad, ...gonderilecek } = payload;
  return logisticsPost(`${POD}.hand_over_shipment`, gonderilecek);
}

// ---------------------------------------------------------------------------
// Katalog
// ---------------------------------------------------------------------------

/**
 * İstisna kodları — KATALOGDAN, bileşene gömülü liste değil (sözleşme §5.1).
 * Gömülü olsaydı "yeni tip nereden eklenecek?" sorusunun cevabı olmazdı.
 *
 * Kendi bayrağında (tam denetim 2026-08-20) — önceden `get_pod_queue`
 * bayrağına bağlıydı; kuyruk canlıya alınınca bu da yazılmamış uca düşerdi.
 */
export async function getExceptionCodes() {
  if (MOCK.get_shipment_exception_codes) return viaMock(() => podMock.getExceptionCodes());
  return logisticsGet(`${POD}.get_shipment_exception_codes`);
}

/**
 * Teslim noktası kartı — K-C: ayrı EKRAN açılmıyor, mevcut katalog ucu.
 * Nokta bilgisi POD / istasyon / teslimat ekranlarında kart olarak görünür.
 *
 * Gerçek dal (tam denetim 2026-08-20): eski çağrı yanlış modüle gidiyordu
 * (`v1.logistics.get_catalog_item` — gerçek uç `v1.logistics_catalog`'da) ve
 * yanıtı `{ branch }` zarfına sarmıyordu; canlıya geçince store `branch`
 * alanını hep undefined okuyacaktı. Artık modül sahibinin istemcisi
 * (`api/logistics.js` → getCatalogItem) kullanılıyor, dönüş mock'la aynı
 * şekle sarılıyor. Mock dalı `MOCK.get_catalog_item` veri bağı yüzünden
 * duruyor — gerekçe MOCK haritasının başındaki yorumda.
 */
export async function getCarrierBranch(name) {
  if (MOCK.get_catalog_item) return viaMock(() => podMock.getCarrierBranch(name));
  return { branch: await getCatalogItem("carrier_branch", name) };
}

/**
 * Denetim izi — düzeltmenin iz bıraktığını ekran gösterebilsin.
 * Kendi bayrağında (tam denetim 2026-08-20) — önceden
 * `amend_proof_of_delivery` bayrağına bağlıydı.
 */
export async function getPodAudit(shipment) {
  if (MOCK.get_pod_audit) return viaMock(() => podMock.getPodAudit(shipment));
  return logisticsGet(`${POD}.get_pod_audit`, { shipment });
}
