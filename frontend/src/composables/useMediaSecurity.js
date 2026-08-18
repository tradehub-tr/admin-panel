import { computed, ref } from "vue";

import api from "@/utils/api";

const M = "tradehub_core.api.media_admin";

/**
 * Medya güvenliği (TUR-125) — tarama politikası, karantina ve bekletme.
 *
 * Üç ayrı liste değil iki: karantina bir KARAR ("bu dosya zararlı"), bekletme
 * bir ARA DURUM ("henüz bilmiyoruz"). Aynı tabloda göstermek operatörün olağan
 * bir yüklemeyi zararlı sanmasına yol açardı; bu yüzden ayrı sekmeler.
 */
export function useMediaSecurity() {
  const policy = ref({ enabled: false, fail_closed: false, hold_until_clean: false, scanner: "" });
  const counts = ref({});
  const items = ref([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(50);
  const tab = ref("quarantine"); // quarantine | hold
  const loading = ref(false);
  const acting = ref("");
  const error = ref(null);

  // Tarayıcı yoksa ekran "0 zararlı bulundu" DEĞİL "tarama kapalı" demeli;
  // hiç çalışmayan bir güvenliği çalışıyor gibi sunmanın en kolay yolu budur.
  const scanningOff = computed(() => !policy.value.enabled);
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

  async function loadOverview() {
    const r = await api.callMethodGET(`${M}.scan_overview`);
    policy.value = r.message?.policy || policy.value;
    counts.value = r.message?.counts || {};
  }

  async function loadList() {
    loading.value = true;
    error.value = null;
    try {
      const uc = tab.value === "hold" ? "list_scan_hold" : "list_quarantine";
      const r = await api.callMethodGET(`${M}.${uc}`, {
        page: page.value,
        page_size: pageSize.value,
      });
      items.value = r.message?.items || [];
      total.value = r.message?.total || 0;
    } catch (e) {
      error.value = e.message;
      items.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  }

  async function loadAll() {
    await Promise.all([loadOverview(), loadList()]);
  }

  async function setTab(next) {
    if (tab.value === next) return;
    tab.value = next;
    page.value = 1;
    await loadList();
  }

  async function goPage(n) {
    page.value = Math.min(Math.max(1, n), pageCount.value);
    await loadList();
  }

  /** Ortak eylem sarmalayıcı — her biri listeyi ve sayaçları tazeler. */
  async function _act(method, fileUrl) {
    acting.value = fileUrl;
    try {
      await api.callMethod(`${M}.${method}`, { file_url: fileUrl });
      await loadAll();
      return true;
    } finally {
      acting.value = "";
    }
  }

  const release = (fileUrl) => _act("release_quarantine", fileUrl);
  const retry = (fileUrl) => _act("retry_scan", fileUrl);

  async function sweep() {
    acting.value = "__sweep";
    try {
      const r = await api.callMethod(`${M}.sweep_scans`);
      await loadAll();
      return r.message;
    } finally {
      acting.value = "";
    }
  }

  async function backfill(limit = 500) {
    acting.value = "__backfill";
    try {
      const r = await api.callMethod(`${M}.scan_backfill`, { limit });
      await loadAll();
      return r.message;
    } finally {
      acting.value = "";
    }
  }

  return {
    policy, counts, items, total, page, pageSize, tab, loading, acting, error,
    scanningOff, pageCount,
    loadAll, loadList, loadOverview, setTab, goPage,
    release, retry, sweep, backfill,
  };
}
