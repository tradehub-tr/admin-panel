import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { SOURCE_SHA256 } from "../../vendor/placements.js";
import {
  boxStyle,
  cutPlaceCount,
  devicesFor,
  formatPercent,
  placeCount,
  placesFor,
  placeVisibility,
} from "../places.js";

const BANNER = 2000 / 408;
const SOURCE = fileURLToPath(
  new URL(
    "../../../../../../../tradehub_core/tradehub_core/media/pipeline/simulator/placements.json",
    import.meta.url
  )
);

test(
  "vendor kopyası kaynak placements.json ile aynı sürümde",
  { skip: !existsSync(SOURCE) },
  () => {
    const sha = createHash("sha256").update(readFileSync(SOURCE)).digest("hex");
    assert.equal(
      SOURCE_SHA256,
      sha,
      "placements.json değişmiş: sizes.py --emit-placements admin koştur"
    );
  }
);

test("her slot için iki cihazda da en az bir yer", () => {
  for (const slot of ["company.cover_image", "seller.logo", "product.image"]) {
    assert.deepEqual(devicesFor(slot), ["desktop", "mobile"]);
    for (const d of ["desktop", "mobile"])
      assert.ok(placesFor(slot, d).length >= 1, `${slot}/${d}`);
  }
});

test("Özgen banner'ı: telefonda mağaza başlığında %44 görünür, 4 yerde kesilir", () => {
  const hero = placesFor("company.cover_image", "mobile").find((p) => p.key === "store_hero");
  const v = placeVisibility(hero, BANNER);
  assert.equal(v.pct, 44);
  assert.equal(v.full, false);
  assert.equal(cutPlaceCount("company.cover_image", BANNER), 4);
  assert.equal(placeCount("company.cover_image"), 4);
});

test("kare ürün görseli hiçbir yerde kesilmez", () => {
  assert.equal(cutPlaceCount("product.image", 1), 0);
  for (const p of placesFor("product.image", "desktop"))
    assert.equal(placeVisibility(p, 1).full, true);
});

test("ölçü bilinmiyorsa yüzde uydurulmaz, kesik sayılmaz", () => {
  const hero = placesFor("company.cover_image", "desktop")[0];
  assert.deepEqual(placeVisibility(hero, 0), {
    x: 1,
    y: 1,
    fraction: 1,
    pct: 100,
    full: true,
    unknown: true,
  });
  assert.equal(cutPlaceCount("company.cover_image", 0), 0);
  assert.equal(cutPlaceCount("company.cover_image", Number.NaN), 0);
});

test("boxStyle ölçeklenmiş genişlik + oran; ölçüsüz yerde %100", () => {
  const hero = placesFor("company.cover_image", "desktop").find((p) => p.key === "store_hero");
  assert.deepEqual(boxStyle(hero, 0.65), { width: "780px", maxWidth: "100%", aspectRatio: "3" });
  const fav = placesFor("product.image", "mobile").find((p) => p.key === "favorites");
  assert.equal(boxStyle(fav, 1).width, "100%");
});

test("formatPercent dile göre", () => {
  assert.equal(formatPercent(0.41, "tr"), "%41");
  assert.equal(formatPercent(0.41, "en"), "41%");
});
