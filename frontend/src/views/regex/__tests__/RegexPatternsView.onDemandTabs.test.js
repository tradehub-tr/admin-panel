import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const source = readFileSync(
  new URL("src/views/regex/RegexPatternsView.vue", `file://${frontendRoot}/`),
  "utf8"
);

const tabs = ["column", "value", "advanced"];

test("kapalı RegexPatterns sekme panelleri DOM'a mount edilmez", () => {
  for (const key of tabs) {
    assert.doesNotMatch(
      source,
      new RegExp(`v-show="activeTab === '${key}'"`),
      `${key} paneli hâlâ yalnızca gizleniyor`
    );
    assert.match(
      source,
      new RegExp(
        `v-if="activeTab === '${key}'"[\\s\\S]{0,160}id="regex-panel-${key}"[\\s\\S]{0,120}role="tabpanel"`
      ),
      `${key} paneli aktifken erişilebilir olarak mount edilmiyor`
    );
  }
});

test("RegexPatterns sekmeleri tab ve panel ARIA ilişkisini korur", () => {
  for (const key of tabs) {
    assert.match(
      source,
      new RegExp(
        `id="regex-tab-${key}"[\\s\\S]{0,220}:aria-controls="activeTab === '${key}' \\? 'regex-panel-${key}' : undefined"[\\s\\S]{0,120}:aria-selected="activeTab === '${key}'"`
      ),
      `${key} tab ARIA ilişkisi eksik`
    );
    assert.match(
      source,
      new RegExp(
        `id="regex-panel-${key}"[\\s\\S]{0,180}aria-labelledby="regex-tab-${key}"`
      ),
      `${key} panel ARIA ilişkisi eksik`
    );
  }
});

test("RegexPatterns sekmeleri klavye yön tuşlarıyla yönetilir", () => {
  assert.match(source, /@keydown="onTabKeydown"/);
  assert.match(source, /function onTabKeydown\(event\)/);
  assert.match(source, /case "ArrowRight":/);
  assert.match(source, /case "ArrowLeft":/);
  assert.match(source, /case "Home":/);
  assert.match(source, /case "End":/);
});

test("RegexPatterns editör taslakları panel componentlerinden bağımsız tutulur", () => {
  assert.match(source, /const colForm = ref\(/);
  assert.match(source, /const vmForm = ref\(/);
  assert.match(source, /const advForm = ref\(/);
  assert.match(source, /const rawForm = ref\(/);
});
