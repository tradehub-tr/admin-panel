import { computed, getCurrentInstance, onUnmounted, ref } from "vue";

import api from "@/utils/api";

const M = "tradehub_core.api.media_admin";
export const TERMINAL = new Set(["completed", "partial", "stopped", "error"]);
// "magaza"/"magaza_turev" (2026-09-30): mağaza görselleri — kare değil, oran ve alfa korunur.
export const STEP_ORDER = [
  "on_kontrol",
  "kare",
  "magaza",
  "seo_ad",
  "meta",
  "turev",
  "magaza_turev",
];
/** Geri alma adımları koştukları sırada: önce mağaza, sonra kare (backend `GERI_ALINABILIR` tersi). */
export const ROLLBACK_STEP_ORDER = ["magaza", "kare"];
const POLL_ERROR_LIMIT = 3;
// Backend koşuyu `tabDefaultValue`'da tutuyor (sayfa yenilense de durum gelir);
// burada yalnız izlenen işin anahtarı saklanır — `th:media:square:lastJob` deseni.
export const STORAGE_KEY = "th:media:optimize:lastJob";
// "Başlat" yalnız AYNI oturumda koşulmuş bir Provadan sonra açılır.
export const PROVA_KEY = "th:media:optimize:prova";

/**
 * Ürün görsellerini tek düğmeyle optimize et (2026-09-30).
 *
 * Akış: Prova (`start_product_image_optimize(dry_run=1)`) → özet tablo →
 * Başlat (aynı oturumdaki provanın anahtarıyla, `dry_run=0`) → canlı ilerleme →
 * isteğe bağlı Durdur / Geri al. Durum ucu anahtar verilmezse son koşuyu
 * döndürür; kart açılışta oradan devam eder.
 *
 * `fetchers` yalnız test içindir.
 */
const varsayilanUclar = {
  status: (args) =>
    api.callMethodGET(`${M}.get_product_image_optimize_status`, args).then((r) => r.message || {}),
  start: (args) =>
    api.callMethod(`${M}.start_product_image_optimize`, args).then((r) => r.message || {}),
  stop: (args) =>
    api.callMethod(`${M}.stop_product_image_optimize`, args).then((r) => r.message || {}),
  rollback: (args) =>
    api.callMethod(`${M}.rollback_product_image_optimize`, args).then((r) => r.message || {}),
  // Eski AVIF temizliği Başlat'a dahil DEĞİL; kart yalnız özetini gösterip ekrana bağlar.
  avif: () =>
    api
      .callMethodGET("tradehub_core.api.media_orphans.orphan_avif_overview", { page_size: 1 })
      .then((r) => r.message || {}),
};

function oku(depo, anahtar) {
  try {
    return depo?.getItem(anahtar) || null;
  } catch {
    return null;
  }
}

function yaz(depo, anahtar, deger) {
  try {
    if (deger) depo?.setItem(anahtar, deger);
    else depo?.removeItem(anahtar);
  } catch {
    // Depolama kapalı (gizli sekme vb.) — kart backend'in son koşusuyla yine çalışır.
  }
}

const yerel = () => (typeof localStorage === "undefined" ? null : localStorage);
const oturum = () => (typeof sessionStorage === "undefined" ? null : sessionStorage);

