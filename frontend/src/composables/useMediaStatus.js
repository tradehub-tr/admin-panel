import { onScopeDispose, ref, toValue, watch } from "vue";
import api from "@/utils/api";

/** Batch, read-only status polling; no scan/optimization is launched here. */
export function useMediaStatus(keys, { interval = 10000 } = {}) {
  const facts = ref({});
  const unavailable = ref(false);
  let stopped = false;
  let revision = 0;
  let timer;
  let running = false;

  async function refresh() {
    if (stopped || running || globalThis.document?.hidden) return;
    const current = [...new Set(toValue(keys) || [])].filter(Boolean);
    if (!current.length) return;
    running = true;
    const seq = revision;
    try {
      const next = {};
      for (let i = 0; i < current.length; i += 50) {
        const res = await api.callMethodGET("tradehub_core.api.media_status.get_status", {
          files: JSON.stringify(current.slice(i, i + 50)),
        });
        Object.assign(next, (res?.message ?? res)?.files || {});
      }
      if (!stopped && seq === revision) {
        facts.value = next;
        unavailable.value = false;
      }
    } catch {
      if (!stopped && seq === revision) unavailable.value = true;
    } finally {
      running = false;
      if (!stopped && seq !== revision) void refresh();
    }
  }

  watch(
    () => [...new Set(toValue(keys) || [])].filter(Boolean).join("\n"),
    () => {
      revision += 1;
      const current = new Set(toValue(keys) || []);
      facts.value = Object.fromEntries(
        Object.entries(facts.value).filter(([key]) => current.has(key))
      );
      clearInterval(timer);
      void refresh();
      if (toValue(keys)?.length) timer = setInterval(refresh, interval);
    },
    { immediate: true }
  );
  onScopeDispose(() => {
    stopped = true;
    clearInterval(timer);
  });
  return { facts, unavailable, refresh };
}
