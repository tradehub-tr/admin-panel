import { computed, getCurrentInstance, onUnmounted, reactive, ref } from "vue";

import api from "@/utils/api";

const M = "tradehub_core.api.media_admin";
const TERMINAL = new Set(["completed", "partial", "error", "stopped", "not_found"]);
// İlk tik(ler)de `not_found` görülmesi arıza değil olabilir: backend
// `enqueue_after_commit` ile kuyruğa alıyor, Redis progress anahtarı ilk
// pollde henüz yazılmamış olabilir. Bu yüzden `not_found` yalnız (a) daha
// önce başka bir durum görülmüşse (iş biliniyordu, sonra kayboldu) YA DA
// (b) art arda bu kadar `not_found` tikinden sonra terminal sayılır.
const NOT_FOUND_TERMINAL_STREAK = 5;
const POLL_ERROR_LIMIT = 3;

/**
 * Retro-rename (MOGEM-582): eski adlı public dosyaları içerik-adresli ada taşıma.
 *
 * Akış: `loadCount` (kart açılışında ucuz sayaç) → `loadPlan` (salt okunur ~20 sn'lik
 * özet, kullanıcı isteyince) → `start` (kuyruk, job_key) → polling → terminal →
 * `loadHistory` + `loadCount` (rollback görünürlüğü + kalan sayaç tazelenir; `plan`
 * TEKRAR ÇAĞRILMAZ). `rollback` yeni bir iş başlatır ve aynı progress sözleşmesiyle
 * izlenir (`mode: "rollback"`) — ama önce çalışan bir iş VARSA reddedilir (iki iş
 * aynı anda public dosya taşıyamaz).
 *
 * `fetchers` yalnız test içindir; üretimde uçlar `media_admin.*`.
 */
const varsayilanUclar = {
  count: () => api.callMethodGET(`${M}.retro_rename_count`).then((r) => r.message || {}),
  plan: (args) => api.callMethodGET(`${M}.retro_rename_plan`, args).then((r) => r.message || {}),
  start: (args) => api.callMethod(`${M}.start_retro_rename`, args).then((r) => r.message || {}),
  status: (args) => api.callMethodGET(`${M}.get_retro_rename_status`, args).then((r) => r.message || {}),
  stop: (args) => api.callMethod(`${M}.stop_retro_rename`, args).then((r) => r.message || {}),
  rollback: (args) => api.callMethod(`${M}.rollback_retro_rename`, args).then((r) => r.message || {}),
  history: () => api.callMethodGET(`${M}.retro_rename_history`).then((r) => r.message || {}),
};

function bosIs() {
  return {
    key: null,
    mode: "rename",
    state: null,
    dry_run: false,
    total: 0,
    processed: 0,
    renamed: 0,
    skipped: 0,
    errors: 0,
    // Dosya sayısı ≠ referans sayısı: tek blob onlarca Listing/CMS alanında
    // geçebilir. Backend bunları iş boyunca topluyor; operatörün "301'e kaç
    // referans muhtaç kaldı" sorusunu ancak `refs_skipped` cevaplıyor.
    refs_updated: 0,
    refs_skipped: 0,
    skip_reasons: {},
    expires_at: null,
    message: "",
  };
}

