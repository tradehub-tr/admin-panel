import assert from "node:assert/strict";
import { test } from "node:test";

import { pageWindow } from "../pageWindow.js";

// ListPagination'ın eski satır içi hesabıyla birebir aynı sonuçlar (5'lik
// pencere) — davranış korunuyor, yalnız pencere genişliği parametre oldu.
test("5'lik pencere: eski davranış korunur", () => {
  assert.deepEqual(pageWindow(1, 3, 5), [1, 2, 3]);
  assert.deepEqual(pageWindow(1, 40, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(pageWindow(3, 40, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(pageWindow(4, 40, 5), [2, 3, 4, 5, 6]);
  assert.deepEqual(pageWindow(20, 40, 5), [18, 19, 20, 21, 22]);
  assert.deepEqual(pageWindow(38, 40, 5), [36, 37, 38, 39, 40]);
  assert.deepEqual(pageWindow(40, 40, 5), [36, 37, 38, 39, 40]);
});

// Telefonda 3'lük pencere: geçerli sayfa HER ZAMAN görünür — uç düğmeleri
// CSS ile gizlemenin yapamadığı şey bu.
test("3'lük pencere: geçerli sayfa daima içeride", () => {
  assert.deepEqual(pageWindow(1, 40, 3), [1, 2, 3]);
  assert.deepEqual(pageWindow(2, 40, 3), [1, 2, 3]);
  assert.deepEqual(pageWindow(3, 40, 3), [2, 3, 4]);
  assert.deepEqual(pageWindow(20, 40, 3), [19, 20, 21]);
  assert.deepEqual(pageWindow(40, 40, 3), [38, 39, 40]);
  for (let p = 1; p <= 40; p++) assert.ok(pageWindow(p, 40, 3).includes(p));
});

test("toplam sayfa pencereden azsa hepsi listelenir", () => {
  assert.deepEqual(pageWindow(1, 1, 3), [1]);
  assert.deepEqual(pageWindow(2, 2, 5), [1, 2]);
  // Sıfır sayfa diye bir şey yok: en az 1 sayfa.
  assert.deepEqual(pageWindow(1, 0, 5), [1]);
});
