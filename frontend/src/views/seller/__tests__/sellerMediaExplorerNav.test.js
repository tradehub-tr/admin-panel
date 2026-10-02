import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { setImmediate } from "node:timers";
import { JSDOM } from "jsdom";
import { compileScript, parse } from "@vue/compiler-sfc";

/**
 * Satıcı Medya Gezgini — klasör geçişi sırasında içerik ve odak.
 *
 *   ÖLÇÜLDÜ  — gerçek SFC basılır (gerçek `useMediaBrowser`, sahte uçlar):
 *              geç dönen eski yanıt düşer; yükleme sürerken soluk içerik ESKİ
 *              klasörün alt klasörlerini gösterir; kart tıklamasından sonra
 *              odak içerik bölgesine geçer, kırıntıdaki odak yerinde kalır.
 *   ÖLÇÜLMEDİ — `inert`'in tarayıcıdaki odak düzeltmesi (JSDOM uygulamaz).
 */

const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement"])
  globalThis[key] = dom.window[key];
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
const Vue = await import("vue");
const { useMediaBrowser } = await import("../../../composables/useMediaBrowser.js");
const regionFocus = await import("../../../lib/media/regionFocus.js");

const source = readFileSync(new URL("../SellerMediaExplorerView.vue", import.meta.url), "utf8");
const { descriptor } = parse(source);
const compiled = compileScript(descriptor, { id: "seller-explorer-nav", inlineTemplate: true });
const program = compiled.content
  .replace(/import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'];?/g, (_, bindings, path) => {
    const target = path === "vue" ? "Vue" : `stubs[${JSON.stringify(path)}]`;
    if (bindings.trim().startsWith("{"))
      return `const ${bindings.replace(/\s+as\s+/g, ":")} = ${target};`;
    return `const ${bindings.trim()} = ${target};`;
  })
  .replace("export default", "return");

function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

/**
 * `browse` / `folder` sırayla tüketilen yanıt kuyrukları; öğe değer ya da
 * elle çözülen Promise olabilir.
 */
