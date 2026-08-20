import { onUnmounted, reactive, ref } from "vue";

import { useToast } from "@/composables/useToast";
import api from "@/utils/api";

const POLL_INTERVAL_MS = 3000;
const TERMINAL_STATES = new Set(["completed", "partial", "error", "not_found"]);

const M = "tradehub_core.api.media_admin";

/**
 * Medya envanteri + optimizasyon state'i.
 *
 * Backend `tabFile`'ı canlı okur; ayrı bir Media DocType yok. Liste `file_url`
 * bazında tekilleştirilmiş gelir (aynı fiziksel dosyaya 39 File kaydına kadar
 * işaret edebiliyor), bu yüzden `record_count` bir satırda kaç kayıt olduğunu
 * gösterir.
 *
 * İş kuyrukta çalışır: `start` bir `job_key` döner, ilerleme 3 sn'de bir Redis'ten
 * okunur. Senkron çalıştırma yok.
 */
export function useMediaOptimize() {
  const toast = useToast();

  const items = ref([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(50);
  const search = ref("");
  const state = ref(""); // "" | pending | optimized
  const sortBy = ref("size");
  const sortDir = ref("desc");
  const onlyOptimizable = ref(false);
  const minBytes = ref(0);
  const usage = ref(""); // "" | multi_use | repeat
  const usageState = ref(""); // "" | in_use | order_only | history_only | unused
  const loading = ref(false);

  const summary = reactive({
    count: 0,
    total_bytes: 0,
    optimized_count: 0,
    saved_bytes: 0,
    archive_bytes: 0,
    retention_days: 30,
    trash_bytes: 0,
    trash_days: 30,
  });

  const job = reactive({
    key: null,
    state: null,
    mode: "optimize", // optimize | restore
    dry_run: false,
    total: 0,
    processed: 0,
    optimized: 0,
    skipped: 0,
    errors: 0,
    original_bytes: 0,
    new_bytes: 0,
    skip_reasons: {},
  });

  let pollTimer = null;

  async function load() {
    loading.value = true;
    try {
      const res = await api.callMethodGET(`${M}.get_image_inventory`, {
        page: page.value,
        page_size: pageSize.value,
        search: search.value,
        state: state.value,
        sort_by: sortBy.value,
        sort_dir: sortDir.value,
        only_optimizable: onlyOptimizable.value ? 1 : 0,
        min_bytes: minBytes.value,
        usage: usage.value,
        usage_state: usageState.value,
      });
      const data = res.message || {};
      items.value = data.items || [];
      total.value = data.total || 0;
      Object.assign(summary, data.summary || {}, {
        archive_bytes: data.archive_bytes || 0,
        retention_days: data.retention_days || 30,
        trash_bytes: data.trash_bytes || 0,
        trash_days: data.trash_days || 30,
      });
    } catch (e) {
      toast.error(e.message || "Medya listesi yüklenemedi");
    } finally {
      loading.value = false;
    }
  }


  function resetJob() {
    Object.assign(job, {
      key: null,
      state: null,
      mode: "optimize",
      dry_run: false,
      total: 0,
      processed: 0,
      optimized: 0,
      skipped: 0,
      errors: 0,
      original_bytes: 0,
      new_bytes: 0,
      skip_reasons: {},
    });
  }

  /**
   * @param {object} opts
   * @param {string[]} [opts.fileNames] seçili dosyalar
   * @param {"selected"|"pending"} [opts.scope]
   * @param {number} [opts.limit] scope="pending" iken ilk N dosya (pilot)
   * @param {boolean} [opts.dryRun] diske yazmadan tahmin
   */
  async function start({ fileNames = [], scope = "selected", limit = 0, dryRun = false } = {}) {
    resetJob();
    try {
      const res = await api.callMethod(`${M}.start_image_optimization`, {
        file_names: JSON.stringify(fileNames),
        scope,
        limit,
        // preset gönderilmiyor: backend DEFAULT_PRESET (2000px/q88) uygular.
        dry_run: dryRun ? 1 : 0,
        // scope="pending" ekrandaki filtreyle AYNI kümeye uygulanmalı; aksi
        // hâlde 209 satır görüp 2.826 dosyalık iş başlatılır.
        search: search.value,
        only_optimizable: onlyOptimizable.value ? 1 : 0,
        min_bytes: minBytes.value,
      });
      const data = res.message || {};
      job.key = data.job_key;
      job.state = "running";
      job.dry_run = !!data.dry_run;
      job.total = data.count || 0;
      toast.success(dryRun ? "Tahmin başlatıldı" : "Optimizasyon başlatıldı");
      startPolling(data.job_key);
      return data;
    } catch (e) {
      toast.error(e.message || "Başlatılamadı");
      return null;
    }
  }

  function startPolling(jobKey) {
    stopPolling();
    if (!jobKey) return;
    pollTimer = setInterval(async () => {
      try {
        const res = await api.callMethodGET(`${M}.get_optimization_status`, { job_key: jobKey });
        const d = res.message || {};
        Object.assign(job, {
          state: d.state || "running",
          dry_run: !!d.dry_run,
          total: d.total || 0,
          processed: d.processed || 0,
          optimized: d.optimized || 0,
          skipped: d.skipped || 0,
          errors: d.errors || 0,
          original_bytes: d.original_bytes || 0,
          new_bytes: d.new_bytes || 0,
          skip_reasons: d.skip_reasons || {},
        });
        if (TERMINAL_STATES.has(d.state)) {
          stopPolling();
          if (!job.dry_run) load();
        }
      } catch (e) {
        // Geçici polling hatası — toast ile gürültü yapma, sonraki tick tekrar dener.
        console.warn("Media optimize polling failed:", e?.message || e);
      }
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  /**
   * Seçili dosyaları çöpe taşı — 30 gün sonra kalıcı silinir.
   *
   * `sharedOk`, `force`tan AYRI bir onay (TUR-298): `force` "kendi sitemdeki
   * görseller kırılacak", `sharedOk` "başka satıcıların dosyası da gidecek"
   * demek. Birini onaylamak diğerini onaylamış saymaz.
   */
  async function trashFiles(fileUrls, force = false, sharedOk = false) {
    try {
      const res = await api.callMethod(`${M}.trash_files`, {
        file_urls: JSON.stringify(fileUrls),
        force: force ? 1 : 0,
        shared_ok: sharedOk ? 1 : 0,
      });
      const d = res.message || {};
      if (d.failed?.length) {
        toast.error(`${d.moved} taşındı, ${d.failed.length} reddedildi: ${d.failed[0].error}`);
      } else {
        toast.success(`${d.moved} dosya çöpe taşındı`);
      }
      await load();
      return d;
    } catch (e) {
      toast.error(e.message || "Çöpe taşınamadı");
      return null;
    }
  }

  /** Çöpten geri al. */
  async function restoreFromTrash(fileUrls) {
    try {
      const res = await api.callMethod(`${M}.restore_from_trash`, {
        file_urls: JSON.stringify(fileUrls),
      });
      toast.success(`${res.message?.restored || 0} dosya geri alındı`);
      await load();
      return res.message;
    } catch (e) {
      toast.error(e.message || "Geri alınamadı");
      return null;
    }
  }

  /** Çöpteki SEÇİLİ dosyaları kalıcı sil (System Manager). */
  async function deleteTrashed(fileUrls, sharedOk = false) {
    try {
      const res = await api.callMethod(`${M}.delete_trashed`, {
        file_urls: JSON.stringify(fileUrls),
        shared_ok: sharedOk ? 1 : 0,
      });
      const d = res.message || {};
      if (d.failed?.length) toast.error(`${d.deleted} silindi, ${d.failed.length} hata`);
      else toast.success(`${d.deleted} dosya kalıcı silindi`);
      await load();
      return d;
    } catch (e) {
      toast.error(e.message || "Silinemedi");
      return null;
    }
  }

  /** Çöptekilerin TAMAMINI kalıcı sil (System Manager). */
  async function purgeTrash(days = 0) {
    try {
      const res = await api.callMethod(`${M}.purge_trash`, { older_than_days: days });
      const d = res.message || {};
      toast.success(`${d.deleted || 0} dosya kalıcı silindi`);
      await load();
      return d;
    } catch (e) {
      toast.error(e.message || "Çöp temizlenemedi");
      return null;
    }
  }

  /** Seçimin kullanım kırılımı — onay uyarısını buna göre kur. */
  async function previewTrash(fileUrls) {
    try {
      const res = await api.callMethodGET(`${M}.preview_trash`, {
        file_urls: JSON.stringify(fileUrls),
      });
      return res.message || null;
    } catch {
      return null;
    }
  }

  /** Tek dosyanın tam kullanım dökümü — detay penceresi için. */
  async function fetchUsage(fileUrl) {
    try {
      const res = await api.callMethodGET(`${M}.get_file_usage`, { file_url: fileUrl });
      return res.message || null;
    } catch (e) {
      toast.error(e.message || "Kullanım bilgisi alınamadı");
      return null;
    }
  }

  /** Ters arama — bir kaydın kullandığı tüm medya (TUR-136). */
  async function fetchRecordMedia({ doctype, name }) {
    try {
      const res = await api.callMethodGET(`${M}.get_record_media`, { doctype, name });
      return res.message || null;
    } catch (e) {
      toast.error(e.message || "Kayıt medyası alınamadı");
      return null;
    }
  }

  /** Toplu geri alma — optimizasyonla aynı kuyruk ve ilerleme çubuğu. */
  async function startRestore({ fileNames = [], scope = "selected" } = {}) {
    resetJob();
    try {
      const res = await api.callMethod(`${M}.start_restore`, {
        file_names: JSON.stringify(fileNames),
        scope,
        search: search.value,
        min_bytes: minBytes.value,
      });
      const data = res.message || {};
      job.key = data.job_key;
      job.state = "running";
      job.mode = "restore";
      job.total = data.count || 0;
      toast.success("Geri alma başlatıldı");
      startPolling(data.job_key);
      return data;
    } catch (e) {
      toast.error(e.message || "Geri alma başlatılamadı");
      return null;
    }
  }

  /**
   * Arşivi temizle — kazanılan alanı kalıcı yapar, geri alma imkânını bitirir.
   * @param {number} days -1 = varsayılan saklama süresi, 0 = tamamı
   */
  async function purgeArchive(days = 0) {
    try {
      const res = await api.callMethod(`${M}.purge_archive`, { older_than_days: days });
      const d = res.message || {};
      toast.success(`${d.deleted || 0} dosya silindi`);
      await load();
      return d;
    } catch (e) {
      toast.error(e.message || "Arşiv temizlenemedi");
      return null;
    }
  }

  /** Filtreye uyan kaç dosya geri alınabilir — onay ekranı için. */
  async function restorableCount() {
    try {
      const res = await api.callMethodGET(`${M}.get_restorable_count`, {
        search: search.value,
        min_bytes: minBytes.value,
      });
      return res.message?.count || 0;
    } catch {
      return 0;
    }
  }

  /** Mevcut filtrelerle kaç dosya işlenecek — onay ekranı için. */
  async function pendingCount() {
    try {
      const res = await api.callMethodGET(`${M}.get_pending_count`, {
        search: search.value,
        only_optimizable: onlyOptimizable.value ? 1 : 0,
        min_bytes: minBytes.value,
      });
      return res.message?.count || 0;
    } catch {
      return 0;
    }
  }

  async function restore(fileName) {
    try {
      await api.callMethod(`${M}.restore_image`, { file_name: fileName });
      toast.success("Orijinal geri yüklendi");
      await load();
      return true;
    } catch (e) {
      toast.error(e.message || "Geri alınamadı");
      return false;
    }
  }

  /** Başarısız (dead-letter) video işlemesini yeniden kuyruğa koy (TUR-296). */
  async function retryTranscode(fileUrl) {
    try {
      await api.callMethod(`${M}.retry_transcode`, { file_url: fileUrl });
      toast.success("Video yeniden işleme kuyruğuna alındı");
      await load();
      return true;
    } catch (e) {
      toast.error(e.message || "Yeniden denenemedi");
      return false;
    }
  }

  onUnmounted(stopPolling);

  return {
    items,
    total,
    page,
    pageSize,
    search,
    state,
    sortBy,
    sortDir,
    onlyOptimizable,
    minBytes,
    usage,
    usageState,
    loading,
    summary,
    job,
    load,
    start,
    restore,
    retryTranscode,
    pendingCount,
    fetchUsage,
    fetchRecordMedia,
    trashFiles,
    previewTrash,
    restoreFromTrash,
    deleteTrashed,
    purgeTrash,
    startRestore,
    restorableCount,
    purgeArchive,
    stopPolling,
    resetJob,
  };
}
