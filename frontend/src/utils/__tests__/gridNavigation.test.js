import assert from "node:assert/strict";
import { test } from "node:test";

import { isGridNavKey, nextGridIndex } from "../gridNavigation.js";

// Klasör ızgarası WAI-ARIA "grid" deseniyle geziliyor: TEK Tab durağı, kalemler
// arası geçiş ok tuşlarıyla (roving tabindex). 300 klasörlük bir seviyede her
// kartın kendi Tab durağı olması, klavye kullanıcısını içeriğe ulaşmak için
// 300 kez Tab'a basmaya zorlardı.

const TOTAL = 10;
const COLS = 4; // satırlar: [0-3] [4-7] [8-9]

test("sağ/sol ok bir kalem ilerletir ve geriletir", () => {
  assert.equal(nextGridIndex("ArrowRight", 0, TOTAL, COLS), 1);
  assert.equal(nextGridIndex("ArrowLeft", 5, TOTAL, COLS), 4);
});

test("aşağı/yukarı ok bir SATIR atlar — sütun sayısı kadar", () => {
  assert.equal(nextGridIndex("ArrowDown", 1, TOTAL, COLS), 5);
  assert.equal(nextGridIndex("ArrowUp", 6, TOTAL, COLS), 2);
});

test("sınırda imleç durur — sarma YOK", () => {
  // Sarma iki boyutlu ızgarada kullanıcıyı beklemediği yere götürür:
  // son kalemden sağa basmak ilk kaleme atlarsa liste başına dönülmüş olur.
  assert.equal(nextGridIndex("ArrowLeft", 0, TOTAL, COLS), 0);
  assert.equal(nextGridIndex("ArrowRight", TOTAL - 1, TOTAL, COLS), TOTAL - 1);
  assert.equal(nextGridIndex("ArrowUp", 2, TOTAL, COLS), 2);
  // 9 + 4 = 13 → liste dışı, imleç yerinde kalır.
  assert.equal(nextGridIndex("ArrowDown", 9, TOTAL, COLS), 9);
});

test("Home ilk, End son kaleme gider", () => {
  assert.equal(nextGridIndex("Home", 7, TOTAL, COLS), 0);
  assert.equal(nextGridIndex("End", 0, TOTAL, COLS), TOTAL - 1);
});

test("PageUp/PageDown dört satır atlar ve sınırda kırpılır", () => {
  assert.equal(nextGridIndex("PageDown", 0, 100, COLS), 16);
  assert.equal(nextGridIndex("PageUp", 20, 100, COLS), 4);
  assert.equal(nextGridIndex("PageDown", 90, 100, COLS), 99);
  assert.equal(nextGridIndex("PageUp", 3, 100, COLS), 0);
});

test("imleç hiç konmamışken ilk ok tuşu ilk kaleme koyar", () => {
  assert.equal(nextGridIndex("ArrowDown", -1, TOTAL, COLS), 0);
  assert.equal(nextGridIndex("ArrowRight", -1, TOTAL, COLS), 0);
});

test("gezinme tuşu OLMAYAN tuşlar -1 döner — olay tarayıcıya bırakılır", () => {
  // Tab, Enter ve yazı tuşları ızgaranın işi değil; engellenirse Tab ile
  // ızgaradan çıkmak imkânsız hâle gelirdi (klavye tuzağı).
  for (const key of ["Tab", "Enter", " ", "a", "Escape"]) {
    assert.equal(nextGridIndex(key, 0, TOTAL, COLS), -1, key);
    assert.equal(isGridNavKey(key), false, key);
  }
  for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"]) {
    assert.equal(isGridNavKey(key), true, key);
  }
});

test("boş ızgarada gezinme -1 döner, çağıran olayı engellemez", () => {
  assert.equal(nextGridIndex("ArrowRight", 0, 0, COLS), -1);
});

test("tek sütunlu ızgarada aşağı ok bir sonraki kaleme gider", () => {
  assert.equal(nextGridIndex("ArrowDown", 0, TOTAL, 1), 1);
});
