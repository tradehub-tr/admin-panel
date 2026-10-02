import assert from "node:assert/strict";
import { test } from "node:test";

import { placeInfoTip } from "../infoTipPlacement.js";

/**
 * SSIM bilgi ipucu balonunun konumu.
 *
 *   ÖLÇÜLDÜ  — genişlik üst sınırı (min(280px, 100vw - 32px)), balonun HER
 *              ZAMAN viewport sınırları içinde kalması (sol/sağ/üst kenar
 *              yakınında bile), yön çevirme (aşağı yer yoksa yukarı).
 *   ÖLÇÜLMEDİ — gerçek tarayıcıda piksel yerleşimi ve CSS tipografi
 *              sıfırlamasının görsel sonucu (düzen motoru yok); tipografi
 *              sıfırlaması `InfoTip.vue`'nun kendi stil bloğunda, kaynak
 *              taramasıyla `mediaDetailDrawer.test.js`te ölçülüyor.
 *
 * Kök neden hatırlatma: balon `position: fixed` olduğu için panelin
 * `overflow`'undan KAÇAR, ama DOM'da hâlâ tetikleyicinin (ör. bir tablo
 * başlığının) İÇİNDE durur — bu dosya yalnız KONUM hesabını kanıtlıyor,
 * miras alınan tipografiyi değil.
 */

const VIEWPORT = { width: 420, height: 800 };
// Türevler tablosunun "SSIM" başlığındaki düğme — panelin SAĞ ucuna yakın.
const btnNearRight = { top: 200, bottom: 224, left: 388, right: 412, width: 24, height: 24 };
const btnNearLeft = { top: 200, bottom: 224, left: 8, right: 32, width: 24, height: 24 };
const btnCentered = { top: 200, bottom: 224, left: 198, right: 222, width: 24, height: 24 };

test("genişlik en fazla 280px, dar viewport'ta 'min(280, 100vw-32)' ile daralır", () => {
  const wide = placeInfoTip(btnCentered, VIEWPORT, 160);
  assert.equal(wide.width, 280);

  // 390px mobilde 390-32=358 > 280 — üst sınır (280) hâlâ bağlayıcı.
  const mobile = placeInfoTip(btnCentered, { width: 390, height: 800 }, 160);
  assert.equal(mobile.width, 280);

  // Yalnız 280+32=312'den dar viewport'larda "100vw-32" bağlayıcı olur.
  const veryNarrow = placeInfoTip(btnCentered, { width: 300, height: 800 }, 160);
  assert.equal(veryNarrow.width, 300 - 16 * 2);
});

test("sağ kenara yakın düğmede balon sağ kenara hizalanır, panelin dışına TAŞMAZ", () => {
  const pos = placeInfoTip(btnNearRight, VIEWPORT, 140);
  assert.ok(pos.left >= 16, `left (${pos.left}) viewport solundan taşmamalı`);
  assert.ok(
    pos.left + pos.width <= VIEWPORT.width - 16,
    `sağ kenar (${pos.left + pos.width}) viewport içinde kalmalı`
  );
  // Ortalanmış konum sağ sınırı aşardı (388 + 12 - 140 = 260 → 260+280=540 >
  // 420-16); gerçek `left` bu yüzden sınırdan geri ÇEKİLMİŞ olmalı.
  assert.equal(pos.left, VIEWPORT.width - 16 - pos.width);
});

test("sol kenara yakın düğmede balon sol kenara hizalanır, negatife TAŞMAZ", () => {
  const pos = placeInfoTip(btnNearLeft, VIEWPORT, 140);
  assert.equal(pos.left, 16);
  assert.ok(pos.left + pos.width <= VIEWPORT.width - 16);
});

test("ortadaki düğmede balon düğmenin ortasına hizalanır", () => {
  const pos = placeInfoTip(btnCentered, VIEWPORT, 140);
  const btnCenter = btnCentered.left + btnCentered.width / 2;
  assert.equal(pos.left + pos.width / 2, btnCenter);
});

test("altında yer varsa aşağı, sağında/altında yer yoksa yukarı açılır", () => {
  const below = placeInfoTip(btnCentered, VIEWPORT, 140);
  assert.equal(below.placement, "bottom");
  assert.equal(below.top, btnCentered.bottom + 6);

  // Düğme ekranın alt kenarına yakın, üstte daha çok yer var.
  const nearBottom = { top: 770, bottom: 794, left: 198, right: 222, width: 24, height: 24 };
  const above = placeInfoTip(nearBottom, VIEWPORT, 140);
  assert.equal(above.placement, "top");
  assert.equal(above.top, nearBottom.top - 6 - 140);
});

test("her koşulda üst/sol/sağ sınırlar viewport içinde kalır (390px mobil dahil)", () => {
  const mobile = { width: 390, height: 844 };
  for (const trigger of [btnNearLeft, btnCentered, btnNearRight]) {
    for (const bubbleHeight of [0, 60, 140, 260]) {
      const pos = placeInfoTip(trigger, mobile, bubbleHeight);
      assert.ok(pos.top >= 16, `top (${pos.top}) >= margin`);
      assert.ok(pos.left >= 16, `left (${pos.left}) >= margin`);
      assert.ok(pos.left + pos.width <= mobile.width - 16, `sağ kenar viewport içinde`);
    }
  }
});
