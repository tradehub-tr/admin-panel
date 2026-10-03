import { onMounted, onUnmounted, ref, watch } from "vue";

/**
 * Önizlemeyi GERÇEK CSS genişliğinde (360 / 600) bırakır; alan darsa
 * `transform: scale()` ile küçültür ve fiilî genişlik + ölçek oranını bildirir.
 *
 * @param {import("vue").Ref<HTMLElement|null>} stage önizleme sahnesi (kullanılabilir alan)
 * @param {import("vue").Ref<HTMLElement|null>} frame gerçek genişlikteki çerçeve
 * @param {import("vue").Ref<number>} frameWidth çerçevenin CSS genişliği (px)
 */
export function usePreviewScale(stage, frame, frameWidth) {
  const scale = ref(1);
  const height = ref(0);
  let observer = null;

  function fit() {
    const stageEl = stage.value;
    const frameEl = frame.value;
    if (!stageEl || !frameEl) return;
    const style = getComputedStyle(stageEl);
    const available =
      stageEl.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    if (available <= 0) return;
    scale.value = Math.min(1, available / frameWidth.value);
    height.value = Math.ceil(frameEl.offsetHeight * scale.value);
  }

  onMounted(() => {
    fit();
    if (typeof ResizeObserver === "undefined") return;
    observer = new ResizeObserver(fit);
    if (stage.value) observer.observe(stage.value);
    if (frame.value) observer.observe(frame.value);
    document.fonts?.ready?.then(fit);
  });
  onUnmounted(() => observer?.disconnect());
  watch(frameWidth, fit, { flush: "post" });
  // Çerçeve koşullu çizilir (içerik yoksa yok); yeniden geldiğinde izlemeye alınır.
  watch(
    frame,
    (el, old) => {
      if (old) observer?.unobserve(old);
      if (el) observer?.observe(el);
      fit();
    },
    { flush: "post" }
  );

  return { scale, height, fit };
}

/** "600px · %58" */
export const scaleLabel = (width, scale) => `${width}px · %${Math.round(scale * 100)}`;
