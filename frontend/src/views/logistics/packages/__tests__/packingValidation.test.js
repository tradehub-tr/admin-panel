// Doğrulama motorunun kurallarını kilitler.
//
// En kritik iki davranış:
//   1. `canComplete` yalnız ERROR yokken true — uyarı engellemiyor.
//   2. Engel varken bile taslak kaydedilebilir olmalı (bu dosya `canComplete`
//      dışında bir kilit üretmiyor; ekranın "Taslağı kaydet" butonu buna
//      bakmıyor). Depoda iş yarım kalır, kaydetmeyi engellemek işi kaybettirir.

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildItemRows,
  decoratePackages,
  packedByItem,
  validatePacking,
} from "../packingValidation.js";

const ITEMS = [
  { row_id: "a1", item_name: "Vida", qty: 2000, uom: "Adet", scan_code: "8690012340011" },
  { row_id: "a2", item_name: "Hortum", qty: 48, uom: "Adet", scan_code: "HYD-1" },
  { row_id: "a3", item_name: "Sigma Profil", qty: 60, uom: "Adet", scan_code: null },
];

const TYPES = [
  { name: "Koli-S", package_name: "Küçük Koli", max_weight_kg: 10, max_desi: 8 },
  { name: "Koli-M", package_name: "Orta Koli", max_weight_kg: 30, max_desi: 25 },
];

/** Tam ve kusursuz paketlenmiş taslak. */
function completeDraft() {
  return [
    {
      package_code: "SHP-01", package_type: "Koli-M",
      length_cm: 40, width_cm: 30, height_cm: 25, weight_kg: 18.5,
      contents: [{ shipment_item: "a1", qty: 2000 }],
    },
    {
      package_code: "SHP-02", package_type: "Koli-M",
      length_cm: 40, width_cm: 30, height_cm: 25, weight_kg: 12,
      contents: [{ shipment_item: "a2", qty: 48 }, { shipment_item: "a3", qty: 60 }],
    },
  ];
}

test("kusursuz taslak tamamlanabilir", () => {
  const r = validatePacking({ items: ITEMS, packages: completeDraft(), packageTypes: TYPES });
  assert.deepEqual(r.findings, []);
  assert.equal(r.canComplete, true);
});

test("koli yoksa engel — boş sevkiyat tamamlanamaz", () => {
  const r = validatePacking({ items: ITEMS, packages: [] });
  assert.equal(r.canComplete, false);
  assert.ok(r.findings.some((f) => f.code === "NO_PACKAGE"));
});

test("paketlenmemiş kalem engel ve adıyla sayılıyor", () => {
  const r = validatePacking({ items: ITEMS, packages: [] });
  const f = r.findings.find((x) => x.code === "UNPACKED_ITEMS");
  assert.equal(f.level, "error");
  assert.match(f.message, /3 kalem paketlenmedi/);
  assert.match(f.message, /Vida/);
});

test("çok kalemde isim listesi kısalıyor — mesaj taşmıyor", () => {
  const many = Array.from({ length: 7 }, (_, i) => ({ row_id: `x${i}`, item_name: `Ürün${i}`, qty: 1 }));
  const r = validatePacking({ items: many, packages: [{ package_code: "P", contents: [{ shipment_item: "z", qty: 1 }], weight_kg: 1, length_cm: 1, width_cm: 1, height_cm: 1 }] });
  const f = r.findings.find((x) => x.code === "UNPACKED_ITEMS");
  assert.match(f.message, /\+4$/, "ilk 3 + kalan sayı");
});

test("fazla atama engel — sunucu da reddediyor", () => {
  const pkgs = completeDraft();
  pkgs[0].contents = [{ shipment_item: "a1", qty: 2500 }];
  const r = validatePacking({ items: ITEMS, packages: pkgs });
  const f = r.findings.find((x) => x.code === "OVER_ASSIGNED");
  assert.equal(f.level, "error");
  assert.match(f.message, /500 Adet fazla/);
});

