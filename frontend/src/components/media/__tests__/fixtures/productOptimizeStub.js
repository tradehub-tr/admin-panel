import { computed, ref } from "vue";

/**
 * `useProductImageOptimize` yerine geçen render-testi sahtesi
 * (`mediaProductOptimizeCard.test.js`). Kartın SSR tek-geçiş render'ında
 * `globalThis.__productOptimizeState` anlık görüntüsünü doğru basıp basmadığı
 * ölçülür; composable mantığı `useProductImageOptimize.test.js`te.
 */
export function useProductImageOptimize() {
  const s = globalThis.__productOptimizeState;
  if (!s) throw new Error("sahte kurulmadı — globalThis.__productOptimizeState eksik");
  return s;
}

export function makeState({
  run = null,
  live = null,
  lastReal = null,
  rollbackAvailable = false,
  killSwitch = false,
  provaDone = false,
  running = false,
  lastError = "",
  avifSummary = null,
} = {}) {
  return {
    run: ref(run),
    live: ref(live),
    lastReal: ref(lastReal),
    rollbackAvailable: ref(rollbackAvailable),
    killSwitch: ref(killSwitch),
    loading: ref(false),
    actionLoading: ref(false),
    lastError: ref(lastError),
    pollError: ref(""),
    provaKey: ref(provaDone ? run?.job_key : null),
    running: ref(running),
    isDryRun: computed(() => !!run?.dry_run),
    provaDone: ref(provaDone),
    canStart: computed(() => provaDone && !running),
    canRollback: computed(() => rollbackAvailable && !running),
    avifSummary: ref(avifSummary),
    avifError: ref(""),
    loadAvif: async () => {},
    load: async () => {},
    prova: async () => {},
    start: async () => {},
    stop: async () => {},
    rollback: async () => {},
    stopPolling: () => {},
  };
}
