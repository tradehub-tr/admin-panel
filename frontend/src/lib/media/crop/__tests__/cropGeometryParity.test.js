import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import * as G from "../geometry.js";

/**
 * Geometri paritesi — Crop Studio'nun **kendi matematiğini yazmadığının** kanıtı.
 *
 *   ÖLÇÜLÜR  — 592 vektörün tamamı panelin gerçek giriş kapısından
 *              (`@/lib/media/crop/geometry.js`) koşturulur; sapma ve hata
 *              vakaları `crop_vectors.json`'daki beklentiyle karşılaştırılır.
 *              Ayrıca vendor kopyasının sha256'sı manifestle, manifest de
 *              (depo ortamdaysa) canlı `tradehub_core` kaynağıyla eşleştirilir.
 *   ÖLÇÜLMEZ — Python tarafı. O `tradehub_core/tests/test_crop_geometry.py`'nin
 *              işi ve bu depodan koşturulmaz. Kaynak deposu ortamda yoksa hash
 *              testi "geçti" demez, ATLAR ve sebebini yazar.
 *
 * Beklenen değerler bağımsız referans uygulamadan (`gen_crop_vectors.py`)
 * geliyor; üretim modülleri ONA uymak zorunda.
 */

const HERE = fileURLToPath(new URL(".", import.meta.url));
const VENDOR = join(HERE, "../vendor");
const FRONTEND = join(HERE, "../../../../..");
const CORE = join(FRONTEND, "../../tradehub_core/tradehub_core");

