import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const source = readFileSync(
  new URL("src/views/seller/ListingFormView.vue", `file://${frontendRoot}/`),
  "utf8"
);

const onDemandSections = [
  "details",
  "description",
  "pricing",
  "inventory",
  "media",
  "specs",
  "variants",
  "shipping",
  "seo",
  "statistics",
  "system",
];

test("kapalı ListingForm accordion bölümleri DOM'a mount edilmez", () => {
  for (const key of onDemandSections) {
    assert.doesNotMatch(
      source,
      new RegExp(`v-show="openSections\\.${key}"`),
      `${key} hâlâ yalnızca gizleniyor`
    );
    assert.match(
      source,
      new RegExp(`v-if="openSections\\.${key}"[\\s\\S]{0,120}id="sec-body-${key}"`),
      `${key} açık olduğunda mount edilmiyor`
    );
  }
});

test("accordion başlıkları açık-kapalı durumunu erişilebilir biçimde bildirir", () => {
  for (const key of onDemandSections) {
    assert.match(
      source,
      new RegExp(
        `:aria-expanded="openSections\\.${key} \\? 'true' : 'false'"[\\s\\S]{0,160}:aria-controls="openSections\\.${key} \\? 'sec-body-${key}' : undefined"`
      ),
      `${key} başlığında açık DOM gövdesiyle ARIA ilişkisi eksik`
    );
  }
});

test("accordion içindeki taslak form verisi component dışında reaktif tutulur", () => {
  assert.match(source, /const form = reactive\(/);
  assert.match(source, /const childData = reactive\(/);
  assert.match(source, /function saveDoc\(\)[\s\S]{0,5000}payload\.pricing_tiers/);
});
