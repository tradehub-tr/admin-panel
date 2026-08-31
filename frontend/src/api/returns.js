// İade / tersine lojistik API istemcisi.
// Backend: tradehub_core.api.v1.returns  (15-BE — HENÜZ YAZILMADI)
// Sözleşme: docs/lojistik/15-FE-VERI-SOZLESMESI.md
//
// AYRI DOSYA, `api/logistics.js`'e EKLENMEDİ:
//   Lojistik dosyaları iki geliştirici arasında bölüşüldü (LOGISTICS-TASK-SPLIT
//   §3). `logistics.js` ortak yüzey; iade uçlarını oraya yazmak her PR'da
//   çakışma üretirdi. Zarf açma mantığı `logisticsClient` üzerinden
//   PAYLAŞILIYOR — kopyalanmadı.
//
// MOCK MODU:
//   `MOCK` haritasındaki uçlar `returnsMock`'a gidiyor. Uçlar yazıldıkça
//   ilgili satır `false` yapılır; ekranlarda ve store'da hiçbir değişiklik
//   gerekmez, çünkü mock sözleşmedeki yükün aynısını üretiyor.

import { LogisticsApiError } from "./logisticsEnvelope";
import { LOGISTICS_METHOD, logisticsGet, logisticsPost } from "./logisticsClient";
import { returnsMock } from "./returnsMock.js";

// Demo verisi ve hata tetikleyicisi — yalnız mock modunda anlamlı.
// `USE_MOCK` kapandığında bu yeniden dışa aktarımlar da silinir.
export { clearFault, FAULT_CODES, getFault, resetMockData, setFault } from "./returnsMock.js";

const RETURNS = LOGISTICS_METHOD.RETURNS;

/**
 * Uç bazında mock anahtarı.
 *
 * TEK BAYRAK YETMİYOR: sözleşme §9, 15-BE'nin uçları SIRAYLA açmasını
 * öneriyor (önce liste/detay, sonra karar, sonra kontrol, en son kapanış —
 * kapanış geri alınamaz ve escrow'a dokunuyor). Tek boolean'la ara durum yok
 * ve yazılmamış uca istek atmak ekranı hata durumunda bırakır.
 *
 * Anahtarlar SUNUCUDAKİ metot adları — sözleşme §2 başlıklarıyla birebir.
 */
export const MOCK = {
  list_return_requests: true,
  get_return_request: true,
  decide_return_request: true,
  save_return_inspection: true,
  close_return_request: true,
};

/** Hâlâ mock'ta olan uç var mı — DEMO paneli buna bakıyor. */
export const USE_MOCK = Object.values(MOCK).some(Boolean);

/** Mock hatalarını sözleşmedeki tipli hataya çevirir — ek alanlar korunur. */
async function viaMock(fn) {
  try {
    return await fn();
  } catch (e) {
    throw new LogisticsApiError({
      code: e.code || "INTERNAL_ERROR",
      message: e.message,
      // Alan bazlı doğrulama hatası ve kapanış ön koşulları tek genel mesaja
      // çökmesin: ekran `failed_checks` ile HANGİ satırın sarı olacağını
      // biliyor (sözleşme §2.7).
      details: {
        ...(e.fields ? { fields: e.fields } : {}),
        ...(e.failed_checks ? { failed_checks: e.failed_checks } : {}),
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Kuyruk ve detay
// ---------------------------------------------------------------------------

/**
 * İade kuyruğu — menüden girilen kapı (I1).
 *
 * `status_counts` listeyle AYNI yanıttan geliyor (sözleşme §2.2). Ayrı
 * istekle çekmek sayaçları listeden kaydırıyor: kullanıcı "Talep edildi 2"
 * görüp tıklıyor, 3 kayıt geliyor (aynı tuzak 14-FE kanıt kuyruğunda
 * ölçülmüştü).
 */
export async function listReturnRequests({
  status = null,
  page = 1,
  pageSize = 50,
  asSeller = false,
} = {}) {
  if (MOCK.list_return_requests) {
    return viaMock(() => returnsMock.listReturnRequests({ status, page, pageSize, asSeller }));
  }
  return logisticsGet(`${RETURNS}.list_return_requests`, {
    ...(status ? { status } : {}),
    page,
    page_size: pageSize,
  });
}

/** Tek iade talebi — LIST + DETAIL + kalemler (I2/I3/I4'ün girdisi). */
export async function getReturnRequest(name, { asSeller = false } = {}) {
  if (MOCK.get_return_request) {
    return viaMock(() => returnsMock.getReturnRequest(name, { asSeller }));
  }
  return logisticsGet(`${RETURNS}.get_return_request`, { name });
}

// ---------------------------------------------------------------------------
// Karar · kontrol · kapanış
// ---------------------------------------------------------------------------

/**
 * Satıcı/platform kararı (I2).
 *
 * Onaylanan iadede ters yönlü sevkiyat ve etiket AYNI çağrıda üretilip
 * yanıtta dönüyor — ekran sonucu aynı yerde gösteriyor (kabul K9).
 */
export async function decideReturnRequest({
  name,
  decision,
  decisionNote = null,
  createReturnShipment = true,
}) {
  const payload = {
    name,
    decision,
    decision_note: decisionNote,
    create_return_shipment: createReturnShipment,
  };
  if (MOCK.decide_return_request) return viaMock(() => returnsMock.decideReturnRequest(payload));
  return logisticsPost(`${RETURNS}.decide_return_request`, payload);
}

/**
 * Depo kontrolü (I3).
 *
 * `refund_amount` GÖNDERİLMİYOR: tutar sunucuda kalem kararlarından
 * türetiliyor (sözleşme §4.3). Elle girilen bir rakam kalem kararlarıyla
 * tutarsız kalırdı.
 */
export async function saveReturnInspection({ name, items }) {
  if (MOCK.save_return_inspection) {
    return viaMock(() => returnsMock.saveReturnInspection({ name, items }));
  }
  return logisticsPost(`${RETURNS}.save_return_inspection`, { name, items });
}

/**
 * Kapanış ve para iadesi (I4).
 *
 * Geri alınamaz. Ön koşul eksikse `RETURN_NOT_CLOSABLE` +
 * `details.failed_checks` dönüyor; ekran hangi satırın sarı olacağını
 * oradan biliyor (sözleşme §2.7).
 */
export async function closeReturnRequest({ name, triggerRefund = true }) {
  const payload = { name, trigger_refund: triggerRefund };
  if (MOCK.close_return_request) return viaMock(() => returnsMock.closeReturnRequest(payload));
  return logisticsPost(`${RETURNS}.close_return_request`, payload);
}
