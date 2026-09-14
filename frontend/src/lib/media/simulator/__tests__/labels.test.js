import assert from "node:assert/strict";
import { test } from "node:test";

import { extractRegionIds, humanizeId, measurementStatus, regionKeyPath } from "../labels.js";
import { DEVICE_MEASUREMENT, EXCLUDED_REGIONS, PAGES, PLACEMENT_MEASUREMENT } from "../layout.js";

/**
 * Durum kodları ekrana basılmaz; insan etiketine çevrilir. Bilinmeyen kod
 * gelirse ekran "Doğrulanmadı"ya düşer — kod sızmaz.
 */

test("vendor'daki iki durum kodu tanınıyor", () => {
  assert.equal(measurementStatus(DEVICE_MEASUREMENT.status).kind, "emulated");
  const p = measurementStatus(PLACEMENT_MEASUREMENT.status);
  assert.equal(p.kind, "partial");
  assert.equal(p.done, 8);
  assert.equal(p.total, 15);
});

test("bilinmeyen ya da boş kod genel türe düşer, kod korunur", () => {
  assert.equal(measurementStatus("YEPYENI_BIR_KOD").kind, "unknown");
  assert.equal(measurementStatus("YEPYENI_BIR_KOD").code, "YEPYENI_BIR_KOD");
  assert.equal(measurementStatus("").kind, "unknown");
  assert.equal(measurementStatus(undefined).done, null);
  assert.equal(measurementStatus("TAM_DOGRULANDI").kind, "verified");
  assert.equal(measurementStatus("OLCULMEDI").kind, "unverified");
});

test("kimlik insan biçimine çevriliyor", () => {
  assert.equal(humanizeId("home/category_bento"), "Home · Category bento");
  assert.equal(humanizeId("seller_shop/template_tiles"), "Seller shop · Template tiles");
  assert.equal(humanizeId("iphone-se-3"), "Iphone se 3");
  assert.equal(humanizeId(""), "");
  assert.equal(regionKeyPath("home/category_bento"), "home.category_bento");
});

test("ölçüm notundaki bölge kimlikleri ayıklanıyor, dosya yolları elenıyor", () => {
  const pages = PAGES.map((p) => p.page);
  const ids = extractRegionIds(PLACEMENT_MEASUREMENT.note, pages);
  assert.ok(ids.includes("home/tailored_grid"));
  assert.ok(ids.includes("cart_checkout/drawer_thumb"));
  assert.equal(ids.length, 7, "not 7 doğrulanmamış bölge sayıyor");
  // Süzgeçsiz çağrı `docs/reports` gibi yolları da yakalar — bilinçli.
  assert.ok(extractRegionIds(PLACEMENT_MEASUREMENT.note).length > 7);
  // Dışarıda bırakılan üç bölge de aynı kalıpta — eşleme onlara da yeter.
  for (const x of EXCLUDED_REGIONS) assert.match(x.region, /^[a-z_]+\/[a-z_]+$/);
});
