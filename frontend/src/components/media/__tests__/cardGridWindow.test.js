import assert from "node:assert/strict";
import { before, test } from "node:test";
import { JSDOM } from "jsdom";

/**
 * Ana medya ızgarasının sanal kaydırması (T-092) — NE ÖLÇÜLDÜ, NE ÖLÇÜLMEDİ:
 *
 *   ÖLÇÜLDÜ  — GERÇEK bir Vue uygulaması jsdom'a bağlanıyor: eşik altında
 *              listenin tamamı, üstünde yalnız görünen pencere DOM'a basılıyor
 *              mu; basılmayan satırların yeri dolguyla korunuyor mu; kaydırınca
 *              pencere kayıyor mu; `aria-posinset` pencereye değil LİSTEYE göre
 *              mi sayıyor; imleç pencere dışına çıktığında karta ait düğüm
 *              gerçekten DOM'a geri geliyor mu.
 *   ÖLÇÜLMEDİ — hız, kare süresi, bellek. Bu makinede ölçüm güvenilir değil ve
 *              jsdom'un düzen motoru yok; "şu kadar hızlandı" DENMİYOR, "şu
 *              kadar düğüm basılıyor" deniyor. Gerçek tarayıcıda görsel
 *              doğrulama da yapılmadı: satır yüksekliğinin sabitliği
 *              (`MediaCard` `uniform`) CSS ile kuruluyor, burada ölçülemiyor.
 */

