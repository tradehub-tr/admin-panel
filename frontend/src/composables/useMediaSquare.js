import { computed, getCurrentInstance, onUnmounted, reactive, ref } from "vue";

import api from "@/utils/api";

const M = "tradehub_core.api.media_admin";
const TERMINAL = new Set(["completed", "partial", "error", "stopped", "not_found"]);
// Aynı `not_found` toleransı retro-rename'de olduğu gibi: backend işi
// commit sonrası kuyruğa alıyor, ilk pollde Redis anahtarı henüz yazılmamış
// olabilir. Bilinen bir duruma hiç girmeden ardışık bu kadar `not_found`
// görülürse iş gerçekten kayıp sayılır.
const NOT_FOUND_TERMINAL_STREAK = 5;
const POLL_ERROR_LIMIT = 3;
const STORAGE_KEY = "th:media:square:lastJob";

/**
 * Ürün görsellerini kareye çevir (Task 6): ürün görsellerini 1000–2000 px
 * kareye tamamlar, eski adresleri yeni görsele yönlendirir.
 *
 * Akış `useMediaRetroRename`den daha sade: ayrı bir "plan" ucu yok — "Prova"
 * da gerçek koşu da AYNI `start_square` ucundan geçer, yalnız `dry_run`
 * bayrağı farklıdır ve ikisi de aynı iş kuyruğu + polling sözleşmesiyle
 * izlenir. Geri alınabilir iş geçmişi de backend'den gelmiyor (retro-rename
 * aksine `history` ucu yok) — son GERÇEK (dry_run olmayan) işin `job_key`'i
 * ve taşınan dosya sayısı `localStorage`'da (`th:media:square:lastJob`)
 * tutulur; bir rollback işi tamamlanınca bu kayıt tüketilir (silinir).
 *
 * `fetchers` yalnız test içindir; üretimde uçlar `media_admin.*`.
 */
const varsayilanUclar = {
  count: () => api.callMethodGET(`${M}.square_count`).then((r) => r.message || {}),
  start: (args) => api.callMethod(`${M}.start_square`, args).then((r) => r.message || {}),
  status: (args) => api.callMethodGET(`${M}.get_square_status`, args).then((r) => r.message || {}),
  stop: (args) => api.callMethod(`${M}.stop_square`, args).then((r) => r.message || {}),
  rollback: (args) => api.callMethod(`${M}.rollback_square`, args).then((r) => r.message || {}),
};

function bosIs() {
  return {
    key: null,
    mode: "kare",
    state: null,
    dry_run: false,
    total: 0,
    processed: 0,
    renamed: 0,
    skipped: 0,
    errors: 0,
    reasons: {},
    message: "",
  };
}

function readLastJob() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLastJob(value) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage kullanılamıyor (gizli sekme, kota vb.) — sessizce yok say.
  }
}

export function useMediaSquare(fetchers = varsayilanUclar, { pollMs = 2000 } = {}) {
  const uc = { ...varsayilanUclar, ...fetchers };
  const pendingCount = ref(null);
  const countLoading = ref(false);
  const countError = ref("");
  const lastError = ref("");
  const pollError = ref("");
  const actionLoading = ref(false);
  const job = reactive(bosIs());
  const lastJob = ref(readLastJob());
  let timer = null;
  let pollGeneration = 0;
  let countGeneration = 0;
  let startInFlight = false;
  let stopInFlight = false;
  let rollbackInFlight = false;

  const running = computed(() => !!job.key && job.state === "running");
  // Çalışan iş varken geri alma başlatılamaz (backend de aynı kilidi koyuyor).
  const canRollback = computed(() => !!lastJob.value && !running.value);

  async function loadCount() {
    const generation = ++countGeneration;
    countLoading.value = true;
    countError.value = "";
    try {
      const d = await uc.count();
      if (generation !== countGeneration) return pendingCount.value;
      pendingCount.value = d.total ?? 0;
    } catch (e) {
      if (generation === countGeneration) countError.value = e?.message || "Sayaç yüklenemedi";
      console.warn("square count failed:", e?.message || e);
    } finally {
      if (generation === countGeneration) countLoading.value = false;
    }
    return pendingCount.value;
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
          if (!sawKnownState && notFoundStreak < NOT_FOUND_TERMINAL_STREAK) return;
          stopPolling();
          Object.assign(job, {
            state: "not_found",
            message: d.message || "İş kuyruğa alınamadı ya da süresi doldu",
          });
          await loadCount();
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
          // Backend gerçek koşuda `skip_reasons` gönderiyor (`reasons` yalnız
          // önceki bir sözleşme taslağıydı) — ikisini de kabul et.
          reasons: d.skip_reasons || d.reasons || {},
          message: d.message || "",
        });
        if (TERMINAL.has(state)) {
          stopPolling();
          // Gerçek (dry-run olmayan) bir dönüştürme işi biterse geri
          // alınabilir son iş olarak saklanır; bir rollback işi biterse
          // kaynak kayıt tüketilmiş sayılır (tekrar geri alınamaz).
          // Backend dönüştürme işini "kare" modu olarak raporluyor.
          if (job.mode === "kare" && !job.dry_run) {
            lastJob.value = { jobKey, renamed: job.renamed };
            writeLastJob(lastJob.value);
          } else if (job.mode === "rollback") {
            lastJob.value = null;
            writeLastJob(null);
          }
          // `square_count` tüm ilanları tarıyor — yalnız iş bittiğinde tazelenir.
          await loadCount();
        }
      } catch (e) {
        if (generation !== pollGeneration) return;
        pollErrors += 1;
        pollError.value = e?.message || "İş durumu alınamadı";
        if (pollErrors >= POLL_ERROR_LIMIT) {
          stopPolling();
          Object.assign(job, { state: "error", message: pollError.value });
        }
        console.warn("square polling failed:", e?.message || e);
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
      Object.assign(job, bosIs(), {
        key: d.job_key,
        mode: "kare",
        state: "running",
        dry_run: !!d.dry_run,
        total: d.total || 0,
      });
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

  async function rollback() {
    lastError.value = "";
    // Çalışan bir dönüştürme/rollback işi varken yeni bir geri alma
    // başlatılamaz — ikisi aynı dosya kümesine dokunur, yarış koşulu yaratır.
    if (!lastJob.value || running.value || startInFlight || rollbackInFlight) {
      lastError.value = "Çalışan bir iş varken geri alma başlatılamaz.";
      return null;
    }
    rollbackInFlight = true;
    actionLoading.value = true;
    pollError.value = "";
    try {
      const d = await uc.rollback({ job_key: lastJob.value.jobKey });
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
    pendingCount,
    countLoading,
    countError,
    lastError,
    pollError,
    actionLoading,
    loadCount,
    job,
    running,
    lastJob,
    canRollback,
    start,
    stop,
    rollback,
    resetJob,
  };
}
