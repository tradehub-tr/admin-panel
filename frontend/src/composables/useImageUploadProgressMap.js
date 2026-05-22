import { reactive, onUnmounted } from "vue";

/**
 * Key-bazlı çoklu image upload progress yönetimi.
 *
 * useImageUploadProgress tek bir state tutar; dinamik upload yerleri (galeri satırı,
 * varyant idx, renk değeri) için key başına ayrı state gerekir. Bu composable
 * tek bir reactive map ile bunu sağlar.
 *
 * UX değerleri tradehub-upload-ui paketiyle birebir aynı:
 * - İlk tick immediate, sonra 100ms interval, %10-18 increment, cap %85
 * - Success: bar %100'de 350ms hold → ✓ mark → 1.5s sonra state silinir
 *
 * Kullanım:
 *   const { states, start, finish, fail } = useImageUploadProgressMap();
 *
 *   async function uploadX(key) {
 *     start(key);
 *     try {
 *       await api.uploadFile(file);
 *       await finish(key);
 *     } catch {
 *       fail(key);
 *     }
 *   }
 *
 *   // Template: <bar v-if="states[key]?.status === 'uploading'" :style="{ width: states[key].progress + '%' }">
 */
export function useImageUploadProgressMap() {
  const states = reactive({}); // key → { status: 'uploading'|'success', progress: 0-100 }
  const intervals = {}; // key → interval id
  const successTimeouts = {}; // key → timeout id (cleanup için)

  function start(key) {
    states[key] = { status: "uploading", progress: 0 };
    const tick = () => {
      const s = states[key];
      if (!s || s.status !== "uploading") return false;
      s.progress = Math.min(s.progress + 10 + Math.random() * 8, 85);
      return true;
    };
    tick(); // immediate
    intervals[key] = window.setInterval(() => {
      if (!tick()) window.clearInterval(intervals[key]);
    }, 100);
  }

  async function finish(key) {
    if (intervals[key]) {
      window.clearInterval(intervals[key]);
      delete intervals[key];
    }
    if (states[key]) states[key].progress = 100;
    await new Promise((r) => window.setTimeout(r, 350));
    if (states[key]) states[key].status = "success";
    successTimeouts[key] = window.setTimeout(() => {
      delete states[key];
      delete successTimeouts[key];
    }, 1500);
  }

  function fail(key) {
    if (intervals[key]) {
      window.clearInterval(intervals[key]);
      delete intervals[key];
    }
    if (successTimeouts[key]) {
      window.clearTimeout(successTimeouts[key]);
      delete successTimeouts[key];
    }
    delete states[key];
  }

  onUnmounted(() => {
    for (const id of Object.values(intervals)) window.clearInterval(id);
    for (const id of Object.values(successTimeouts)) window.clearTimeout(id);
  });

  return { states, start, finish, fail };
}
