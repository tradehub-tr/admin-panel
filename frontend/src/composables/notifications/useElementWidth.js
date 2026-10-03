import { onMounted, onUnmounted, ref } from "vue";

/**
 * Bir öğenin KENDİ genişliğini izler (ResizeObserver).
 *
 * NEDEN viewport sorgusu değil: panel kabuğu ≥768px'te IconRail + SidePanel
 * için 280px alıyor (`assets/scss/media.scss` notu). 1024px viewport'ta sayfaya
 * ~700px kalır; düzen "viewport" ile değil "sayfaya kalan genişlik" ile
 * seçilmeli. Tablo ↔ kart ve düzenleyicinin sütun sayısı buradan beslenir.
 *
 * @param {import("vue").Ref<HTMLElement|null>} target
 * @param {number} [fallback] ölçüm gelene kadarki tahmin
 */
export function useElementWidth(target, fallback) {
  const shell = typeof window !== "undefined" && window.innerWidth >= 768 ? 280 : 0;
  const width = ref(
    fallback ??
      (typeof window !== "undefined" ? Math.max(320, window.innerWidth - shell - 48) : 1024)
  );
  let observer = null;

  onMounted(() => {
    const el = target.value;
    if (!el) return;
    width.value = el.getBoundingClientRect().width;
    if (typeof ResizeObserver === "undefined") return;
    observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect?.width;
      if (next && Math.abs(next - width.value) >= 1) width.value = next;
    });
    observer.observe(el);
  });

  onUnmounted(() => observer?.disconnect());

  return { width };
}
