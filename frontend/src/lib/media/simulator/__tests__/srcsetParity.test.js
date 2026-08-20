import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  ALL_REGIONS,
  DEVICES,
  DEFAULT_SOURCE_WIDTH,
  PRIMARY_REGIONS,
  regionByKey,
  renditionsFor,
  simulate,
  simulateMatrix,
  sizesFor,
  srcsetAttribute,
  summarize,
} from "../index.js";
import { posterRenditions, simulatePoster } from "../poster.js";

/**
 * Simülatör paritesi — panelin JavaScript hesabının referans uygulamadan
 * SAPMADIĞININ kanıtı.
 *
 *   ÖLÇÜLÜR  — 195 (cihaz × bölge) kombinasyonunun tamamı ve içindeki 65
 *              birincil kombinasyon, panelin gerçek kapısından
 *              (`@/lib/media/simulator`) koşturulur; kutu genişliği, gereken
 *              piksel, seçilen basamak, uyarı kodları ve 15 `sizes` dizgesi
 *              `srcset.py`'nin ürettiğiyle karşılaştırılır. Sapma RAPORLANIR.
 *              Ayrıca 13 poster vektörü ve vendor hash zinciri.
 *   ÖLÇÜLMEZ — Python tarafının kendi doğruluğu (`tradehub_core/tests/
 *              test_simulator_srcset.py`'nin işi, buradan koşturulmaz) ve
 *              gerçek tarayıcı davranışı. `devices.json`/`placements.json`
 *              değerleri de ölçülmedi — emülasyon/CSS aritmetiği.
 *
 * Beklenen değerler `vendor/parity_vectors.json`'dan gelir; o dosya
 * `scripts/gen_simulator_vectors.py` ile referans uygulamayı KOŞTURARAK
 * üretilir. Kaynak deposu ortamda yoksa hash testi "geçti" demez, ATLAR.
 */

const HERE = fileURLToPath(new URL(".", import.meta.url));
const VENDOR = join(HERE, "../vendor");
const FRONTEND = join(HERE, "../../../../..");
const CORE_REPO = join(FRONTEND, "../../tradehub_core");

