// Tarama eşleşme sırasını ve "tanınmayan kod hiçbir şeyi değiştirmez"
// kuralını kilitler.
//
// Bu kurallar sunum kararı değil, sözleşme (13-FE-VERI-SOZLESMESI §4.2).
// Yanlış eşleşmenin bedeli fiziksel: operatör yanlış koliye ürün koyar,
// hata kargo şubesinde ya da alıcıda çıkar.

import assert from "node:assert/strict";
import test from "node:test";

import { applyScan, hasScannableItems, matchScan, packedQtyOf } from "../scanMatcher.js";

const ITEMS = [
  { row_id: "a1", item_name: "Vida", qty: 2000, scan_code: "8690012340011" },
  { row_id: "a2", item_name: "Hortum", qty: 48, scan_code: "HYD-R2AT-38-2M" },
  { row_id: "a3", item_name: "Sigma Profil", qty: 60, scan_code: null }, // barkodsuz
];

const PACKAGES = () => [
  { package_code: "SHP-01", barcode: "PKG86900456001", contents: [{ shipment_item: "a1", qty: 1400 }] },
  { package_code: "SHP-02", barcode: "PKG86900456002", contents: [] },
];

test("kalem barkodu kalemi buluyor", () => {
  const m = matchScan("8690012340011", { items: ITEMS, packages: PACKAGES() });
  assert.equal(m.type, "item");
  assert.equal(m.item.row_id, "a1");
});

test("koli barkodu koliyi buluyor", () => {
  const m = matchScan("PKG86900456002", { items: ITEMS, packages: PACKAGES() });
  assert.equal(m.type, "package");
  assert.equal(m.package.package_code, "SHP-02");
});

test("KOLİ kalemden ÖNCE denenir — çakışmada operatörün beklentisi koli", () => {
  const items = [{ row_id: "x", qty: 5, scan_code: "ÇAKIŞAN" }];
  const packages = [{ package_code: "P1", barcode: "ÇAKIŞAN", contents: [] }];
  assert.equal(matchScan("ÇAKIŞAN", { items, packages }).type, "package");
});

test("boş/whitespace kod 'empty' — okuyucu bazen CR gönderiyor", () => {
  assert.equal(matchScan("", { items: ITEMS }).type, "empty");
  assert.equal(matchScan("   ", { items: ITEMS }).type, "empty");
  assert.equal(matchScan(null, { items: ITEMS }).type, "empty");
});

test("baş/son boşluk ve satır sonu temizleniyor", () => {
  const m = matchScan("  8690012340011\r\n", { items: ITEMS, packages: PACKAGES() });
  assert.equal(m.type, "item");
});

test("scan_code'u null olan kalem BOŞ kodla eşleşmiyor", () => {
  // Naif implementasyon `i.scan_code === code` yazsaydı, normalize("") === ""
  // ile a3 eşleşir ve boş okutma yanlış kaleme giderdi.
  const m = matchScan("", { items: ITEMS });
  assert.equal(m.type, "empty");
  const m2 = matchScan("null", { items: ITEMS });
  assert.equal(m2.type, "unknown");
});

test("tanınmayan kod 'unknown' dönüyor", () => {
  assert.equal(matchScan("8699999999999", { items: ITEMS, packages: PACKAGES() }).type, "unknown");
});

// ── applyScan ────────────────────────────────────────────────────────

test("TANINMAYAN KOD HİÇBİR KOLİYİ DEĞİŞTİRMEZ", () => {
  const before = PACKAGES();
  const r = applyScan({ code: "8699999999999", items: ITEMS, packages: before, activeIndex: 1 });
  assert.equal(r.result, "unknown");
  assert.equal(r.packages, before, "aynı referans dönmeli — gereksiz render yok");
  assert.equal(r.activeIndex, 1, "aktif koli de değişmemeli");
  assert.deepEqual(before[1].contents, [], "içerik dokunulmamış");
});

test("koli okutunca aktif koli değişiyor, içerik değişmiyor", () => {
  const pkgs = PACKAGES();
  const r = applyScan({ code: "PKG86900456002", items: ITEMS, packages: pkgs, activeIndex: 0 });
  assert.equal(r.result, "activated");
  assert.equal(r.activeIndex, 1);
  assert.equal(r.packages, pkgs);
});

