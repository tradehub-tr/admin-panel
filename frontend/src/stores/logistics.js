import { defineStore } from "pinia";
import { computed, ref } from "vue";

import {
  LogisticsApiError,
  cancelShipment,
  createCatalogItem,
  getCatalogItem,
  getLogisticsPermissions,
  getLogisticsSettings,
  getShipment,
  listCatalog,
  listCatalogKeys,
  listShipments,
  setFeatureFlag,
  updateCatalogItem,
  updateLogisticsSettings,
  updateShipmentStatus,
} from "@/api/logistics";

/**
 * Lojistik store — katalog, ayarlar ve oturum yetkileri.
 *
 * HATA SAKLAMA BİÇİMİ:
 *   Projedeki diğer store'lar `error.value = e.message` yazıyor. Burada
 *   `{ code, message }` saklanıyor — çünkü lojistik ekranları hata KODUNA
 *   göre dallanıyor: "özellik kapalı" mavi bir bilgi kutusu, "yetkiniz yok"
 *   yeniden-dene butonu OLMAYAN bir hata. Mesaj metnine bakarak dallanmak
 *   i18n ile kırılır (bkz. src/api/logistics.js).
 */
export const useLogisticsStore = defineStore("logistics", () => {
  // ── state ────────────────────────────────────────────────────────────
  const catalogKeys = ref([]);
  const catalogRows = ref([]);
  const catalogTotal = ref(0);
  const currentItem = ref(null);

  const settings = ref({});
  const featureFlags = ref({});

  // ── sevkiyat ─────────────────────────────────────────────────────────
  const shipmentRows = ref([]);
  const shipmentTotal = ref(0);
  const currentShipment = ref(null);

  /** `get_logistics_permissions` çıktısı — buton görünürlüğü buna bakar. */
  const capabilities = ref([]);

  const loading = ref(false);
  const saving = ref(false);
  const error = ref(null);

  // ── getters ──────────────────────────────────────────────────────────
  const masterEnabled = computed(() => Boolean(settings.value.logistics_enabled));

  /**
   * Ekranların `can` prop'u. GÜVENLİK SINIRI DEĞİL — yalnız arayüz
   * kolaylığı; asıl kontrol backend'de (logistics_admin.py).
   */
  const can = computed(() => ({
    read: true,
    write: capabilities.value.includes("shipment.write"),
    create: capabilities.value.includes("shipment.create"),
    cancel: capabilities.value.includes("shipment.cancel"),
    viewCost: capabilities.value.includes("view.logistics_cost"),
    manage: capabilities.value.includes("carrier_credential.manage"),
    viewSecret: capabilities.value.includes("view.carrier_secret"),
  }));

  // ── actions ──────────────────────────────────────────────────────────

  /** Tipli hatayı `{code, message}` olarak saklar; ağ hatasını da normalize eder. */
  function capture(e) {
    error.value =
      e instanceof LogisticsApiError
        ? { code: e.code, message: e.message, details: e.details }
        : { code: "INTERNAL_ERROR", message: e?.message || "Beklenmeyen bir hata oluştu." };
  }

  async function fetchPermissions() {
    try {
      const data = await getLogisticsPermissions();
      capabilities.value = data?.capabilities ?? [];
    } catch {
      // Yetki bildirimi alınamazsa buton göstermemek DOĞRU davranış —
      // hata ekrana taşınmıyor, yetkiler boş kalıyor.
      capabilities.value = [];
    }
  }

  async function fetchCatalogKeys() {
    try {
      catalogKeys.value = (await listCatalogKeys()) ?? [];
    } catch (e) {
      capture(e);
      throw e;
    }
  }

  async function fetchCatalog(catalogKey, params = {}) {
    loading.value = true;
    error.value = null;
    try {
      const data = await listCatalog(catalogKey, params);
      catalogRows.value = data?.items ?? [];
      catalogTotal.value = data?.total ?? 0;
    } catch (e) {
      // Hata durumunda eski satırları BIRAKMA — ekran yetki hatası
      // gösterirken altında önceki kataloğun verisi durmasın.
      catalogRows.value = [];
      catalogTotal.value = 0;
      capture(e);
    } finally {
      loading.value = false;
    }
  }

  async function fetchCatalogItem(catalogKey, name) {
    loading.value = true;
    error.value = null;
    try {
      currentItem.value = await getCatalogItem(catalogKey, name);
    } catch (e) {
      currentItem.value = null;
      capture(e);
    } finally {
      loading.value = false;
    }
  }

  /** Yeni kayıtta `name` boştur; ayrım burada yapılır, ekranda değil. */
  async function saveCatalogItem(catalogKey, name, values) {
    saving.value = true;
    error.value = null;
    try {
      currentItem.value = name
        ? await updateCatalogItem(catalogKey, name, values)
        : await createCatalogItem(catalogKey, values);
      return currentItem.value;
    } catch (e) {
      capture(e);
      throw e;
    } finally {
      saving.value = false;
    }
  }

  async function fetchSettings() {
    loading.value = true;
    error.value = null;
    try {
      const data = await getLogisticsSettings();
      settings.value = data?.settings ?? {};
      featureFlags.value = data?.feature_flags ?? {};
    } catch (e) {
      capture(e);
    } finally {
      loading.value = false;
    }
  }

  async function saveSetting(key, value) {
    saving.value = true;
    error.value = null;
    try {
      settings.value = await updateLogisticsSettings({ [key]: value });
    } catch (e) {
      capture(e);
      throw e;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Tek bayrak açıp kapatır. Tüm sözlüğü göndermemenin nedeni backend'de
   * yazılı: bayraklar tek JSON alanında duruyor, toplu yazım eşzamanlı iki
   * yöneticinin birbirini ezmesine yol açar (logistics_admin.set_feature_flag).
   */
  async function toggleFlag(flag, enabled) {
    saving.value = true;
    error.value = null;
    try {
      const data = await setFeatureFlag(flag, enabled);
      featureFlags.value = { ...featureFlags.value, [data.flag]: data.enabled };
    } catch (e) {
      capture(e);
      throw e;
    } finally {
      saving.value = false;
    }
  }

  // ── sevkiyat aksiyonları ─────────────────────────────────────────────
  //
  // Uçlar `tradehub_core.api.v1.shipment`'te; zarf farkı `api/logistics.js`
  // içindeki köprüde çevriliyor. Tenant izolasyonu backend'de
  // (`shipment_query_conditions`) — burada filtre YOK, olsaydı yanlış bir
  // güvenlik hissi verirdi.

  async function fetchShipments(params = {}) {
    loading.value = true;
    error.value = null;
    try {
      const data = await listShipments(params);
      shipmentRows.value = data?.items ?? [];
      shipmentTotal.value = data?.total ?? 0;
    } catch (e) {
      // Katalogdaki gerekçenin aynısı: hata ekranının altında eski satırlar
      // durmasın.
      shipmentRows.value = [];
      shipmentTotal.value = 0;
      capture(e);
    } finally {
      loading.value = false;
    }
  }

  async function fetchShipment(name) {
    loading.value = true;
    error.value = null;
    try {
      currentShipment.value = await getShipment(name);
    } catch (e) {
      currentShipment.value = null;
      capture(e);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Durum geçişi. Başarıda detayı SUNUCUDAN yeniden okur, yereldeki nesneyi
   * yamamaz: geçiş `Shipment Event` üretiyor ve `modified` değişiyor —
   * yerel yama zaman çizelgesini eksik gösterirdi.
   */
  async function changeShipmentStatus(name, status, note = null) {
    saving.value = true;
    error.value = null;
    try {
      await updateShipmentStatus(name, status, note);
      await fetchShipment(name);
    } catch (e) {
      capture(e);
      throw e;
    } finally {
      saving.value = false;
    }
  }

  async function cancelShipmentById(name, reason = null) {
    saving.value = true;
    error.value = null;
    try {
      await cancelShipment(name, reason);
      await fetchShipment(name);
    } catch (e) {
      capture(e);
      throw e;
    } finally {
      saving.value = false;
    }
  }

  function clearError() {
    error.value = null;
  }

  return {
    catalogKeys, catalogRows, catalogTotal, currentItem,
    settings, featureFlags, capabilities,
    shipmentRows, shipmentTotal, currentShipment,
    loading, saving, error,
    masterEnabled, can,
    fetchPermissions, fetchCatalogKeys, fetchCatalog, fetchCatalogItem,
    saveCatalogItem, fetchSettings, saveSetting, toggleFlag, clearError,
    fetchShipments, fetchShipment, changeShipmentStatus, cancelShipmentById,
  };
});