const fixture = JSON.parse(readFileSync(join(VENDOR, "parity_vectors.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(VENDOR, "vendor.manifest.json"), "utf8"));

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const byKey = (rows) => new Map(rows.map((r) => [r.key, r]));

/**
 * Fazlalık beklentisi tam çift duyarlıkta üretiliyor; tolerans SIFIR değil ama
 * bir ULP mertebesinde: iki dil de IEEE-754 double kullanıyor ve bölme aynı
 * sırada yapılıyor, o yüzden ölçülen sapma bugün 0. Tolerans sıfıra sabitlenip
 * ilerideki bir derleyici farkında testin yalancı kırmızıya dönmemesi için var.
 */
const OVERSHOOT_TOL = Number.EPSILON * 8;

// ── 0. Girdi kümesi aynı mı ───────────────────────────────────────

test("cihaz ve bölge kümeleri referans uygulamayla birebir", () => {
  assert.deepEqual(
    DEVICES.map((d) => d.id),
    fixture.device_ids,
    "13 cihaz aynı sırada olmalı"
  );
  assert.deepEqual(
    ALL_REGIONS.map((r) => r.key),
    fixture.region_keys,
    "15 bölge aynı sırada olmalı"
  );
  assert.deepEqual(
    PRIMARY_REGIONS.map((r) => r.key),
    fixture.primary_region_keys,
    "5 birincil bölge aynı olmalı"
  );
  assert.equal(DEVICES.length, 13);
  assert.equal(PRIMARY_REGIONS.length, 5);
});

test("[FR-028] profil merdiveni politikadan aynı çıkıyor (upscale kelepçesi dahil)", () => {
  for (const [slotKey, expected] of Object.entries(fixture.ladders)) {
    const got = renditionsFor(slotKey, fixture.source_width);
    assert.deepEqual(
      got.map((r) => ({
        name: r.name,
        width: r.width,
        maxOvershoot: r.maxOvershoot,
        clampedFrom: r.clampedFrom,
      })),
      expected,
      `${slotKey} merdiveni ayrışmış`
    );
  }
  assert.equal(fixture.source_width, DEFAULT_SOURCE_WIDTH);
});

// ── 1. 65 birincil kombinasyon — görevin kapısı ───────────────────

/**
 * Tek bir kombinasyonu karşılaştırır ve sapmaları dizi olarak döndürür.
 * Assert BURADA atılmaz: 65'in tamamı koşsun, sapmaların HEPSİ raporlansın.
 */
function compare(got, want) {
  const bad = [];
  const eq = (field, a, b) => {
    if (a !== b) bad.push(`${want.key} · ${field}: panel=${a} referans=${b}`);
  };
  if (Math.abs(got.cssBoxPx - want.css_box_px) > fixture.tolerance_px) {
    bad.push(`${want.key} · css_box_px: panel=${got.cssBoxPx} referans=${want.css_box_px}`);
  }
  eq("required_px", got.requiredPx, want.required_px);
  eq("chosen_profile", got.chosen?.name ?? "-", want.chosen_profile);
  eq("chosen_width", got.chosen?.width ?? 0, want.chosen_width);
  eq("sufficient", got.sufficient, want.sufficient);
  eq("deficit_px", got.deficitPx, want.deficit_px);
  eq("demand_multiplier", got.demandMultiplier, want.demand_multiplier);
  eq("zoom_required_px", got.zoomRequiredPx, want.zoom_required_px);
  eq("zoom_sufficient", got.zoomSufficient, want.zoom_sufficient);
  if (Math.abs(got.overshoot - want.overshoot) > OVERSHOOT_TOL) {
    bad.push(`${want.key} · overshoot: panel=${got.overshoot} referans=${want.overshoot}`);
  }
  if (got.warnings.join(",") !== want.warnings.join(",")) {
    bad.push(`${want.key} · warnings: panel=[${got.warnings}] referans=[${want.warnings}]`);
  }
  return bad;
}

test("65 birincil kombinasyonun tamamı panelin kapısından referansla aynı", () => {
  const want = byKey(fixture.vectors);
  const rows = simulateMatrix(DEVICES, PRIMARY_REGIONS, fixture.source_width);
  assert.equal(rows.length, 65, "13 cihaz × 5 yerleşim = 65");

  const deviations = [];
  for (const row of rows) {
    const expected = want.get(row.key);
    assert.ok(expected, `referans vektörü yok: ${row.key}`);
    deviations.push(...compare(row, expected));
  }
  assert.deepEqual(deviations, [], `${deviations.length} sapma`);
});

test("65 kombinasyonun özeti ölçülen değerlerle aynı", () => {
  const s = summarize(simulateMatrix(DEVICES, PRIMARY_REGIONS, fixture.source_width));
  const ref = fixture.summary.primary;
  assert.equal(s.total, 65);
  // Faz 11 raporunun ölçtüğü üç sayı. `aşırı servis` 2026-08-20'de 1'den 3'e
  // ÇIKTI ve bu bir gerileme DEĞİL: T-115 drift ölçümü kataloğun mağaza ürün
  // ızgarasını 260px sanıp gerçekte 199,5px olduğunu gösterdi (sol kenar
  // çubuğu düşülmüyordu). Katalog düzeltilince kutu küçüldü, merdivenin aynı
  // basamağı artık FAZLA iniyor — yani aşırı servis zaten VARDI, katalog onu
  // göremiyordu. Yeni ikisi: desktop-1080p ve desktop-1440p × seller_shop.
  assert.equal(s.sourceInsufficient, 0, "kaynak_yetersiz=0 @2160px");
  assert.equal(s.zoomInsufficient, 6, "zoom_yetersiz=6");
  assert.equal(s.overshoot, 3, "aşırı servis=3");
  assert.equal(s.sourceInsufficient, ref.kaynak_yetersiz);
  assert.equal(s.zoomInsufficient, ref.zoom_yetersiz);
  assert.equal(s.overshoot, ref.asiri_servis);
  assert.deepEqual(s.zoomInsufficientKeys, ref.zoom_yetersiz_liste);
  assert.deepEqual(s.overshootKeys, ref.asiri_servis_liste);
  assert.deepEqual(s.distribution, ref.secilen_dagilim);
  assert.ok(Math.abs(s.meanOvershoot - ref.ortalama_fazlalik) < 1e-12);
  assert.ok(Math.abs(s.maxOvershoot - ref.en_yuksek_fazlalik) < 1e-12);
});

// ── 2. 195 kombinasyon — üst küme ─────────────────────────────────

test("15 bölgenin tamamında (195 kombinasyon) da sapma yok", () => {
  const want = byKey(fixture.vectors);
  const rows = simulateMatrix(DEVICES, ALL_REGIONS, fixture.source_width);
  assert.equal(rows.length, 195);
  const deviations = [];
  for (const row of rows) deviations.push(...compare(row, want.get(row.key)));
  assert.deepEqual(deviations, [], `${deviations.length} sapma`);
});

// ── 3. `sizes` / `srcset` dizgeleri ───────────────────────────────

test("[FR-121] 15 bölgenin `sizes` dizgesi karakteri karakterine aynı", () => {
  const bad = [];
  for (const region of ALL_REGIONS) {
    const got = sizesFor(region);
    const want = fixture.sizes[region.key];
    if (got !== want) bad.push(`${region.key}\n  panel:     ${got}\n  referans:  ${want}`);
  }
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("[FR-121] `srcset` dizgesi referansla aynı", () => {
  for (const [slotKey, want] of Object.entries(fixture.srcset)) {
    assert.equal(srcsetAttribute(renditionsFor(slotKey, fixture.source_width)), want, slotKey);
  }
});

// ── 4. Video posteri ──────────────────────────────────────────────

test("13 cihazın poster seçimi referansla aynı", () => {
  const want = byKey(fixture.poster.vectors);
  const { region, ladder, rows } = simulatePoster(DEVICES, fixture.source_width);
  assert.ok(region, "vekil bölge bulunmalı");
  assert.equal(region.key, fixture.poster.proxy_region);
  assert.deepEqual(
    ladder.map((r) => ({ name: r.name, width: r.width })),
    fixture.poster.ladder
  );
  assert.equal(rows.length, 13);
  const deviations = [];
  for (const row of rows) deviations.push(...compare(row, want.get(row.key)));
  assert.deepEqual(deviations, [], `${deviations.length} sapma`);
});

test("poster merdiveni videonun kendi türevlerini içermiyor", () => {
  const names = posterRenditions().map((r) => r.name);
  assert.ok(names.length > 0, "en az bir poster basamağı olmalı");
  assert.ok(
    names.every((n) => n.startsWith("poster")),
    `poster dışı basamak sızmış: ${names}`
  );
});

// ── 5. Kenar durumları — referansla aynı davranış ─────────────────

test("merdiven boşsa profil_yok uyarısı verilir, sessizce geçilmez", () => {
  const region = regionByKey("home/hero_showcase_grid");
  const row = simulate(DEVICES[0], region, []);
  assert.equal(row.chosen, null);
  assert.deepEqual(row.warnings, ["profil_yok"]);
  assert.equal(row.overshoot, 0, "seçim yoksa fazlalık ölçülemez → 0");
  assert.equal(row.sufficient, false);
});

test("listeleme ızgarası viewport ile MONOTON ARTMIYOR (placements.json anomalisi)", () => {
  // 640px'te 3 sütun yok, 768'de 3 sütun + 240px filtre çubuğu aynı anda açılır.
  const region = regionByKey("listing/card_grid");
  const at = (w) => simulate({ ...DEVICES[0], cssWidth: w, dpr: 1 }, region, []).cssBoxPx;
  assert.ok(at(768) < at(640), `768 (${at(768)}) 640'tan (${at(640)}) küçük olmalı`);
});

// ── 6. Vendor zinciri ─────────────────────────────────────────────

test("vendor kopyaları manifestteki sha256 ile birebir", () => {
  for (const [rel, hash] of Object.entries(manifest.kaynaklar)) {
    const local = join(VENDOR, rel.split("/").pop());
    if (!existsSync(local)) continue; // srcset.py / video_decision.json kopyalanmaz
    assert.equal(sha256(readFileSync(local)), hash, `${local} manifestten sapmış`);
  }
});

test("manifest canlı tradehub_core kaynağıyla uyuşuyor", (t) => {
  if (!existsSync(CORE_REPO)) {
    t.skip("ÖLÇÜLMEDİ: tradehub_core deposu bu ortamda yok — kaynak hash'i doğrulanamadı");
    return;
  }
  for (const [rel, hash] of Object.entries(manifest.kaynaklar)) {
    const abs = join(CORE_REPO, rel.replace(/^tradehub_core\//, ""));
    assert.ok(existsSync(abs), `kaynak kayıp: ${abs}`);
    assert.equal(
      sha256(readFileSync(abs)),
      hash,
      `kaynak değişmiş, \`npm run sync:simulator\` gerekli: ${rel}`
    );
  }
});
