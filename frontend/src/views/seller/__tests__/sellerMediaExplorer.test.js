import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { createI18n } from "vue-i18n";
import { createMemoryHistory, createRouter } from "vue-router";
import { renderToString } from "@vue/server-renderer";

import { useMediaBrowser } from "../../../composables/useMediaBrowser.js";
import tr from "../../../i18n/locales/tr.js";

// Satıcı Medya Gezgini: satıcı KENDİ medyasını klasör ağacında gezer —
// mağaza dosyaları (kategori → ürün → dosyalar), özel dosyalar ve sohbet
// ekleri. Mağaza sunucuda oturumdan çözülür; ekran mağaza seçtirmez ve uca
// `store` parametresi göndermez.

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const read = (p) => readFileSync(new URL(p, `file://${frontendRoot}/`), "utf8");

const view = read("src/views/seller/SellerMediaExplorerView.vue");
const router = read("src/router/index.js");
const nav = read("src/data/navigation.js");

const SELLER_KEYS = ["scope", "category", "listing"];

/** Sunucu yerine geçen basit ağaç — gezinmenin gerçekten ne çağırdığını görür. */
function fakeBackend() {
  const calls = [];
  const fetchLevel = async (params) => {
    calls.push(params);
    const { scope, category, listing } = params;
    if (!scope) {
      return {
        folders: [
          { id: "public", label: "", count: 12 },
          { id: "private", label: "", count: 3 },
          { id: "chat", label: "", count: 5 },
        ],
      };
    }
    if (scope === "public" && !category) {
      return { folders: [{ id: "CAT-1", label: "Vanalar", count: 9 }] };
    }
    if (scope === "public" && !listing) {
      return { folders: [{ id: "LST-7", label: "Küresel vana 2 inç", count: 4 }] };
    }
    return {
      items: [
        { name: "f1", file_name: "vana.webp", file_url: "/files/vana.webp", file_size: 2048 },
      ],
      total: 4,
    };
  };
  return { calls, fetchLevel };
}

test("kök seviyede üç klasör listelenir, dosya seviyesi değildir", async () => {
  const { calls, fetchLevel } = fakeBackend();
  const b = useMediaBrowser({ keys: SELLER_KEYS, fetchLevel, rootLabel: "Medyam" });

  await b.load();

  assert.deepEqual(
    b.folders.value.map((f) => f.id),
    ["public", "private", "chat"]
  );
  assert.equal(b.atFileLevel.value, false);
  assert.equal(b.currentCount.value, 20);
  assert.equal(b.breadcrumb.value.length, 1);
  assert.equal(b.breadcrumb.value[0].label, "Medyam");
  // İzolasyonun dayanağı: mağaza istemciden GÖNDERİLMEZ.
  assert.equal("store" in calls[0], false);
  assert.deepEqual(Object.keys(calls[0]).sort(), [
    "category",
    "listing",
    "page",
    "page_size",
    "scope",
    "search",
  ]);
});

test("klasöre girildikçe kırıntı derinleşir, geri dönünce kısalır", async () => {
  const { calls, fetchLevel } = fakeBackend();
  const b = useMediaBrowser({ keys: SELLER_KEYS, fetchLevel, rootLabel: "Medyam" });
  await b.load();

  await b.enter({ id: "public" }, "Mağaza dosyalarım");
  assert.equal(b.path.value.scope, "public");
  assert.deepEqual(
    b.breadcrumb.value.map((c) => c.label),
    ["Medyam", "Mağaza dosyalarım"]
  );

  await b.enter({ id: "CAT-1", label: "Vanalar" });
  await b.enter({ id: "LST-7", label: "Küresel vana 2 inç" });
  assert.deepEqual(b.path.value, { scope: "public", category: "CAT-1", listing: "LST-7" });
  assert.deepEqual(
    b.breadcrumb.value.map((c) => c.label),
    ["Medyam", "Mağaza dosyalarım", "Vanalar", "Küresel vana 2 inç"]
  );
  // Ürün klasörünün içi dosya seviyesi — karar yanıttan geliyor, derinlikten değil.
  assert.equal(b.atFileLevel.value, true);
  assert.equal(b.total.value, 4);
  assert.equal(calls.at(-1).listing, "LST-7");

  await b.jump("scope");
  assert.deepEqual(b.path.value, { scope: "public", category: "", listing: "" });
  assert.equal(b.breadcrumb.value.length, 2);

  await b.jump("root");
  assert.deepEqual(b.path.value, { scope: "", category: "", listing: "" });
  assert.equal(b.breadcrumb.value.length, 1);
});

test("özel dosyalar ve sohbet ekleri kökün hemen altında dosya seviyesidir", async () => {
  const { fetchLevel } = fakeBackend();
  const b = useMediaBrowser({ keys: SELLER_KEYS, fetchLevel });
  await b.load();

  await b.enter({ id: "private" });
  assert.equal(b.atFileLevel.value, true);
  assert.equal(b.files.value.length, 1);
});

