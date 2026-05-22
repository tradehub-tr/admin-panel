import { ref, onUnmounted } from "vue";

/**
 * Tek bir image upload akışı için bar overlay state + UX değerleri.
 *
 * Storefront tradehub-upload-ui (paket) ile birebir aynı UX:
 * - İlk tick immediate, sonra her 100ms +%10-18 (cap %85)
 * - Backend cevap geldiğinde bar %100 → 350ms hold → ✓ mark
 * - Mark 1.5sn göründükten sonra idle
 *
 * Mevcut Apple-style UI'lerde (avatar, logo, banner) zorla giriş yapmadan
 * sadece görsel feedback eklemek için kullanılır.
 *
 * Kullanım:
 *   const logoUpload = useImageUploadProgress();
 *   async function handleLogoUpload(e) {
 *     logoUpload.start();
 *     try {
 *       const url = await uploadFile(file);
 *       if (url) form.logo = url;
 *       await logoUpload.finish();
 *     } catch {
 *       logoUpload.fail();
 *     }
 *   }
 */
export function useImageUploadProgress() {
  const status = ref("idle"); // idle | uploading | success
  const progress = ref(0);
  let tickInterval = null;
  let successTimeout = null;

  function start() {
    status.value = "uploading";
    progress.value = 0;
    const tick = () => {
      if (status.value !== "uploading") return false;
      progress.value = Math.min(progress.value + 10 + Math.random() * 8, 85);
      return true;
    };
    tick(); // immediate first tick
    tickInterval = window.setInterval(() => {
      if (!tick()) window.clearInterval(tickInterval);
    }, 100);
  }

  /** Backend success — bar %100'de 350ms tut, ✓ mark göster, 1.5s sonra idle */
  async function finish() {
    if (tickInterval) window.clearInterval(tickInterval);
    progress.value = 100;
    await new Promise((r) => window.setTimeout(r, 350));
    status.value = "success";
    successTimeout = window.setTimeout(() => {
      status.value = "idle";
      progress.value = 0;
    }, 1500);
  }

  /** Hata — bar gizle, idle'a dön */
  function fail() {
    if (tickInterval) window.clearInterval(tickInterval);
    status.value = "idle";
    progress.value = 0;
  }

  onUnmounted(() => {
    if (tickInterval) window.clearInterval(tickInterval);
    if (successTimeout) window.clearTimeout(successTimeout);
  });

  return { status, progress, start, finish, fail };
}
