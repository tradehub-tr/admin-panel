import { computed, onScopeDispose, ref } from "vue";

import { useToast } from "@/composables/useToast";
import api from "@/utils/api";

const M = "tradehub_core.api.media_admin";

/** Paket hazırlanırken durumun kaç ms'de bir sorulacağı. */
const EXPORT_POLL_MS = 2000;

/**
 * Medya yedekleme ve geri yükleme (TUR-131).
 *
 * Ekranın taşıdığı asıl sorumluluk şu: geri yükleme YIKICI RİSK taşıyor —
 * yanlış çalışırsa bugünkü veriyi dünkiyle ezer. Bu yüzden akış tek tıkla
 * çalışmıyor:
 *
 *   1. Yedek seç  →  2. Plan al (hiçbir şeye dokunmaz)  →  3. Uygula
 *
 * "Üzerine yaz" ayrı bir onay: içeriği değişmiş dosyaya varsayılan olarak
 * dokunulmuyor. Dosya optimize edilmiş olabilir; yedekteki eski hâlini geri
 * yazmak sessiz bir gerileme demek.
 */
export function useMediaBackup() {
  const toast = useToast();

  const sets = ref([]);
  const usage = ref({ bytes: 0, files: 0, sets: 0 });
  const keep = ref(0);
  const loading = ref(false);

  const selected = ref("");
  const plan = ref(null);
  const verifyResult = ref(null);
  const busy = ref("");

  /** Seçili yedeğin künyesi. */
  const selectedSet = computed(() => sets.value.find((s) => s.set_id === selected.value) || null);

  /** Planda dokunulacak bir şey var mı — "Uygula" düğmesi buna bakar. */
  const hasWork = computed(
    () => Boolean(plan.value) && (plan.value.missing_file_count || plan.value.missing_record_count)
  );

  async function load() {
    loading.value = true;
    try {
      const res = (await api.callMethodGET(`${M}.list_media_backups`))?.message || {};
      sets.value = res.sets || [];
      usage.value = res.usage || { bytes: 0, files: 0, sets: 0 };
      keep.value = res.keep || 0;
      if (!selected.value && sets.value.length) selected.value = sets.value[0].set_id;
    } catch (e) {
      toast.error(e.message || "Yedek listesi alınamadı");
    } finally {
      loading.value = false;
    }
  }

  async function createBackup() {
    busy.value = "create";
    try {
      const r = (await api.callMethod(`${M}.create_media_backup`))?.message || {};
      toast.success(`Yedek alındı: ${r.file_count} dosya, ${r.record_count} kayıt`);
      await load();
      selected.value = r.set_id || selected.value;
    } catch (e) {
      toast.error(e.message || "Yedek alınamadı");
    } finally {
      busy.value = "";
    }
  }

  /**
   * Yedek geri yüklenebilir mi.
   *
   * `deep` havuzdaki içeriğin imzasını yeniden hesaplar — sessiz disk
   * bozulmasını ancak bu yakalar, karşılığında yavaş.
   */
  async function verify(deep = false) {
    if (!selected.value) return;
    busy.value = deep ? "verifyDeep" : "verify";
    verifyResult.value = null;
    try {
      verifyResult.value =
        (
          await api.callMethodGET(`${M}.verify_media_backup`, {
            set_id: selected.value,
            deep: deep ? 1 : 0,
          })
        )?.message || null;
    } catch (e) {
      toast.error(e.message || "Doğrulama başarısız");
    } finally {
      busy.value = "";
    }
  }

  /** Ne olacağını göster — hiçbir şeye dokunmaz. */
  async function buildPlan() {
    if (!selected.value) return;
    busy.value = "plan";
    plan.value = null;
    try {
      plan.value =
        (await api.callMethodGET(`${M}.plan_media_restore`, { set_id: selected.value }))?.message ||
        null;
    } catch (e) {
      toast.error(e.message || "Plan alınamadı");
    } finally {
      busy.value = "";
    }
  }

  async function applyRestore({ overwrite = false } = {}) {
    if (!selected.value) return null;
    busy.value = "apply";
    try {
      const r =
        (
          await api.callMethod(`${M}.apply_media_restore`, {
            set_id: selected.value,
            files: 1,
            records: 1,
            overwrite: overwrite ? 1 : 0,
          })
        )?.message || {};
      toast.success(
        `${r.files_written} dosya, ${r.records_created} kayıt geri yüklendi` +
          (r.conflicts_skipped_count ? ` · ${r.conflicts_skipped_count} çatışma atlandı` : "")
      );
      await buildPlan();
      return r;
    } catch (e) {
      toast.error(e.message || "Geri yükleme başarısız");
      return null;
    } finally {
      busy.value = "";
    }
  }

  /** Kaydı olup dosyası kaybolanları en yeni yedekten getir. */
  async function repairMissing() {
    busy.value = "repair";
    try {
      const r =
        (await api.callMethod(`${M}.repair_missing_media`, { set_id: selected.value }))?.message ||
        {};
      toast.success(`${r.restored}/${r.missing} eksik dosya geri getirildi`);
      await buildPlan();
    } catch (e) {
      toast.error(e.message || "Onarım başarısız");
    } finally {
      busy.value = "";
    }
  }

  /**
   * Tek yedeği sil.
   *
   * Havuzdaki içerik hemen silinmiyor: aynı içeriği başka bir yedek de
   * gösteriyor olabilir. Sahipsiz kalanları arka taraf ayıklıyor.
   */
  async function deleteSet(setId) {
    busy.value = `delete:${setId}`;
    try {
      const r = (await api.callMethod(`${M}.delete_media_backup`, { set_id: setId }))?.message || {};
      toast.success(
        `Yedek silindi · ${r.removed_blobs || 0} içerik kaldırıldı, ` +
          `${((r.freed_bytes || 0) / 1024 / 1024).toFixed(0)} MB kazanıldı`
      );
      if (selected.value === setId) {
        selected.value = "";
        plan.value = null;
        verifyResult.value = null;
      }
      await load();
      if (selected.value) buildPlan();
    } catch (e) {
      toast.error(e.message || "Yedek silinemedi");
    } finally {
      busy.value = "";
    }
  }

  // ── Dışa aktarma ────────────────────────────────────────────────────
  //
  // Yedek, koruduğu medyayla aynı diskte duruyor. Paketi indirip başka bir
  // yere koymak, yedeği gerçekten ikinci bir yere taşımanın tek yolu.
  //
  // Paket ~1 GB olabildiği için hazırlık arka planda sürüyor: başlat, durumu
  // sor, hazır olunca indir. Ekranın beklemesi gerekmiyor.

  const exportState = ref(null);
  let pollTimer = null;

  function stopPolling() {
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = null;
  }

  // Sayfa kapanınca soruyu bırak — arkada dönen bir zamanlayıcı, ekran yokken
  // sunucuya sormaya devam ederdi.
  onScopeDispose(stopPolling);

  async function refreshExport({ silent = true } = {}) {
    if (!selected.value) {
      exportState.value = null;
      return;
    }
    try {
      exportState.value =
        (await api.callMethodGET(`${M}.media_backup_export_status`, { set_id: selected.value }))
          ?.message || null;
    } catch (e) {
      exportState.value = null;
      if (!silent) toast.error(e.message || "Paket durumu alınamadı");
      return;
    }

    stopPolling();
    if (exportState.value?.state === "hazirlaniyor" && !exportState.value?.stale) {
      pollTimer = setTimeout(refreshExport, EXPORT_POLL_MS);
    }
  }

  async function startExport() {
    if (!selected.value) return;
    busy.value = "export";
    try {
      exportState.value =
        (await api.callMethod(`${M}.start_media_backup_export`, { set_id: selected.value }))
          ?.message || null;
      toast.success("Paket hazırlanıyor, hazır olunca indirebilirsiniz");
      stopPolling();
      pollTimer = setTimeout(refreshExport, EXPORT_POLL_MS);
    } catch (e) {
      toast.error(e.message || "Paket hazırlanamadı");
    } finally {
      busy.value = "";
    }
  }

  async function discardExport() {
    if (!selected.value) return;
    busy.value = "discardExport";
    try {
      await api.callMethod(`${M}.discard_media_backup_export`, { set_id: selected.value });
      exportState.value = null;
      stopPolling();
      toast.success("Paket sunucudan kaldırıldı");
    } catch (e) {
      toast.error(e.message || "Paket kaldırılamadı");
    } finally {
      busy.value = "";
    }
  }

  /**
   * İndirme adresi.
   *
   * Paket dosyası yanıt gövdesiyle taşınmıyor — 1 GB'ı belleğe almak yerine
   * tarayıcı doğrudan uca gidiyor ve sunucu akıtıyor. Bu yüzden `api.request`
   * değil düz bir bağlantı; oturum çerezi zaten gidiyor.
   */
  const exportUrl = computed(() =>
    selected.value
      ? `/api/method/${M}.download_media_backup_export?set_id=${encodeURIComponent(selected.value)}`
      : ""
  );

  /** Hazırlık yüzdesi — bilinmiyorsa 0. */
  const exportProgress = computed(() => {
    const s = exportState.value;
    if (!s?.total) return 0;
    return Math.min(100, Math.round(((s.done || 0) / s.total) * 100));
  });

  async function prune() {
    busy.value = "prune";
    try {
      const r = (await api.callMethod(`${M}.prune_media_backups`))?.message || {};
      toast.success(
        `${r.removed_sets?.length || 0} yedek, ${r.removed_blobs} içerik silindi · ` +
          `${((r.freed_bytes || 0) / 1024 / 1024).toFixed(0)} MB kazanıldı`
      );
      await load();
    } catch (e) {
      toast.error(e.message || "Temizlik başarısız");
    } finally {
      busy.value = "";
    }
  }

  return {
    sets,
    usage,
    keep,
    loading,
    selected,
    selectedSet,
    plan,
    verifyResult,
    busy,
    hasWork,
    load,
    createBackup,
    verify,
    buildPlan,
    applyRestore,
    repairMissing,
    deleteSet,
    prune,
    exportState,
    exportUrl,
    exportProgress,
    refreshExport,
    startExport,
    discardExport,
  };
}