// Vue'nun runtime-dom'u `document`'i MODÜL YÜKLENİRKEN okuyor — bu yüzden
// global'ler kuruluyor, `vue` ondan SONRA dinamik olarak yükleniyor.
const dom = new JSDOM("<!doctype html><html><body><div id='app'></div></body></html>", {
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.requestAnimationFrame = (cb) => dom.window.requestAnimationFrame(cb);
globalThis.cancelAnimationFrame = (id) => dom.window.cancelAnimationFrame(id);

const ROW_HEIGHT = 100;
const GAP = 10; // adım = 110px
const COLUMNS = 4;

// jsdom düzen HESAPLAMAZ: `getBoundingClientRect` hep sıfır, `getComputedStyle`
// ızgara raylarını bilmez. Ölçümün İKİ girdisini burada biz veriyoruz; test
// edilen şey ölçüm değil, ölçümden sonraki pencereleme.
dom.window.getComputedStyle = () => ({
  gridTemplateColumns: Array(COLUMNS).fill("1fr").join(" "),
  rowGap: `${GAP}px`,
});

/** Izgaranın viewport'a göre üst kenarı — kaydırma bunu negatifleştirir. */
let gridTop = 0;
dom.window.Element.prototype.getBoundingClientRect = function () {
  const box = { x: 0, y: 0, left: 0, right: 0, bottom: 0, width: 0 };
  return this.tagName === "UL"
    ? { ...box, top: gridTop, height: 0 }
    : { ...box, top: 0, height: ROW_HEIGHT };
};

let vue;
let useCardGridWindow;

before(async () => {
  vue = await import("vue");
  ({ useCardGridWindow } = await import("../useCardGridWindow.js"));
});

/** Bir kare bekle — composable ölçümü rAF'a erteliyor. */
const frame = () => new Promise((resolve) => setTimeout(resolve, 50));

/**
 * Composable'ı gerçek bir bileşende çalıştırır ve `<ul>`'ü DOM'a basar.
 * Ekranın kendi şablonuyla AYNI sözleşme: `data-cell` ve `aria-posinset`
 * mutlak indeksten (`offset + i`) türetiliyor.
 */
async function mountGrid(count, { threshold = 24 } = {}) {
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);

  const list = (n) => Array.from({ length: n }, (_, i) => ({ id: `M-${i}` }));
  const items = vue.ref(list(count));
  let api;

  const app = vue.createApp({
    setup() {
      const gridEl = vue.ref(null);
      api = useCardGridWindow(gridEl, { items: () => items.value, threshold });
      return () =>
        vue.h(
          "ul",
          { ref: gridEl, style: api.padStyle.value || {} },
          api.visible.value.map((item, i) =>
            vue.h(
              "li",
              {
                key: item.id,
                "data-cell": api.offset.value + i,
                "aria-setsize": items.value.length,
                "aria-posinset": api.offset.value + i + 1,
              },
              item.id
            )
          )
        );
    },
  });
  app.mount(host);
  await frame();

  const ul = host.querySelector("ul");
  return {
    api,
    ul,
    cells: () => [...ul.children],
    posinsets: () => [...ul.children].map((li) => Number(li.getAttribute("aria-posinset"))),
    /** Sayfa/filtre değişimi: aynı kap, bambaşka liste. */
    async setCount(n) {
      items.value = list(n);
      await frame();
    },
    async scrollTo(px) {
      gridTop = -px;
      dom.window.dispatchEvent(new dom.window.Event("scroll"));
      await frame();
    },
    stop() {
      app.unmount();
      host.remove();
      gridTop = 0;
    },
  };
}

test("eşik altındaki liste PENCERELENMEZ — tamamı basılır, dolgu yok", async () => {
  // Bir-iki ekran dolusu kart için pencerelemenin kazancı yok, bedeli var:
  // matematiğin şartı sabit satır yüksekliği ve o kısıt kart içeriğini bağlıyor.
  const g = await mountGrid(20, { threshold: 24 });
  assert.equal(g.api.windowed.value, false);
  assert.equal(g.cells().length, 20);
  assert.equal(g.ul.style.paddingTop, "");
  assert.equal(g.ul.style.paddingBottom, "");
  g.stop();
});

test("eşik üstünde yalnız görünen satırlar basılır, kalanın yeri dolguyla korunur", async () => {
  const g = await mountGrid(2000, { threshold: 24 });

  assert.equal(g.api.windowed.value, true);
  assert.equal(g.api.active.value, true);
  assert.equal(g.api.columns.value, COLUMNS);

  // 2000 kalem / 4 sütun = 500 satır. Tepede: son satır = floor(768/110)+2 = 8
  // → 9 satır × 4 = 36 kart.
  const shown = g.cells().length;
  assert.equal(shown, 36);
  assert.ok(shown < 2000 * 0.05, `${shown} kart 2000'in %5'inden az olmalı`);

  // Yükseklik korunur: basılmayan 491 satırın yeri altta duruyor.
  assert.equal(g.ul.style.paddingTop, "0px");
  assert.equal(g.ul.style.paddingBottom, `${(500 - 1 - 8) * (ROW_HEIGHT + GAP)}px`);
  g.stop();
});

test("kaydırınca pencere kayar ve aria-posinset PENCEREYE değil LİSTEYE göre sayar", async () => {
  const g = await mountGrid(2000, { threshold: 24 });
  await g.scrollTo(300 * (ROW_HEIGHT + GAP)); // 300. satıra kadar kaydır

  const posinsets = g.posinsets();
  // Ekran okuyucu "1 / 2000" değil, gerçek konumu duymalı: pencereleme DOM'u
  // kırpar, listenin kendisini değil.
  assert.ok(posinsets[0] > 1000, `ilk konum ${posinsets[0]} pencere içi sayaç olmamalı`);
  assert.equal(posinsets[0], (300 - 2) * COLUMNS + 1); // overscan = 2 satır
  // Ardışık ve mutlak: DOM'daki i. düğüm listedeki (offset + i). kalem.
  posinsets.forEach((p, i) => assert.equal(p, posinsets[0] + i));

  // Üstteki satırların yeri de korunuyor — kaydırma çubuğu zıplamıyor.
  assert.equal(g.ul.style.paddingTop, `${(300 - 2) * (ROW_HEIGHT + GAP)}px`);
  g.stop();
});

test("imleç görünmeyen bir karta giderse o kart DOM'a geri gelir", async () => {
  // Sanal kaydırmanın klavyeyi bozduğu yer tam burası: 1500. karta gitmek
  // istiyorsun ama o düğüm basılmamış — `children[1500]` yok, `scrollIntoView`
  // çağıracak bir şey de yok, imleç sessizce kayboluyor.
  const g = await mountGrid(2000, { threshold: 24 });

  assert.equal(g.ul.querySelector('[data-cell="1500"]'), null, "başlangıçta basılmamış olmalı");

  const cell = await g.api.reveal(1500);
  assert.ok(cell, "reveal düğümü döndürmeli");
  assert.equal(cell.getAttribute("data-cell"), "1500");
  assert.equal(cell.getAttribute("aria-posinset"), "1501");
  assert.equal(g.ul.querySelector('[data-cell="1500"]'), cell);
  g.stop();
});

test("liste kısalınca pencere sıfırlanır — eski aralıkta kalıp boş ekran göstermez", async () => {
  const g = await mountGrid(2000, { threshold: 24 });
  await g.scrollTo(300 * (ROW_HEIGHT + GAP));
  assert.ok(g.posinsets()[0] > 1000, "önce derin bir pencerede olmalı");

  // Filtre daraldı: 2000 kalem yerine 30. Eski aralık (1192-1228) yeni listenin
  // TAMAMEN dışında; pencere sıfırlanmazsa ekran boş kalırdı.
  gridTop = 0;
  await g.setCount(30);

  assert.equal(g.posinsets()[0], 1);
  assert.ok(g.cells().length > 0, "kart basılmalı");
  assert.ok(g.cells().length <= 30);
  g.stop();
});
