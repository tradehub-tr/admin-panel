import { onScopeDispose, ref, toValue, watch } from "vue";
import { uploadedKey, uploadPhase } from "../lib/media/status.js";

/** A transfer response never opens the editor. Only a fresh, verified ready
 * image can open it; removed/replaced images and unmounted forms are ignored. */
export function useUploadPlacementQueue({ rows, facts, launcher, isCurrent = () => true }) {
  const pending = ref([]);
  let stopped = false;
  let opening = false;

  function rowFor(item) {
    return (toValue(rows) || []).find((row) => row.result?.file_url === item.fileUrl);
  }
  function ready(item) {
    const row = rowFor(item);
    return (
      !stopped &&
      isCurrent(item.fileUrl) &&
      row?.kind === "image" &&
      uploadPhase(row, toValue(facts)?.[uploadedKey(row)]) === "ready"
    );
  }
  async function drain() {
    if (stopped || opening || launcher.state.open) return;
    const current = pending.value.filter((item) => isCurrent(item.fileUrl) && rowFor(item));
    if (current.length !== pending.value.length) pending.value = current;
    const item = pending.value.find(ready);
    if (!item) return;
    opening = true;
    pending.value = pending.value.filter((entry) => entry !== item);
    try {
      await launcher.afterUpload({ ...item, canOpen: () => ready(item) });
    } finally {
      opening = false;
      if (!stopped && !launcher.state.open && pending.value.some(ready)) void drain();
    }
  }
  function enqueue(item) {
    // Preserve the existing preference: a multi-file selection does not open
    // a sequence of dialogs. Ready rows retain an explicit preview action.
    if (item.selected !== 1 || !item.fileUrl || stopped) return;
    pending.value = [...pending.value.filter((p) => p.fileUrl !== item.fileUrl), item];
  }
  watch(() => [pending.value, toValue(rows), toValue(facts), launcher.state.open], drain, {
    deep: true,
    flush: "post",
  });
  onScopeDispose(() => {
    stopped = true;
    pending.value = [];
  });
  return { enqueue };
}
