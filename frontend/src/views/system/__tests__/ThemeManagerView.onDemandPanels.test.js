import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const source = readFileSync(
  new URL("src/views/system/ThemeManagerView.vue", `file://${frontendRoot}/`),
  "utf8"
);

test("ThemeManager yalnız aktif token grubunu ve ilgili ağır preview'i üretir", () => {
  assert.match(source, /const groups = computed\(\(\) => \{/);
  assert.match(source, /<template v-if="activeTab === 'productCards'">/);
  assert.match(source, /<template v-if="activeTab !== 'productCards'">/);
});

test("ThemeManager sekmeleri erişilebilir tab ilişkisinde tutar", () => {
  assert.match(source, /role="tablist"/);
  assert.equal((source.match(/role="tab"/g) || []).length, 6);
  assert.match(source, /:aria-selected="activeTab === 'palette' \? 'true' : 'false'"/);
  assert.match(
    source,
    /:aria-controls="activeTab === 'palette' \? 'thm-panel-palette' : undefined"/
  );
  assert.match(source, /:id="`thm-panel-\$\{activeTab\}`"/);
});

test("ThemeManager sekmeleri klavyeyle değiştirir ve taslağı panel ömründen bağımsız tutar", () => {
  assert.match(source, /@keydown="onThemeTabKeydown\(\$event, 0\)"/);
  assert.match(source, /function onThemeTabKeydown\(event, currentIndex\)/);
  assert.match(source, /const draft = ref\(\{\}\)/);
  assert.match(source, /function setValue\(varName, value\)/);
});
