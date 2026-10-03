import { nextTick } from "vue";

/**
 * Sekme listesi klavye davranışı (WAI-ARIA tabs): ok tuşları + Home/End,
 * dolaşan tabindex. Yatay oklar RTL'de ters çevrilir.
 *
 * @param {() => string[]} ids sekme kimlikleri, DOM sırasıyla
 * @param {(id: string) => void} activate
 * @param {(id: string) => HTMLElement|null} elementOf
 */
export function useTablistKeys(ids, activate, elementOf) {
  async function onKeydown(event, currentId) {
    const list = ids();
    const i = list.indexOf(currentId);
    if (i < 0) return;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const next = rtl ? "ArrowLeft" : "ArrowRight";
    const prev = rtl ? "ArrowRight" : "ArrowLeft";
    let target = null;
    if (event.key === next) target = (i + 1) % list.length;
    else if (event.key === prev) target = (i - 1 + list.length) % list.length;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = list.length - 1;
    if (target === null) return;
    event.preventDefault();
    activate(list[target]);
    await nextTick();
    elementOf(list[target])?.focus({ preventScroll: true });
  }
  return { onKeydown };
}
