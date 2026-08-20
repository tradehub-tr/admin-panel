import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { defaultPolicyEngine } from "../index.js";

/**
 * Çapraz parite — T-033'ün "iki taraf aynı sonucu veriyor" kabul kriteri.
 *
 *   ÖLÇÜLÜR  — vendor'lanmış vektörlerin TAMAMI panelin gerçek giriş
 *              kapısından (`@/lib/media/policy`) koşturulur; karar nesnesi
 *              (allow/action/violations/mesaj metinleri/normalized_targets/
 *              skipped) Python motorunun verdiği beklentiyle DERİN eşitlikle
 *              karşılaştırılır. Vendor zincirinin sha256'ları manifestle,
 *              manifest de (depo ortamdaysa) canlı tradehub_core kaynağıyla
 *              eşleştirilir.
 *   ÖLÇÜLMEZ — Python tarafının kendi doğruluğu; o
 *              `tradehub_core/tests/test_policy_engine.py`'nin işi.
 *              Kaynak deposu ortamda yoksa hash testi "geçti" demez, ATLAR.
 *
 * Beklenen kararlar referans motor (`policy/engine.py`) GERÇEKTEN koşturularak
 * üretildi (`scripts/sync-policy-engine.mjs`); ikiz ONA uymak zorunda.
 */

const HERE = fileURLToPath(new URL(".", import.meta.url));
const VENDOR = join(HERE, "../vendor");
const FRONTEND = join(HERE, "../../../../..");
const CORE = join(FRONTEND, "../../tradehub_core/tradehub_core");

const doc = JSON.parse(readFileSync(join(VENDOR, "policy_vectors.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(VENDOR, "vendor.manifest.json"), "utf8"));
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

// ── 1. Tüm vektörler ──────────────────────────────────────────────

test(`${doc.count} parite vektörünün tamamı birebir aynı kararı veriyor`, () => {
  assert.ok(doc.count >= 300, "vektör korpusu beklenmedik ölçüde küçülmüş");
  assert.equal(doc.vectors.length, doc.count, "vektör sayısı başlıkla uyuşmalı");
  const engine = defaultPolicyEngine();
  for (const v of doc.vectors) {
    const got = engine.evaluate(v.slot, v.probe, v.role);
    assert.deepStrictEqual(
      got,
      v.expected,
      `${v.id} ${v.slot} · ${v.name} (${v.kaynak}) — ikiz motor referanstan saptı`
    );
  }
});

test("vektör örneklemi dört girdi ailesini de içeriyor", () => {
  const d = doc.kaynak_dagilimi;
  for (const kaynak of ["manifest", "ffprobe", "sinir", "rol", "guvenlik"]) {
    assert.ok((d[kaynak] ?? 0) > 0, `'${kaynak}' ailesinden hiç vektör yok`);
  }
});

// ── 2. Elle seçilmiş kanıt vektörleri — okunur örnekler ───────────

test("ret vektörleri gerçekten ret, uyarılar gerçekten geçiriyor", () => {
  const engine = defaultPolicyEngine();
  const retler = doc.vectors.filter((v) => !v.expected.allow);
  const gecenler = doc.vectors.filter((v) => v.expected.allow && v.expected.action === "warn");
  assert.ok(retler.length >= 50, "korpus hiç ret içermiyorsa sınırlar ölçülmüyor demektir");
  assert.ok(gecenler.length >= 10, "korpus hiç uyarı içermiyor");
  for (const v of [retler[0], gecenler[0]]) {
    const got = engine.evaluate(v.slot, v.probe, v.role);
    assert.equal(got.allow, v.expected.allow, v.id);
    assert.equal(got.action, v.expected.action, v.id);
  }
});

test("mesaj paritesi: tam sayı değerli politika float'ı Python gibi yazılıyor (2.0)", () => {
  // brand.logo aspect_band [0.5, 2.0] — Python f"{alt}–{ust}" = "0.5–2.0".
  // TR metni politika ezer (kendi cümlesi var); İngilizce metin katalogdan gelir
  // ve {izinli_oranlar} yer tutucusunu bant değerleriyle doldurur.
  const v = doc.vectors.find((x) => x.slot === "brand.logo" && x.name === "band_ust_disi");
  assert.ok(v, "brand.logo band_ust_disi vektörü üretimden düşmüş");
  const ihlal = v.expected.violations.find((i) => i.rule === "aspect_out_of_band");
  assert.ok(ihlal, "band dışı vektör aspect_out_of_band üretmeliydi");
  assert.match(ihlal.message.en, /0\.5–2\.0/, "beklentinin kendisi 2.0 yazmalı");
  const got = defaultPolicyEngine().evaluate(v.slot, v.probe, v.role);
  const gotIhlal = got.violations.find((i) => i.rule === "aspect_out_of_band");
  assert.match(gotIhlal.message.en, /0\.5–2\.0/, "ikiz '2' yazarsa FLOAT_REPRS zinciri kopmuş");
});

// ── 3. Kaynak hash'i — kopya ayrışmadı mı ─────────────────────────

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

test("türetilmiş engine.js manifestteki zincire uyuyor", () => {
  const kayit = manifest.turetilmis?.["src/lib/media/policy/vendor/engine.js"];
  assert.ok(kayit, "manifest türetilmiş dosyayı tanımıyor — npm run sync:policy koşulmalı");
  assert.equal(
    sha256(readFileSync(join(HERE, "../engine.ts"))),
    kayit.kaynak_sha256,
    ".js başka bir .ts'ten üretilmiş — npm run sync:policy koşulmalı"
  );
  assert.equal(
    sha256(readFileSync(join(VENDOR, "engine.js"))),
    kayit.sha256,
    "türetilmiş .js elle düzenlenmiş ya da eskimiş"
  );
});

test("politika kapısı hiçbir yerde .ts içe aktarmıyor", () => {
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
  walk(join(HERE, ".."));
  assert.deepEqual(suspects, [], "tip soymaya bağlı içe aktarım — kapı Node 20'de düşer");
});

// ── 4. İkinci bir uygulama / sahiplik ihlali var mı ───────────────

test("vendor'ı yalnız index.js içe aktarıyor (tek meşru kapı)", () => {
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
      if (abs.endsWith(join("policy", "index.js"))) continue;
      const src = readFileSync(abs, "utf8");
      if (src.includes("vendor/engine") || src.includes("vendor/slot_policies")) {
        suspects.push(abs);
      }
    }
  };
  walk(join(HERE, ".."));
  assert.deepEqual(suspects, [], "motor yalnız policy/index.js üzerinden içe aktarılmalı");
});

test("ikiz motor upload/vendor/slotPolicy.js'e dokunmuyor (ayrı vendor, yalnız oku)", () => {
  const src = readFileSync(join(HERE, "../index.js"), "utf8");
  assert.ok(
    !/from\s+["'][^"']*upload\/vendor/.test(src),
    "politika kapısı ön kontrol vendor'ını içe aktarmamalı"
  );
});
