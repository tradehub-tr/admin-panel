// Lojistik ÇEKİRDEK API istemcisi — katalog, taşıyıcı hesabı, ayarlar, sevkiyat.
// Backend: tradehub_core.api.v1.logistics_catalog / logistics_admin / shipment
// Sözleşme: tradehub_core/docs/LOGISTICS-API-CONTRACT.md
//
// SAHİP: Bora (16-FE-0). Yeni bir domain'in uçlarını buraya EKLEME —
// `src/api/logisticsClient.js` başlığındaki desene göre kendi modül dosyanı
// aç (`logisticsPricing.js`, `logisticsPod.js`, …). Bu dosya büyüdükçe iki
// geliştirici aynı satırlarda buluşur; ayrı modüller çakışmayı sıfırlar.
//
// Zarf açma, tipli hata ve HTTP geçidi `logisticsClient.js` +
// `logisticsEnvelope.js` içinde. Buradaki fonksiyonlar yalnız uç adını,
// parametre biçimini ve sözleşme notlarını taşır.

// Saf çeviri mantığı ayrı modülde — tarayıcı API'si kullanmadığı için
// node:test'ten doğrudan sınanabiliyor (bkz. __tests__/shipmentEnvelope.test.js).
import { LOGISTICS_METHOD, logisticsGet, logisticsPost } from "./logisticsClient";
import { omitEmpty, toPageEnvelope, toPageParams } from "./shipmentEnvelope";

const { ADMIN, CATALOG, SHIPMENT } = LOGISTICS_METHOD;

// Tipli hata ve zarf açıcı çekirdekte (logisticsEnvelope) yaşıyor; buradan
// yeniden dışa açılıyor çünkü mevcut çağıranların import yolu bu
// (stores/logistics.js, api/packaging.js — 13-FE paketleme de aynı zarfı açıyor).
export { LogisticsApiError, unwrap } from "./logisticsEnvelope";

// ---------------------------------------------------------------------------
// Katalog
// ---------------------------------------------------------------------------

/** Yönetilebilir katalogların listesi — panel menüsünü kurar. */
export async function listCatalogKeys() {
  return logisticsGet(`${CATALOG}.list_catalog_keys`);
}

/**
 * Katalog kayıtlarını sayfalı listeler.
 * @returns {Promise<{items: object[], total: number, page: number, page_size: number}>}
 */
export async function listCatalog(
  catalog,
  { page = 1, pageSize = 50, search = "", isActive = null, filters = null, orderBy = null } = {}
) {
  return logisticsGet(`${CATALOG}.list_catalog`, {
    catalog,
    page,
    page_size: pageSize,
    ...(search ? { search } : {}),
    ...(isActive === null ? {} : { is_active: isActive }),
    ...(filters ? { filters: JSON.stringify(filters) } : {}),
    ...(orderBy ? { order_by: orderBy } : {}),
  });
}

/** Tek kaydın tam detayı (child tablolar dahil). */
export async function getCatalogItem(catalog, name) {
  return logisticsGet(`${CATALOG}.get_catalog_item`, { catalog, name });
}

export async function createCatalogItem(catalog, values) {
  return logisticsPost(`${CATALOG}.create_catalog_item`, { catalog, values });
}

export async function updateCatalogItem(catalog, name, values) {
  return logisticsPost(`${CATALOG}.update_catalog_item`, { catalog, name, values });
}

/**
 * Kaydı aktifleştirir/pasifleştirir.
 * Silme yok — katalog kayıtları başka dokümanlardan referans alınabiliyor.
 */
export async function setCatalogItemActive(catalog, name, isActive) {
  return logisticsPost(`${CATALOG}.set_catalog_item_active`, {
    catalog,
    name,
    is_active: isActive ? 1 : 0,
  });
}

// ---------------------------------------------------------------------------
// Taşıyıcı hesapları
// ---------------------------------------------------------------------------

export async function listCarrierAccounts({
  carrier = null,
  isActive = null,
  page = 1,
  pageSize = 50,
} = {}) {
  return logisticsGet(`${ADMIN}.list_carrier_accounts`, {
    ...(carrier ? { carrier } : {}),
    ...(isActive === null ? {} : { is_active: isActive }),
    page,
    page_size: pageSize,
  });
}

export async function getCarrierAccount(name) {
  return logisticsGet(`${ADMIN}.get_carrier_account`, { name });
}

/**
 * Hesap oluşturur veya günceller.
 *
 * DİKKAT: Gizli alanları (api_key, api_secret, webhook_secret, access_token)
 * BOŞ göndermek "dokunma" anlamına gelir — form her kaydettiğinde mevcut
 * secret'ı silmesin diye. Değeri temizlemek isteniyorsa backend'e ayrı bir
 * akış gerekir.
 */
export async function saveCarrierAccount(name, values) {
  return logisticsPost(`${ADMIN}.save_carrier_account`, { name, values });
}

