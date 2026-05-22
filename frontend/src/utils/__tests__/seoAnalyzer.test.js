// Node 22 native test runner.
// Çalıştırma: node --test src/utils/__tests__/seoAnalyzer.test.js

import { test } from "node:test";
import assert from "node:assert/strict";

import { analyze, STATUS } from "../seoAnalyzer.js";

const baseInput = {
  title: "iPhone 15 Pro 128GB",
  meta_title: "iPhone 15 Pro 128GB Satın Al — Resmi Apple Türkiye Bayisi",
  meta_description:
    "iPhone 15 Pro 128GB Doğal Titanyum modelini hızlı kargo ve güvenli ödeme ile İstoç B2B güvencesiyle satın al — 2 yıl garanti dahil.",
  description:
    "iPhone 15 Pro Türkiye'nin en hızlı pazaryeri İstoç'ta toptan satışta. Ayrıca güvenli ödeme imkanı sunulur. " +
    "Bununla birlikte kargo ücretsizdir. Böylece toplam maliyet düşer ve sipariş süreci hızlanır. " +
    "iPhone 15 Pro 6 farklı renk seçeneği ile mevcuttur ve tüm modeller orijinal Apple Türkiye garantilidir.\n\n" +
    "Detaylı incelemek için ürün galerisini görüntüleyin. Hızlı kargo seçeneği aktiftir ve aynı gün gönderim yapılır.",
  slug: "iphone-15-pro-128gb",
  focus_keyword: "iphone 15 pro",
  primary_image_alt: "iPhone 15 Pro 128GB ön görünüm",
  og_image: "/files/listing/iphone-15.jpg",
  noindex: 0,
};

function findCheck(result, id) {
  return result.checks.find((c) => c.id === id);
}

// ── Keyword checks ──────────────────────────────────────────────────────

test("keyword_in_title: focus geçiyorsa PASS", () => {
  const r = analyze(baseInput);
  assert.equal(findCheck(r, "keyword_in_title").status, STATUS.PASS);
});

test("keyword_in_title: focus boşsa NA", () => {
  const r = analyze({ ...baseInput, focus_keyword: "" });
  assert.equal(findCheck(r, "keyword_in_title").status, STATUS.NA);
});

test("keyword_in_title: title'da yoksa FAIL", () => {
  const r = analyze({ ...baseInput, meta_title: "Random başlık", title: "Random" });
  assert.equal(findCheck(r, "keyword_in_title").status, STATUS.FAIL);
});

test("keyword_in_meta_desc: meta_description içinde yoksa FAIL", () => {
  const r = analyze({ ...baseInput, meta_description: "Tamamen alakasız açıklama" });
  assert.equal(findCheck(r, "keyword_in_meta_desc").status, STATUS.FAIL);
});

test("keyword_in_slug: slug'da var", () => {
  const r = analyze(baseInput);
  assert.equal(findCheck(r, "keyword_in_slug").status, STATUS.PASS);
});

test("keyword_in_body: description'da var", () => {
  const r = analyze(baseInput);
  assert.equal(findCheck(r, "keyword_in_body").status, STATUS.PASS);
});

test("keyword_in_image_alt: alt'ta var", () => {
  const r = analyze(baseInput);
  assert.equal(findCheck(r, "keyword_in_image_alt").status, STATUS.PASS);
});

test("keyword_in_image_alt: alt boşsa WARN", () => {
  const r = analyze({ ...baseInput, primary_image_alt: "" });
  assert.equal(findCheck(r, "keyword_in_image_alt").status, STATUS.WARN);
});

// ── Length checks ───────────────────────────────────────────────────────

test("meta_title_length: 50-70 arası PASS", () => {
  const r = analyze(baseInput);
  assert.equal(findCheck(r, "meta_title_length").status, STATUS.PASS);
});

test("meta_title_length: çok kısa WARN", () => {
  const r = analyze({ ...baseInput, meta_title: "Kısa" });
  assert.equal(findCheck(r, "meta_title_length").status, STATUS.WARN);
});

test("meta_title_length: boş FAIL", () => {
  const r = analyze({ ...baseInput, meta_title: "" });
  assert.equal(findCheck(r, "meta_title_length").status, STATUS.FAIL);
});

test("meta_desc_length: 120-160 PASS", () => {
  const r = analyze(baseInput);
  assert.equal(findCheck(r, "meta_desc_length").status, STATUS.PASS);
});

