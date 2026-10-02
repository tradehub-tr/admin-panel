import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { placeMenu } from "../menuPlacement.js";

/**
 * Kart "⋯" menüsü kartın içinde çiziliyordu; kart `overflow: hidden` olduğu
 * için listenin son ögeleri (Arşivle, Sil) kartın alt kenarında kesiliyordu.
 *
 *   ÖLÇÜLDÜ  — konum hesabı (aşağı/yukarı açılma, viewport sınırı, RTL) ve
 *              bileşenin listeyi body'ye Teleport ettiği kaynak sözleşmesi.
 *   ÖLÇÜLMEDİ — gerçek tarayıcıda piksel yerleşimi (düzen motoru yok).
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const card = readFileSync(`${frontendRoot}/src/components/media/MediaCard.vue`, "utf8");

const VIEWPORT = { width: 1280, height: 800 };
const MENU = { width: 180, height: 320 };
// Düğme 32×32, sağ kenarı x=600.
const btnAt = (top) => ({ top, bottom: top + 32, left: 568, right: 600 });

test("altında yer varsa menü düğmenin altında, sağ kenarına hizalı açılır", () => {
  const pos = placeMenu(btnAt(100), MENU, VIEWPORT);
  assert.equal(pos.placement, "bottom");
  assert.equal(pos.top, 100 + 32 + 4);
  assert.equal(pos.left, 600 - MENU.width);
});

test("altında yer yoksa yukarı açılır ve tüm öğeler viewport içinde kalır", () => {
  // Izgaranın son satırındaki kart: düğme ekranın altına yakın.
  const pos = placeMenu(btnAt(700), MENU, VIEWPORT);
  assert.equal(pos.placement, "top");
  assert.equal(pos.top, 700 - 4 - MENU.height);
  assert.ok(pos.top >= 8);
  assert.ok(pos.top + MENU.height <= VIEWPORT.height - 8);
});

test("her iki yönde de yer yoksa 8px payla viewport'a sıkıştırılır", () => {
  const short = { width: 1280, height: 360 };
  const pos = placeMenu(btnAt(150), MENU, short);
  assert.ok(pos.top >= 8);
  assert.ok(pos.top + Math.min(MENU.height, pos.maxHeight) <= short.height - 8);
});

test("viewport menüden kısaysa maxHeight ile sınırlanır (liste kendi içinde kayar)", () => {
  const tiny = { width: 1280, height: 200 };
  const pos = placeMenu(btnAt(80), MENU, tiny);
  assert.equal(pos.maxHeight, 200 - 16);
  assert.equal(pos.top, 8);
});

test("yatayda viewport dışına taşmaz", () => {
  const nearLeft = { top: 100, bottom: 132, left: 10, right: 42 };
  assert.equal(placeMenu(nearLeft, MENU, VIEWPORT).left, 8);
  const rtlNearRight = { top: 100, bottom: 132, left: 1250, right: 1282 };
  assert.equal(
    placeMenu(rtlNearRight, MENU, VIEWPORT, { rtl: true }).left,
    VIEWPORT.width - 8 - MENU.width
  );
});

test("RTL'de düğmenin sol kenarına hizalanır (inset-inline-end karşılığı)", () => {
  assert.equal(placeMenu(btnAt(100), MENU, VIEWPORT, { rtl: true }).left, 568);
});

test("MediaCard menü listesini body'ye Teleport eder ve fixed konumlar", () => {
  assert.match(card, /<Teleport to="body">\s*<ul[\s\S]*?class="mcard__menu-list"/);
  assert.match(card, /:style="menuStyle"/);
  assert.match(card, /\.mcard__menu-list\s*\{[^}]*position:\s*fixed/);
  assert.match(card, /placeMenu\(/);
});

test("dışarı tıklama kontrolü Teleport'lu listeyi içeride sayar", () => {
  // Liste artık `.mcard__menu` altında değil; yalnız closest() yetmez.
  assert.match(card, /menuListEl\.value\?\.contains\(target\)/);
  // Başka kartın düğmesi @click.stop kullanıyor — capture evresi şart.
  assert.match(card, /addEventListener\("click", closeMenu, true\)/);
});

test("menü a11y sözleşmesi korunur", () => {
  assert.match(card, /role="menu"/);
  assert.match(card, /role="menuitem"/);
  assert.match(card, /aria-haspopup="menu"/);
  assert.match(card, /:disabled="action\.disabled"/);
  assert.match(card, /mcard__menu-item--danger/);
  assert.match(card, /@click="run\(action\.id\)"/);
  assert.match(card, /event\.key !== "Escape"/);
});

test("menü kompakt: öge button mixin'inin 44px hedefini ve kalın yazısını kullanmaz", () => {
  const item = card.match(/\.mcard__menu-item \{[\s\S]*?\n {2}\}\n/)?.[0] || "";
  assert.ok(item, ".mcard__menu-item bloğu bulunamadı");
  assert.doesNotMatch(item, /@include media\.button/);
  assert.match(item, /min-height: media\.\$s-6 - media\.\$s-05/);
  assert.match(item, /@include media\.text\("sm"\)/);
  assert.match(item, /white-space: nowrap/);
  // 44px dokunma hedefi yalnız dokunmatikte.
  assert.match(item, /@media \(pointer: coarse\) \{\s*@include media\.tap-target/);
  const list = card.match(/\.mcard__menu-list \{[\s\S]*?\n {2}\}\n/)?.[0] || "";
  assert.match(list, /width: max-content/);
  assert.match(list, /min-width: 10rem/);
});

test("tehlikeli işlemden önce ince ayırıcı çizgi var", () => {
  assert.match(card, /'mcard__menu-row--danger': action\.danger/);
  assert.match(
    card,
    /\.mcard__menu-row--danger:not\(:first-child\) \{[^}]*@include media\.divider\(top\)/
  );
});

test("kompakt menü (10 öge × 30px) son satırdaki kartta yukarı açılıp tamamen görünür", () => {
  const compact = { width: 230, height: 10 * 30 + 8 + 9 };
  const pos = placeMenu(btnAt(740), compact, VIEWPORT);
  assert.equal(pos.placement, "top");
  assert.ok(pos.top >= 8 && pos.top + compact.height <= VIEWPORT.height - 8);
  assert.ok(pos.left >= 8 && pos.left + compact.width <= VIEWPORT.width - 8);
});