test("kalem okutunca aktif koliye 1 birim ekleniyor", () => {
  const pkgs = PACKAGES();
  const r = applyScan({ code: "HYD-R2AT-38-2M", items: ITEMS, packages: pkgs, activeIndex: 1 });
  assert.equal(r.result, "added");
  assert.equal(r.qty, 1);
  assert.deepEqual(r.packages[1].contents, [{ shipment_item: "a2", qty: 1 }]);
});

test("aynı kalem tekrar okutulunca satır çoğalmıyor, miktar artıyor", () => {
  let pkgs = PACKAGES();
  for (let i = 0; i < 3; i++) {
    pkgs = applyScan({ code: "HYD-R2AT-38-2M", items: ITEMS, packages: pkgs, activeIndex: 1 }).packages;
  }
  assert.equal(pkgs[1].contents.length, 1, "tek satır kalmalı");
  assert.equal(pkgs[1].contents[0].qty, 3);
});

test("girdi dizisi MUTASYONA uğramıyor", () => {
  const pkgs = PACKAGES();
  const snapshot = JSON.stringify(pkgs);
  applyScan({ code: "HYD-R2AT-38-2M", items: ITEMS, packages: pkgs, activeIndex: 1 });
  assert.equal(JSON.stringify(pkgs), snapshot, "orijinal taslak bozulmamalı");
});

test("kalemin tamamı paketlenmişse fazlası eklenmiyor", () => {
  const pkgs = [{ package_code: "P1", barcode: "B1", contents: [{ shipment_item: "a2", qty: 48 }] }];
  const r = applyScan({ code: "HYD-R2AT-38-2M", items: ITEMS, packages: pkgs, activeIndex: 0 });
  assert.equal(r.result, "already-full");
  assert.equal(r.packages, pkgs);
});

test("kalan miktardan fazla istenirse kalana kırpılıyor", () => {
  const pkgs = [{ package_code: "P1", barcode: "B1", contents: [{ shipment_item: "a2", qty: 45 }] }];
  const r = applyScan({ code: "HYD-R2AT-38-2M", items: ITEMS, packages: pkgs, activeIndex: 0, qty: 10 });
  assert.equal(r.qty, 3, "48 - 45 = 3");
  assert.equal(r.packages[0].contents[0].qty, 48);
});

test("koli yokken kalem okutmak sessizce kaybolmuyor", () => {
  const r = applyScan({ code: "8690012340011", items: ITEMS, packages: [], activeIndex: 0 });
  assert.equal(r.result, "no-package");
  assert.equal(r.item.row_id, "a1");
});

test("aktif index sınır dışıysa son koliye düşüyor, çökmüyor", () => {
  const pkgs = PACKAGES();
  const r = applyScan({ code: "HYD-R2AT-38-2M", items: ITEMS, packages: pkgs, activeIndex: 99 });
  assert.equal(r.result, "added");
  assert.equal(r.activeIndex, 1);
});

// ── yardımcılar ──────────────────────────────────────────────────────

test("packedQtyOf kolileri topluyor", () => {
  const pkgs = [
    { contents: [{ shipment_item: "a1", qty: 800 }] },
    { contents: [{ shipment_item: "a1", qty: 600 }, { shipment_item: "a2", qty: 10 }] },
  ];
  assert.equal(packedQtyOf({ row_id: "a1" }, pkgs), 1400);
  assert.equal(packedQtyOf({ row_id: "a2" }, pkgs), 10);
  assert.equal(packedQtyOf({ row_id: "yok" }, pkgs), 0);
});

test("hasScannableItems — hiç kod yoksa tarama kutusu çizilmemeli", () => {
  assert.equal(hasScannableItems({ items: ITEMS }), true);
  assert.equal(hasScannableItems({ items: [ITEMS[2]] }), false, "yalnız barkodsuz kalem");
  assert.equal(hasScannableItems({ items: [] }), false);
  assert.equal(hasScannableItems({}), false);
});

test("koli barkodu TEK BAŞINA tarama kutusunu açmıyor", () => {
  // Koli okutmak yalnız aktif koliyi değiştirir; asıl iş olan kalem atamasını
  // yapamayan bir kutu "okutma bozuk" izlenimi verir.
  assert.equal(hasScannableItems({ items: [ITEMS[2]], packages: PACKAGES() }), false);
});
