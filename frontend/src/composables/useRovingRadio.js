import { computed, nextTick, ref } from "vue";

/**
 * WAI-ARIA radio group deseni — dolaşan tabindex + ok tuşları.
 *
 * `SimOptionGroup`'tan çıkarıldı (öneri 02, 2026-08-31): cihaz rafı ve sayfa
 * haritası aynı sözleşmeyi paylaşır. Tuş davranışı iki yerde kopyalanırsa
 * biri sessizce bozulur — makine TEK yerde durur, bileşenler yalnız görseldir.
 *
 *   ↓ / →      sonraki      ↑ / ←   önceki
 *   Home / End ilk / son
 *
 * Yatay oklar RTL'de (Arapça) ters çevrilir; dikey oklar yönden bağımsızdır.
 * `ids` seçenek kimliklerinin SIRALI listesini döndüren getter'dır ve DOM
 * `buttons` ref dizisiyle birebir aynı sırada olmalıdır.
 *
 * ÖLÇÜLMEDİ: gerçek ekran okuyucu (NVDA/VoiceOver) ve tarayıcıdaki gerçek
 * odak halkası — sözleşme SSR çıktısı üzerinden test edilir.
 */
export function useRovingRadio(ids, model) {
  /** Şablonda `ref` dizisi: DOM sırası ile `ids()` sırası birebir. */
  const buttons = ref([]);

  const activeIndex = computed(() => {
    const i = ids().indexOf(model.value);
    // Seçim listeye uymuyorsa ilk seçenek odak durağı olur — grup Tab
    // sırasından TAMAMEN düşmemeli.
    return i === -1 ? 0 : i;
  });

  async function focusAt(index) {
    const list = ids();
    const clamped = Math.max(0, Math.min(list.length - 1, index));
    model.value = list[clamped];
    await nextTick();
    buttons.value[clamped]?.focus();
  }

  function isRtl() {
    if (typeof document === "undefined") return false;
    return document.documentElement.dir === "rtl";
  }

  function onKeydown(event) {
    const last = ids().length - 1;
    const i = activeIndex.value;
    const horizontalNext = isRtl() ? "ArrowLeft" : "ArrowRight";
    const horizontalPrev = isRtl() ? "ArrowRight" : "ArrowLeft";

    let target = null;
    if (event.key === "ArrowDown" || event.key === horizontalNext) target = i >= last ? 0 : i + 1;
    else if (event.key === "ArrowUp" || event.key === horizontalPrev)
      target = i <= 0 ? last : i - 1;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = last;
    if (target === null) return;

    event.preventDefault();
    focusAt(target);
  }

  return { buttons, activeIndex, onKeydown, focusAt };
}