const vectorFile = JSON.parse(readFileSync(join(VENDOR, "crop_vectors.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(VENDOR, "vendor.manifest.json"), "utf8"));

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const R = (o) => G.rect(o.x, o.y, o.w, o.h);

/**
 * Vektör dosyası snake_case, TS ikizi camelCase konuşur. Adaptör BURADA,
 * geometrinin içinde değil — ikizin imzası kaynak depoyla birebir kalmalı.
 */
const CALL = {
  ratioFit: (i) => {
    const [w, h] = G.ratioFit(i.w, i.h, i.target_ar, i.mode);
    return { w, h };
  },
  clampWindow: (i) => G.clampWindow(R(i.win), R(i.bounds), i.keep_ratio),
  zoomBase: (i) => G.zoomBase(i.source_w, i.source_h, i.zoom, i.center_x, i.center_y),
  zoomFromBase: (i) => ({ zoom: G.zoomFromBase(i.source_w, i.source_h, R(i.base)) }),
  cropWindow: (i) =>
    G.cropWindow(i.source_w, i.source_h, R(i.base), i.target_ar, i.focal_x, i.focal_y),
  focalFromWindow: (i) => G.focalFromWindow(R(i.win), i.source_w, i.source_h),
  roundWindow: (i) => ({ box: G.roundWindow(R(i.win), i.source_w ?? null, i.source_h ?? null) }),
};

// ── 1. Tüm vektörler ──────────────────────────────────────────────

test("592 vektörün tamamı panelin geometri kapısından geçiyor", () => {
  const tol = vectorFile.tolerance_px;
  let enBuyukSapma = 0;
  let deger = 0;
  let hata = 0;

  for (const v of vectorFile.vectors) {
    const call = CALL[v.fn];
    assert.ok(call, `bilinmeyen fonksiyon: ${v.fn} (${v.id})`);

    if (v.error) {
      hata += 1;
      assert.throws(
        () => call(v.in),
        G.CropGeometryError,
        `${v.id} ${v.case} — hata bekleniyordu, sessizce varsayılana düşülmemeli`
      );
      continue;
    }

    deger += 1;
    const got = call(v.in);
    for (const [key, beklenen] of Object.entries(v.out)) {
      if (key === "box") {
        assert.deepEqual(got.box, beklenen, `${v.id} ${v.case} · box`);
        continue;
      }
      const sapma = Math.abs(got[key] - beklenen);
      if (sapma > enBuyukSapma) enBuyukSapma = sapma;
      assert.ok(sapma <= tol, `${v.id} ${v.case} · ${key}: ${got[key]} ≠ ${beklenen}`);
    }
  }

  assert.equal(deger, 584, "değer vektörü sayısı T-100'deki ölçümle aynı olmalı");
  assert.equal(hata, 8, "hata vakası sayısı T-100'deki ölçümle aynı olmalı");
  // T-100 raporu 0.0 px sapma ölçmüştü; panelde de aynı IEEE-754 double çıkmalı.
  assert.equal(enBuyukSapma, 0, `en büyük sapma 0 px olmalı, ölçülen: ${enBuyukSapma}`);
});

// ── 2. Elle seçilmiş birkaç vektör — okunur kanıt ─────────────────

const NAMED = ["V0004", "V0005", "V0253", "V0502", "V0530", "V0537", "V0538", "V0585"];

for (const id of NAMED) {
  const v = vectorFile.vectors.find((x) => x.id === id);
  test(`${id} — ${v.case}`, () => {
    if (v.error) {
      assert.throws(() => CALL[v.fn](v.in), G.CropGeometryError);
      return;
    }
    const got = CALL[v.fn](v.in);
    for (const [key, beklenen] of Object.entries(v.out)) {
      if (key === "box") assert.deepEqual(got.box, beklenen);
      else assert.equal(got[key], beklenen, `${key}`);
    }
  });
}

test("16:9 kırpma vektörü ile UI'nın çağıracağı zincir aynı sonucu verir", () => {
  // cropWindow(1120×1120 kare kaynak, tam taban, 16:9, merkez odak)
  const base = G.zoomBase(1120, 1120, 1, 0.5, 0.5);
  const win = G.cropWindow(1120, 1120, base, 16 / 9, 0.5, 0.5);
  const [w, h] = G.ratioFit(1120, 1120, 16 / 9, G.FIT_INSIDE);
  assert.equal(win.w, w);
  assert.equal(win.h, h);
  assert.equal(w, 1120); // V0004 çıktısı
  assert.equal(h, 630); // V0004 çıktısı
  assert.deepEqual(G.roundWindow(win, 1120, 1120), [0, 245, 1120, 630]);
});

// ── 3. Kaynak hash'i — kopya ayrışmadı mı ─────────────────────────

test("vendor kopyaları manifestteki sha256 ile birebir", () => {
  for (const [rel, hash] of Object.entries(manifest.kaynaklar)) {
    if (!rel.endsWith("crop_geometry.ts") && !rel.endsWith("crop_vectors.json")) continue;
    const local = join(VENDOR, rel.split("/").pop());
    assert.equal(sha256(readFileSync(local)), hash, `${local} manifestten sapmış`);
  }
});

test("manifest canlı tradehub_core kaynağıyla uyuşuyor", (t) => {
  if (!existsSync(CORE)) {
    t.skip("ÖLÇÜLMEDİ: tradehub_core deposu bu ortamda yok — kaynak hash'i doğrulanamadı");
    return;
  }
  for (const [rel, hash] of Object.entries(manifest.kaynaklar)) {
    const abs = join(CORE, rel.replace("tradehub_core/tradehub_core/", ""));
    assert.ok(existsSync(abs), `kaynak kayıp: ${abs}`);
    assert.equal(sha256(readFileSync(abs)), hash, `kaynak değişmiş, senkron gerekli: ${rel}`);
  }
});

// ── 3b. Türetilmiş .js — kapı Node sürümüne bağlı olmasın ─────────

/**
 * Zincir üç halkalıdır ve üçü de burada doğrulanır:
 *
 *   tradehub_core/.../crop_geometry.ts  ──sha256──▶  vendor/crop_geometry.ts
 *                                       ──sha256──▶  vendor/crop_geometry.js
 *
 * Son halka olmadan panel `.ts` içe aktarmak zorunda kalır; `node --test` o
 * dosyayı yalnız tip soyma destekli sürümlerde (22.6+ bayraklı, 22.18+ varsayılan)
 * okuyabilir. `tradehub_core` konteynerinde ölçülen sürüm v20.19.2 ve orada
 * `--experimental-strip-types` "bad option" ile düşüyor — yani parite ölçülmüyor,
 * yalnızca kırmızı yanıyor. Türetilmiş `.js` o bağı koparır.
 */
test("türetilmiş crop_geometry.js manifestteki zincire uyuyor", () => {
  const kayit = manifest.turetilmis?.["src/lib/media/crop/vendor/crop_geometry.js"];
  assert.ok(kayit, "manifest türetilmiş dosyayı tanımıyor — npm run sync:crop koşulmalı");
  assert.equal(
    sha256(readFileSync(join(VENDOR, "crop_geometry.ts"))),
    kayit.kaynak_sha256,
    ".js başka bir .ts'ten üretilmiş — npm run sync:crop koşulmalı"
  );
  assert.equal(
    sha256(readFileSync(join(VENDOR, "crop_geometry.js"))),
    kayit.sha256,
    "türetilmiş .js elle düzenlenmiş ya da eskimiş"
  );
});

test("kırpma kapısı hiçbir yerde .ts içe aktarmıyor", () => {
  const roots = [join(HERE, ".."), join(FRONTEND, "src/components/media/crop")];
  const suspects = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) {
        if (entry !== "vendor") walk(abs);
        continue;
      }
      if (!/\.(js|vue)$/.test(entry)) continue;
      const src = readFileSync(abs, "utf8");
      if (/from\s+["'][^"']+\.ts["']/.test(src)) suspects.push(abs);
    }
  };
  roots.forEach(walk);
  assert.deepEqual(suspects, [], "tip soymaya bağlı içe aktarım — kapı Node 20'de düşer");
});

