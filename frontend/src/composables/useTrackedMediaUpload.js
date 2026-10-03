import { onScopeDispose, ref } from "vue";
import api from "@/utils/api";
import { kindOfFile } from "@/utils/mediaKind";
import { useMediaStatus } from "./useMediaStatus.js";
import { uploadedKey, uploadPhase } from "@/lib/media/status.js";

/** A form keeps its accepted/error rows after HTTP completion. Assignment of
 * the returned URL stays with the form, exactly as before this UI integration. */
export function useTrackedMediaUpload() {
  const rows = ref([]);
  const { facts, unavailable } = useMediaStatus(
    () => rows.value.filter((row) => row.status === "done").map(uploadedKey),
    { interval: 2000 }
  );
  let sequence = 0;
  const controllers = new Map();
  async function upload(file, options = {}) {
    const id = `form-upload-${++sequence}`;
    rows.value.push({
      id,
      name: options.name || file.name,
      bytes: options.originalBytes || file.size,
      kind: kindOfFile(file),
      status: options.prepare ? "preparing" : "uploading",
      progress: 0,
      progressKnown: false,
      retryable: false,
    });
    const row = rows.value.at(-1);
    const controller = new AbortController();
    controllers.set(id, controller);
    try {
      const prepared = options.prepare ? await options.prepare(file) : file;
      controller.signal.throwIfAborted();
      row.status = "uploading";
      const result = await api.uploadFile(prepared, "Home", {
        details: true,
        signal: controller.signal,
        onProgress: (percent) => {
          row.progress = percent;
          row.progressKnown = true;
          options.onProgress?.(percent);
        },
      });
      if (!result?.file_url) throw new Error("Upload response has no file URL");
      row.result = { ...result, bytes: result.file_size || prepared.size };
      row.status = "done";
      return result.file_url;
    } catch (error) {
      row.status = error.name === "AbortError" ? "cancelled" : "error";
      row.error = error.message;
      row.errorCode = error.code || "";
      throw error;
    } finally {
      controllers.delete(id);
    }
  }
  const clear = () => {
    rows.value = rows.value.filter(
      (row) =>
        ![
          "ready",
          "readyBackground",
          "cancelled",
          "uploadFailed",
          "blocked",
          "scanFailed",
          "processingFailed",
        ].includes(uploadPhase(row, facts.value[uploadedKey(row)]))
    );
  };
  onScopeDispose(() => {
    for (const controller of controllers.values()) controller.abort();
  });
  return { rows, facts, unavailable, upload, clear, cancel: (id) => controllers.get(id)?.abort() };
}
