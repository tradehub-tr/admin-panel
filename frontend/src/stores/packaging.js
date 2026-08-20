import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { LogisticsApiError } from "@/api/logistics";
import {
  completePacking,
  generateLabels,
  getPackingQueue,
  getPackingSlip,
  getShipmentPacking,
  markReady,
  reprintLabels,
  saveShipmentPackages,
  voidLabel,
} from "@/api/packaging";
import {
  buildItemRows,
  decoratePackages,
  validatePacking,
} from "@/views/logistics/packages/packingValidation";
import { calculateTotals } from "@/utils/desi";
import { applyScan } from "@/utils/scanMatcher";

/**
 * Paketleme ve etiket store'u.
 *
 * `stores/logistics.js`'ten AYRI: lojistik dosyaları iki geliştirici arasında
 * bölüşüldü ve o dosya ortak yüzey. Yetki (`can`) oradan okunuyor — kopyalanmadı.
 *
 * TASLAK MODELİ:
 *   `packages` sunucudan gelen yükün KOPYASI ve serbestçe mutasyona uğruyor;
 *   `savePackages()` çağrılana kadar sunucuya hiçbir şey gitmiyor. Depoda ağ
 *   kopuyor — her koli düzenlemesinde istek atmak yarım kayıt bırakırdı.
 *   `isDirty` ile ekran çıkışta uyarıyor.
 */
