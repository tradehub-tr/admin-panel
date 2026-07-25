import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));

async function renderIcon(name) {
  const server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    plugins: [vue()],
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { default: AppIcon } = await server.ssrLoadModule("/src/components/common/AppIcon.vue");
    return renderToString(createSSRApp({ render: () => h(AppIcon, { name, size: 18 }) }));
  } finally {
    await server.close();
  }
}

test("AppIcon bilinen Lucide ikonunu SVG olarak render eder", async () => {
  const html = await renderIcon("bell");

  assert.match(html, /<svg\b/);
  assert.match(html, /width="18"/);
});

test("AppIcon eski alias adlarını korur", async () => {
  const html = await renderIcon("alert-triangle");

  assert.match(html, /<svg\b/);
  assert.match(html, /lucide-triangle-alert/);
});

test("AppIcon eski ekrânlarda kullanılan eksik ikon adlarını da render eder", async () => {
  const names = [
    "align-left",
    "bar-chart-2",
    "kanban-square",
    "more-vertical",
    "x-octagon",
    "cube",
  ];

  for (const name of names) {
    const html = await renderIcon(name);
    assert.match(html, /<svg\b/, `${name} için SVG render edilmedi`);
  }
});

test("AppIcon bilinmeyen adı boş bırakır", async () => {
  const html = await renderIcon("kullanici-adi-degil");

  assert.doesNotMatch(html, /<svg\b/);
});
