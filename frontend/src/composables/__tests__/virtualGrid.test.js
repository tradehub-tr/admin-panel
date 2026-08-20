import assert from "node:assert/strict";
import { test } from "node:test";

import { computeWindow } from "../useVirtualGrid.js";

// Klasör seviyesi SAYFALANMIYOR: `media/browse.py → seller_listings()` bir
// kategorideki bütün ürün klasörlerini tek yanıtta veriyor (`folders`
// listesinde page/page_size yok). 750 dosyalık bir mağazada bu birkaç yüz
// karta çıkıyor ve hepsi DOM'a basılıyordu. `computeWindow` bunun matematiği.

const GRID = { columns: 4, rowHeight: 108, gap: 12 }; // pitch = 120

test("ölçüm yokken pencereleme YAPILMAZ — liste tam basılır", () => {
  // SSR ve mount öncesi hâl. Tahmin edilen bir pencere, sonradan düzeltilecek
  // yanlış bir yükseklik demektir; tam olarak kaçındığımız düzen kayması.
  const w = computeWindow({ ...GRID, total: 500, gridTop: 0, viewportHeight: 0 });
  assert.deepEqual(w, { start: 0, end: 500, padTop: 0, padBottom: 0 });
});

test("boş listede pencere boş kalır", () => {
  const w = computeWindow({ ...GRID, total: 0, gridTop: 0, viewportHeight: 800 });
  assert.deepEqual(w, { start: 0, end: 0, padTop: 0, padBottom: 0 });
});

test("tepede yalnız görünen satırlar + overscan basılır", () => {
  // 500 kalem / 4 sütun = 125 satır. 800px viewport / 120px adım ≈ 7 satır.
  const w = computeWindow({ ...GRID, total: 500, gridTop: 0, viewportHeight: 800, overscan: 2 });
  assert.equal(w.start, 0);
  // lastRow = floor(800/120) + 2 = 8  →  end = 9 satır × 4 = 36
  assert.equal(w.end, 36);
  assert.equal(w.padTop, 0);
  assert.equal(w.padBottom, (125 - 1 - 8) * 120);
  // DOM'a basılan kalem sayısı toplamın onda birinden az.
  assert.ok(w.end - w.start < 500 * 0.1);
});

test("kaydırınca pencere kayar, üstteki satırların yeri boşlukla korunur", () => {
  // 30 satır yukarı kaydırılmış: gridTop = -3600
  const w = computeWindow({ ...GRID, total: 500, gridTop: -3600, viewportHeight: 800 });
  const firstRow = 30 - 2; // overscan
  assert.equal(w.start, firstRow * 4);
  assert.equal(w.padTop, firstRow * 120);
});

test("toplam yükseklik HER pencerede aynı kalır — kaydırma çubuğu zıplamaz", () => {
  const total = 500;
  const rowCount = Math.ceil(total / GRID.columns);
  const fullHeight = rowCount * 120 - GRID.gap;

  for (const gridTop of [0, -600, -3600, -9000, -14880]) {
    const w = computeWindow({ ...GRID, total, gridTop, viewportHeight: 800 });
    const renderedRows = Math.ceil((w.end - w.start) / GRID.columns);
    const rendered = renderedRows * 120 - GRID.gap;
    assert.equal(
      w.padTop + rendered + w.padBottom,
      fullHeight,
      `gridTop=${gridTop} yüksekliği bozuyor`
    );
  }
});

test("liste sonunda pencere son satırda durur, alt boşluk sıfırlanır", () => {
  const w = computeWindow({ ...GRID, total: 500, gridTop: -100000, viewportHeight: 800 });
  assert.equal(w.end, 500);
  assert.equal(w.padBottom, 0);
});

test("sütun sayısı değişince pencere yeniden hesaplanır (duyarlı ızgara)", () => {
  const dar = computeWindow({ ...GRID, columns: 1, total: 500, gridTop: 0, viewportHeight: 800 });
  const genis = computeWindow({ ...GRID, columns: 6, total: 500, gridTop: 0, viewportHeight: 800 });
  // Aynı viewport'ta tek sütunda daha az KALEM, altı sütunda daha çok kalem
  // görünür — satır sayısı aynı, satır başına kalem farklı.
  assert.ok(genis.end > dar.end);
  assert.equal(dar.end, 9);
  assert.equal(genis.end, 9 * 6);
});

test("bozuk ölçüm (satır yüksekliği 0) pencerelemeyi kapatır, listeyi düşürmez", () => {
  const w = computeWindow({
    ...GRID,
    rowHeight: 0,
    gap: 0,
    total: 300,
    gridTop: 0,
    viewportHeight: 800,
  });
  assert.equal(w.start, 0);
  assert.equal(w.end, 300);
});