test("geometri kapısı türetilmiş .js'i içe aktarıyor", () => {
  const src = readFileSync(join(HERE, "../geometry.js"), "utf8");
  assert.match(src, /from "\.\/vendor\/crop_geometry\.js"/);
});

// ── 4. İkinci bir uygulama var mı ─────────────────────────────────

test("kırpma modüllerinin hiçbiri vendor'ı doğrudan içe aktarmıyor", () => {
  const roots = [join(HERE, ".."), join(FRONTEND, "src/components/media/crop")];
  const suspects = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) {
        if (entry !== "vendor" && entry !== "__tests__") walk(abs);
        continue;
      }
      if (!/\.(js|vue)$/.test(entry)) continue;
      if (abs.endsWith(join("crop", "geometry.js"))) continue; // tek meşru kapı
      const src = readFileSync(abs, "utf8");
      if (src.includes("vendor/crop_geometry")) suspects.push(abs);
    }
  };
  roots.forEach(walk);
  assert.deepEqual(suspects, [], "geometri yalnız geometry.js üzerinden içe aktarılmalı");
});

test("kırpma modüllerinde kendi yuvarlama/oran matematiği yazılmamış", () => {
  // `floor(v + 0.5)` ikizin imzasıdır; panelde ikinci bir kopyası çıkarsa
  // parite testi sessiz kalır ama kadraj ayrışır.
  const roots = [join(HERE, ".."), join(FRONTEND, "src/components/media/crop")];
  const suspects = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) {
        if (entry !== "vendor" && entry !== "__tests__") walk(abs);
        continue;
      }
      if (!/\.(js|vue)$/.test(entry)) continue;
      const src = readFileSync(abs, "utf8");
      if (/Math\.floor\s*\([^)]*\+\s*0\.5/.test(src)) suspects.push(`${abs}: floor(v+0.5)`);
    }
  };
  roots.forEach(walk);
  assert.deepEqual(suspects, []);
});
