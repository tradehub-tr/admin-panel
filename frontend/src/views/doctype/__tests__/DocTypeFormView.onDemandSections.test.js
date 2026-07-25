import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const source = readFileSync(
  new URL("src/views/doctype/DocTypeFormView.vue", `file://${frontendRoot}/`),
  "utf8"
);

test("DocTypeForm kapalı mobil section gövdelerini DOM'dan çıkarır", () => {
  assert.match(source, /v-if="!isMobileAccordion \|\| openSections\[tab\.id\]"/);
  assert.doesNotMatch(source, /v-show="!isMobileAccordion \|\| openSections\[tab\.id\]"/);
});

test("DocTypeForm accordion kontrolünü yalnız mevcut gövdeye bağlar", () => {
  assert.match(
    source,
    /:aria-controls="openSections\[tab\.id\] \? `dtf-sec-body-\$\{tab\.id\}` : undefined"/
  );
  assert.match(source, /:aria-expanded="openSections\[tab\.id\] \? 'true' : 'false'"/);
});

test("DocTypeForm desktop tabları klavye ve ARIA ile etkinleştirir", () => {
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tab"/);
  assert.match(source, /@keydown="onTabKeydown\(\$event, tabIdx\)"/);
  assert.match(source, /function onTabKeydown\(event, currentIndex\)/);
});

test("DocTypeForm form ve child-table state'ini section mount ömründen bağımsız korur", () => {
  assert.match(source, /const formData = ref\(\{\}\)/);
  assert.match(source, /const childTableData = reactive\(\{\}\)/);
  assert.match(source, /const openSections = reactive\(\{\}\)/);
});
