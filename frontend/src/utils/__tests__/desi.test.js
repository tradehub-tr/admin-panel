// Desi hesabının Python otoritesiyle aynı kaldığını zorlar.
//
// `utils/desi.js` bilinçli bir kopya (gerekçesi o dosyada). Kopyanın tek gerçek
// riski SESSİZ KAYMA: `desi.py`'de bölen ya da yuvarlama değişir, panel eski
// kuralla hesaplamaya devam eder ve operatöre yanlış ücret gösterir. Fark
// fatura geldiğinde çıkar. Bu test o kaymayı gürültülü hâle getiriyor.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_DESI_DIVISOR,
  calculateDesi,
  calculateTotals,
  chargeableWeight,
} from "../desi.js";

// __tests__ → utils → src → frontend → admin-panel → kök
const PY_SOURCE = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../tradehub_core/tradehub_core/logistics/services/desi.py"
);

test("varsayılan bölen Python sabitiyle aynı", { skip: !existsSync(PY_SOURCE) }, () => {
  const source = readFileSync(PY_SOURCE, "utf8");
  const match = source.match(/^DEFAULT_DESI_DIVISOR:\s*int\s*=\s*(\d+)/m);
  assert.ok(match, "DEFAULT_DESI_DIVISOR bulunamadı — desi.py biçimi değişmiş");
  assert.equal(
    DEFAULT_DESI_DIVISOR,
    Number(match[1]),
    "Bölen Python'dan kaymış — biri güncellenirken diğeri unutulmuş"
  );
});

test("varsayılan yuvarlama Python ile aynı (ceil)", { skip: !existsSync(PY_SOURCE) }, () => {
  const source = readFileSync(PY_SOURCE, "utf8");
  // calculate_desi imzasındaki rounding varsayılanı
  const match = source.match(/rounding:\s*Literal\[[^\]]*\]\s*=\s*"(\w+)"/);
  assert.ok(match, "rounding varsayılanı bulunamadı — desi.py imzası değişmiş");
  assert.equal(match[1], "ceil", "Python varsayılanı ceil değil — JS kopyası hizalanmalı");
});

test("chargeable_weight Python ile aynı kuralı uyguluyor", { skip: !existsSync(PY_SOURCE) }, () => {
  const source = readFileSync(PY_SOURCE, "utf8");
  assert.match(
    source,
    /def get_chargeable_weight[\s\S]*?return max\(actual_weight_kg,\s*desi\)/,
    "get_chargeable_weight artık max() değil — JS kopyası hizalanmalı"
  );
});

test("toplam ücret PARSEL BAŞINA max alıyor, toplam üzerinden değil", { skip: !existsSync(PY_SOURCE) }, () => {
  const source = readFileSync(PY_SOURCE, "utf8");
  // Python döngü içinde chargeable_weight'i biriktiriyor olmalı.
  assert.match(
    source,
    /chargeable_weight\s*\+=\s*get_chargeable_weight\(weight,\s*desi\)\s*\*\s*qty/,
    "Python parsel başına biriktirmiyor — kural değişmiş, JS kopyası hizalanmalı"
  );
});

test("desi = ceil(hacim / bölen)", () => {
  assert.equal(calculateDesi(40, 30, 25), 10); // 30000/3000 = 10
  assert.equal(calculateDesi(60, 40, 40), 32); // 96000/3000 = 32
  assert.equal(calculateDesi(30, 20, 15), 3); // 9000/3000 = 3
});

test("küsurat YUKARI yuvarlanır — aşağı yuvarlamak ücreti eksik gösterir", () => {
  assert.equal(calculateDesi(10, 10, 10), 1); // 1000/3000 = 0.33 → 1
  assert.equal(calculateDesi(31, 30, 25), 8); // 23250/3000 = 7.75 → 8
  // Tam bölünen değer yukarı kaçmamalı
  assert.equal(calculateDesi(30, 20, 50), 10); // 30000/3000 = 10 tam
});

