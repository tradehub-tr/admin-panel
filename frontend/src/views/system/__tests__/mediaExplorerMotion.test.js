import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { setImmediate } from "node:timers";
import { JSDOM } from "jsdom";
import { compileScript, parse } from "@vue/compiler-sfc";

/**
 * Medya ekranlarının hafif hareket sözleşmesi.
 *
 *   ÖLÇÜLDÜ  — Yönetici gezgini gerçek SFC olarak basılır: yükleme kartı
 *              yalnız İLK yüklemede; sonraki klasör geçişinde eski içerik
 *              yerinde kalır (aria-busy + inert), veri gelince yeni anahtarla
 *              değişir. Diğer ekranlarda geçiş sarmalayıcısı ve anahtarları
 *              metinden kontrol edilir.
 *   ÖLÇÜLMEDİ — gerçek kare zamanlaması ve eğri (tarayıcı işi).
 */

const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement"])
  globalThis[key] = dom.window[key];
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
const Vue = await import("vue");
const regionFocus = await import("../../../lib/media/regionFocus.js");

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const read = (p) => readFileSync(new URL(p, `file://${frontendRoot}/`), "utf8");

const adminSource = read("src/views/system/MediaExplorerView.vue");
const sellerSource = read("src/views/seller/SellerMediaExplorerView.vue");
const librarySource = read("src/views/seller/MediaLibraryView.vue");
const gridSource = read("src/components/media/MediaFolderGrid.vue");

const { descriptor } = parse(adminSource);
const compiled = compileScript(descriptor, { id: "media-explorer-motion", inlineTemplate: true });
const program = compiled.content
  .replace(/import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'];?/g, (_, bindings, path) => {
    const target = path === "vue" ? "Vue" : `stubs[${JSON.stringify(path)}]`;
    if (bindings.trim().startsWith("{"))
      return `const ${bindings.replace(/\s+as\s+/g, ":")} = ${target};`;
    return `const ${bindings.trim()} = ${target};`;
  })
  .replace("export default", "return");

