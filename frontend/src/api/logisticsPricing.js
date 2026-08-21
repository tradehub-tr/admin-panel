// Fiyatlandırma API istemcisi.
// Backend: tradehub_core.api.v1.pricing  (20-BE — HENÜZ YAZILMADI)
// Sözleşme: docs/lojistik/20-FE-VERI-SOZLESMESI.md
//
// AYRI DOSYA, `api/logistics.js`'e EKLENMEDİ:
//   Lojistik dosyaları iki geliştirici arasında bölüşüldü (LOGISTICS-TASK-SPLIT
//   §3). `logistics.js` Bora'nın çekirdek modülü; fiyat uçlarını oraya yazmak
//   her PR'da çakışma üretirdi. Zarf açma mantığı `logisticsClient` üzerinden
//   PAYLAŞILIYOR — kopyalanmadı.
//
// MOCK MODU:
//   `MOCK` haritasındaki uçlar `pricingMock`'a gidiyor. Uçlar yazıldıkça ilgili
//   satır `false` yapılır; ekranlarda ve store'da hiçbir değişiklik gerekmez,
//   çünkü mock sözleşmedeki yükün aynısını üretiyor.

import { LogisticsApiError } from "./logisticsEnvelope";
import { LOGISTICS_METHOD, logisticsGet, logisticsPost } from "./logisticsClient";
import { pricingMock } from "./pricingMock.js";

// Demo verisi ve hata tetikleyicisi — yalnız mock modunda anlamlı.
// `USE_MOCK` kapandığında bu yeniden dışa aktarımlar da silinir.
export { clearFault, FAULT_CODES, getFault, resetMockData, setFault } from "./pricingMock.js";

const PRICING = LOGISTICS_METHOD.PRICING;

/**
 * Uç bazında mock anahtarı.
 *
 * TEK BAYRAK YETMİYOR: sözleşme §9, 20-BE'nin uçları SIRAYLA açmasını öneriyor
 * (önce liste, sonra CRUD, en son simülasyon). Tek boolean'la ara durum yok —
 * ya hepsi mock ya hiçbiri, ve yazılmamış uca istek atmak ekranı hata
 * durumunda bırakır.
 *
 * Anahtarlar SUNUCUDAKİ metot adları — sözleşme §2 başlıklarıyla birebir.
 */
