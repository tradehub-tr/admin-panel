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
  setCatalogItemActive,
  setFeatureFlag,
  updateCatalogItem,
  updateLogisticsSettings,
  updateShipmentStatus,
} from "@/api/logistics";
import { normalizeCapabilities } from "@/api/logisticsCapabilities";
import { normalizeCatalogKeys } from "@/api/logisticsCatalogKeys";
import { toDisplayMessage } from "@/api/logisticsEnvelope";

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

  /**
   * `get_logistics_permissions` çıktısı — buton görünürlüğü buna bakar.
   *
   * `Set`, çünkü uç bir SÖZLÜK döndürüyor (`{cap: bool}`) ama burada dizi
   * bekleniyordu; `includes` sözlükte olmadığı için `can` computed'ı fırlıyor
   * ve DOM donuyordu. Normalizasyon `api/logisticsCapabilities.js`'te.
   */
  const capabilities = ref(new Set());

  /**
   * Katalog anahtarı → `{read, write, create, delete}`.
   *
   * Katalog ekranlarının yetkisi BURAYA bakar; `capabilities` sevkiyat
   * aksiyonlarını anlatır ve katalog CRUD'u ile semantik olarak ilgisizdir.
   */
  const doctypePermissions = ref({});

  /** Lojistik modülü ana bayrağı — yanıttaki `module_enabled`. */
  const moduleEnabled = ref(false);

  const loading = ref(false);
  const saving = ref(false);
  const error = ref(null);

  // ── getters ──────────────────────────────────────────────────────────
  const masterEnabled = computed(() => Boolean(settings.value.logistics_enabled));

  /**
   * Ekranların `can` prop'u. GÜVENLİK SINIRI DEĞİL — yalnız arayüz
   * kolaylığı; asıl kontrol backend'de (logistics_admin.py).
   */
  const has = (name) => capabilities.value.has(name);

  const can = computed(() => ({
    read: true,
    write: has("shipment.write"),
    create: has("shipment.create"),
    cancel: has("shipment.cancel"),
    viewCost: has("view.logistics_cost"),
    manage: has("carrier_credential.manage"),
    viewSecret: has("view.carrier_secret"),

    // ── Etiket yetkileri (13-FE) ─────────────────────────────────────
    // `shipment.label.*` capability'leri 13-BE'de LOGISTICS_CAPABILITIES'e
    // eklenecek (sözleşme §6). O güne kadar sunucu bu adları hiç bildirmiyor;
    // yalnız onlara bakmak etiket butonlarını KALICI olarak gizlerdi.
    // Köprü: tanımlıysa onu kullan, değilse yazma yetkisine düş.
    generateLabel: has("shipment.label.generate") || has("shipment.write"),
    reprintLabel: has("shipment.label.reprint") || has("shipment.write"),
    // Void taşıyıcıya GERİ ALINAMAZ istek gönderiyor. Köprü döneminde
    // `shipment.write`'a düşmüyor; yönetim yetkisi olanla sınırlı.
    voidLabel: has("shipment.label.void") || has("carrier_credential.manage"),
  }));

  /**
   * Tek bir kataloğun CRUD yetkisi — `can` DEĞİL, bunu kullan.
   *
   * Katalog ekranları eskiden `can.write`/`can.create`'e bakıyordu; onlar
   * sevkiyat capability'leri ve bir kataloğu düzenleme yetkisiyle ilgisiz.
   * Backend `doctype_permissions`'ı zaten katalog anahtarı bazında veriyor.
   *
   * Anahtar bilinmiyorsa (yanıt gelmemiş ya da katalog yeni) dördü de
   * `false` — yetki bilinmiyorken düğme göstermemek doğru davranış.
   *
   * @param {string} catalogKey Sözleşmedeki katalog anahtarı.
   * @returns {{read: boolean, write: boolean, create: boolean, delete: boolean}}
   */
  function catalogCan(catalogKey) {
    const perms = doctypePermissions.value?.[catalogKey];
    return {
      read: Boolean(perms?.read),
      write: Boolean(perms?.write),
      create: Boolean(perms?.create),
      delete: Boolean(perms?.delete),
    };
  }

  // ── actions ──────────────────────────────────────────────────────────

  /**
   * Tipli hatayı `{code, message}` olarak saklar; ağ hatasını da normalize eder.
   *
   * `details` sunucudan geldiği gibi taşınıyor ve serbest biçimli:
   * validasyon bağlamı, taşıyıcı yanıt gövdesi vb. içerebilir. **Kullanıcıya
   * BASILMAZ** — yalnız geliştirici/destek bağlamı. `ErrorState` bilerek
   * yalnız `code` ve `message` gösteriyor; yeni bir hata ekranı yazan kişi
   * bu satırı okumadan `details`i render etmesin.
   */
  function capture(e) {
    // `message` HER ZAMAN string: `ErrorState` ve toast onu doğrudan basıyor,
    // bir nesne kaçarsa kullanıcı "[object Object]" görür. `toDisplayMessage`
    // string olmayanı da, bir yerde `String(nesne)`'ye dönüşmüş olanı da
    // okunabilir bir metne indiriyor (bkz. api/logisticsEnvelope.js).
    error.value =
      e instanceof LogisticsApiError
        ? { code: e.code, message: toDisplayMessage(e.message), details: e.details }
        : { code: "INTERNAL_ERROR", message: toDisplayMessage(e?.message) };
  }

  async function fetchPermissions() {
    try {
      const data = await getLogisticsPermissions();
      capabilities.value = normalizeCapabilities(data?.capabilities);
      doctypePermissions.value = data?.doctype_permissions ?? {};
      moduleEnabled.value = Boolean(data?.module_enabled);
    } catch (e) {
      // Sessiz kalmak yanlıştı (Ali, 13-FE): panel salt-okunur görünüyor,
      // kimse nedenini bilmiyordu. Hata konsola düşüyor.
      console.warn("Lojistik yetkileri alınamadı — panel salt-okunur çalışıyor.", e);
      // Yetki bildirimi alınamazsa buton göstermemek DOĞRU davranış —
      // hata ekrana taşınmıyor, yetkiler boş kalıyor.
      //
      // `moduleEnabled` DA sıfırlanmalı: bu üçü tek yanıttan geliyor ve
      // birlikte "oturumun lojistik yetki durumu"nu anlatıyor. İkisini
      // sıfırlayıp bunu bırakmak asimetrik bir fail-open'dı — başarılı bir
      // yanıttan sonra gelen başarısız bir tazeleme "modül açık ama hiçbir
      // yetki yok" karışık durumunu bırakıyor, modüle bağlı ekranlar
      // (ör. ayar sekmeleri) açık sanıp boş çiziliyordu.
      capabilities.value = new Set();
      doctypePermissions.value = {};
      moduleEnabled.value = false;
    }
  }

  /**
   * Katalog anahtarları. SÖZLEŞME: `catalogKeys` her zaman STRING dizisidir.
   *
   * Uç bir NESNE döndürüyor (`{catalogs:[{key, doctype, …}]}`); ham hâliyle
   * atandığında `CatalogListView`'ün `catalogKeys.map(...)` çağrısı
   * `TypeError` fırlatıyor ve katalog seçici kırılıyordu. Normalizasyon tek
   * yerde: `api/logisticsCatalogKeys.js`.
   */
  async function fetchCatalogKeys() {
    try {
      catalogKeys.value = normalizeCatalogKeys(await listCatalogKeys());
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

  /**
   * Yeni kayıtta `name` boştur; ayrım burada yapılır, ekranda değil.
   *
   * `values` SÖZLEŞMEYE SÜZÜLMÜŞ gelmeli (`catalogMeta.pickWritableValues`) —
   * backend sözleşme dışı tek bir anahtar için tüm isteği reddediyor.
   *
   * Yazma uçları yalnız `{name}` döndürüyor. Dönen bu yükü `currentItem`'a
   * koymak formu bir anda BOŞALTIRDI (draft `modelValue`'dan doğuyor), bu
   * yüzden başarıdan sonra kayıt SUNUCUDAN yeniden okunuyor —
   * `changeShipmentStatus` ile aynı gerekçe: doğru hâli sunucu bilir.
   * Yeniden okuma başarısız olursa kaydı başarısız SAYMIYORUZ; yazma zaten
   * tamamlandı, elimizdeki yükle devam edilir.
   */
  async function saveCatalogItem(catalogKey, name, values) {
    saving.value = true;
    error.value = null;
    try {
      const written = name
        ? await updateCatalogItem(catalogKey, name, values)
        : await createCatalogItem(catalogKey, values);
      const savedName = written?.name ?? name ?? null;

      currentItem.value = savedName
        ? await getCatalogItem(catalogKey, savedName).catch(() => ({ ...values, name: savedName }))
        : written;
      return currentItem.value;
    } catch (e) {
      capture(e);
      throw e;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Yeni kayıt formu için `currentItem`'ı boşaltır.
   *
   * View eskiden `store.currentItem = {}` yazıyordu — Pinia buna izin verse de
   * state mutasyonu action'da toplanmalı (state-management §2): "burada
   * temizleniyor" bilgisi tek yerde dursun, ekran state şeklini bilmesin.
   */
  function resetCurrentItem() {
    currentItem.value = {};
  }

  /**
   * Seçili kayıtları toplu aktif/pasif yapar.
   *
   * SIRALI, paralel DEĞİL: uç her kayıt için ayrı bir doküman yazıyor ve
   * `frappe` aynı DocType'a eşzamanlı yazımda kilitlenebiliyor. Liste zaten
   * en fazla bir sayfa (50 kayıt) seçim taşıyor.
   *
   * KISMİ BAŞARI KABUL: ilk hata döngüyü kesmiyor — 20 kaydın 3'ü yetki
   * yüzünden reddedilirse kalan 17'yi geri almanın yolu yok, atomik olmayan
   * uçtan atomik davranış taklit etmek yanlış olurdu. Hata `capture()` ile
   * saklanıyor, çağıran `store.error`'a bakıp uyarabiliyor.
   *
   * Liste HER DURUMDA tazeleniyor: kısmi başarıdan sonra ekranda hangi
   * kaydın döndüğü ancak sunucudan okunarak bilinir.
   *
   * @param {string} catalogKey Katalog anahtarı.
   * @param {string[]} names Kayıt adları.
   * @param {boolean|number} isActive Hedef aktiflik.
   * @param {object} [params] Tazelemede kullanılacak liste parametreleri.
   * @returns {Promise<boolean>} Tümü başarılıysa `true`.
   */
  async function setCatalogActive(catalogKey, names, isActive, params = {}) {
    if (!names?.length) return true;

    saving.value = true;
    error.value = null;
    let failure = null;
    try {
      for (const name of names) {
        try {
          await setCatalogItemActive(catalogKey, name, isActive);
        } catch (e) {
          failure = e;
        }
      }
    } finally {
      saving.value = false;
    }

    // Tazeleme `error`'ı sıfırlıyor, bu yüzden toplu işlemin hatası ondan
    // SONRA yazılıyor — aksi hâlde çağıran hiç göremezdi. Tazelemenin kendi
    // hatası varsa ona dokunulmuyor: liste boş kaldıysa kullanıcının önce
    // onu görmesi gerek.
    await fetchCatalog(catalogKey, params);
    if (failure && !error.value) capture(failure);
    return !failure;
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
    catalogKeys,
    catalogRows,
    catalogTotal,
    currentItem,
    settings,
    featureFlags,
    capabilities,
    doctypePermissions,
    moduleEnabled,
    shipmentRows,
    shipmentTotal,
    currentShipment,
    loading,
    saving,
    error,
    masterEnabled,
    can,
    catalogCan,
    fetchPermissions,
    fetchCatalogKeys,
    fetchCatalog,
    fetchCatalogItem,
    saveCatalogItem,
    setCatalogActive,
    resetCurrentItem,
    fetchSettings,
    saveSetting,
    toggleFlag,
    clearError,
    fetchShipments,
    fetchShipment,
    changeShipmentStatus,
    cancelShipmentById,
  };
});