test("site ayarındaki bölen kullanılabiliyor (uluslararası 5000)", () => {
  assert.equal(calculateDesi(40, 30, 25, 5000), 6); // 30000/5000 = 6
  assert.notEqual(calculateDesi(40, 30, 25, 5000), calculateDesi(40, 30, 25, 3000));
});

test("geçersiz girdi ekranı kilitlemiyor — 0 dönüyor, fırlatmıyor", () => {
  // Python ValueError fırlatıyor; ekranda fırlatmak formu kilitlerdi.
  // Kullanıcı "-" yazdığı anda henüz "-40"ı bitirmemiş olabilir.
  assert.equal(calculateDesi(-40, 30, 25), 0);
  assert.equal(calculateDesi(null, undefined, "abc"), 0);
  assert.equal(calculateDesi(40, 30, 25, -5), 0, "negatif bölen veri hatası — gizlenmemeli");
});

test("bölen 0/boş gelirse varsayılana düşer — Python get_desi_divisor ile aynı", () => {
  // LOG-039: "boş/0 ise DEFAULT_DESI_DIVISOR kullanılır". Bozuk ayar yüzünden
  // 0 desi göstermek "bu koli hacimsiz" demek olur, ücreti eksik gösterirdi.
  const expected = calculateDesi(40, 30, 25, 3000);
  assert.equal(calculateDesi(40, 30, 25, 0), expected);
  assert.equal(calculateDesi(40, 30, 25, null), expected);
  assert.equal(calculateDesi(40, 30, 25, undefined), expected);
});

test("ücretlendirilebilir ağırlık büyüğü seçiyor", () => {
  assert.equal(chargeableWeight(18.5, 10), 18.5); // ağırlık belirleyici
  assert.equal(chargeableWeight(12, 32), 32); // desi belirleyici
  assert.equal(chargeableWeight(10, 10), 10); // eşit
});

test("KARIŞIK YÜK: toplam üzerinden max ücreti eksik hesaplardı", () => {
  // Ağır-küçük + hafif-hacimli klasik tuzağı.
  const packages = [
    { length_cm: 20, width_cm: 20, height_cm: 15, weight_kg: 20 }, // desi 2  → ücret 20
    { length_cm: 90, width_cm: 50, height_cm: 20, weight_kg: 2 }, // desi 30 → ücret 30
  ];
  const t = calculateTotals(packages);

  assert.equal(t.total_weight, 22);
  assert.equal(t.total_desi, 32);
  assert.equal(t.chargeable_weight, 50, "parsel başına max: 20 + 30");

  // Yanlış yol: max(Σağırlık, Σdesi) = max(22, 32) = 32 → 18 kg eksik.
  assert.notEqual(t.chargeable_weight, Math.max(t.total_weight, t.total_desi));
});

test("qty parsel sayısını ve toplamları çarpıyor", () => {
  const t = calculateTotals([
    { length_cm: 40, width_cm: 30, height_cm: 25, weight_kg: 18.5, qty: 3 },
  ]);
  assert.equal(t.parcel_count, 3);
  assert.equal(t.total_weight, 55.5);
  assert.equal(t.total_desi, 30);
  assert.equal(t.chargeable_weight, 55.5);
});

test("kayan nokta kuyruğu ekrana sızmıyor", () => {
  const t = calculateTotals([
    { length_cm: 40, width_cm: 30, height_cm: 25, weight_kg: 18.5 },
    { length_cm: 60, width_cm: 40, height_cm: 40, weight_kg: 12 },
    { length_cm: 30, width_cm: 20, height_cm: 15, weight_kg: 11.4 },
  ]);
  // Ham toplam 41.900000000000006 olurdu.
  assert.equal(t.total_weight, 41.9);
  assert.equal(String(t.total_weight), "41.9");
  assert.equal(t.chargeable_weight, 61.9); // 18.5 + 32 + 11.4
});

test("boş liste sıfır döndürüyor, çökmüyor", () => {
  const t = calculateTotals([]);
  assert.deepEqual(t, {
    total_weight: 0,
    total_desi: 0,
    chargeable_weight: 0,
    parcel_count: 0,
  });
});