export function useMediaRetroRename(fetchers = varsayilanUclar, { pollMs = 3000 } = {}) {
  const uc = { ...varsayilanUclar, ...fetchers };
  const pendingCount = ref(null);
  // `count` ucu bayat satırları ayırıyor: `total` = aday satır, `disk_missing`
  // = `tabFile` eski adresi gösteriyor ama blob diskte yok. İkincisi bu araçla
  // TAŞINAMAZ — ayrılmazsa kart hiç sıfırlanmayan bir "N dosya bekliyor"
  // rozetinde takılı kalıyordu.
  const diskMissingCount = ref(0);
  const renamableCount = ref(0);
  const plan = ref(null);
  const planLoading = ref(false);
  const planError = ref("");
  const lastError = ref("");
  const countLoading = ref(false);
  const countError = ref("");
  const historyLoading = ref(false);
  const historyError = ref("");
  const pollError = ref("");
  const actionLoading = ref(false);
  const history = ref([]);
  const job = reactive(bosIs());
  let timer = null;
  let pollGeneration = 0;
  let countGeneration = 0;
  let historyGeneration = 0;
  let startInFlight = false;
  let stopInFlight = false;
  let rollbackInFlight = false;

  const running = computed(() => !!job.key && job.state === "running");
  const canRollback = computed(() => history.value.length > 0 && !running.value);

  async function loadCount() {
    const generation = ++countGeneration;
    countLoading.value = true;
    countError.value = "";
    try {
      const d = await uc.count();
      if (generation !== countGeneration) return pendingCount.value;
      pendingCount.value = d.total ?? 0;
      diskMissingCount.value = d.disk_missing ?? 0;
      // Eski backend (`{total}`) ile uyum: kırılım yoksa hepsi taşınabilir sayılır.
      renamableCount.value = d.renamable ?? Math.max(0, (d.total ?? 0) - (d.disk_missing ?? 0));
    } catch (e) {
      if (generation === countGeneration) countError.value = e?.message || "Sayaç yüklenemedi";
      console.warn("retro-rename count failed:", e?.message || e);
    } finally {
      if (generation === countGeneration) countLoading.value = false;
    }
    return pendingCount.value;
  }

  async function loadPlan(limit = 200) {
    planLoading.value = true;
    planError.value = "";
    try {
      plan.value = await uc.plan({ limit });
    } catch (e) {
      planError.value = e?.message || "Plan yüklenemedi";
      plan.value = null;
    } finally {
      planLoading.value = false;
    }
    return plan.value;
  }

  async function loadHistory() {
    const generation = ++historyGeneration;
    historyLoading.value = true;
    historyError.value = "";
    try {
      const d = await uc.history();
      if (generation !== historyGeneration) return history.value;
      history.value = d.jobs || [];
    } catch (e) {
      if (generation === historyGeneration) historyError.value = e?.message || "Geçmiş yüklenemedi";
      console.warn("retro-rename history failed:", e?.message || e);
    } finally {
      if (generation === historyGeneration) historyLoading.value = false;
    }
    return history.value;
  }

  function resetJob() {
    pollGeneration += 1;
    stopPolling();
    Object.assign(job, bosIs());
  }

  function stopPolling() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function startPolling(jobKey) {
    stopPolling();
    const generation = ++pollGeneration;
    // Bu job_key'e özel durum — her `start`/`rollback` çağrısı sıfırdan başlar.
    let sawKnownState = false;
    let notFoundStreak = 0;
    let pollErrors = 0;
    let tickInFlight = false;
    timer = setInterval(async () => {
      if (tickInFlight || generation !== pollGeneration) return;
      tickInFlight = true;
      try {
        const d = await uc.status({ job_key: jobKey });
        if (generation !== pollGeneration) return;
        pollErrors = 0;
        pollError.value = "";
        const state = d.state || "running";

        if (state === "not_found") {
          notFoundStreak += 1;
          // Henüz iş hiç bilinen bir duruma girmediyse ve streak eşiğin
          // altındaysa: muhtemelen backend commit sonrası kuyruğa henüz
          // yazmadı — sessizce bir sonraki tiki bekle, job'u KİRLETME.
          if (!sawKnownState && notFoundStreak < NOT_FOUND_TERMINAL_STREAK) return;
          stopPolling();
          Object.assign(job, {
            state: "not_found",
            message: d.message || "İş kuyruğa alınamadı ya da süresi doldu",
          });
          await Promise.all([loadHistory(), loadCount()]);
          return;
        }

        sawKnownState = true;
        notFoundStreak = 0;
        Object.assign(job, {
          state,
          dry_run: !!d.dry_run,
          total: d.total || 0,
          processed: d.processed || 0,
          renamed: d.renamed || 0,
          skipped: d.skipped || 0,
          errors: d.errors || 0,
          refs_updated: d.refs_updated || 0,
          refs_skipped: d.refs_skipped || 0,
          skip_reasons: d.skip_reasons || {},
          expires_at: d.expires_at || null,
          message: d.message || "",
        });
        if (TERMINAL.has(state)) {
          stopPolling();
          // `plan` burada YENİDEN ÇAĞRILMAZ (~20 sn sürebilir) — yalnız
          // history (rollback görünürlüğü) ve ucuz sayaç tazelenir.
          await Promise.all([loadHistory(), loadCount()]);
        }
      } catch (e) {
        if (generation !== pollGeneration) return;
        pollErrors += 1;
        pollError.value = e?.message || "İş durumu alınamadı";
        if (pollErrors >= POLL_ERROR_LIMIT) {
          stopPolling();
          Object.assign(job, {
            state: "error",
            message: pollError.value,
          });
        }
        console.warn("retro-rename polling failed:", e?.message || e);
      } finally {
        tickInFlight = false;
      }
    }, pollMs);
  }

  async function start({ dryRun = false, batchSize = 200 } = {}) {
    if (running.value || startInFlight || rollbackInFlight) {
      lastError.value = "Zaten çalışan bir iş var.";
      return null;
    }
    lastError.value = "";
    pollError.value = "";
    startInFlight = true;
    actionLoading.value = true;
    try {
      const d = await uc.start({ dry_run: dryRun ? 1 : 0, batch_size: batchSize });
      Object.assign(job, bosIs(), { key: d.job_key, mode: "rename", state: "running", dry_run: !!d.dry_run, total: d.total || 0 });
      startPolling(d.job_key);
      return d;
    } catch (e) {
      lastError.value = e?.message || "Başlatılamadı";
      return null;
    } finally {
      startInFlight = false;
      actionLoading.value = false;
    }
  }

  async function stop() {
    if (!job.key || stopInFlight) return null;
    stopInFlight = true;
    actionLoading.value = true;
    try {
      return await uc.stop({ job_key: job.key });
    } catch (e) {
      lastError.value = e?.message || "Durdurulamadı";
      return null;
    } finally {
      stopInFlight = false;
      actionLoading.value = false;
    }
  }

  async function rollback(jobKey) {
    lastError.value = "";
    // Çalışan bir yeniden-adlandırma işi varken geri alma başlatılamaz —
    // ikisi aynı anda aynı dosya kümesine dokunur, yarış koşulu yaratır.
    if (running.value || startInFlight || rollbackInFlight) {
      lastError.value = "Çalışan bir iş varken geri alma başlatılamaz.";
      return null;
    }
    rollbackInFlight = true;
    actionLoading.value = true;
    pollError.value = "";
    try {
      const d = await uc.rollback({ job_key: jobKey });
      Object.assign(job, bosIs(), { key: d.job_key, mode: "rollback", state: "running" });
      startPolling(d.job_key);
      return d;
    } catch (e) {
      lastError.value = e?.message || "Geri alınamadı";
      return null;
    } finally {
      rollbackInFlight = false;
      actionLoading.value = false;
    }
  }

  if (getCurrentInstance()) onUnmounted(stopPolling);

  return {
    plan,
    planLoading,
    planError,
    lastError,
    countLoading,
    countError,
    historyLoading,
    historyError,
    pollError,
    actionLoading,
    loadPlan,
    pendingCount,
    diskMissingCount,
    renamableCount,
    loadCount,
    history,
    loadHistory,
    canRollback,
    job,
    running,
    start,
    stop,
    rollback,
    resetJob,
  };
}
