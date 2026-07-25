// Node 22 native test runner.
// Çalıştırma: node --test src/components/common/__tests__/iconStandardization.test.js

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { test } from "node:test";

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));

function readSource(relativePath) {
  return readFileSync(new URL(relativePath, `file://${frontendRoot}/`), "utf8");
}

const staticIconFiles = [
  "src/components/common/ChildTable.vue",
  "src/components/layout/IconRail.vue",
  "src/components/layout/NotificationPanel.vue",
  "src/components/layout/SidePanel.vue",
  "src/layouts/AppLayout.vue",
  "src/views/doctype/DocTypeFormView.vue",
  "src/views/messaging/BuyerMessagesView.vue",
  "src/views/seller/SuggestCertificationView.vue",
  "src/views/system/ThemeManagerView.vue",
];

test("sabit tek renkli ikonlar AppIcon kullanır", () => {
  for (const relativePath of staticIconFiles) {
    const source = readSource(relativePath);
    assert.doesNotMatch(source, /<svg\b/, `${relativePath} hâlâ inline SVG içeriyor`);
    assert.match(source, /<AppIcon\b/, `${relativePath} AppIcon kullanmıyor`);
  }
});

test("dinamik tamamlanma göstergesi inline SVG olarak korunur", () => {
  const source = readSource("src/views/seller/ListingFormView.vue");

  assert.match(source, /<svg class="w-9 h-9 -rotate-90"/);
  assert.match(source, /:stroke-dasharray=/);
});

test("native kontrol data-image SVG'leri korunur", () => {
  const subUserSource = readSource("src/views/seller/SubUserManagementView.vue");
  const helpdeskSource = readSource("src/assets/scss/helpdesk.scss");
  const themeSource = readSource("src/views/system/ThemeManagerView.vue");

  assert.equal(subUserSource.match(/data:image\/svg\+xml/g)?.length, 2);
  assert.equal(helpdeskSource.match(/data:image\/svg\+xml/g)?.length, 6);
  assert.equal(themeSource.match(/data:image\/svg\+xml/g)?.length, 1);
});
