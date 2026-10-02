import { computed, ref } from "vue";

/**
 * `useMediaSquare` yerine geçen render-testi sahtesi (`mediaSquareCard.test.js`).
 *
 * Composable'ın kendi mantığı (polling, terminal durum geçişleri, localStorage
 * kalıcılığı) ileride `composables/__tests__/mediaSquare.test.js` gibi ayrı bir
 * dosyada ölçülebilir; burada tek amaç kartın SSR tek-geçiş render'ında,
 * `globalThis.__mediaSquareState`'e konan durağan bir anlık görüntüyle doğru
 * bölümü basıp basmadığı.
 */
export function useMediaSquare() {
  const s = globalThis.__mediaSquareState;
  if (!s) throw new Error("useMediaSquare sahtesi kurulmadı — globalThis.__mediaSquareState eksik");
  return s;
}

export function bosIs() {
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

export function makeState({
  pendingCount = null,
  lastError = "",
  lastJob = null,
  job,
  running = false,
  countLoading = false,
  countError = "",
  pollError = "",
  actionLoading = false,
} = {}) {
  const jobObj = job ?? bosIs();
  return {
    pendingCount: ref(pendingCount),
    countLoading: ref(countLoading),
    countError: ref(countError),
    lastError: ref(lastError),
    pollError: ref(pollError),
    actionLoading: ref(actionLoading),
    loadCount: async () => {},
    job: jobObj,
    running: ref(running),
    lastJob: ref(lastJob),
    canRollback: computed(() => !!lastJob && !running),
    start: async () => {},
    stop: async () => {},
    rollback: async () => {},
    resetJob: () => {},
  };
}
