import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createPinia, setActivePinia } from "pinia";
import { createSSRApp, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { renderToString } from "@vue/server-renderer";
import { createI18n } from "vue-i18n";

import tr from "../../../i18n/locales/tr.js";

/**
 * SidePanel grup akordeonu (2026-10-01, grid-rows 0fr↔1fr hareketi).
 *
 *   ÖLÇÜLÜR  — SSR çıktısında grup başlığının gerçek <button> olduğu,
 *              aria-expanded'ın store durumunu izlediği, aria-controls'un var
 *              olan bir gruba işaret ettiği; kapalı grubun `inert` olduğu
 *              (Tab ile içine girilemez, AT atlar), açık grubun olmadığı;
 *              SCSS'te max-height hilesinin dönmediği, yalnız izinli
 *              özelliklerin ($ease-out, 200ms token) geçtiği.
 *   ÖLÇÜLMEZ — gerçek tıklama ve animasyonun kendisi (SSR'de olay koşmaz);
 *              tıklamanın yerine store'un `toggleGroup`u render'dan önce çağrılır.
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const SIDE_PANEL = "/src/components/layout/SidePanel.vue";
const WEB_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15";
const SELLER = { is_seller: 1, is_admin: 0, full_name: "Test Satıcı" };

const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, "");
const noopStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const saved = {};
function installGlobal(key, value) {
  if (!(key in saved)) saved[key] = globalThis[key];
  globalThis[key] = value;
}

let server;
let useAuthStore;
let useNavigationStore;

before(async () => {
  installGlobal("localStorage", noopStorage);
  installGlobal("sessionStorage", noopStorage);
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    plugins: [vue()],
    resolve: { alias: { "@": `${frontendRoot}/src` } },
    server: { middlewareMode: true },
    appType: "custom",
  });
  // sass'ı global `window` takılmadan önce Node modunda ısıt (iosUpgradeCta deseni).
  await server.ssrLoadModule(SIDE_PANEL);
  ({ useAuthStore } = await server.ssrLoadModule("/src/stores/auth.js"));
  ({ useNavigationStore } = await server.ssrLoadModule("/src/stores/navigation.js"));
});

after(async () => {
  await server?.close();
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete globalThis[k];
    else globalThis[k] = v;
  }
});

async function render({ section = "products", open = [] } = {}) {
  const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
  const originalWindow = globalThis.window;
  globalThis.window = {
    navigator: { userAgent: WEB_UA },
    matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
  };
  try {
    const { default: Component } = await server.ssrLoadModule(SIDE_PANEL);
    const pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore(pinia).user = SELLER;
    const nav = useNavigationStore(pinia);
    nav.activeSection = section;
    for (const title of open) nav.toggleGroup(title);
    const app = createSSRApp({ render: () => h(Component) });
    app.use(pinia);
    app.use(createI18n({ legacy: false, locale: "tr", fallbackLocale: "tr", messages: { tr } }));
    app.use(
      createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/:pathMatch(.*)*", component: { render: () => null } }],
      })
    );
    const html = stripComments(await renderToString(app, {}));
    return { html, titles: nav.currentGroups.filter((g) => g.title).map((g) => g.title) };
  } finally {
    if (hadWindow) globalThis.window = originalWindow;
    else delete globalThis.window;
  }
}

/** Başlık düğmelerini ve işaret ettikleri grupları eşleştirir. */
function pairs(html) {
  const heads = [...html.matchAll(/<button([^>]*class="panel-group-title"[^>]*)>/g)].map(
    (m) => m[1]
  );
  return heads.map((attrs) => {
    const expanded = attrs.match(/aria-expanded="(\w+)"/)?.[1];
    const controls = attrs.match(/aria-controls="([^"]+)"/)?.[1];
    const group = html.match(new RegExp(`<div id="${controls}"([^>]*)>`))?.[1];
    return { attrs, expanded, controls, group };
  });
}

test("grup başlığı gerçek <button>; aria-controls var olan gruba işaret eder", async () => {
  const { html } = await render();
  const p = pairs(html);
  assert.ok(p.length > 0, "products bölümünde başlıklı grup olmalı");
  for (const { attrs, controls, group } of p) {
    assert.match(attrs, /type="button"/);
    assert.ok(controls, "aria-controls eksik");
    assert.ok(group, `aria-controls="${controls}" hiçbir gruba denk gelmiyor`);
  }
  assert.doesNotMatch(html, /<div[^>]*class="panel-group-title"/, "eski div başlık geri gelmiş");
});

test("kapalı grup: aria-expanded=false + inert; açılınca ikisi de döner", async () => {
  const closed = await render();
  for (const { expanded, group } of pairs(closed.html)) {
    assert.equal(expanded, "false");
    assert.match(group, /\binert\b/, "kapalı grup Tab/AT'ye açık kalmış");
    assert.doesNotMatch(group, /class="[^"]*\bopen\b/);
  }

  const first = closed.titles[0];
  const opened = await render({ open: [first] });
  const [head, ...rest] = pairs(opened.html);
  assert.equal(head.expanded, "true");
  assert.doesNotMatch(head.group, /\binert\b/, "açık grup inert kalmamalı");
  assert.match(head.group, /class="[^"]*\bopen\b/);
  for (const r of rest) assert.equal(r.expanded, "false", "yalnız açılan grup değişmeli");
});

test("SCSS: grid-rows 0fr↔1fr + opacity, $d-pop $ease-out; max-height/ease-in yok", () => {
  const scss = readFileSync(`${frontendRoot}/src/assets/scss/sidebar.scss`, "utf8");
  const block = scss
    .slice(scss.indexOf("// ── Panel Group (collapsible)"), scss.indexOf("// ── Panel Group Title"))
    .replace(/\/\/[^\n]*/g, ""); // yorumlar (eski max-height'tan söz eder) sayılmaz
  assert.match(block, /grid-template-rows: 0fr;/);
  assert.match(block, /grid-template-rows: 1fr;/);
  assert.match(block, /grid-template-rows \$d-pop \$ease-out/);
  assert.match(block, /opacity \$d-pop \$ease-out/);
  assert.match(block, /min-height: 0;/);
  assert.match(block, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(block, /max-height|transition:\s*all|ease-in[^-]/);

  const chev = scss.slice(scss.indexOf(".panel-group-chevron {"));
  assert.match(chev.slice(0, 400), /transition: transform \$d-pop \$ease-out/);
});

test("grup başlığı tam genişlik satır: global basış küçültmesi (0.97) uygulanmaz", () => {
  const scss = readFileSync(`${frontendRoot}/src/assets/scss/sidebar.scss`, "utf8");
  const title = scss.slice(
    scss.indexOf(".panel-group-title {"),
    scss.indexOf(".panel-group-title-left")
  );
  // Global kural `button:not(:disabled):not([aria-disabled="true"]):active` (0,3,1);
  // iptal kuralı ondan özgül olmalı, `!important`'a gerek kalmadan kazanmalı.
  assert.match(
    title,
    /&:not\(:disabled\):not\(\[aria-disabled="true"\]\):active \{\s*transform: none;/
  );
});
