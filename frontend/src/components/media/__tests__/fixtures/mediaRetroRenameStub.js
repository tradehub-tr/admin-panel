import { computed, ref } from "vue";

/**
 * `useMediaRetroRename` yerine geçen render-testi sahtesi
 * (`mediaRetroRenameCard.test.js`).
 *
 * Composable'ın kendi mantığı (polling, terminal durum geçişleri,
 * `loadCount`/`loadPlan` ayrımı) `composables/__tests__/mediaRetroRename.test.js`'de
 * zaten ölçülüyor. Burada tek amaç: kartın SSR tek-geçiş render'ında,
 * `globalThis.__mediaRetroRenameState`'e konan durağan bir anlık görüntüyle
 * doğru bölümü basıp basmadığı. `previewOpen` kartın kendi local `ref`'i
 * olduğu için (tıklamayla açılıyor) SSR'da tetiklenemez — o kablo
 * `mediaRetroRenameCard.test.js`'de kaynak metin üzerinden doğrulanıyor.
 */
export function useMediaRetroRename() {
  const s = globalThis.__mediaRetroRenameState;
  if (!s) throw new Error("useMediaRetroRename sahtesi kurulmadı — globalThis.__mediaRetroRenameState eksik");
  return s;
}

export function bosIs() {
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
    refs_updated: 0,
    refs_skipped: 0,
    skip_reasons: {},
    expires_at: null,
    message: "",
  };
}

export function makeState({
  pendingCount = null,
  // Kırılım verilmezse eski davranış: hepsi taşınabilir sayılır (`disk_missing`
  // 0). Böylece kırılıma bakmayan testler aynı bölümleri görmeye devam eder.
  renamableCount,
  diskMissingCount = 0,
  plan = null,
  planLoading = false,
  planError = "",
  lastError = "",
  history = [],
  job,
  running = false,
} = {}) {
  const jobObj = job ?? bosIs();
  return {
    plan: ref(plan),
    planLoading: ref(planLoading),
    planError: ref(planError),
    lastError: ref(lastError),
    loadPlan: async () => {},
    pendingCount: ref(pendingCount),
    renamableCount: ref(renamableCount ?? Math.max(0, (pendingCount ?? 0) - diskMissingCount)),
    diskMissingCount: ref(diskMissingCount),
    loadCount: async () => {},
    history: ref(history),
    loadHistory: async () => {},
    canRollback: computed(() => history.length > 0 && !running),
    job: jobObj,
    running: ref(running),
    start: async () => {},
    stop: async () => {},
    rollback: async () => {},
    resetJob: () => {},
  };
}
