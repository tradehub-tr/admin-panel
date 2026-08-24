import assert from "node:assert/strict";
import { test } from "node:test";

import { parseProfile } from "../lcpAsset.js";

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
