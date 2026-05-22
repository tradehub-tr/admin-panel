// Node 22 native test runner.
// Çalıştırma: node --test src/utils/__tests__/turkishTextHelpers.test.js

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  containsTransitionWord,
  countWords,
  firstWordOf,
  isPassiveWord,
  normalizeForSlug,
  sentenceHasPassive,
  splitSentences,
  splitWords,
} from "../turkishTextHelpers.js";

test("splitSentences: nokta ile böler", () => {
  const sentences = splitSentences("İlk cümle. İkinci cümle. Üçüncü cümle.");
  assert.equal(sentences.length, 3);
});

test("splitSentences: soru ve ünlem işareti de bölme noktası", () => {
  const sentences = splitSentences("Soru? Cevap! Açıklama.");
  assert.equal(sentences.length, 3);
});

test("splitSentences: boş input", () => {
  assert.deepEqual(splitSentences(""), []);
});

test("splitWords: noktalama temizlenir", () => {
  const words = splitWords("iPhone 15 Pro, harika ürün!");
  assert.deepEqual(words, ["iphone", "15", "pro", "harika", "ürün"]);
});

test("countWords: doğru sayım", () => {
  assert.equal(countWords("Bu beş kelimelik bir cümledir"), 5);
});

test("containsTransitionWord: ayrıca tespit", () => {
  assert.equal(containsTransitionWord("Ayrıca bunu da düşün."), true);
});

test("containsTransitionWord: kelime yok", () => {
  assert.equal(containsTransitionWord("Hızlı kahverengi tilki."), false);
});

test("containsTransitionWord: çok kelimeli geçiş", () => {
  assert.equal(containsTransitionWord("Bununla birlikte devam ettik."), true);
});

test("isPassiveWord: yapıldı (pasif)", () => {
  assert.equal(isPassiveWord("yapıldı"), true);
});

test("isPassiveWord: kısa kelime pasif değil", () => {
  assert.equal(isPassiveWord("al"), false);
});

test("isPassiveWord: aktif fiil — uzun ama suffix yok", () => {
  assert.equal(isPassiveWord("kahverengi"), false);
});

test("sentenceHasPassive: pasif cümle", () => {
  assert.equal(sentenceHasPassive("Bu ürün stoklara eklendi."), true);
});

test("normalizeForSlug: Türkçe karakter normalize", () => {
  assert.equal(normalizeForSlug("Çiçek Böreği"), "cicek-boregi");
});

test("normalizeForSlug: özel karakter strip", () => {
  assert.equal(normalizeForSlug("Apple iPad! (2024)"), "apple-ipad-2024");
});

test("firstWordOf: ilk kelime lowercase", () => {
  assert.equal(firstWordOf("İlk kelime gelir"), "ilk");
});

test("firstWordOf: boş cümle", () => {
  assert.equal(firstWordOf(""), "");
});
