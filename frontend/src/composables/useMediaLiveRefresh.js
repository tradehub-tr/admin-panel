import { onMounted, onUnmounted, ref } from "vue";

export const MEDIA_REALTIME_EVENTS = ["media_processing_status", "doc_update"];
export const MEDIA_DOC_TYPES = new Set([
  "File",
  "Media Asset",
  "Media Version",
  "Media Rendition",
  "Media Processing Job",
]);

export function isMediaRealtimeEvent(event, payload) {
  if (event === "media_processing_status") return true;
  const doctype = payload?.doctype || payload?.doc?.doctype || payload?.doc_type || "";
  return MEDIA_DOC_TYPES.has(doctype);
}

/**
 * Frappe realtime varsa olaya bağlanır; bağlantı yoksa gerçek sunucu listesini
 * düzenli olarak yeniden okur. Olay gövdesi karta doğrudan uygulanmaz: kiracı
 * sınırı yine `get_my_media`/`manifest_batch` uçlarında kalır.
 */
export function createMediaLiveController({
  refresh,
  realtime = globalThis?.frappe?.realtime || null,
  pollMs = 10_000,
  debounceMs = 250,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  shouldRefresh = () => true,
  onMode = () => {},
} = {}) {
  if (typeof refresh !== "function") throw new TypeError("refresh zorunlu");
  let pollTimer = null;
  let debounceTimer = null;
  let running = false;
  let stopped = true;
  let mode = "off";
  const handlers = new Map();

  const setMode = (next) => {
    mode = next;
    onMode(next);
  };

  async function run() {
    if (running || !shouldRefresh()) return;
    running = true;
    try {
      await refresh();
    } finally {
      running = false;
    }
  }

  function schedule() {
    if (debounceTimer) clearTimeoutFn(debounceTimer);
    debounceTimer = setTimeoutFn(() => {
      debounceTimer = null;
      run().catch(() => {});
    }, debounceMs);
  }

  function startPolling() {
    if (pollTimer || stopped) return;
    setMode("polling");
    pollTimer = setIntervalFn(() => run().catch(() => {}), pollMs);
  }

  function stopPolling() {
    if (pollTimer) clearIntervalFn(pollTimer);
    pollTimer = null;
  }

  function bind(event, handler) {
    realtime?.on?.(event, handler);
    handlers.set(event, handler);
  }

  function start() {
    if (!stopped) return;
    stopped = false;
    if (!realtime?.on) {
      startPolling();
      return;
    }
    for (const event of MEDIA_REALTIME_EVENTS) {
      bind(event, (payload) => {
        if (isMediaRealtimeEvent(event, payload)) schedule();
      });
    }
    bind("realtime_connect", () => {
      stopPolling();
      setMode("realtime");
      schedule();
    });
    bind("realtime_disconnect", startPolling);

    if (realtime.connected === true || realtime.socket?.connected === true) setMode("realtime");
    else startPolling();
  }

  function stop() {
    stopped = true;
    stopPolling();
    if (debounceTimer) clearTimeoutFn(debounceTimer);
    debounceTimer = null;
    for (const [event, handler] of handlers) realtime?.off?.(event, handler);
    handlers.clear();
    setMode("off");
  }

  return { start, stop, refresh: run, getMode: () => mode };
}

export function useMediaLiveRefresh(options = {}) {
  const mode = ref("off");
  const lastRefreshAt = ref(0);
  const controller = createMediaLiveController({
    ...options,
    onMode: (next) => {
      mode.value = next;
      options.onMode?.(next);
    },
    refresh: async () => {
      await options.refresh?.();
      lastRefreshAt.value = Date.now();
    },
  });
  onMounted(controller.start);
  onUnmounted(controller.stop);
  return { mode, lastRefreshAt, refresh: controller.refresh };
}
