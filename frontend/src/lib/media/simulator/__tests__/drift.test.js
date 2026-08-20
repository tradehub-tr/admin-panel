import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { DEVICES, boxWidth, regionByKey } from "../index.js";
import { KNOWN_DRIFT, DRIFT_THRESHOLD_PX, classifyRow } from "./driftBaseline.js";

/**
 * T-115 — SİMÜLATÖRÜN GERÇEK SAYFAYLA DOĞRULANMASI (drift testi).
 *
 * ## Bu test `srcsetParity.test.js`'ten NE İLE AYRILIR
 *
 * Parite testi iki HESABI karşılaştırır: panelin JavaScript'i ile `srcset.py`.
 * İkisi de aynı `placements.json`'u okuduğu için ikisi birden gerçeğe göre
 * yanlış olabilir — nitekim ÖYLE ÇIKTI (aşağıya bak). Drift testi kataloğu
 * **gerçek storefront sayfasındaki `getBoundingClientRect()`** ile karşılaştırır.
 *
 *   ÖLÇÜLÜR  — `fixtures/drift-measurements.json`'daki her satır için katalog
 *              kutu genişliği BURADA YENİDEN HESAPLANIR (`boxWidth`) ve gerçek
 *              tarayıcı ölçümüyle karşılaştırılır. Eşik 2px (kaynak kabul
 *              ölçütü). Bilinen sapmalar `driftBaseline.js`'te AÇIK AÇIK
 *              listelidir; liste büyürse ya da bir sapma kötüleşirse test kırılır.
 *   ÖLÇÜLMEZ — Fixture'ın kendisi burada ÜRETİLMEZ; tarayıcı ölçümü
 *              `scripts/drift-measure.mjs` ile GECELİK koşar (kaynak kabul
 *              ölçütü §4: "her PR'da değil, günlük"). Bu test o ölçümün
 *              donmuş kanıtını kataloğa karşı doğrular.
 *
 * ## Sapma GİZLENMEDİ
 *
 * `driftBaseline.js` bir tolerans gevşetmesi DEĞİLDİR: eşik hâlâ 2px ve
 * `scripts/drift-measure.mjs` canlı koşumda herhangi bir sapmada **1 ile
 * çıkar** (CI kırmızısı). Baseline yalnız bugünkü AÇIK HATALARI kayda geçirir
 * ki yeni bir sapma eklendiğinde ayırt edilebilsin. Hatalar
 * `docs/reports/59-fe2-drift-testi.md`'de raporlandı.
 *
 * Ölçümü tazelemek için:
 *   node scripts/drift-measure.mjs --dist ../../tradehubfront/dist
 */

const HERE = fileURLToPath(new URL(".", import.meta.url));
const FIXTURE = join(HERE, "fixtures/drift-measurements.json");

const hasFixture = existsSync(FIXTURE);
const data = hasFixture ? JSON.parse(readFileSync(FIXTURE, "utf8")) : null;

test("drift ölçümü kaydı var (yoksa ÖLÇÜLMEDİ, 'geçti' değil)", () => {
  assert.ok(
    hasFixture,
    "fixtures/drift-measurements.json yok — drift ÖLÇÜLMEDİ. " +
      "Üret: node scripts/drift-measure.mjs --dist <tradehubfront/dist>"
  );
  assert.equal(data.thresholdPx, DRIFT_THRESHOLD_PX, "fixture farklı bir eşikle üretilmiş");
  assert.ok(data.rows.length > 0, "fixture boş");
  assert.ok(data.generatedAt && data.base && data.browser, "fixture kökeni eksik");
});