test("uç hata verirse ekran çökmez — boş durum ve hata metni kalır", async () => {
  const b = useMediaBrowser({
    keys: SELLER_KEYS,
    fetchLevel: async () => {
      throw new Error("404 Not Found");
    },
  });

  // Uç henüz yayında olmayabilir; load() fırlatmamalı.
  await assert.doesNotReject(() => b.load());
  assert.deepEqual(b.folders.value, []);
  assert.deepEqual(b.files.value, []);
  assert.equal(b.total.value, 0);
  assert.equal(b.atFileLevel.value, false);
  assert.equal(b.loading.value, false);
  assert.match(b.error.value, /404/);
});

test("hatadan sonraki başarılı yükleme hata durumunu temizler", async () => {
  let patla = true;
  const b = useMediaBrowser({
    keys: SELLER_KEYS,
    fetchLevel: async () => {
      if (patla) throw new Error("500");
      return { folders: [{ id: "public", count: 1 }] };
    },
  });
  await b.load();
  patla = false;
  await b.load();

  assert.equal(b.error.value, "");
  assert.equal(b.folders.value.length, 1);
});

test("görünüm uç yokken çökmeden render edilir ve boş durumu gösterir", async () => {
  const server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    plugins: [vue()],
    resolve: { alias: { "@": `${frontendRoot}/src` } },
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { default: View } = await server.ssrLoadModule(
      "/src/views/seller/SellerMediaExplorerView.vue"
    );
    const i18n = createI18n({
      legacy: false,
      globalInjection: true,
      locale: "tr",
      messages: { tr },
    });
    const memoryRouter = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/:pathMatch(.*)*", component: { template: "<div />" } }],
    });
    const app = createSSRApp({ render: () => h(View) });
    app.use(i18n);
    app.use(memoryRouter);

    // SSR'de `onMounted` çalışmaz: veri gelmemiş hâl budur — çökme değil,
    // boş klasör ekranı beklenir.
    const html = await renderToString(app);

    assert.match(html, /Medya Gezgini/);
    assert.match(html, /Bu klasör boş/);
    // Kök klasör kartları veri geldiğinde basılır; ızgara kabı hazır olmalı.
    assert.match(html, /mfgrid/);
    // Mağaza seçtiren hiçbir alan yok.
    assert.doesNotMatch(html, /<select/);
  } finally {
    await server.close();
  }
});

test("görünüm satıcı ucunu çağırır ve mağaza kimliği göndermez", () => {
  assert.match(view, /tradehub_core\.api\.seller_media/);
  assert.match(view, /browse_my_media/);
  assert.match(view, /keys: \["scope", "category", "listing"\]/);
  // `store` ne parametre olarak geçilir ne de ekranda seçtirilir.
  assert.doesNotMatch(view, /store:/);
  assert.doesNotMatch(view, /<select/);
});

test("rota satıcı bölümünde, süper yönetici koşulu YOK", () => {
  const route = router.slice(
    router.indexOf('path: "my-media-explorer"'),
    router.indexOf('path: "my-certifications"')
  );
  assert.match(route, /name: "SellerMediaExplorer"/);
  assert.match(route, /section: "store"/);
  assert.doesNotMatch(route, /requiresSuperAdmin/);
  assert.match(router, /SellerMediaExplorerView/);
});

test("menüde VİTRİN grubunda, Medya Kütüphanesi'nin yanında", () => {
  const group = nav.slice(nav.indexOf('title: "nav.group.storefront"'));
  const items = group.slice(0, group.indexOf("]"));
  assert.match(items, /nav\.item\.mediaLibrary/);
  assert.match(items, /nav\.item\.sellerMediaExplorer.*\/my-media-explorer/);
});

test("dört dilde de sellerMediaExplorer çevirisi var", async () => {
  for (const lang of ["tr", "en", "ar", "ru"]) {
    const { default: messages } = await import(`../../../i18n/locales/${lang}.js`);
    const block = messages.sellerMediaExplorer;
    assert.ok(block, `${lang}: sellerMediaExplorer eksik`);
    for (const key of ["title", "root", "empty", "loadFailed", "fileCount"]) {
      assert.equal(typeof block[key], "string", `${lang}: ${key} eksik`);
    }
    for (const id of ["public", "private", "chat"]) {
      assert.equal(typeof block.folder[id], "string", `${lang}: folder.${id} eksik`);
      assert.equal(typeof block.stat[`${id}Note`], "string", `${lang}: stat.${id}Note eksik`);
    }
    assert.equal(typeof messages.nav.item.sellerMediaExplorer, "string", `${lang}: menü etiketi`);
  }
});