export function useProductImageOptimize(fetchers = varsayilanUclar, { pollMs = 2000 } = {}) {
  const uc = { ...varsayilanUclar, ...fetchers };
  const run = ref(null);
  const live = ref(null);
  const lastReal = ref(null);
  const rollbackAvailable = ref(false);
  const killSwitch = ref(false);
  const loading = ref(false);
  const actionLoading = ref(false);
  const lastError = ref("");
  const pollError = ref("");
  const provaKey = ref(oku(oturum(), PROVA_KEY));
  const avifSummary = ref(null);
  const avifError = ref("");
  let timer = null;
  let generation = 0;

  const running = computed(() => !!run.value && !TERMINAL.has(run.value.state));
  const isDryRun = computed(() => !!run.value?.dry_run);
  const provaDone = computed(() => {
    const r = run.value;
    return (
      !!provaKey.value &&
      !!r &&
      r.job_key === provaKey.value &&
      r.dry_run &&
      (r.state === "completed" || r.state === "partial")
    );
  });
  const canStart = computed(() => provaDone.value && !running.value && !actionLoading.value);
  const canRollback = computed(
    () => rollbackAvailable.value && !running.value && !actionLoading.value
  );

  function uygula(d) {
    if (d.run !== undefined) run.value = d.run || null;
    live.value = d.live || null;
    lastReal.value = d.last_real || null;
    rollbackAvailable.value = !!d.rollback_available;
    killSwitch.value = !!d.kill_switch;
  }

  function stopPolling() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function startPolling(jobKey) {
    stopPolling();
    const g = ++generation;
    let hatalar = 0;
    let ucusta = false;
    timer = setInterval(async () => {
      if (ucusta || g !== generation) return;
      ucusta = true;
      try {
        const d = await uc.status({ job_key: jobKey });
        if (g !== generation) return;
        hatalar = 0;
        pollError.value = "";
        uygula(d);
        if (!run.value || TERMINAL.has(run.value.state)) stopPolling();
      } catch (e) {
        if (g !== generation) return;
        hatalar += 1;
        pollError.value = e?.message || "İş durumu alınamadı";
        if (hatalar >= POLL_ERROR_LIMIT) stopPolling();
      } finally {
        ucusta = false;
      }
    }, pollMs);
  }

  async function load() {
    loading.value = true;
    lastError.value = "";
    try {
      const d = await uc.status({ job_key: oku(yerel(), STORAGE_KEY) || "" });
      // Kayıtlı anahtar artık listede yoksa son koşuya düş.
      const son = d.run ? d : await uc.status({ job_key: "" });
      uygula(son);
      if (running.value) startPolling(run.value.job_key);
    } catch (e) {
      lastError.value = e?.message || "Durum yüklenemedi";
    } finally {
      loading.value = false;
    }
  }

  async function baslat(dryRun) {
    if (running.value || actionLoading.value) return null;
    lastError.value = "";
    pollError.value = "";
    actionLoading.value = true;
    try {
      const args = { dry_run: dryRun ? 1 : 0 };
      if (!dryRun) args.prova_key = provaKey.value || "";
      const d = await uc.start(args);
      run.value = {
        job_key: d.job_key,
        dry_run: !!d.dry_run,
        mode: "optimize",
        state: "queued",
        steps: STEP_ORDER.map((key) => ({ key, state: "pending" })),
      };
      live.value = null;
      yaz(yerel(), STORAGE_KEY, d.job_key);
      if (dryRun) {
        provaKey.value = d.job_key;
        yaz(oturum(), PROVA_KEY, d.job_key);
      } else {
        // Prova tüketildi: sonraki gerçek koşu yeni bir prova ister.
        provaKey.value = null;
        yaz(oturum(), PROVA_KEY, null);
      }
      startPolling(d.job_key);
      return d;
    } catch (e) {
      lastError.value = e?.message || "Başlatılamadı";
      return null;
    } finally {
      actionLoading.value = false;
    }
  }

  async function loadAvif() {
    avifError.value = "";
    try {
      avifSummary.value = await uc.avif();
    } catch (e) {
      avifError.value = e?.message || "Özet alınamadı";
    }
    return avifSummary.value;
  }

  const prova = () => baslat(true);
  const start = () => (canStart.value ? baslat(false) : Promise.resolve(null));

  async function stop() {
    if (!running.value || actionLoading.value) return null;
    actionLoading.value = true;
    try {
      return await uc.stop({ job_key: run.value.job_key });
    } catch (e) {
      lastError.value = e?.message || "Durdurulamadı";
      return null;
    } finally {
      actionLoading.value = false;
    }
  }

  async function rollback() {
    if (!canRollback.value || !lastReal.value) return null;
    lastError.value = "";
    actionLoading.value = true;
    try {
      const d = await uc.rollback({ job_key: lastReal.value.job_key });
      run.value = {
        job_key: d.job_key,
        mode: "rollback",
        dry_run: false,
        state: "queued",
        source_job_key: d.source_job_key,
        steps: ROLLBACK_STEP_ORDER.map((key) => ({ key, state: "pending" })),
      };
      rollbackAvailable.value = false;
      yaz(yerel(), STORAGE_KEY, d.job_key);
      startPolling(d.job_key);
      return d;
    } catch (e) {
      lastError.value = e?.message || "Geri alınamadı";
      return null;
    } finally {
      actionLoading.value = false;
    }
  }

  if (getCurrentInstance()) onUnmounted(stopPolling);

  return {
    run,
    live,
    lastReal,
    rollbackAvailable,
    killSwitch,
    loading,
    actionLoading,
    lastError,
    pollError,
    provaKey,
    running,
    isDryRun,
    provaDone,
    canStart,
    canRollback,
    avifSummary,
    avifError,
    loadAvif,
    load,
    prova,
    start,
    stop,
    rollback,
    stopPolling,
  };
}
