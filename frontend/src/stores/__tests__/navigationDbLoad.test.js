/**
 * MOGEM-638 §3.1 / §7-10 · navigation store `loadDbSections` davranışı.
 *
 * Eskiden her çağrı admin+seller iki isteği birden atıyor, hata sonrası
 * `dbLoaded` false kaldığı için router guard her rota geçişinde yeniden
 * deniyordu (15 rotanın 15'inde 2× get_navigation). Şimdi: rol başına tek
 * istek, aynı anda gelen çağrılar tek isteği paylaşır, hata sonrası 30 sn
 * geri çekilme, `force` ve `resetState` bunu sıfırlar.
 *
 * Harness: subscriptionCancellation.test.js ile aynı — `@/utils/api` alias'la
 * sahteye çevrilir (`globalThis.__subApiGetMock`).
 */
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, test } from "node:test";
import { createServer } from "vite";
import { createPinia, setActivePinia } from "pinia";

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));
const STUB = "/src/stores/__tests__/fixtures/subscriptionApiStub.js";
const NAV = "tradehub_core.api.v1.navigation.get_navigation";

let server;
let navModule;
let restoreStorage;

before(async () => {
  const bellek = new Map();
  const stub = {
    getItem: (k) => (bellek.has(k) ? bellek.get(k) : null),
    setItem: (k, v) => bellek.set(k, String(v)),
    removeItem: (k) => bellek.delete(k),
  };
  const desc = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: stub });
  restoreStorage = () => {
    if (desc) Object.defineProperty(globalThis, "localStorage", desc);
    else delete globalThis.localStorage;
  };
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: {
      alias: [
        { find: /^@\/utils\/api$/, replacement: `${frontendRoot}/src${STUB.slice(4)}` },
        { find: "@", replacement: `${frontendRoot}/src` },
      ],
    },
    server: { middlewareMode: true },
    appType: "custom",
  });
  navModule = await server.ssrLoadModule("/src/stores/navigation.js");
});

after(async () => {
  await server?.close();
  delete globalThis.__subApiGetMock;
  restoreStorage?.();
});

let calls;
function kur({ fail = false, gecikme = 0 } = {}) {
  setActivePinia(createPinia());
  calls = [];
  globalThis.__subApiGetMock = (method, args) =>
    new Promise((resolve, reject) => {
      calls.push({ method, args });
      setTimeout(() => {
        if (fail) reject(new Error("503"));
        else
          resolve({
            message: {
              sections: [{ section_key: "dashboard", items: [{ label: "G", module_key: "m", items: [] }] }],
              hidden_doctypes: ["Gizli DT"],
              hidden_routes: ["/gizli"],
            },
          });
      }, gecikme);
    });
  return navModule.useNavigationStore();
}

beforeEach(() => {
  delete globalThis.__subApiGetMock;
});

test("tek panel için TEK istek atar (admin+seller çifti yok)", async () => {
  const nav = kur();
  await nav.loadDbSections();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, NAV);
  assert.deepEqual(Object.keys(calls[0].args), ["panel"]);
  assert.equal(nav.dbLoaded, true);
});

test("yüklendikten sonra tekrar çağrı istek atmaz; force atar", async () => {
  const nav = kur();
  await nav.loadDbSections();
  await nav.loadDbSections();
  await nav.loadDbSections();
  assert.equal(calls.length, 1);
  await nav.loadDbSections({ force: true });
  assert.equal(calls.length, 2);
});

test("aynı anda gelen çağrılar (router guard + AppLayout) tek isteği paylaşır", async () => {
  const nav = kur({ gecikme: 20 });
  await Promise.all([nav.loadDbSections(), nav.loadDbSections(), nav.loadDbSections()]);
  assert.equal(calls.length, 1, "in-flight istek paylaşılmadı");
  assert.equal(nav.dbLoaded, true);
});

test("hata sonrası 30 sn içinde yeniden denemez; force dener; resetState sıfırlar", async () => {
  const nav = kur({ fail: true });
  await nav.loadDbSections();
  assert.equal(nav.dbLoaded, false);
  assert.equal(calls.length, 1);
  // Eski davranış: her rota geçişinde yeniden istek. Şimdi geri çekilme.
  await nav.loadDbSections();
  await nav.loadDbSections();
  assert.equal(calls.length, 1, "hata sonrası her çağrı yeniden istek attı");
  await nav.loadDbSections({ force: true });
  assert.equal(calls.length, 2);
  nav.resetState();
  await nav.loadDbSections();
  assert.equal(calls.length, 3, "resetState geri çekilmeyi sıfırlamadı");
});

test("gizli doctype/rota kümeleri yanıttan dolar", async () => {
  const nav = kur();
  await nav.loadDbSections();
  assert.equal(nav.isDoctypeHidden?.("Gizli DT") ?? nav.hiddenDoctypes.admin.has("Gizli DT"), true);
});
