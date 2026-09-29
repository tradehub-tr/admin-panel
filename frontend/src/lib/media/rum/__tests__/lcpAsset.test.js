import assert from "node:assert/strict";
import { test } from "node:test";

import { NON_ORIGINAL_RENDITION, parseProfile } from "../lcpAsset.js";

test("kanonik türev URL'sinden genişlik profilini çıkarır", () => {
  assert.equal(
    parseProfile(
      "/files/media/ASSET/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef/w768-768.webp"
    ),
    "w768"
  );
});

test("doğrudan Frappe kaynak görselini original olarak etiketler", () => {
  assert.equal(parseProfile("https://shop.example/files/urun-kapak.jpg?v=1"), "original");
});

test("kökeni kanıtlanamayan eski shard türevini original saymaz", () => {
  assert.equal(parseProfile(`/files/ab/${"1".repeat(32)}.webp`), "unknown");
});

// T-5 (2026-09-28, seo-gorsel-adresi) — okunur SEO adresi
// (/files/<slug>-<8..32 hex>[__<türev>].<uzantı>) da NON_ORIGINAL_RENDITION
// tarafından tanınmalı; eski hash'siz düz dosya adı (`/files/0585.jpg`) YANLIŞ
// POZİTİF vermemeli.
test("NON_ORIGINAL_RENDITION eski shard türevini eşleştirir", () => {
  assert.equal(NON_ORIGINAL_RENDITION.test(`/files/ab/${"1".repeat(32)}.webp`), true);
});

test("NON_ORIGINAL_RENDITION okunur SEO adresini (türevsiz) eşleştirir", () => {
  assert.equal(NON_ORIGINAL_RENDITION.test("/files/kadin-canta-a1b2c3d4.jpg"), true);
});

test("NON_ORIGINAL_RENDITION okunur SEO adresini (__türev'li) eşleştirir", () => {
  assert.equal(NON_ORIGINAL_RENDITION.test("/files/kadin-canta-a1b2c3d4__thumb.webp"), true);
});

test("NON_ORIGINAL_RENDITION hash taşımayan düz dosya adını eşleştirmez", () => {
  assert.equal(NON_ORIGINAL_RENDITION.test("/files/0585.jpg"), false);
});