async function mount({ browse = [], folder = [], realFolders = [] }) {
  let b = 0;
  let f = 0;
  const blank = Vue.defineComponent({ render: () => Vue.h("span") });
  const stubs = new Proxy(
    {
      "vue-i18n": { useI18n: () => ({ t: (key) => key, locale: Vue.ref("tr") }) },
      "vue-router": { useRouter: () => ({ push() {} }) },
      "@/utils/api": {
        async callMethodGET() {
          return { message: await browse[b++] };
        },
      },
      "@/utils/dateFormat": { formatDay: String },
      "@/utils/mediaFormat": { canRenderThumb: () => false, formatSize: String },
      "@/composables/useMediaBrowser": { useMediaBrowser },
      "@/composables/useSellerMedia": {
        useSellerMedia: () => ({
          listFolders: async () => ({ folders: realFolders, max_depth: 5 }),
          folderMedia: async () => folder[f++],
        }),
      },
      "@/composables/useToast": { useToast: () => ({ error() {}, success() {} }) },
      "@/lib/media/folderDrag": {
        MAX_MEDIA_FOLDER_MOVE: 100,
        readMediaFolderDrag: () => [],
        writeMediaFolderDrag: () => [],
      },
      "@/lib/media/regionFocus": regionFocus,
      // Kırıntı kalıcı düğmeler basar: tıklanan düğme DOM'da kalır.
      "@/components/media/MediaCrumbs.vue": Vue.defineComponent({
        props: ["items"],
        emits: ["jump"],
        setup:
          (props, { emit }) =>
          () =>
            Vue.h(
              "div",
              props.items.map((c) =>
                Vue.h(
                  "button",
                  { "data-crumb": c.key, key: c.key, onClick: () => emit("jump", c.key) },
                  c.label
                )
              )
            ),
      }),
      "@/components/media/MediaFolderGrid.vue": Vue.defineComponent({
        props: ["items"],
        emits: ["select"],
        setup:
          (props, { emit }) =>
          () =>
            Vue.h(
              "div",
              { "data-folder-grid": "" },
              props.items.map((it) =>
                Vue.h(
                  "button",
                  { "data-card": it.id, key: it.id, onClick: () => emit("select", it) },
                  it.id
                )
              )
            ),
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
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setImmediate(resolve));
      await Vue.nextTick();
    }
  };
  await settle();
  return {
    host,
    settle,
    cards: () => [...host.querySelectorAll("[data-card]")].map((el) => el.dataset.card),
    region: () => host.querySelector(".sx__region"),
    close: () => {
      app.unmount();
      host.remove();
    },
  };
}

const ROOT = { folders: [{ id: "public", count: 3 }] };
const REAL = [
  { name: "F1", folder_name: "Kampanya", parent_folder: "", file_count: 0 },
  { name: "F2", folder_name: "Yaz", parent_folder: "F1", file_count: 0 },
  { name: "F3", folder_name: "Kış", parent_folder: "F1", file_count: 0 },
];

test("sanal ağaç: geç dönen eski yanıt yeni klasörün içeriğini ezmez", async () => {
  const slow = deferred();
  const fast = deferred();
  const view = await mount({ browse: [ROOT, slow.promise, fast.promise] });
  try {
    view.host.querySelector('[data-card="public"]').click(); // yavaş istek
    await view.settle();
    view.host.querySelector('[data-crumb="root"]').click(); // hızlı istek
    await view.settle();

    fast.resolve({ folders: [{ id: "chat", count: 1 }] });
    await view.settle();
    assert.deepEqual(view.cards(), ["chat"]);
    assert.equal(view.region().getAttribute("aria-busy"), "false");

    slow.resolve({ folders: [{ id: "CAT-9", count: 1 }] });
    await view.settle();
    assert.deepEqual(view.cards(), ["chat"], "eski yanıt düşürüldü");
    assert.equal(view.region().getAttribute("aria-busy"), "false");
  } finally {
    view.close();
  }
});

test("gerçek klasör: yükleme sürerken soluk içerik ESKİ klasörün alt klasörlerini gösterir", async () => {
  const files = deferred();
  const view = await mount({ browse: [ROOT], folder: [files.promise], realFolders: REAL });
  try {
    assert.deepEqual(view.cards(), ["public", "F1"]);
    view.host.querySelector('[data-card="F1"]').click();
    await view.settle();
    // Kırıntı yeni klasörde; içerik veri gelene kadar kökte.
    assert.ok(view.host.querySelector('[data-crumb="F1"]'));
    assert.deepEqual(view.cards(), ["public", "F1"], "yeni klasörün alt klasörleri sızmadı");
    assert.equal(view.host.querySelector(".sx__list"), null, "boş dosya listesi sızmadı");
    assert.equal(view.region().getAttribute("aria-busy"), "true");

    files.resolve({ items: [], total: 0 });
    await view.settle();
    assert.deepEqual(view.cards(), ["F2", "F3"]);
    assert.ok(view.host.querySelector(".sx__list"));
  } finally {
    view.close();
  }
});

test("gerçek klasör: geç dönen eski klasör yanıtı düşer", async () => {
  const slow = deferred();
  const fast = deferred();
  const view = await mount({
    browse: [ROOT],
    folder: [slow.promise, fast.promise],
    realFolders: REAL,
  });
  try {
    view.host.querySelector('[data-card="F1"]').click();
    await view.settle();
    // F1 yüklenirken kırıntıdan köke dönülüp tekrar F1'e girilirse ikinci
    // istek kazanır. Kök, gerçek klasör kipinde yükleme istemez.
    view.host.querySelector('[data-crumb="root"]').click();
    await view.settle();
    view.host.querySelector('[data-card="F1"]').click();
    await view.settle();
    fast.resolve({
      items: [{ fileUrl: "/files/yeni.webp", fileName: "yeni.webp", docName: "n" }],
      total: 1,
    });
    await view.settle();
    assert.match(view.host.querySelector(".sx__list").textContent, /yeni\.webp/);

    slow.resolve({
      items: [{ fileUrl: "/files/eski.webp", fileName: "eski.webp", docName: "o" }],
      total: 1,
    });
    await view.settle();
    assert.match(view.host.querySelector(".sx__list").textContent, /yeni\.webp/);
    assert.doesNotMatch(view.host.querySelector(".sx__list").textContent, /eski\.webp/);
  } finally {
    view.close();
  }
});

test("odak: ilk açılışta taşınmaz; kart tıklamasından sonra içerik bölgesine geçer", async () => {
  const next = deferred();
  const view = await mount({ browse: [ROOT, next.promise] });
  try {
    assert.equal(document.activeElement, document.body, "ilk yüklemede odak yerinde");
    const card = view.host.querySelector('[data-card="public"]');
    card.focus();
    card.click();
    await view.settle();
    next.resolve({ folders: [{ id: "CAT-1", count: 1 }] });
    await view.settle();
    const region = view.region();
    assert.equal(region.getAttribute("tabindex"), "-1");
    assert.equal(document.activeElement, region, "kaybolan kartın yerine bölge odaklanır");
  } finally {
    view.close();
  }
});

test("odak: kırıntıdan geçişte odak tıklanan kırıntıda kalır", async () => {
  const deeper = deferred();
  const back = deferred();
  const view = await mount({ browse: [ROOT, deeper.promise, back.promise] });
  try {
    view.host.querySelector('[data-card="public"]').click();
    deeper.resolve({ folders: [{ id: "CAT-1", count: 1 }] });
    await view.settle();
    const crumb = view.host.querySelector('[data-crumb="root"]');
    crumb.focus();
    crumb.click();
    await view.settle();
    back.resolve(ROOT);
    await view.settle();
    assert.equal(document.activeElement, view.host.querySelector('[data-crumb="root"]'));
  } finally {
    view.close();
  }
});
