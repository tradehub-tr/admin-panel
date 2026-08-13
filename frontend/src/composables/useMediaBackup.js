import { computed, ref } from "vue";

import { useToast } from "@/composables/useToast";
import api from "@/utils/api";

const M = "tradehub_core.api.media_admin";

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
  };
}