/**
 * Tek bir gizli alanın değerini getirir.
 *
 * `view.carrier_secret` capability'si ister ve her çağrı HIGH severity denetim
 * kaydı bırakır. Bilinçli bir kullanıcı eylemine bağlanmalı — sayfa açılışında
 * otomatik ÇAĞIRMA.
 */
export async function revealCarrierSecret(name, secretField) {
  return logisticsPost(`${ADMIN}.reveal_carrier_secret`, { name, secret_field: secretField });
}

// ---------------------------------------------------------------------------
// Ayarlar ve yetki
// ---------------------------------------------------------------------------

/** @returns {Promise<{settings: object, feature_flags: Record<string, boolean>}>} */
export async function getLogisticsSettings() {
  return logisticsGet(`${ADMIN}.get_logistics_settings`);
}

export async function updateLogisticsSettings(values) {
  return logisticsPost(`${ADMIN}.update_logistics_settings`, { values });
}

/**
 * Tek bir feature flag'i değiştirir.
 *
 * Tüm bayrak sözlüğünü göndermek yerine tek anahtar gönderilir — eşzamanlı iki
 * yöneticinin birbirinin değişikliğini ezmemesi için.
 */
export async function setFeatureFlag(flag, enabled) {
  return logisticsPost(`${ADMIN}.set_feature_flag`, { flag, enabled: enabled ? 1 : 0 });
}

/**
 * Oturumun lojistik yetkilerini bildirir.
 *
 * GÜVENLİK SINIRI DEĞİLDİR — yalnız aksiyonları gizlemek için. Yetki kararı
 * her istekte backend'de yeniden verilir.
 */
export async function getLogisticsPermissions() {
  return logisticsGet(`${ADMIN}.get_logistics_permissions`);
}

// ---------------------------------------------------------------------------
// Sevkiyat uçları — ZARF KÖPRÜSÜ
// ---------------------------------------------------------------------------
//
// `tradehub_core.api.v1.shipment` katalog/admin uçlarından ÖNCE ve AYRI
// yazıldı; kendi zarfını kuruyor ve sayfalama sözleşmesi farklı:
//
//     Sevkiyat ucu   { ok, data: { shipments, total, limit_start, limit_page_length }, meta }
//     Bu istemci     { items, total, page, page_size }
//
// Uçları yeniden yazmak yerine burada köprüleniyor. Sebep: o uçlar çalışıyor,
// testleri var, tenant izolasyonu (`shipment_query_conditions`) kurulu.
//
// Köprü İNCE tutuluyor: yalnız anahtar adı ve sayfalama çevirisi yapıyor,
// alan adlarına dokunmuyor. Sözleşme adları 2026-08-13'te gerçek DocType'a
// hizalandığı için alan çevirisi GEREKMİYOR.

/**
 * Sevkiyatları sayfalı listeler.
 *
 * Tenant izolasyonu backend'de: satıcı yalnız kendi mağazasının, alıcı yalnız
 * kendi siparişlerinin sevkiyatlarını görür (`shipment_query_conditions`).
 */
export async function listShipments({ status = null, order = null, page = 1, pageSize = 50 } = {}) {
  const {
    limit_start,
    limit_page_length,
    page: safePage,
    pageSize: safeSize,
  } = toPageParams(page, pageSize);

  const data = await logisticsGet(
    `${SHIPMENT}.list_shipments`,
    omitEmpty({ status, order, limit_start, limit_page_length })
  );
  return toPageEnvelope(data, { page: safePage, pageSize: safeSize });
}

/**
 * Sevkiyat detayı.
 *
 * Yanıt `doc.as_dict()`: yalnız Shipment'ın KENDİ child tabloları geliyor —
 * items, packages, documents, address_snapshots. `Shipment Leg` ve
 * `Shipment Event` AYRI DocType'lar (`shipment` link alanıyla bağlı), bu
 * yanıtta YOKLAR. Sekme kaydındaki `blockedBy` gerekçeleri buna dayanıyor
 * (`views/logistics/shipmentTabRegistry.js`) — burada "legs/events dahil"
 * yazsaydı, onları okuyan biri engeli haksız yere kaldırırdı.
 */
export async function getShipment(name) {
  return logisticsGet(`${SHIPMENT}.get_shipment_detail`, { name });
}

/**
 * Durum geçişi. Gerekçe (`note`) TUR-107 denetim kriteri gereği taşınıyor —
 * backend `Shipment Event`'e yazıyor.
 */
export async function updateShipmentStatus(name, status, note = null) {
  return logisticsPost(`${SHIPMENT}.update_shipment_status`, omitEmpty({ name, status, note }));
}

export async function cancelShipment(name, reason = null) {
  return logisticsPost(`${SHIPMENT}.cancel_shipment`, omitEmpty({ name, reason }));
}

export async function createShipment(order, values = {}) {
  return logisticsPost(`${SHIPMENT}.create_shipment`, { order, ...values });
}
