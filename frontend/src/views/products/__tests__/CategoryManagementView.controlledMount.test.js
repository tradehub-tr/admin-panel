import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const source = readFileSync(
  new URL("src/views/products/CategoryManagementView.vue", `file://${frontendRoot}/`),
  "utf8"
);

test("CategoryManagement karşıt breakpoint araç çubuklarını birlikte mount etmez", () => {
  assert.match(
    source,
    /v-if="isLg"\s+class="hidden lg:flex items-center gap-2 flex-wrap"/
  );
  assert.match(source, /v-if="!isLg"\s+class="flex lg:hidden items-center gap-2 mt-3"/);
});

test("CategoryManagement cards görünümünde yalnız aktif breakpoint ağacı mount edilir", () => {
  assert.match(source, /<div v-if="!isLg" class="cat-m-wrap">/);
  assert.match(source, /<div v-else class="cat-cards-layout hidden lg:flex gap-4 items-start">/);
});

test("CategoryManagement tablo modunda gizli slug sütununu küçük ekranda mount etmez", () => {
  assert.match(
    source,
    /<th\s+v-if="isLg"\s+class="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden md:table-cell"/
  );
  assert.match(source, /<td v-if="isLg" class="px-4 py-2\.5 hidden md:table-cell">/);
});

test("CategoryManagement seçim ve düzenleme state'ini mount edilen ağaçtan bağımsız korur", () => {
  assert.match(source, /const selectedNode = ref\(null\)/);
  assert.match(source, /const selectedIds = ref\(new Set\(\)\)/);
  assert.match(source, /const formModal = ref\(/);
  assert.match(source, /const sideNodes = ref\(\[\]\)/);
  assert.match(source, /async function toggleExpand\(node\)/);
  assert.match(source, /parent: node\.id/);
});