test("ölçüm gerçek bir tarayıcıdan geldi — kaynak CSS'ten türetilmedi", () => {
  const measured = data.rows.filter((r) => r.status === "OK");
  assert.ok(measured.length >= 8, `en az 8 gerçek ölçüm bekleniyordu, ${measured.length} var`);
  for (const r of measured) {
    // Türetilmiş sayı tam sayı olurdu; tarayıcı ölçümü kesirli değer üretir ve
    // her satır ölçülen elemanın etiketini/sınıfını taşır.
    assert.ok(typeof r.measuredWidth === "number" && r.measuredWidth > 0, `${r.key}: genişlik yok`);
    assert.ok(r.tag && typeof r.cls === "string", `${r.key}: ölçülen eleman kimliği yok`);
    assert.ok(Array.isArray(r.ancestors) && r.ancestors.length > 0, `${r.key}: ata zinciri yok`);
  }
  // En az bir satırda kesirli piksel olmalı — yerleşim motorunun imzası.
  assert.ok(
    measured.some((r) => !Number.isInteger(r.measuredWidth)),
    "hiçbir ölçüm kesirli değil — bunlar tarayıcıdan gelmemiş olabilir"
  );
});

test("katalog hesabı fixture'daki değerle aynı kalıyor", () => {
  const byId = new Map(DEVICES.map((d) => [d.id, d]));
  for (const r of data.rows) {
    if (r.status !== "OK") continue;
    const region = regionByKey(r.key);
    assert.ok(region, `${r.key}: katalogda böyle bir bölge yok`);
    const now = boxWidth(region, byId.get(r.device));
    assert.ok(
      Math.abs(now - r.catalogWidth) < 1e-9,
      `${r.device} ${r.key}: katalog ölçümden bu yana değişti ` +
        `(${r.catalogWidth} → ${now}) — drift ölçümünü yenile`
    );
  }
});

test(`kutu farkı ${DRIFT_THRESHOLD_PX}px eşiğini yalnız BİLİNEN bölgelerde aşıyor`, () => {
  const surprises = [];
  for (const r of data.rows) {
    if (r.status !== "OK") continue;
    const verdict = classifyRow(r);
    if (verdict.unexpected) surprises.push(verdict.message);
  }
  assert.deepEqual(
    surprises,
    [],
    "YENİ DRIFT — katalog gerçek sayfadan sapıyor:\n  " + surprises.join("\n  ")
  );
});

test("bilinen sapmaların hepsi hâlâ ölçülüyor (sessizce kaybolmadı)", () => {
  const measuredKeys = new Set(data.rows.filter((r) => r.status === "OK").map((r) => r.key));
  const drifted = new Set(
    data.rows.filter((r) => r.status === "OK" && r.absDelta > DRIFT_THRESHOLD_PX).map((r) => r.key)
  );
  for (const [key, spec] of Object.entries(KNOWN_DRIFT)) {
    assert.ok(
      measuredKeys.has(key),
      `${key}: bilinen sapma kaydı var ama bölge artık ÖLÇÜLMÜYOR — ` +
        "ölçüm kapsamı daraldıysa baseline de güncellenmeli"
    );
    assert.ok(
      drifted.has(key),
      `${key}: sapma DÜZELMİŞ görünüyor (${spec.reason}). ` +
        "Düzeldiyse driftBaseline.js'ten çıkar ve raporu güncelle."
    );
  }
});

test("ölçülemeyen her bölgenin yazılı gerekçesi var", () => {
  for (const u of data.unmeasuredRegions || []) {
    assert.ok(regionByKey(u.key), `${u.key}: katalogda yok`);
    assert.ok(
      typeof u.reason === "string" && u.reason.length > 30,
      `${u.key}: "ölçülmedi" gerekçesi yok veya çok kısa`
    );
  }
});

test("kare olması gereken kutular gerçekten kare ölçüldü", () => {
  for (const r of data.rows) {
    if (r.status !== "OK" || !r.expectSquare) continue;
    assert.equal(
      r.squareOk,
      true,
      `${r.device} ${r.key}: kare beklenen kutu ${r.measuredWidth}×${r.measuredHeight} ölçüldü — ` +
        "seçici yanlış elemanı yakalamış olabilir"
    );
  }
});
