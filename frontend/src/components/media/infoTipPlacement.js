/**
 * `InfoTip` balonunun ekran konumu — saf fonksiyon (node:test ile ölçülür).
 *
 * Neden ayrı dosya: `MediaCard`'ın "⋯" menüsündeki aynı sorunun aynı çözümü
 * (`menuPlacement.js` → `placeMenu`) — konum hesabı DOM'dan bağımsız saf bir
 * fonksiyon olursa gerçek tarayıcı açmadan ölçülebilir. İlk sürümde bu hesap
 * `InfoTip.vue` içine gömülüydü ve test edilmiyordu; balon bir tablo
 * başlığının (`<th>`) içinden açıldığında miras alınan tipografiyle
 * (BÜYÜK HARF, `nowrap`) birleşip panelin sağından taşıyordu (ekran
 * görüntüsüyle bildirildi, 2026-09-30). Tipografi düzeltmesi `InfoTip.vue`
 * stilinde; bu dosya yalnız KONUMU doğru hesapladığını kanıtlar.
 *
 * @param {{top:number,bottom:number,left:number,right:number,width:number}} trigger
 *   Düğmenin `getBoundingClientRect()` değeri.
 * @param {{width:number,height:number}} viewport
 * @param {number} bubbleHeight Balonun ölçülen yüksekliği (yoksa 0 — henüz
 *   çizilmemiş demektir, aşağı açılır varsayılır).
 * @param {{margin?:number, maxWidth?:number, gap?:number}} [opts]
 * @returns {{top:number,left:number,width:number,placement:"top"|"bottom"}}
 */
export function placeInfoTip(trigger, viewport, bubbleHeight, opts = {}) {
  const { margin = 16, maxWidth = 280, gap = 6 } = opts;

  // "min(280px, 100vw - 32px)" — 390px mobilde bile balon iki yanda margin
  // payıyla kalır.
  const width = Math.max(0, Math.min(maxWidth, viewport.width - margin * 2));

  const spaceBelow = viewport.height - trigger.bottom - margin;
  const spaceAbove = trigger.top - margin;
  const openUp = bubbleHeight > spaceBelow && spaceAbove > spaceBelow;

  // Düğmenin ortasına hizalanır, sonra viewport içine SIKIŞTIRILIR — sağ
  // kenara yakın bir düğmede (Türevler'in SSIM başlığı gibi) bu, balonu
  // otomatik olarak sağ kenara hizalı açar; simetrik olarak sol kenarda da
  // aynı şekilde çalışır.
  const rawLeft = trigger.left + trigger.width / 2 - width / 2;
  const left = clamp(rawLeft, margin, viewport.width - margin - width);

  const rawTop = openUp ? trigger.top - gap - bubbleHeight : trigger.bottom + gap;
  const top = Math.max(margin, rawTop);

  return { top, left, width, placement: openUp ? "top" : "bottom" };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}
