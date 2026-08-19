// Teslim kanıtı / teslimat akışları API istemcisi.
// Backend: tradehub_core.api.v1.logistics  (14-BE — HENÜZ YAZILMADI)
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

import api from "@/utils/api";

import { LogisticsApiError, unwrap } from "./logistics";
import { podMock } from "./podMock.js";

// Demo verisi ve hata tetikleyicisi — yalnız mock modunda anlamlı.
// `USE_MOCK` kapandığında bu yeniden dışa aktarımlar da silinir.
export { clearFault, getFault, resetMockData, setFault } from "./podMock.js";

const LOGISTICS = "tradehub_core.api.v1.logistics";

/**
 * Uç bazında mock anahtarı.
 *
 * TEK BAYRAK YETMİYOR: sözleşme §9, 14-BE'nin uçları SIRAYLA açmasını
 * öneriyor (önce POD detay+kayıt, sonra kuyruk, sonra teslimat akışları).
 * Tek boolean'la ara durum yok — ya hepsi mock ya hiçbiri, ve yazılmamış uca
 * istek atmak ekranı hata durumunda bırakır.
 *
 * Anahtarlar SUNUCUDAKİ metot adları — sözleşme §2 başlıklarıyla birebir.
 *
 * `list_shipment_events` **11-BE'de (Bora)**; `Shipment Event.location` alanı
 * bugün DocType'ta yok (sözleşme §1.2). Bu satır Bora'nın ucu geldiğinde
 * kapanır, diğerlerinden bağımsız.
 */
export const MOCK = {
  get_pod_queue: true,
  get_proof_of_delivery: true,
  record_proof_of_delivery: true,
  amend_proof_of_delivery: true,
  list_shipment_events: true,
  list_delivery_flows: true,
  hand_over_shipment: true,
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

  return unwrap(
    await api.callMethodGET(`${LOGISTICS}.get_pod_queue`, {
      bucket,
      q: search,
      carrier,
      seller,
      date_range: dateRange,
      start,
      page_length: pageLength,
    })
  );
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
  return unwrap(await api.callMethodGET(`${LOGISTICS}.get_proof_of_delivery`, { shipment }));
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
  return unwrap(await api.callMethod(`${LOGISTICS}.record_proof_of_delivery`, gonderilecek));
}

/** Kaydı düzeltir — gerekçe zorunlu, iz bırakır, satıcıda yetki yok. */
export async function amendProofOfDelivery(payload) {
  if (MOCK.amend_proof_of_delivery) return viaMock(() => podMock.amendProofOfDelivery(payload));

  const { asSeller: _rol, sellerName: _ad, ...gonderilecek } = payload;
  return unwrap(await api.callMethod(`${LOGISTICS}.amend_proof_of_delivery`, gonderilecek));
}

// ---------------------------------------------------------------------------
// İstasyonlar (11-BE · Bora)
// ---------------------------------------------------------------------------

/**
 * Sevkiyat olayları — istasyon çizelgesinin ham verisi.
 *
 * UÇ BORA'DA (11-BE). `Shipment Event.location` alanı bugün DocType'ta YOK;
 * sözleşme §1.2 ile sipariş edildi. Alan gelmezse ekran "bu bilgi henüz
 * taşınmıyor" der — boş çizelge çizmez, çünkü boş liste operasyona "kayıt
 * yok" der ve bu yalan olur.
 *
 * İndirgeme (ardışık aynı-konum olayları tek istasyona) FE'de yapılır;
 * sunucudan ham olay listesi yeterli (sözleşme §7).
 */
export async function listShipmentEvents(shipment) {
  if (MOCK.list_shipment_events) return viaMock(() => podMock.listShipmentEvents(shipment));
  return unwrap(await api.callMethodGET(`${LOGISTICS}.list_shipment_events`, { shipment }));
}

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

  return unwrap(
    await api.callMethodGET(`${LOGISTICS}.list_delivery_flows`, {
      flow_type: flowType,
      q: search,
      status,
      appointment,
      start,
      page_length: pageLength,
    })
  );
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
  return unwrap(await api.callMethod(`${LOGISTICS}.hand_over_shipment`, gonderilecek));
}

// ---------------------------------------------------------------------------
// Katalog
// ---------------------------------------------------------------------------

/**
 * İstisna kodları — KATALOGDAN, bileşene gömülü liste değil (sözleşme §5.1).
 * Gömülü olsaydı "yeni tip nereden eklenecek?" sorusunun cevabı olmazdı.
 */
export async function getExceptionCodes() {
  if (MOCK.get_pod_queue) return viaMock(() => podMock.getExceptionCodes());
  return unwrap(await api.callMethodGET(`${LOGISTICS}.get_shipment_exception_codes`));
}

/**
 * Teslim noktası kartı — K-C: ayrı EKRAN açılmıyor, mevcut katalog ucu.
 * Nokta bilgisi POD / istasyon / teslimat ekranlarında kart olarak görünür.
 */
export async function getCarrierBranch(name) {
  if (MOCK.get_pod_queue) return viaMock(() => podMock.getCarrierBranch(name));
  return unwrap(await api.callMethodGET(`${LOGISTICS}.get_catalog_item`, { catalog: "carrier_branch", name }));
}

/** Denetim izi — düzeltmenin iz bıraktığını ekran gösterebilsin. */
export async function getPodAudit(shipment) {
  if (MOCK.amend_proof_of_delivery) return viaMock(() => podMock.getPodAudit(shipment));
  return unwrap(await api.callMethodGET(`${LOGISTICS}.get_pod_audit`, { shipment }));
}
