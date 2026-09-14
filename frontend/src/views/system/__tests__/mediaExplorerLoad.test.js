import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { setImmediate } from "node:timers";
import { JSDOM } from "jsdom";
import { compileScript, parse } from "@vue/compiler-sfc";

// Render the actual SFC; replace external services and unrelated child components.
const dom = new JSDOM("<!doctype html><html><body></body></html>");
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement"])
  globalThis[key] = dom.window[key];
const Vue = await import("vue");
const source = readFileSync(new URL("../MediaExplorerView.vue", import.meta.url), "utf8");
const { descriptor } = parse(source);
const compiled = compileScript(descriptor, { id: "media-explorer-load", inlineTemplate: true });
const program = compiled.content
  .replace(/import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'];?/g, (_, bindings, path) => {
    const target = path === "vue" ? "Vue" : `stubs[${JSON.stringify(path)}]`;
    if (bindings.trim().startsWith("{"))
      return `const ${bindings.replace(/\s+as\s+/g, ":")} = ${target};`;
    return `const ${bindings.trim()} = ${target};`;
  })
  .replace("export default", "return");

async function mount(responses) {
  let calls = 0;
  const blank = Vue.defineComponent({ render: () => Vue.h("span") });
  const stubs = new Proxy(
    {
      "vue-i18n": { useI18n: () => ({ t: (key) => key }) },
      "vue-router": { useRouter: () => ({ push() {} }) },
      "@/utils/api": {
        async callMethodGET() {
          const value = responses[calls++];
          if (value instanceof Error) throw value;
          return value;
        },
      },
      "@/utils/mediaFormat": { canRenderThumb: () => false, formatSize: String },
      "@/composables/useMediaAccess": { useMediaAccess: () => ({}) },
      "@/composables/useToast": { useToast: () => ({ error() {}, success() {} }) },
      "@/components/media/MediaFolderGrid.vue": Vue.defineComponent({
        props: ["items"],
        setup: (props) => () =>
          Vue.h("div", { "data-folder-grid": "" }, String(props.items.length)),
      }),
    },
    { get: (target, key) => target[key] || blank }
  );
  const view = new Function("Vue", "stubs", program)(Vue, stubs);
  const host = document.createElement("div");
  document.body.append(host);
  const app = Vue.createApp(view);
  app.mount(host);
  const settle = async () => {
    await new Promise((resolve) => setImmediate(resolve));
    await Vue.nextTick();
  };
  await settle();
  return {
    host,
    settle,
    calls: () => calls,
    close: () => {
      app.unmount();
      host.remove();
    },
  };
}

test("API failure shows alert/retry and never an empty folder; retry can recover", async () => {
  const view = await mount([new Error("backend module missing"), { message: { folders: [] } }]);
  try {
    assert.match(view.host.querySelector('[role="alert"]').textContent, /mediaExplorer.loadFailed/);
    assert.equal(view.host.querySelector("[data-folder-grid]"), null);
    assert.doesNotMatch(view.host.textContent, /backend module missing/);
    assert.equal(view.host.querySelectorAll(".mx__tree-count").length, 0);
    const retry = [...view.host.querySelectorAll("button")].find((b) =>
      b.textContent.includes("mediaExplorer.retry")
    );
    assert.ok(retry);
    retry.click();
    await view.settle();
    assert.equal(view.calls(), 2);
    assert.equal(view.host.querySelector('[role="alert"]'), null);
    assert.equal(view.host.querySelector("[data-folder-grid]").textContent, "0");
  } finally {
    view.close();
  }
});
test("successful empty response renders the normal empty folder branch", async () => {
  const view = await mount([{ message: { folders: [] } }]);
  try {
    assert.equal(view.host.querySelector('[role="alert"]'), null);
    assert.equal(view.host.querySelector("[data-folder-grid]").textContent, "0");
  } finally {
    view.close();
  }
});
test("malformed success response is displayed as a load error", async () => {
  const view = await mount([{ message: null }]);
  try {
    assert.ok(view.host.querySelector('[role="alert"]'));
    assert.equal(view.host.querySelector("[data-folder-grid]"), null);
  } finally {
    view.close();
  }
});