test("boş koli engel", () => {
  const pkgs = completeDraft();
  pkgs.push({ package_code: "SHP-03", contents: [], weight_kg: 5, length_cm: 10, width_cm: 10, height_cm: 10 });
  const r = validatePacking({ items: ITEMS, packages: pkgs });
  const f = r.findings.find((x) => x.code === "EMPTY_PACKAGE");
  assert.equal(f.package_code, "SHP-03");
  assert.equal(r.canComplete, false);
});

test("aynı kalem bir kolide iki satırsa engel — bir kez raporlanıyor", () => {
  const pkgs = completeDraft();
  pkgs[0].contents = [
    { shipment_item: "a1", qty: 1200 },
    { shipment_item: "a1", qty: 800 },
  ];
  const r = validatePacking({ items: ITEMS, packages: pkgs });
  const dupes = r.findings.filter((x) => x.code === "DUPLICATE_CONTENT");
  assert.equal(dupes.length, 1, "koli başına tek uyarı");
});

test("ağırlık ve ölçü eksikliği ayrı engeller", () => {
  const pkgs = [{ package_code: "P1", contents: [{ shipment_item: "a1", qty: 2000 }], weight_kg: 0, length_cm: 40, width_cm: 0, height_cm: 25 }];
  const r = validatePacking({ items: ITEMS, packages: pkgs });
  assert.ok(r.findings.some((f) => f.code === "NO_WEIGHT"));
  assert.ok(r.findings.some((f) => f.code === "NO_DIMENSIONS"));
});

test("kod yoksa koli sırasıyla adlandırılıyor — '#1' ", () => {
  const r = validatePacking({ items: [], packages: [{ contents: [], weight_kg: 0, length_cm: 0, width_cm: 0, height_cm: 0 }] });
  assert.ok(r.findings.every((f) => !f.package_code || f.package_code === "#1"));
});

test("TİP LİMİTİ UYARI — tamamlamayı ENGELLEMİYOR", () => {
  const pkgs = completeDraft();
  pkgs[0].package_type = "Koli-S"; // max 10 kg, koli 18.5 kg
  const r = validatePacking({ items: ITEMS, packages: pkgs, packageTypes: TYPES });

  const w = r.findings.find((f) => f.code === "OVER_TYPE_WEIGHT");
  assert.equal(w.level, "warning");
  assert.match(w.message, /max 10 kg, girilen 18.5 kg/);
  assert.equal(r.canComplete, true, "uyarı engel değil — operatör bilerek aşabilir");
  assert.equal(r.errorCount, 0);
  assert.ok(r.warningCount >= 1);
});

test("desi limiti ağırlıktan bağımsız uyarı üretiyor", () => {
  // Hafif ama hacimli: 10 kg < 30 kg sınırı, ama desi 32 > 25.
  const pkgs = [{
    package_code: "P1", package_type: "Koli-M",
    length_cm: 60, width_cm: 40, height_cm: 40, weight_kg: 10,
    contents: [{ shipment_item: "a1", qty: 2000 }],
  }];
  const r = validatePacking({ items: [ITEMS[0]], packages: pkgs, packageTypes: TYPES });
  assert.ok(r.findings.some((f) => f.code === "OVER_TYPE_DESI"));
  assert.ok(!r.findings.some((f) => f.code === "OVER_TYPE_WEIGHT"), "ağırlık sınırı aşılmadı");
});

test("bilinmeyen paket tipi limit kontrolünü atlıyor, çökmüyor", () => {
  const pkgs = completeDraft();
  pkgs[0].package_type = "Olmayan-Tip";
  const r = validatePacking({ items: ITEMS, packages: pkgs, packageTypes: TYPES });
  assert.equal(r.canComplete, true);
});

