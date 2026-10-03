// Sunucu ↔ panel şablon dili eşdeğerliği (node:test).
//
// `fixtures/notification_template_cases.json`, sunucudaki
// `tradehub_core/tests/fixtures/notification_template_cases.json` dosyasının BAYT BAYT
// kopyasıdır; sunucu aynı dosyayı `tests/test_notification_template_lang.py` ile okur.
// İki taraf aynı girdide aynı sonucu vermeli. Fixture değişirse iki kopya birlikte güncellenir.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { render, structureIssue } from "../template.js";
import { validUrl } from "../validation.js";

const cases = JSON.parse(
  readFileSync(new URL("./fixtures/notification_template_cases.json", import.meta.url), "utf8")
);

// Sunucu testindeki değişken tanımlarıyla aynı.
const URL_VARIABLES = [
  { name: "order_url", type: "url" },
  { name: "order_no", type: "text" },
];

test("parity: fixture üç bölümü de taşıyor", () => {
  assert.ok(cases.render.length > 0);
  assert.ok(cases.structure.length > 0);
  assert.ok(cases.url.length > 0);
});

for (const c of cases.render) {
  test(`parity render: ${c.name}`, () => {
    assert.equal(render(c.template, c.scope, c.mode || "text"), c.expected);
  });
}

for (const c of cases.structure) {
  test(`parity structure: ${c.name}`, () => {
    assert.equal(structureIssue(c.template), c.issue);
  });
}

for (const c of cases.url) {
  test(`parity url: ${c.value}`, () => {
    assert.equal(validUrl(c.value, URL_VARIABLES), c.ok);
  });
}
