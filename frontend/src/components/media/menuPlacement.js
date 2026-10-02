/**
 * Body'ye Teleport edilmiş (position: fixed) bir menünün ekran konumu.
 *
 * Neden var: kart menüsü kartın içinde çiziliyordu; kart `overflow: hidden`
 * olduğu için listenin alt ögeleri (Arşivle, Sil) kartın alt kenarında
 * kesiliyordu. Menü artık gövdeye taşınıyor ve konumu tetikleyiciden
 * hesaplanıyor — hesap DOM'dan bağımsız, saf fonksiyon (node:test ile ölçülür).
 *
 * Kurallar:
 *   - Menü tetikleyicinin "son" kenarına hizalanır (LTR'de sağ, RTL'de sol) —
 *     eski `inset-inline-end: 0` davranışının aynısı.
 *   - Altında yer varsa aşağı, yoksa ve üstte daha çok yer varsa yukarı açılır.
 *   - Her durumda viewport içinde `margin` payıyla kalır; viewport menüden
 *     kısaysa `maxHeight` ile sınırlanır (liste kendi içinde kayar).
 *
 * @param {{top:number,bottom:number,left:number,right:number}} trigger
 * @param {{width:number,height:number}} menu
 * @param {{width:number,height:number}} viewport
 * @param {{gap?:number, margin?:number, rtl?:boolean}} [opts]
 * @returns {{top:number,left:number,maxHeight:number,placement:"top"|"bottom"}}
 */
export function placeMenu(trigger, menu, viewport, { gap = 4, margin = 8, rtl = false } = {}) {
  const maxHeight = Math.max(0, viewport.height - margin * 2);
  const height = Math.min(menu.height, maxHeight);

  const spaceBelow = viewport.height - trigger.bottom - gap - margin;
  const spaceAbove = trigger.top - gap - margin;
  const openUp = height > spaceBelow && spaceAbove > spaceBelow;

  const rawTop = openUp ? trigger.top - gap - height : trigger.bottom + gap;
  const rawLeft = rtl ? trigger.left : trigger.right - menu.width;

  return {
    top: clamp(rawTop, margin, viewport.height - margin - height),
    left: clamp(rawLeft, margin, viewport.width - margin - menu.width),
    maxHeight,
    placement: openUp ? "top" : "bottom",
  };
}

// Alt sınır önceliklidir: menü viewport'tan büyükse sol/üst kenara yaslanır.
function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}