export const MOCK = {
  list_pricing_rules: true,
  get_pricing_rule: true,
  save_pricing_rule: true,
  reorder_pricing_rules: true,
  delete_pricing_rule: true,
  simulate_price: true,
  // Bölge kataloğu 20-BE'de `logistics_catalog.CATALOGS`'a giriyor; o gün bu
  // satır silinir ve `listShippingZones` katalog ucuna devreder.
  list_shipping_zones: true,
  // Hesap ucu GERÇEK ve yazılmış (`logistics_admin.list_carrier_accounts`),
  // ama mock kuralların atıf yaptığı hesapların var olması gerekiyor. Bu bir
  // VERİ bağı, uç eksikliği değil — `list_pricing_rules` false yapılırken
  // bu da false yapılır.
  list_carrier_accounts: true,
  // Sevkiyat seçici: gerçek uçta `simulate_price({shipment})` sunucuda
  // çözülüyor, ayrı bir uç YOK. Mock'ta seçim listesi gerekiyor.
  list_simulatable_shipments: true,
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
// Kural listesi ve detayı
// ---------------------------------------------------------------------------

/**
 * Kural listesi — K1 ve K2'nin kapısı.
 *
 * `layers` sayaçları listeyle AYNI yanıttan geliyor (sözleşme §2.1). Ayrı
 * istekle çekmek sayaçları listeden kaydırır: kullanıcı "Satıcı kuralları 4"
 * görür, açar, 3 kayıt gelir.
 */
export async function listPricingRules({
  scope = "all",
  search = null,
  zone = null,
  carrierAccount = null,
  seller = null,
  isActive = null,
  start = 0,
  pageLength = 50,
  asSeller = false,
  sellerName = null,
} = {}) {
  if (MOCK.list_pricing_rules)
    return viaMock(() =>
      pricingMock.listPricingRules({
        q: search,
        zone,
        carrierAccount,
        seller,
        isActive,
        start,
        pageLength,
        asSeller,
        ...(sellerName ? { sellerName } : {}),
      })
    );

  return logisticsGet(`${PRICING}.list_pricing_rules`, {
    scope,
    q: search,
    zone,
    carrier_account: carrierAccount,
    seller,
    is_active: isActive,
    start,
    page_length: pageLength,
  });
}

/** Tek kuralın detayı — alt tablolar (kademe, ek ücret) burada geliyor. */
export async function getPricingRule(name, { asSeller = false, sellerName = null } = {}) {
  if (MOCK.get_pricing_rule)
    return viaMock(() =>
      pricingMock.getPricingRule(name, { asSeller, ...(sellerName ? { sellerName } : {}) })
    );

  return logisticsGet(`${PRICING}.get_pricing_rule`, { name });
}

// ---------------------------------------------------------------------------
// Yazma
// ---------------------------------------------------------------------------

/**
 * Kural kaydet — `name` boşsa oluşturur.
 *
 * Doğrulama SUNUCUDA (sözleşme §2.3): kademe çakışması/boşluğu, sahiplik ve
 * `is_mandatory` kapısı. Arayüz aynı denetimleri yapıyor ama kapı burası değil;
 * arayüz yalnız kullanıcıyı erken uyarıyor.
 */
export async function savePricingRule({
  name = null,
  values,
  asSeller = false,
  sellerName = null,
} = {}) {
  if (MOCK.save_pricing_rule)
    return viaMock(() =>
      pricingMock.savePricingRule({ name, values, asSeller, ...(sellerName ? { sellerName } : {}) })
    );

  return logisticsPost(`${PRICING}.save_pricing_rule`, { name, values });
}

/**
 * Katman içi SIRALAMA — tek istek, yalnız `priority` değişir.
 *
 * `save_pricing_rule`'a tüm belgeyi geri göndermek YANLIŞ (ölçüldü
 * 2026-08-21): liste yükü alt tabloları taşımıyor, kayıt "En az bir kademe
 * gerekli" ile reddediliyor ve sürükleme sessizce kayboluyordu. Ayrıca N
 * kural için 2N istek ve ortada kalan hata öncelikleri yarım bırakırdı —
 * sıralama ATOMİK olmalı.
 */
export async function reorderPricingRules({
  layer,
  order,
  asSeller = false,
  sellerName = null,
} = {}) {
  if (MOCK.reorder_pricing_rules)
    return viaMock(() =>
      pricingMock.reorderPricingRules({
        layer,
        order,
        asSeller,
        ...(sellerName ? { sellerName } : {}),
      })
    );

  return logisticsPost(`${PRICING}.reorder_pricing_rules`, { layer, order });
}

/** Kural sil — kullanımdaysa `RULE_IN_USE`. */
export async function deletePricingRule(name, { asSeller = false, sellerName = null } = {}) {
  if (MOCK.delete_pricing_rule)
    return viaMock(() =>
      pricingMock.deletePricingRule(name, { asSeller, ...(sellerName ? { sellerName } : {}) })
    );

  return logisticsPost(`${PRICING}.delete_pricing_rule`, { name });
}

// ---------------------------------------------------------------------------
// Simülasyon
// ---------------------------------------------------------------------------

/**
 * Fiyat simülasyonu — K3 ve K8 AYNI yanıtı tüketiyor.
 *
 * Tek teklif değil, kullanılabilir HER taşıyıcı hesabı için bir satır döner
 * (sözleşme §2.5). Girdi ya serbest parametre ya `{ shipment }` — ikinci
 * biçimde değerleri sunucu dolduruyor ve `input` alanında geri veriyor.
 */
export async function simulatePrice(input = {}, { asSeller = false, sellerName = null } = {}) {
  if (MOCK.simulate_price)
    return viaMock(() =>
      pricingMock.simulatePrice(input, { asSeller, ...(sellerName ? { sellerName } : {}) })
    );

  return logisticsPost(`${PRICING}.simulate_price`, input);
}

// ---------------------------------------------------------------------------
// Seçim listeleri
// ---------------------------------------------------------------------------

/**
 * Kargo bölgeleri.
 *
 * 20-BE'de `Shipping Zone` DocType'ı katalog kaydına girecek ve bu fonksiyon
 * jenerik katalog ucuna devredecek — YENİ UÇ YAZILMIYOR (sözleşme §2.6).
 */
export async function listShippingZones() {
  if (MOCK.list_shipping_zones) return viaMock(() => pricingMock.listShippingZones());

  return logisticsGet(`${LOGISTICS_METHOD.CATALOG}.list_catalog`, {
    catalog: "shipping_zone",
    page_length: 100,
  });
}

/** Taşıyıcı hesapları — kural formunun ve simülasyonun seçicisi. */
export async function listCarrierAccounts({ asSeller = false, sellerName = null } = {}) {
  if (MOCK.list_carrier_accounts)
    return viaMock(() =>
      pricingMock.listCarrierAccounts({ asSeller, ...(sellerName ? { sellerName } : {}) })
    );

  return logisticsGet(`${LOGISTICS_METHOD.ADMIN}.list_carrier_accounts`, { page_length: 100 });
}

/**
 * "Gerçek sipariş" sekmesinin beslendiği liste.
 *
 * Gerçek uçta böyle bir uç YOK: ekran mevcut sevkiyat listesini kullanır
 * (`v1.shipment.list_shipments`). Mock'ta ayrı tutuluyor çünkü simülasyona
 * uygun (desi/bölge/tutar taşıyan) kayıtlar sınırlı.
 */
export async function listSimulatableShipments({ asSeller = false, sellerName = null } = {}) {
  if (MOCK.list_simulatable_shipments)
    return viaMock(() =>
      pricingMock.listSimulatableShipments({ asSeller, ...(sellerName ? { sellerName } : {}) })
    );

  return logisticsGet(`${LOGISTICS_METHOD.SHIPMENT}.list_shipments`, { page_length: 50 });
}