test("description_min_length: 300+ PASS", () => {
  const r = analyze(baseInput);
  assert.equal(findCheck(r, "description_min_length").status, STATUS.PASS);
});

test("description_min_length: < 300 FAIL", () => {
  const r = analyze({ ...baseInput, description: "Çok kısa." });
  assert.equal(findCheck(r, "description_min_length").status, STATUS.FAIL);
});

test("focus_keyword_set: PASS", () => {
  const r = analyze(baseInput);
  assert.equal(findCheck(r, "focus_keyword_set").status, STATUS.PASS);
});

test("focus_keyword_set: boş FAIL", () => {
  const r = analyze({ ...baseInput, focus_keyword: "" });
  assert.equal(findCheck(r, "focus_keyword_set").status, STATUS.FAIL);
});

// ── Readability checks ─────────────────────────────────────────────────

test("paragraph_count: çift satır sonu ile 2 paragraf PASS", () => {
  const r = analyze(baseInput);
  assert.equal(findCheck(r, "paragraph_count").status, STATUS.PASS);
});

test("transition_words: yeterli geçiş kelimesi PASS", () => {
  const r = analyze(baseInput);
  // "Ayrıca", "Bununla birlikte", "Böylece" var — ≥%30 olmalı
  assert.equal(findCheck(r, "transition_words").status, STATUS.PASS);
});

// ── Structure checks ───────────────────────────────────────────────────

test("image_alt_coverage: img yoksa NA", () => {
  const r = analyze(baseInput);
  assert.equal(findCheck(r, "image_alt_coverage").status, STATUS.NA);
});

test("image_alt_coverage: tüm img'lerde alt PASS", () => {
  const r = analyze({
    ...baseInput,
    description: '<p>Test <img src="x.jpg" alt="açıklama">.</p>',
  });
  assert.equal(findCheck(r, "image_alt_coverage").status, STATUS.PASS);
});

test("image_alt_coverage: alt eksik WARN", () => {
  const r = analyze({
    ...baseInput,
    description: '<p>Test <img src="x.jpg">.</p>',
  });
  assert.equal(findCheck(r, "image_alt_coverage").status, STATUS.WARN);
});

// ── Technical checks ───────────────────────────────────────────────────

test("slug_ascii_safe: PASS", () => {
  const r = analyze(baseInput);
  assert.equal(findCheck(r, "slug_ascii_safe").status, STATUS.PASS);
});

test("slug_ascii_safe: Türkçe karakter FAIL", () => {
  const r = analyze({ ...baseInput, slug: "çiçek-böreği" });
  assert.equal(findCheck(r, "slug_ascii_safe").status, STATUS.FAIL);
});

test("og_image_set: var PASS", () => {
  const r = analyze(baseInput);
  assert.equal(findCheck(r, "og_image_set").status, STATUS.PASS);
});

test("og_image_set: yok WARN", () => {
  const r = analyze({ ...baseInput, og_image: "" });
  assert.equal(findCheck(r, "og_image_set").status, STATUS.WARN);
});

test("noindex_off: 0 PASS", () => {
  const r = analyze(baseInput);
  assert.equal(findCheck(r, "noindex_off").status, STATUS.PASS);
});

test("noindex_off: 1 FAIL", () => {
  const r = analyze({ ...baseInput, noindex: 1 });
  assert.equal(findCheck(r, "noindex_off").status, STATUS.FAIL);
});

// ── Composite score ─────────────────────────────────────────────────────

test("total score: mükemmel input → ≥ 70 (iyi)", () => {
  const r = analyze(baseInput);
  assert.ok(r.total >= 70, `total=${r.total}`);
  assert.equal(r.grade, "iyi");
});

test("total score: empty input → düşük", () => {
  const r = analyze({
    title: "",
    meta_title: "",
    meta_description: "",
    description: "",
    slug: "",
    focus_keyword: "",
  });
  assert.ok(r.total < 40, `total=${r.total}`);
});

test("byCategory: 5 kategori var", () => {
  const r = analyze(baseInput);
  assert.equal(Object.keys(r.byCategory).length, 5);
});

test("byCategory: keyword 5 check", () => {
  const r = analyze(baseInput);
  assert.equal(r.byCategory.keyword.checks.length, 5);
});