test("bayat etiket uyarısı — büyük/küçük harf farkı yakalanıyor", () => {
  const pkgs = completeDraft();
  pkgs[0].label = { status: "Stale" };
  pkgs[1].label = { status: "stale" };
  const r = validatePacking({ items: ITEMS, packages: pkgs, packageTypes: TYPES });
  assert.equal(r.findings.filter((f) => f.code === "LABEL_STALE").length, 2);
  assert.equal(r.canComplete, true);
});

test("site bölenini kullanıyor — 5000'de desi limiti aşılmıyor", () => {
  const pkgs = [{
    package_code: "P1", package_type: "Koli-M",
    length_cm: 60, width_cm: 40, height_cm: 40, weight_kg: 10,
    contents: [{ shipment_item: "a1", qty: 2000 }],
  }];
  const at3000 = validatePacking({ items: [ITEMS[0]], packages: pkgs, packageTypes: TYPES, divisor: 3000 });
  const at5000 = validatePacking({ items: [ITEMS[0]], packages: pkgs, packageTypes: TYPES, divisor: 5000 });
  assert.ok(at3000.findings.some((f) => f.code === "OVER_TYPE_DESI"), "32 > 25");
  assert.ok(!at5000.findings.some((f) => f.code === "OVER_TYPE_DESI"), "19.2→20 < 25");
});

// ── türetilmiş görünümler ────────────────────────────────────────────

test("packedByItem kolileri topluyor", () => {
  const m = packedByItem(completeDraft());
  assert.equal(m.get("a1"), 2000);
  assert.equal(m.get("a3"), 60);
});

test("buildItemRows eksik kalemleri ÜSTE alıyor", () => {
  const pkgs = [{ package_code: "P1", contents: [{ shipment_item: "a2", qty: 48 }] }];
  const rows = buildItemRows(ITEMS, pkgs);
  assert.ok(rows[0].remaining > 0, "ilk satır eksik olmalı");
  assert.equal(rows.at(-1).row_id, "a2", "tamamlanan sona düşmeli");
});

test("buildItemRows barkodsuz kalemi işaretliyor", () => {
  const rows = buildItemRows(ITEMS, []);
  assert.equal(rows.find((r) => r.row_id === "a3").is_scannable, false);
  assert.equal(rows.find((r) => r.row_id === "a1").is_scannable, true);
});

test("buildItemRows yüzdeyi 100'de sınırlıyor, sıfıra bölmüyor", () => {
  const rows = buildItemRows(
    [{ row_id: "z", item_name: "Sıfır", qty: 0 }],
    [{ contents: [{ shipment_item: "z", qty: 5 }] }]
  );
  assert.equal(rows[0].percent, 0, "qty 0 → NaN değil 0");
  assert.equal(rows[0].remaining, 0);
});

test("decoratePackages desi, ücret ve X/Y üretiyor", () => {
  const rows = decoratePackages(completeDraft());
  assert.equal(rows[0].desi, 10);
  assert.equal(rows[0].chargeable_kg, 18.5);
  assert.equal(rows[0].sequence_label, "1/2");
  assert.equal(rows[1].sequence_label, "2/2");
});

test("decoratePackages desi baskınlığını işaretliyor", () => {
  const rows = decoratePackages([
    { length_cm: 60, width_cm: 40, height_cm: 40, weight_kg: 12 }, // desi 32 > 12
    { length_cm: 40, width_cm: 30, height_cm: 25, weight_kg: 18.5 }, // desi 10 < 18.5
  ]);
  assert.equal(rows[0].is_desi_dominant, true);
  assert.equal(rows[1].is_desi_dominant, false);
});

test("decoratePackages sunucudan gelen sequence'i EZMİYOR", () => {
  // Sunucu yeniden numaralandırmış olabilir; FE kendi index'ini dayatmamalı.
  const rows = decoratePackages([{ sequence: 5, length_cm: 1, width_cm: 1, height_cm: 1, weight_kg: 1 }]);
  assert.equal(rows[0].sequence, 5);
  assert.equal(rows[0].sequence_label, "5/1");
});
