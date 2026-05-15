import { ref, watch } from "vue";

const VALID_MODES = ["table", "grid", "kanban", "list"];

export function useListViewMode(key, fallback = "table") {
  const storageKey = `lv-mode:${key}`;
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) : null;
  const initial = VALID_MODES.includes(stored) ? stored : fallback;
  const viewMode = ref(initial);

  watch(viewMode, (v) => {
    if (VALID_MODES.includes(v)) localStorage.setItem(storageKey, v);
  });

  return { viewMode };
}