/** `responses` öğesi değer, Error ya da elle çözülen bir Promise olabilir. */
async function mount(responses) {
  let calls = 0;
  const blank = Vue.defineComponent({ render: () => Vue.h("span") });
  const stubs = new Proxy(
    {
      "vue-i18n": { useI18n: () => ({ t: (key) => key }) },
      "vue-router": { useRouter: () => ({ push() {} }) },
      "@/utils/api": {
        async callMethodGET() {
          const value = await responses[calls++];
          if (value instanceof Error) throw value;
          return value;
        },
      },
      "@/utils/mediaFormat": { canRenderThumb: () => false, formatSize: String },
      "@/composables/useMediaAccess": { useMediaAccess: () => ({}) },
      "@/composables/useToast": { useToast: () => ({ error() {}, success() {} }) },
      "@/lib/media/regionFocus": regionFocus,
      "@/components/media/MediaFolderGrid.vue": Vue.defineComponent({
        props: ["items"],
        emits: ["select"],
        setup:
          (props, { emit }) =>
          () =>
            Vue.h(
              "button",
              { "data-folder-grid": "", onClick: () => emit("select", props.items[0]) },
              props.items.map((f) => f.id).join(",")
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
    await new Promise((resolve) => setImmediate(resolve));
    await Vue.nextTick();
  };
  await settle();
  return {
    host,
    settle,
    close: () => {
      app.unmount();
      host.remove();
    },
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

test("yükleme kartı yalnız ilk yüklemede; klasör geçişinde eski içerik kalır", async () => {
  const first = deferred();
  const second = deferred();
  const view = await mount([first.promise, second.promise]);
  const region = () => view.host.querySelector(".mx__region");
  const bootCard = () =>
    [...view.host.querySelectorAll(".mx__empty-card")].find((el) =>
      el.textContent.includes("mediaExplorer.loading")
    );
  try {
    // İlk yükleme: kart görünür; `inert` yalnız sonraki yüklemelerde.
    assert.ok(bootCard(), "ilk yüklemede yükleme kartı görünür");
    assert.equal(region().getAttribute("aria-busy"), "true");
    assert.equal(region().hasAttribute("inert"), false);

    first.resolve({ message: { folders: [{ id: "public", count: 3 }] } });
    await view.settle();
    assert.equal(bootCard(), undefined);
    assert.equal(region().getAttribute("aria-busy"), "false");
    const oldSwap = view.host.querySelector(".mx__swap");
    assert.equal(view.host.querySelector("[data-folder-grid]").textContent, "public");

    // Klasöre gir: ikinci yanıt bekliyor.
    view.host.querySelector("[data-folder-grid]").click();
    await view.settle();
    assert.equal(bootCard(), undefined, "sonraki yüklemede kart YOK");
    assert.equal(view.host.querySelector("[data-folder-grid]").textContent, "public");
    assert.equal(view.host.querySelector(".mx__swap"), oldSwap, "eski içerik yerinde");
    assert.equal(region().getAttribute("aria-busy"), "true");
    assert.ok(region().hasAttribute("inert"), "eski içerik yüklenirken tıklanamaz");

    second.resolve({ message: { folders: [{ id: "STORE-1", count: 3 }] } });
    await view.settle();
    assert.equal(bootCard(), undefined);
    assert.equal(region().getAttribute("aria-busy"), "false");
    assert.equal(region().hasAttribute("inert"), false);
    // Yeni anahtar → yeni sarmalayıcı; eskisi beklemeden kalktı.
    const swaps = view.host.querySelectorAll(".mx__swap");
    assert.equal(swaps.length, 1);
    assert.notEqual(swaps[0], oldSwap);
    assert.equal(view.host.querySelector("[data-folder-grid]").textContent, "STORE-1");
  } finally {
    view.close();
  }
});

test("odak: ilk açılışta taşınmaz; kart tıklamasından sonra içerik bölgesine geçer", async () => {
  const next = deferred();
  const view = await mount([{ message: { folders: [{ id: "public", count: 3 }] } }, next.promise]);
  try {
    assert.equal(document.activeElement, document.body, "ilk yüklemede odak yerinde");
    const card = view.host.querySelector("[data-folder-grid]");
    card.focus();
    card.click();
    await view.settle();
    next.resolve({ message: { folders: [{ id: "STORE-1", count: 3 }] } });
    await view.settle();
    const region = view.host.querySelector(".mx__region");
    assert.equal(region.getAttribute("tabindex"), "-1");
    assert.equal(document.activeElement, region, "kaybolan kartın yerine bölge odaklanır");
  } finally {
    view.close();
  }
});

test("odak: ağaçtan geçişte odak tıklanan ağaç düğmesinde kalır", async () => {
  const next = deferred();
  const view = await mount([{ message: { folders: [{ id: "public", count: 3 }] } }, next.promise]);
  try {
    const tree = [...view.host.querySelectorAll(".mx__tr")].find((b) =>
      b.textContent.includes("mediaExplorer.folder.private")
    );
    tree.focus();
    tree.click();
    await view.settle();
    next.resolve({ message: { folders: [{ id: "__other__", count: 1 }] } });
    await view.settle();
    assert.equal(document.activeElement, tree);
  } finally {
    view.close();
  }
});

test("odak halkası: içerik bölgesi 3px görünür halka taşır", () => {
  for (const [src, cls] of [
    [adminSource, "mx__region"],
    [sellerSource, "sx__region"],
  ]) {
    const block = src.slice(src.indexOf(`.${cls} {`));
    assert.match(block.slice(0, 400), /&:focus-visible \{\s*outline: 3px solid/);
  }
});

test("gezgin şablonları anahtarlı geçiş sarmalayıcısı taşır", () => {
  assert.match(adminSource, /<Transition name="mx-swap" @leave="leaveNow">/);
  assert.match(adminSource, /<div v-if="!hasLoaded" key="boot"/);
  assert.match(adminSource, /<div v-else :key="shownKey" class="mx__swap">/);
  assert.match(adminSource, /:aria-busy="loading \? 'true' : 'false'"/);

  assert.match(sellerSource, /<Transition name="sx-swap" @leave="leaveNow">/);
  assert.match(sellerSource, /v-if="isLoading && !hasLoaded" key="boot"/);
  assert.match(sellerSource, /<div v-else :key="shownKey" class="sx__swap">/);
  // Arama konum anahtarına girmez — aramada içerik yeniden belirmez.
  const locationKey = sellerSource.slice(sellerSource.indexOf("const locationKey"));
  assert.doesNotMatch(locationKey.slice(0, locationKey.indexOf(");")), /search/i);

  // Giden içerik beklemeden kalkar (ease-in çıkış yok).
  for (const src of [adminSource, sellerSource, librarySource])
    assert.match(src, /const leaveNow = \(_el, done\) => done\(\);/);
});

test("klasör kartları yalnız ilk basımda, ilk 6'sı kademeli girer", () => {
  assert.match(gridSource, /'mfgrid--enter': entering/);
  assert.match(gridSource, /@for \$i from 2 through 6/);
  assert.match(gridSource, /\(\$i - 1\) \* 30ms/);
  assert.match(gridSource, /translateY\(6px\)/);
  // Azaltılmış harekette kayma ve kademe kalkar, opacity kalır.
  assert.match(gridSource, /prefers-reduced-motion: reduce[\s\S]*?mfgrid-fade/);
});

test("kütüphane sonuçları kip/sütun/sayfa anahtarıyla belirir, filtreyle değil", () => {
  assert.match(librarySource, /<Transition name="mswap" @leave="leaveNow">/);
  assert.match(librarySource, /<div :key="resultsKey" class="mswap">/);
  const key = librarySource.slice(librarySource.indexOf("const resultsKey"));
  const body = key.slice(0, key.indexOf(");"));
  assert.match(body, /effectiveMode\.value/);
  assert.match(body, /gridColumns\.value/);
  assert.match(body, /pageSwap\.value/);
  assert.doesNotMatch(body, /search|filter/i);
  // Kart başına hareket yok: TransitionGroup/FLIP pencerelemeyi bozardı.
  assert.doesNotMatch(librarySource, /<TransitionGroup/);
  // Mevcut geçişler yerinde.
  assert.match(librarySource, /<Transition name="mdetail">/);
  assert.match(librarySource, /<Transition name="dropdown">/);
});
