// Rapor mock'unun TUTARLILIK sözlerini kilitler (17-FE · TUR-121).
//
// NEDEN VAR:
//   Üç rapor aynı gün×taşıyıcı tohumundan toplanıyor; sözler hesapla değil
//   YAPIYLA sağlanıyor (reportsMock.js başlığı). Bu test yapıyı bilerek
//   DIŞARIDAN doğrular: biri "küçük bir düzeltme" ile raporlardan birini
//   kendi sabitine ayırırsa toplamlar sessizce kayar — burada kırmızı olur.
//   Desen: exceptionsMock.test.js — mock saf modül, gerçek kod çağrılıyor.

import assert from "node:assert/strict";
import test from "node:test";

import { REPORT_CARRIERS, defaultReportRange, reportsMock } from "../reportsMock.js";

const FROM = "2026-07-01";
const TO = "2026-07-31";

const sum = (rows, field) => rows.reduce((acc, row) => acc + row[field], 0);

test("operasyon: toplamlar kırılımların toplamı — hem taşıyıcı hem durum ekseni", () => {
  const report = reportsMock.operations(FROM, TO);

  assert.equal(report.totals.shipments, sum(report.by_carrier, "count"));
  assert.equal(report.totals.delivered, sum(report.by_carrier, "delivered"));
  assert.equal(report.totals.failed, sum(report.by_carrier, "failed"));

  // Durum ekseni de AYNI sevkiyat kümesini bölüştürür — iki kırılım
  // birbirinden kayarsa kullanıcı iki farklı "toplam" okur.
  const statusTotal = Object.values(report.by_status).reduce((a, b) => a + b, 0);
  assert.equal(statusTotal, report.totals.shipments);
  assert.equal(report.by_status.Delivered, report.totals.delivered);
  assert.equal(report.by_status.Failed, report.totals.failed);
  assert.equal(report.by_status.Cancelled, report.totals.cancelled);

  // Taşıyıcı adları diğer lojistik mock'larıyla uyumlu (pendingWork.js vb.).
  assert.deepEqual(
    report.by_carrier.map((r) => r.carrier),
    [...REPORT_CARRIERS]
  );
});

test("maliyet: marj = tahsilat − maliyet (satır satır ve toplamda, kuruşu kuruşuna)", () => {
  const report = reportsMock.cost(FROM, TO);

  for (const row of report.by_carrier) {
    // Kuruş hassasiyeti: mock parayı tamsayı kuruş tutuyor, float farkı sıfır.
    assert.equal(Math.round((row.charge - row.cost) * 100), Math.round(row.margin * 100));
  }
  assert.equal(
    Math.round(report.margin * 100),
    Math.round((report.total_customer_charge - report.total_carrier_cost) * 100)
  );
  assert.equal(
    Math.round(report.total_carrier_cost * 100),
    Math.round(sum(report.by_carrier, "cost") * 100)
  );
  // MNG bilinçli zararda (profil kararı) — L3'ün uyarı şeridi mock'ta görünür.
  const mng = report.by_carrier.find((r) => r.carrier === "MNG Kargo");
  assert.ok(mng.margin < 0, "MNG zararda olmalı — profil kararı bozulmuş");
});

test("tarih filtresi deterministik: aynı aralık aynı rapor, ayrık aralıklar toplanabilir", () => {
  // Aynı aralık iki çağrıda AYNI raporu üretir (Math.random yasak).
  assert.deepEqual(reportsMock.operations(FROM, TO), reportsMock.operations(FROM, TO));

  // Ayrık iki aralığın toplamı, birleşik aralığın toplamına eşit —
  // filtre gün bazında kesiyor, gün payandan pay çalmıyor.
  const first = reportsMock.operations("2026-07-01", "2026-07-15");
  const second = reportsMock.operations("2026-07-16", "2026-07-31");
  const whole = reportsMock.operations("2026-07-01", "2026-07-31");
  assert.equal(first.totals.shipments + second.totals.shipments, whole.totals.shipments);
  assert.equal(first.totals.delivered + second.totals.delivered, whole.totals.delivered);

  // Ters/geçersiz aralık fırlatmaz, boş rapor döner (sunucu davranışı).
  assert.equal(reportsMock.operations(TO, FROM).totals.shipments, 0);
  assert.deepEqual(reportsMock.performance(TO, FROM).trend, []);
});

test("raporlar arası tutarlılık: üç uç aynı sevkiyat kümesini anlatıyor", () => {
  const ops = reportsMock.operations(FROM, TO);
  const perf = reportsMock.performance(FROM, TO);
  const cost = reportsMock.cost(FROM, TO);

  assert.equal(sum(perf.by_carrier, "shipments"), ops.totals.shipments);
  assert.equal(sum(cost.by_carrier, "shipments"), ops.totals.shipments);
  assert.equal(perf.on_time_rate, ops.totals.on_time_rate);
  // Trend aralıktaki her gün için bir satır (iki uç dahil, Temmuz = 31 gün)
  // ve günlük teslimlerin toplamı taşıyıcı toplamıyla aynı.
  assert.equal(perf.trend.length, 31);
  assert.equal(sum(perf.trend, "delivered"), ops.totals.delivered);

  // Varsayılan aralık son 30 gün (bugün dahil) — sözleşme varsayılanı.
  const range = defaultReportRange(new Date("2026-08-21T12:00:00Z"));
  assert.deepEqual(range, { from: "2026-07-23", to: "2026-08-21" });
});
