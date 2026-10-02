import assert from "node:assert/strict";
import { test } from "node:test";

import { clampFocal, frameRect, objectPosition, visibleFraction } from "../geometry.js";

const BANNER = 2000 / 408; // Özgen Plastik banner'ı

test("clampFocal: 0-1 aralığı, sayı değilse merkez", () => {
  assert.equal(clampFocal(0.3), 0.3);
  assert.equal(clampFocal(-1), 0);
  assert.equal(clampFocal(2), 1);
  assert.equal(clampFocal("x"), 0.5);
  assert.equal(clampFocal(undefined), 0.5);
});

test("visibleFraction: geniş görsel dar yerde yatayda kesilir", () => {
  const v = visibleFraction(BANNER, 390 / 180);
  assert.ok(Math.abs(v.x - 0.442) < 0.001);
  assert.equal(v.y, 1);
});

test("visibleFraction: dik görsel geniş yerde dikeyde kesilir; contain hiç kesmez", () => {
  assert.deepEqual(visibleFraction(0.5, 1), { x: 1, y: 0.5 });
  assert.deepEqual(visibleFraction(BANNER, 1, "contain"), { x: 1, y: 1 });
  assert.deepEqual(visibleFraction(0, 1), { x: 1, y: 1 });
});

test("frameRect: çerçeve konumu (1 − görünen) × odak", () => {
  const r = frameRect(BANNER, 390 / 180, { x: 0.78, y: 0.45 });
  assert.ok(Math.abs(r.width - 0.442) < 0.001);
  assert.ok(Math.abs(r.left - (1 - r.width) * 0.78) < 1e-9);
  assert.equal(r.top, 0);
  assert.equal(r.height, 1);
});

test("frameRect CSS object-position ile aynı pikseli verir", () => {
  // CSS: offset = (kutu − çizilen) × p; çizilen genişlik = kutuYükseklik × görselOranı.
  const kutuW = 390, kutuH = 180, p = 0.78;
  const cizilen = kutuH * BANNER;
  const solPiksel = -(kutuW - cizilen) * p;
  const r = frameRect(BANNER, kutuW / kutuH, { x: p, y: 0.5 });
  assert.ok(Math.abs(r.left * cizilen - solPiksel) < 1e-6);
});

test("objectPosition: kayan nokta artığı yok", () => {
  assert.equal(objectPosition({ x: 0.78, y: 0.45 }), "78% 45%");
  assert.equal(objectPosition({ x: 0.123, y: 1 }), "12.3% 100%");
  assert.equal(objectPosition(null), "50% 50%");
});
