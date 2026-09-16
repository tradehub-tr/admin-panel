import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, afterEach, before, test } from "node:test";
import { createServer } from "vite";
import { createPinia, setActivePinia } from "pinia";

/**
 * M4 savunma katmanı — sayfa turu adım filtresi gerçek DOM kontrolü yapar.
 *
 *   ÖLÇÜLÜR  — startPageTour'un DOM'da BULUNMAYAN hedefli adımları elediği
 *              (satır 116 yorumunun vaadi: "eksik anchor'lar atlanır" — eskiden
 *              yalnız target STRING'ine bakılıyor, GuidedTour bulamayınca
 *              popover EKRAN ORTASINDA çıkıyordu); tüm hedefler yoksa turun hiç
 *              başlamadığı; boş adım listesinin (iOS kaynak katmanı) turu
 *              başlatmadığı ve "görüldü" işaretlemediği; document yokken
 *              (SSR/test) eski davranışın korunduğu; geçersiz seçicinin güvenli
 *              tarafa düştüğü (elenir).
 *   ÖLÇÜLMEZ — GuidedTour overlay render'ı ve retry konumlaması (tarayıcı işi,
 *              E2E kapsamı); bölüm turu adım üretimi (navigation datasına
 *              bağlı — bu filtre bölüm turuna bilerek uygulanmaz, kapalı
 *              accordion öğeleri adım gelince DOM'a girer).
 */

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));

const savedGlobals = {};
function installGlobal(key, value) {
  if (!(key in savedGlobals)) {
    savedGlobals[key] = Object.prototype.hasOwnProperty.call(globalThis, key)
      ? globalThis[key]
      : undefined;
  }
  globalThis[key] = value;
}
function restoreGlobals() {
  for (const [key, value] of Object.entries(savedGlobals)) {
    if (value === undefined) delete globalThis[key];
    else globalThis[key] = value;
  }
  for (const key of Object.keys(savedGlobals)) delete savedGlobals[key];
}

let server;
let useTourStore;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: { alias: { "@": `${frontendRoot}/src` } },
    server: { middlewareMode: true },
    appType: "custom",
  });
  ({ useTourStore } = await server.ssrLoadModule("/src/stores/tour.js"));
});

after(async () => {
  await server?.close();
});

afterEach(() => {
  restoreGlobals();
});

/** DOM'da yalnız `present` seçicileri "var" sayan sahte document kurar. */
function installDom(present = []) {
  const set = new Set(present);
  installGlobal("document", {
    querySelector: (sel) => {
      if (sel === ":::gecersiz:::") throw new Error("geçersiz seçici");
      return set.has(sel) ? {} : null;
    },
  });
}

function freshStore() {
  setActivePinia(createPinia());
  return useTourStore();
}

const STEP = (target) => ({ target, title: "t", desc: "d" });

test("DOM'da bulunmayan hedefli adım ELENİR, bulunanlar sırayla kalır", () => {
  installDom(['[data-tour="a"]', '[data-tour="c"]']);
  const tour = freshStore();
  tour.startPageTour("p1", [
    STEP('[data-tour="a"]'),
    STEP('[data-tour="b"]'), // DOM'da yok — ekran-ortası popover sızıntısı buradan doğuyordu
    STEP('[data-tour="c"]'),
  ]);
  assert.equal(tour.active, true, "var olan hedeflerle tur başlar");
  assert.deepEqual(
    tour.steps.map((s) => s.target),
    ['[data-tour="a"]', '[data-tour="c"]'],
    "DOM'da olmayan hedef adım listesine giremez"
  );
  assert.equal(tour.total, 2, "adım sayacı filtrelenmiş listeyi sayar");
});

test("hiçbir hedef DOM'da yoksa tur HİÇ başlamaz (M4 sızıntı vakası)", () => {
  installDom([]); // iOS'ta sgt-* anchor'ları hiç render edilmez
  const tour = freshStore();
  tour.startPageTour("subscription-gate", [
    STEP('[data-tour="sgt-plans"]'),
    STEP('[data-tour="sgt-subscribe"]'),
    STEP('[data-tour="sgt-info"]'),
  ]);
  assert.equal(tour.active, false, "hedefsiz tur ekran ortasında popover açamaz");
  assert.equal(tour.steps.length, 0);
});

test("boş adım listesi (iOS kaynak katmanı) turu başlatmaz ve 'görüldü' işaretlemez", () => {
  installDom(['[data-tour="a"]']);
  const tour = freshStore();
  tour.registerPage("subscription-gate", []);
  tour.maybeAutoStartPage("subscription-gate", []);
  assert.equal(tour.active, false, "boş adımla otomatik tur başlamaz");
  // Yardım(?) restartContext'i: sayfa turu adımı yoksa sayfa turuna DÖNEMEZ.
  tour.restartContext("yok-boyle-bolum");
  assert.equal(tour.active, false, "restartContext boş sayfa turunu başlatamaz");
  assert.notEqual(tour.mode, "page", "sayfa turu moduna geçilmez");
});

test("document yokken (SSR/test) güvenli davranış: target'lı adımlar korunur", () => {
  const had = Object.prototype.hasOwnProperty.call(globalThis, "document");
  const orig = globalThis.document;
  if (had) delete globalThis.document;
  try {
    const tour = freshStore();
    tour.startPageTour("p2", [STEP('[data-tour="a"]'), { title: "hedefsiz" }]);
    assert.equal(tour.active, true, "document yokken eski (string) filtre davranışı sürer");
    assert.equal(tour.steps.length, 1, "target'sız adım yine elenir");
  } finally {
    if (had) globalThis.document = orig;
  }
});

test("geçersiz seçici güvenli tarafa düşer: adım elenir, tur kalanlarla sürer", () => {
  installDom(['[data-tour="a"]']);
  const tour = freshStore();
  tour.startPageTour("p3", [STEP(":::gecersiz:::"), STEP('[data-tour="a"]')]);
  assert.equal(tour.active, true);
  assert.deepEqual(
    tour.steps.map((s) => s.target),
    ['[data-tour="a"]'],
    "querySelector'ün fırlattığı seçici gösterilemez — atlanır"
  );
});
