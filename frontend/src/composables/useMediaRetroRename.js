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
    skip_reasons: {},
    expires_at: null,
    message: "",
  };
}

export function useMediaRetroRename(fetchers = varsayilanUclar, { pollMs = 3000 } = {}) {
  const uc = { ...varsayilanUclar, ...fetchers };
  const pendingCount = ref(null);
  const plan = ref(null);
  const planLoading = ref(false);
  const planError = ref("");
  const lastError = ref("");
  const history = ref([]);
  const job = reactive(bosIs());
  let timer = null;

  const running = computed(() => !!job.key && job.state === "running");
  const canRollback = computed(() => history.value.length > 0 && !running.value);

  async function loadCount() {
    try {
      const d = await uc.count();
      pendingCount.value = d.total ?? 0;
    } catch (e) {
      console.warn("retro-rename count failed:", e?.message || e);
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
    try {
      const d = await uc.history();
      history.value = d.jobs || [];
    } catch (e) {
      console.warn("retro-rename history failed:", e?.message || e);
    }
    return history.value;
  }

  function resetJob() {
    stopPolling();
    Object.assign(job, bosIs());
  }

  function stopPolling() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function startPolling(jobKey) {
    stopPolling();
    // Bu job_key'e özel durum — her `start`/`rollback` çağrısı sıfırdan başlar.
    let sawKnownState = false;
    let notFoundStreak = 0;
    timer = setInterval(async () => {
      try {
        const d = await uc.status({ job_key: jobKey });
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
        console.warn("retro-rename polling failed:", e?.message || e);
      }
    }, pollMs);
  }

  async function start({ dryRun = false, batchSize = 200 } = {}) {
    lastError.value = "";
    try {
      const d = await uc.start({ dry_run: dryRun ? 1 : 0, batch_size: batchSize });
      Object.assign(job, bosIs(), { key: d.job_key, mode: "rename", state: "running", dry_run: !!d.dry_run, total: d.total || 0 });
      startPolling(d.job_key);
      return d;
    } catch (e) {
      lastError.value = e?.message || "Başlatılamadı";
      return null;
    }
  }

  async function stop() {
    if (!job.key) return;
    try {
      await uc.stop({ job_key: job.key });
    } catch (e) {
      lastError.value = e?.message || "Durdurulamadı";
    }
  }

  async function rollback(jobKey) {
    lastError.value = "";
    // Çalışan bir yeniden-adlandırma işi varken geri alma başlatılamaz —
    // ikisi aynı anda aynı dosya kümesine dokunur, yarış koşulu yaratır.
    if (running.value) {
      lastError.value = "Çalışan bir iş varken geri alma başlatılamaz.";
      return null;
    }
    try {
      const d = await uc.rollback({ job_key: jobKey });
      Object.assign(job, bosIs(), { key: d.job_key, mode: "rollback", state: "running" });
      startPolling(d.job_key);
      return d;
    } catch (e) {
      lastError.value = e?.message || "Geri alınamadı";
      return null;
    }
  }

  if (getCurrentInstance()) onUnmounted(stopPolling);

  return {
    plan,
    planLoading,
    planError,
    lastError,
    loadPlan,
    pendingCount,
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