export const usePackagingStore = defineStore("packaging", () => {
  // ── kuyruk (P1) ──────────────────────────────────────────────────────
  const queueRows = ref([]);
  const queueTotal = ref(0);
  const buckets = ref({});

  // ── çalışma alanı (P2/P3) ────────────────────────────────────────────
  /** Sunucudan gelen yük — kalemler, ayarlar, paket tipleri. Salt-okunur. */
  const shipment = ref(null);
  /** Düzenlenen koli taslağı. `shipment.packages`'ın kopyası. */
  const packages = ref([]);
  /** Sunucudan gelen son `modified` — optimistik kilit damgası. */
  const baseModified = ref(null);
  const activeIndex = ref(0);
  const isDirty = ref(false);

  const loading = ref(false);
  const saving = ref(false);
  const error = ref(null);
  /** Son okutmanın sonucu — tarama kutusu geri bildirimi. */
  const lastScan = ref(null);

  // ── getters ──────────────────────────────────────────────────────────
  const items = computed(() => shipment.value?.items ?? []);
  const packageTypes = computed(() => shipment.value?.package_types ?? []);
  const divisor = computed(() => shipment.value?.desi_divisor);

  /** Terminal durumdaki sevkiyat düzenlenemez — sunucu da reddediyor. */
  const isLocked = computed(() => Boolean(shipment.value?.is_locked));

  const itemRows = computed(() => buildItemRows(items.value, packages.value));
  const packageRows = computed(() => decoratePackages(packages.value, divisor.value));

  const validation = computed(() =>
    validatePacking({
      items: items.value,
      packages: packages.value,
      packageTypes: packageTypes.value,
      divisor: divisor.value,
    })
  );

  /**
   * Toplamlar YEREL hesaplanıyor — sunucu yükünde de var ama taslak
   * değiştiğinde bayatlar. Kaydedince sunucu değeri geri geliyor ve
   * ikisi örtüşüyor.
   */
  const totals = computed(() => calculateTotals(packages.value, divisor.value));

  const activePackage = computed(() => packages.value[activeIndex.value] ?? null);

  // ── yardımcılar ──────────────────────────────────────────────────────
  function capture(e) {
    error.value =
      e instanceof LogisticsApiError
        ? { code: e.code, message: e.message, details: e.details }
        : { code: "INTERNAL_ERROR", message: e?.message || "Beklenmeyen bir hata oluştu." };
  }

  /** Sunucu yükünü store'a yerleştirir; taslak ve dirty sıfırlanır. */
  function adopt(payload) {
    shipment.value = payload;
    packages.value = structuredClone(payload.packages ?? []);
    baseModified.value = payload.modified ?? null;
    isDirty.value = false;
    activeIndex.value = Math.min(activeIndex.value, Math.max(0, packages.value.length - 1));
  }

  function touch() {
    isDirty.value = true;
  }

  // ── kuyruk ───────────────────────────────────────────────────────────
  async function fetchQueue(params = {}) {
    loading.value = true;
    error.value = null;
    try {
      const data = await getPackingQueue(params);
      queueRows.value = data?.items ?? [];
      queueTotal.value = data?.total ?? 0;
      buckets.value = data?.buckets ?? {};
    } catch (e) {
      // Hatada eski satırları BIRAKMA — yetki hatasının altında önceki
      // kovanın verisi durmasın (stores/logistics.js ile aynı gerekçe).
      queueRows.value = [];
      queueTotal.value = 0;
      capture(e);
    } finally {
      loading.value = false;
    }
  }

  // ── çalışma alanı ────────────────────────────────────────────────────
  async function fetchPacking(name) {
    loading.value = true;
    error.value = null;
    lastScan.value = null;
    try {
      adopt(await getShipmentPacking(name));
    } catch (e) {
      shipment.value = null;
      packages.value = [];
      capture(e);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Taslağı kaydeder.
   *
   * Doğrulama ENGELİ olsa bile kaydediyor: depoda iş yarım kalıyor, kaydı
   * engellemek girilen ölçüleri çöpe atardı. "Tamamla" ayrı bir kapı.
   */
  async function savePackages() {
    if (!shipment.value) return null;
    saving.value = true;
    error.value = null;
    try {
      const payload = await saveShipmentPackages(
        shipment.value.shipment,
        packages.value,
        baseModified.value
      );
      adopt(payload);
      return payload;
    } catch (e) {
      // CONFLICT'te taslağı SİLME — kullanıcının girdiği ölçüler duruyor,
      // ekran "başkası değiştirdi, yeniden yükle" diyor ve kararı ona bırakıyor.
      capture(e);
      throw e;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Paketlemeyi tamamlar: önce taslağı kaydeder, sonra tamamlar.
   *
   * İki adım tek eylemde: kullanıcı "tamamla"ya bastığında kaydetmemiş
   * olabilir ve ayrı ayrı basmasını beklemek işi kaybettirir.
   */
  async function completeAndSave() {
    if (!shipment.value) return null;
    saving.value = true;
    error.value = null;
    try {
      if (isDirty.value) {
        const saved = await saveShipmentPackages(shipment.value.shipment, packages.value, baseModified.value);
        adopt(saved);
      }
      const payload = await completePacking(shipment.value.shipment, baseModified.value);
      adopt(payload);
      return payload;
    } catch (e) {
      capture(e);
      throw e;
    } finally {
      saving.value = false;
    }
  }

  /** Sevkiyatı "Alıma hazır" işaretler — etiket ekranının son adımı. */
  async function markShipmentReady() {
    if (!shipment.value) return null;
    saving.value = true;
    error.value = null;
    try {
      const payload = await markReady(shipment.value.shipment);
      adopt(payload);
      return payload;
    } catch (e) {
      capture(e);
      throw e;
    } finally {
      saving.value = false;
    }
  }

  /** İrsaliye belgesini açar. */
  async function openPackingSlip(packageCodes = null) {
    error.value = null;
    try {
      const { url } = await getPackingSlip(shipment.value.shipment, packageCodes);
      if (url) window.open(url, "_blank", "noopener");
    } catch (e) {
      capture(e);
    }
  }

  // ── koli düzenleme ───────────────────────────────────────────────────
  function defaultType() {
    return packageTypes.value.find((t) => t.is_default) ?? packageTypes.value[0] ?? null;
  }

  function addPackage(preset = null) {
    const type = preset ?? defaultType();
    packages.value = [
      ...packages.value,
      {
        row_id: null, // sunucu üretecek
        package_code: null,
        package_type: type?.name ?? null,
        length_cm: type?.length_cm ?? 0,
        width_cm: type?.width_cm ?? 0,
        height_cm: type?.height_cm ?? 0,
        weight_kg: 0,
        qty: 1,
        barcode: null,
        contents: [],
        label: null,
      },
    ];
    activeIndex.value = packages.value.length - 1;
    touch();
  }

  function updatePackage(index, patch) {
    packages.value = packages.value.map((p, i) => (i === index ? { ...p, ...patch } : p));
    touch();
  }

  /** Aynı ürünün birden çok özdeş kolisi — ölçüler kopyalanır, içerik BOŞ. */
  function duplicatePackage(index) {
    const src = packages.value[index];
    if (!src) return;
    const copy = { ...structuredClone(src), row_id: null, package_code: null, contents: [], label: null };
    packages.value = [...packages.value.slice(0, index + 1), copy, ...packages.value.slice(index + 1)];
    activeIndex.value = index + 1;
    touch();
  }

  function removePackage(index) {
    packages.value = packages.value.filter((_, i) => i !== index);
    activeIndex.value = Math.min(activeIndex.value, Math.max(0, packages.value.length - 1));
    touch();
  }

  function clearPackage(index) {
    updatePackage(index, { contents: [] });
  }

  function setActive(index) {
    activeIndex.value = index;
  }

  // ── kalem atama ──────────────────────────────────────────────────────
  /**
   * Kalemden aktif koliye miktar aktarır (B1 yolu).
   * Kalan miktarı aşan istek kalana kırpılıyor — sunucu da reddederdi.
   */
  function assignItem(rowId, qty, targetIndex = activeIndex.value) {
    const item = items.value.find((i) => i.row_id === rowId);
    const target = packages.value[targetIndex];
    if (!item || !target) return { result: "no-package" };

    const row = itemRows.value.find((r) => r.row_id === rowId);
    const amount = Math.min(Number(qty) || 0, row?.remaining ?? 0);
    if (amount <= 0) return { result: "already-full" };

    packages.value = packages.value.map((pkg, i) => {
      if (i !== targetIndex) return pkg;
      const contents = [...(pkg.contents ?? [])];
      const at = contents.findIndex((c) => c.shipment_item === rowId);
      if (at >= 0) contents[at] = { ...contents[at], qty: contents[at].qty + amount };
      else contents.push({ shipment_item: rowId, qty: amount });
      return { ...pkg, contents };
    });
    touch();
    return { result: "added", qty: amount };
  }

  /** Bir kalemi koliden tamamen çıkarır. */
  function unassignItem(rowId, packageIndex) {
    packages.value = packages.value.map((pkg, i) =>
      i === packageIndex
        ? { ...pkg, contents: (pkg.contents ?? []).filter((c) => c.shipment_item !== rowId) }
        : pkg
    );
    touch();
  }

  /**
   * Okutulan kodu işler (B3 yolu).
   *
   * Eşleşme mantığı `utils/scanMatcher.js`'te — saf ve test edilebilir.
   * Store yalnız sonucu uygular ve geri bildirimi saklar.
   */
  function scan(code, qty = 1) {
    const outcome = applyScan({
      code,
      items: items.value,
      packages: packages.value,
      activeIndex: activeIndex.value,
      qty,
    });

    if (outcome.result === "added") {
      packages.value = outcome.packages;
      touch();
    }
    // "activated" yalnız aktif koliyi değiştirir; "unknown"/"empty" hiçbir şeyi.
    activeIndex.value = outcome.activeIndex;
    lastScan.value = outcome;
    return outcome;
  }

  function clearScan() {
    lastScan.value = null;
  }

  // ── etiket ───────────────────────────────────────────────────────────
  async function generate(packageCodes, format) {
    saving.value = true;
    error.value = null;
    try {
      const result = await generateLabels(shipment.value.shipment, packageCodes, format);
      // Etiket durumu sunucuda değişti; tam yükü yeniden okuyoruz.
      adopt(await getShipmentPacking(shipment.value.shipment));
      return result;
    } catch (e) {
      capture(e);
      throw e;
    } finally {
      saving.value = false;
    }
  }

  async function reprint(packageCodes, reason, reasonNote) {
    saving.value = true;
    error.value = null;
    try {
      const result = await reprintLabels(shipment.value.shipment, packageCodes, reason, reasonNote);
      adopt(await getShipmentPacking(shipment.value.shipment));
      // Yazdırma belgesi hemen açılıyor: "yazdır"a basan kişi önünde
      // yazdırılabilir bir şey bekliyor, ikinci bir tıklama değil.
      if (result?.batch_url) window.open(result.batch_url, "_blank", "noopener");
      return result;
    } catch (e) {
      capture(e);
      throw e;
    } finally {
      saving.value = false;
    }
  }

  async function voidPackageLabel(packageCode, reason) {
    saving.value = true;
    error.value = null;
    try {
      await voidLabel(shipment.value.shipment, packageCode, reason);
      adopt(await getShipmentPacking(shipment.value.shipment));
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

  /** Ekrandan çıkarken taslağı bırak — sonraki sevkiyat temiz açılsın. */
  function reset() {
    shipment.value = null;
    packages.value = [];
    baseModified.value = null;
    activeIndex.value = 0;
    isDirty.value = false;
    error.value = null;
    lastScan.value = null;
  }

  return {
    queueRows, queueTotal, buckets,
    shipment, packages, activeIndex, isDirty, baseModified,
    loading, saving, error, lastScan,
    items, packageTypes, divisor, isLocked,
    itemRows, packageRows, validation, totals, activePackage,
    fetchQueue, fetchPacking, savePackages, completeAndSave, markShipmentReady, openPackingSlip,
    addPackage, updatePackage, duplicatePackage, removePackage, clearPackage, setActive,
    assignItem, unassignItem, scan, clearScan,
    generate, reprint, voidPackageLabel,
    clearError, reset,
  };
});
