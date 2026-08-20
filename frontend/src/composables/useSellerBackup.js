/**
 * Satıcının kendi medya yedeği (TUR-131).
 *
 * Yönetimdeki `useMediaBackup` ile aynı ekranı çizmez: orası platform çapında
 * çalışır (tüm mağazalar, veritabanı yapı künyesi, budama), burası yalnız
 * oturumdaki mağazanın kapsamında. Mağaza kimliği İSTEMCİDEN GÖNDERİLMEZ —
 * arka taraf oturumdan çözer; göndermek, kodu değiştirip başkasının yedeğine
 * bakma kapısı açardı.
 */
import { ref, reactive, computed, onUnmounted } from "vue";

import api from "@/utils/api";
import { useToast } from "@/composables/useToast";

const M = "tradehub_core.api.seller_media";

// Paket hazırlanırken yoklama aralığı. Yedek küçükse birkaç saniyede biter;
// 2 sn hem hızlı görünür hem sunucuyu yormaz.
const POLL_MS = 2000;

export function useSellerBackup() {
  const toast = useToast();

  const loading = ref(false);
  const busy = ref(false);
  const sets = ref([]);
  const selected = ref("");
  const usage = reactive({ bytes: 0, blobs: 0, sets: 0, max_sets: 5 });

  const verifyResult = ref(null);
  const plan = ref(null);
  const exportState = reactive({ state: "", file_name: null, bytes: 0, done: 0, total: 0 });

  let pollTimer = null;

  const selectedSet = computed(() => sets.value.find((s) => s.set_id === selected.value) || null);

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  async function load() {
    loading.value = true;
    try {
      const res = (await api.callMethodGET(`${M}.list_backups`))?.message || {};
      sets.value = res.sets || [];
      Object.assign(usage, res.usage || {});
      // Seçili yedek silinmiş olabilir; listedeki ilkine düş.
      if (!sets.value.some((s) => s.set_id === selected.value)) {
        selected.value = sets.value[0]?.set_id || "";
        verifyResult.value = null;
        plan.value = null;
      }
      if (selected.value) await refreshExport();
    } catch (e) {
      toast.error(e.message || "Yedek listesi alınamadı");
    } finally {
      loading.value = false;
    }
  }

  async function create(label = "") {
    busy.value = true;
    try {
      const r = (await api.callMethod(`${M}.create_backup`, { label }))?.message || {};
      toast.success(`Yedek alındı: ${r.file_count || 0} dosya`);
      selected.value = r.set_id || "";
      await load();
      return r;
    } catch (e) {
      // Hız sınırı ve kota reddi de buradan geçiyor; mesaj arka taraftan geliyor.
      toast.error(e.message || "Yedek alınamadı");
      return null;
    } finally {
      busy.value = false;
    }
  }

  async function verify(deep = false) {
    if (!selected.value) return;
    busy.value = true;
    try {
      verifyResult.value =
        (await api.callMethodGET(`${M}.verify_backup`, {
          set_id: selected.value,
          deep: deep ? 1 : 0,
        }))?.message || null;
    } catch (e) {
      toast.error(e.message || "Doğrulama yapılamadı");
    } finally {
      busy.value = false;
    }
  }

  /** Ne olacağını göster — hiçbir şeye dokunmaz. */
  async function loadPlan() {
    if (!selected.value) return;
    busy.value = true;
    try {
      plan.value =
        (await api.callMethodGET(`${M}.plan_backup_restore`, { set_id: selected.value }))
          ?.message || null;
    } catch (e) {
      toast.error(e.message || "Plan alınamadı");
    } finally {
      busy.value = false;
    }
  }

  /**
   * Geri yüklemeyi uygula.
   *
   * `overwrite` varsayılan KAPALI ve ekranda ayrı bir onay istiyor: içeriği
   * değişmiş dosyanın üzerine yazmak sessiz bir gerileme olur.
   */
  async function applyRestore({ withFiles = true, withRecords = true, overwrite = false } = {}) {
    if (!selected.value) return null;
    busy.value = true;
    try {
      const r =
        (await api.callMethod(`${M}.apply_backup_restore`, {
          set_id: selected.value,
          with_files: withFiles ? 1 : 0,
          with_records: withRecords ? 1 : 0,
          overwrite: overwrite ? 1 : 0,
        }))?.message || {};
      toast.success(
        `Geri yükleme bitti: ${r.files_written || 0} dosya, ${r.records_created || 0} kayıt`
      );
      await loadPlan();
      return r;
    } catch (e) {
      toast.error(e.message || "Geri yükleme yapılamadı");
      return null;
    } finally {
      busy.value = false;
    }
  }

  async function remove(setId) {
    busy.value = true;
    try {
      await api.callMethod(`${M}.delete_backup`, { set_id: setId });
      toast.success("Yedek silindi");
      await load();
    } catch (e) {
      // "Son yedek silinemez" de buradan geçiyor.
      toast.error(e.message || "Yedek silinemedi");
    } finally {
      busy.value = false;
    }
  }

  // --- indirilebilir paket ---

  async function refreshExport() {
    if (!selected.value) return;
    try {
      const d =
        (await api.callMethodGET(`${M}.backup_export_status`, { set_id: selected.value }))
          ?.message || {};
      Object.assign(exportState, {
        state: d.state || "",
        file_name: d.file_name || null,
        bytes: d.bytes || 0,
        done: d.done || 0,
        total: d.total || 0,
      });
      // Hazırlanıyor değilse yoklamayı sürdürmenin anlamı yok.
      if (exportState.state !== "hazirlaniyor") stopPolling();
    } catch {
      stopPolling();
    }
  }

  async function startExport() {
    if (!selected.value) return;
    busy.value = true;
    try {
      await api.callMethod(`${M}.start_backup_export`, { set_id: selected.value });
      exportState.state = "hazirlaniyor";
      stopPolling();
      pollTimer = setInterval(refreshExport, POLL_MS);
      toast.success("Paket hazırlanıyor");
    } catch (e) {
      toast.error(e.message || "Paket hazırlanamadı");
    } finally {
      busy.value = false;
    }
  }

  /**
   * Paketi indir.
   *
   * Fetch ile blob'a almıyoruz: paket yüzlerce MB olabilir, belleğe koymak
   * sekmeyi kilitler. Tarayıcının kendi indirme akışına bırakılıyor.
   */
  function downloadUrl() {
    if (!selected.value) return "";
    const q = new URLSearchParams({ set_id: selected.value });
    return `/api/method/${M}.download_backup_export?${q.toString()}`;
  }

  async function discardExport() {
    if (!selected.value) return;
    try {
      await api.callMethod(`${M}.discard_backup_export`, { set_id: selected.value });
      Object.assign(exportState, { state: "", file_name: null, bytes: 0 });
      toast.success("Paket sunucudan kaldırıldı");
    } catch (e) {
      toast.error(e.message || "Paket kaldırılamadı");
    }
  }

  async function select(setId) {
    selected.value = setId;
    verifyResult.value = null;
    plan.value = null;
    stopPolling();
    await refreshExport();
  }

  onUnmounted(stopPolling);

  return {
    loading,
    busy,
    sets,
    selected,
    selectedSet,
    usage,
    verifyResult,
    plan,
    exportState,
    load,
    create,
    verify,
    loadPlan,
    applyRestore,
    remove,
    select,
    startExport,
    refreshExport,
    discardExport,
    downloadUrl,
  };
}
