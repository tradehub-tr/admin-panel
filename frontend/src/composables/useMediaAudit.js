import { computed, onUnmounted, reactive, ref } from "vue";

import { useToast } from "@/composables/useToast";
import api from "@/utils/api";

const M = "tradehub_core.api.media_admin";

/** Otomatik yenileme seçenekleri (saniye). 0 = kapalı. */
export const REFRESH_INTERVALS = [0, 10, 30, 60];

/**
 * Medya denetim kaydı sayfasının durumu (TUR-140).
 *
 * `useMediaOptimize` ile ayrı tutuldu: o composable envanter + kuyruk + çöp
 * yönetiyor, burası salt okunur bir olay akışı. Tek dosyada birleştirmek iki
 * ekranın filtre durumlarını birbirine karıştırırdı.
 */
export function useMediaAudit() {
  const toast = useToast();

  const items = ref([]);
  const actions = ref([]);
  const actors = ref([]);
  const targets = ref([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(50);
  const loading = ref(false);

  const search = ref("");
  const action = ref("");
  const severity = ref("");
  const decision = ref("");
  const actor = ref("");
  const tenant = ref("");
  const fileUrl = ref("");
  const days = ref(0);
  const sortBy = ref("timestamp");
  const sortDir = ref("desc");

  const facets = reactive({ actions: {}, severity: {}, denied: 0, total: 0 });

  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

  /** Filtreleri tek nesnede topla — hem istek gövdesi hem URL için tek kaynak. */
  const filterPayload = computed(() => ({
    search: search.value,
    action: action.value,
    severity: severity.value,
    decision: decision.value,
    actor: actor.value,
    tenant: tenant.value,
    file_url: fileUrl.value,
    days: days.value,
  }));

  const hasActiveFilter = computed(() =>
    Object.values(filterPayload.value).some((v) => v !== "" && v !== 0)
  );

  async function load() {
    loading.value = true;
    try {
      const res = await api.callMethodGET(`${M}.get_media_audit`, {
        ...filterPayload.value,
        page: page.value,
        page_size: pageSize.value,
        sort_by: sortBy.value,
        sort_dir: sortDir.value,
      });
      const data = res.message || {};
      items.value = data.items || [];
      total.value = data.total || 0;
      actions.value = data.actions || [];
    } catch (e) {
      toast.error(e.message || "Denetim kaydı alınamadı");
      items.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  }

  /** Sayaçlar liste filtresinden bağımsız: rayda "toplam kaç var" gösterilir. */
  async function loadFacets() {
    try {
      const res = await api.callMethodGET(`${M}.get_media_audit_facets`, { days: days.value });
      Object.assign(facets, res.message || {});
    } catch {
      // Sayaç kozmetik — liste zaten yüklendi, toast basmaya değmez.
    }
  }

  async function loadActors() {
    try {
      const res = await api.callMethodGET(`${M}.get_media_audit_actors`, { limit: 50 });
      actors.value = res.message?.items || [];
    } catch {
      actors.value = [];
    }
  }

  /** Tek kaydın tam raporu — popup bunu gösterir. */
  async function fetchReport(name) {
    try {
      const res = await api.callMethodGET(`${M}.get_media_audit_report`, { name });
      return res.message || null;
    } catch (e) {
      toast.error(e.message || "Rapor alınamadı");
      return null;
    }
  }

  async function loadTargets() {
    try {
      const res = await api.callMethodGET(`${M}.get_media_audit_targets`, { limit: 8 });
      targets.value = res.message?.items || [];
    } catch {
      targets.value = [];
    }
  }

  function loadAll() {
    load();
    loadFacets();
    loadTargets();
  }

  /** Filtre değişince ilk sayfaya dön — 7. sayfada filtre değiştirmek boş liste verir. */
  function applyFilters() {
    page.value = 1;
    load();
    loadFacets();
  }

  function reset() {
    clearFilters();
    applyFilters();
  }

  function goToPage(p) {
    page.value = Math.min(Math.max(1, p), pageCount.value);
    load();
  }

  /** Hazır görünüm uygula — operatörün en sık sorduğu dört soru. */
  function applyPreset(preset) {
    clearFilters();
    const map = {
      denied: () => {
        decision.value = "DENY";
        days.value = 1;
      },
      uploads: () => {
        action.value = "media.upload";
        days.value = 1;
      },
      deletions: () => {
        action.value = "media.delete";
      },
      high: () => {
        severity.value = "HIGH";
        days.value = 7;
      },
    };
    map[preset]?.();
    applyFilters();
  }

  /** Filtreleri sıfırla ama isteği atma — `applyPreset` üstüne kendi değerini yazar. */
  function clearFilters() {
    search.value = "";
    action.value = "";
    severity.value = "";
    decision.value = "";
    actor.value = "";
    tenant.value = "";
    fileUrl.value = "";
    days.value = 0;
  }

  /**
   * Filtrelenmiş kayıtların TAMAMINI CSV indir.
   *
   * Yalnız görünen sayfayı indirmek yanıltıcı olurdu — operatör "filtrelediğim
   * her şeyi ver" bekliyor, sunucu tarafında üretiliyor.
   */
  async function exportCsv() {
    try {
      const res = await api.callMethodGET(`${M}.export_media_audit`, filterPayload.value);
      const data = res.message || {};
      if (!data.csv) return;
      const blob = new Blob(["﻿" + data.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `medya-denetim-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${data.count} kayıt indirildi`);
    } catch (e) {
      toast.error(e.message || "Dışa aktarılamadı");
    }
  }

  // ── Otomatik yenileme ────────────────────────────────────────────
  const refreshEvery = ref(0);
  let timer = null;

  function setRefresh(seconds) {
    refreshEvery.value = Number(seconds) || 0;
    if (timer) clearInterval(timer);
    timer = null;
    if (!refreshEvery.value) return;
    timer = setInterval(() => {
      // Yükleme sürerken üst üste istek atma.
      if (!loading.value) {
        load();
        loadFacets();
      }
    }, refreshEvery.value * 1000);
  }

  onUnmounted(() => timer && clearInterval(timer));

  return {
    items,
    actions,
    actors,
    targets,
    total,
    page,
    pageSize,
    pageCount,
    loading,
    search,
    action,
    severity,
    decision,
    actor,
    tenant,
    fileUrl,
    days,
    sortBy,
    sortDir,
    facets,
    filterPayload,
    hasActiveFilter,
    refreshEvery,
    load,
    loadAll,
    loadFacets,
    loadActors,
    loadTargets,
    applyFilters,
    applyPreset,
    reset,
    goToPage,
    exportCsv,
    fetchReport,
    setRefresh,
  };
}
