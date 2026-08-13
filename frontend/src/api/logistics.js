// Lojistik API istemcisi.
// Backend: tradehub_core.api.v1.logistics_catalog / logistics_admin
// Sözleşme: tradehub_core/docs/LOGISTICS-API-CONTRACT.md
//
// utils/api.js'in callMethod/callMethodGET wrapper'ını kullanır (CSRF + auth
// + hata yönetimi merkezi) — projedeki src/api/seo.js ile aynı desen.
//
// ZARF AÇMA:
//   Lojistik uçları tek bir zarf döndürüyor:
//     başarı → { ok: true,  data: <yük> }
//     hata   → { ok: false, error: { code, message, details? } }
//   Frappe bunu ayrıca `{ message: ... }` içine sarıyor. Bu modül iki katmanı
//   da açar; çağıran ya doğrudan yükü alır ya LogisticsApiError yakalar.
//
// NEDEN TİPLİ HATA:
//   Ekranların hata TÜRÜNE göre dallanması gerekiyor — "bu özellik henüz açık
//   değil" (FEATURE_DISABLED) ile "yetkiniz yok" (PERMISSION_DENIED) farklı
//   ekran gösterir. Mesaj metnine bakarak dallanmak i18n ile kırılır.

import api from "@/utils/api";

const CATALOG = "tradehub_core.api.v1.logistics_catalog";
const ADMIN = "tradehub_core.api.v1.logistics_admin";

/** Sözleşmedeki hata kodunu taşıyan hata. */
export class LogisticsApiError extends Error {
  constructor({ code, message, details }) {
    super(message || code);
    this.name = "LogisticsApiError";
    /** Kararlı hata kodu — dallanma buna göre yapılır. */
    this.code = code;
    this.details = details ?? null;
  }

  get isPermissionDenied() {
    return this.code === "PERMISSION_DENIED" || this.code === "CAPABILITY_REQUIRED";
  }

  get isFeatureDisabled() {
    return this.code === "FEATURE_DISABLED";
  }

  get isNotFound() {
    return this.code === "NOT_FOUND";
  }
}

/**
 * Frappe + lojistik zarfını açar.
 *
 * `utils/api.js` ağ/HTTP hatalarında zaten `Error` fırlatıyor; burada yalnız
 * uygulama seviyesindeki `{ ok: false }` yanıtı ele alınıyor.
 */
function unwrap(response) {
  const envelope = response?.message ?? response;

  if (!envelope || typeof envelope !== "object" || !("ok" in envelope)) {
    // Sözleşme dışı yanıt — sessizce geçmek yerine görünür kıl.
    throw new LogisticsApiError({
      code: "INTERNAL_ERROR",
      message: "Beklenmeyen yanıt biçimi (sözleşme zarfı yok).",
    });
  }

  if (!envelope.ok) {
    throw new LogisticsApiError(envelope.error ?? {});
  }
  return envelope.data;
}

// ---------------------------------------------------------------------------
// Katalog
// ---------------------------------------------------------------------------

/** Yönetilebilir katalogların listesi — panel menüsünü kurar. */
export async function listCatalogKeys() {
  return unwrap(await api.callMethodGET(`${CATALOG}.list_catalog_keys`));
}

/**
 * Katalog kayıtlarını sayfalı listeler.
 * @returns {Promise<{items: object[], total: number, page: number, page_size: number}>}
 */
export async function listCatalog(
  catalog,
  { page = 1, pageSize = 50, search = "", isActive = null, filters = null, orderBy = null } = {}
) {
  return unwrap(
    await api.callMethodGET(`${CATALOG}.list_catalog`, {
      catalog,
      page,
      page_size: pageSize,
      ...(search ? { search } : {}),
      ...(isActive === null ? {} : { is_active: isActive }),
      ...(filters ? { filters: JSON.stringify(filters) } : {}),
      ...(orderBy ? { order_by: orderBy } : {}),
    })
  );
}

/** Tek kaydın tam detayı (child tablolar dahil). */
export async function getCatalogItem(catalog, name) {
  return unwrap(await api.callMethodGET(`${CATALOG}.get_catalog_item`, { catalog, name }));
}

export async function createCatalogItem(catalog, values) {
  return unwrap(await api.callMethod(`${CATALOG}.create_catalog_item`, { catalog, values }));
}

export async function updateCatalogItem(catalog, name, values) {
  return unwrap(await api.callMethod(`${CATALOG}.update_catalog_item`, { catalog, name, values }));
}

/**
 * Kaydı aktifleştirir/pasifleştirir.
 * Silme yok — katalog kayıtları başka dokümanlardan referans alınabiliyor.
 */
export async function setCatalogItemActive(catalog, name, isActive) {
  return unwrap(
    await api.callMethod(`${CATALOG}.set_catalog_item_active`, {
      catalog,
      name,
      is_active: isActive ? 1 : 0,
    })
  );
}

// ---------------------------------------------------------------------------
// Taşıyıcı hesapları
// ---------------------------------------------------------------------------

export async function listCarrierAccounts({ carrier = null, isActive = null, page = 1, pageSize = 50 } = {}) {
  return unwrap(
    await api.callMethodGET(`${ADMIN}.list_carrier_accounts`, {
      ...(carrier ? { carrier } : {}),
      ...(isActive === null ? {} : { is_active: isActive }),
      page,
      page_size: pageSize,
    })
  );
}

export async function getCarrierAccount(name) {
  return unwrap(await api.callMethodGET(`${ADMIN}.get_carrier_account`, { name }));
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
  return unwrap(await api.callMethod(`${ADMIN}.save_carrier_account`, { name, values }));
}

/**
 * Tek bir gizli alanın değerini getirir.
 *
 * `view.carrier_secret` capability'si ister ve her çağrı HIGH severity denetim
 * kaydı bırakır. Bilinçli bir kullanıcı eylemine bağlanmalı — sayfa açılışında
 * otomatik ÇAĞIRMA.
 */
export async function revealCarrierSecret(name, secretField) {
  return unwrap(
    await api.callMethod(`${ADMIN}.reveal_carrier_secret`, { name, secret_field: secretField })
  );
}

// ---------------------------------------------------------------------------
// Ayarlar ve yetki
// ---------------------------------------------------------------------------

/** @returns {Promise<{settings: object, feature_flags: Record<string, boolean>}>} */
export async function getLogisticsSettings() {
  return unwrap(await api.callMethodGET(`${ADMIN}.get_logistics_settings`));
}

export async function updateLogisticsSettings(values) {
  return unwrap(await api.callMethod(`${ADMIN}.update_logistics_settings`, { values }));
}

/**
 * Tek bir feature flag'i değiştirir.
 *
 * Tüm bayrak sözlüğünü göndermek yerine tek anahtar gönderilir — eşzamanlı iki
 * yöneticinin birbirinin değişikliğini ezmemesi için.
 */
export async function setFeatureFlag(flag, enabled) {
  return unwrap(
    await api.callMethod(`${ADMIN}.set_feature_flag`, { flag, enabled: enabled ? 1 : 0 })
  );
}

/**
 * Oturumun lojistik yetkilerini bildirir.
 *
 * GÜVENLİK SINIRI DEĞİLDİR — yalnız aksiyonları gizlemek için. Yetki kararı
 * her istekte backend'de yeniden verilir.
 */
export async function getLogisticsPermissions() {
  return unwrap(await api.callMethodGET(`${ADMIN}.get_logistics_permissions`));
}
