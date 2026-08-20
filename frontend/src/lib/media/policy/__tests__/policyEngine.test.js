import assert from "node:assert/strict";
import { test } from "node:test";

import {
  PolicyEngine,
  PolicyNotFoundError,
  defaultPolicyEngine,
  evaluate,
  pyRound,
  pyFixed,
  parseRatio,
} from "../index.js";

/**
 * Motor birim testleri — vektörlerden BAĞIMSIZ, elle yazılmış beklentiler.
 * Parite testi "Python ile aynı mı" sorusuna, burası "tek başına doğru mu"
 * sorusuna cevap verir: eşitlik semantiği, Python truthiness tuzakları,
 * yarı-çift yuvarlama ve karar birleştirme.
 */

// ── Sentetik politika: Python tarafındaki şemanın karar veren alt kümesi ──

const POL = {
  slot_key: "test.slot",
  schema_version: "9.9.9",
  status: "draft",
  roles: ["seller"],
  accept: {
    extensions: [".jpg", ".png"],
    rejected_extensions: [".bmp"],
    mime: ["image/jpeg", "image/png"],
    max_bytes: 1000,
    max_megapixels_hard: 2,
    allow_animated: false,
  },
  require: {
    min_short_edge: 100,
    max_edge: 4000,
    allowed_ratios: ["1:1"],
    ratio_tolerance: 0.02,
    max_count: 3,
  },
  master: { max_long_edge: 200, min_long_edge: 150, fit: "contain", format: "webp" },
  on_violation: { default: "reject", master: "warn", error_code_prefix: "tst" },
  messages: { tr: {} },
};

const mk = (over = {}) => ({
  filename: "a.jpg",
  extension: ".jpg",
  byte_size: 500,
  kind: "image",
  detected: "jpeg",
  mime: "image/jpeg",
  width: 150,
  height: 150,
  readable: true,
  loadable: true,
  animated: false,
  extension_matches_content: true,
  leading_marker: false,
  appended_payload: false,
  scan_clean: true,
  existing_count: 1,
  ...over,
});

const engine = () => new PolicyEngine([POL]);

test("temiz künye geçer; master hedefi eksikse yalnız uyarı taşır", () => {
  const k = engine().evaluate("test.slot", mk(), "seller");
  assert.equal(k.allow, true);
  // 150 < min_long_edge yok (150 == 150 sınırın altında değil) → hiç ihlal yok
  assert.equal(k.action, "pass");
  assert.deepEqual(k.violations, []);
  assert.equal(k.normalized_targets.master.width, 150);
});

test("[FR-015] eşitlik GEÇERLİDİR: kısa kenar tam eşikte ihlal üretmez", () => {
  const k = engine().evaluate("test.slot", mk({ width: 100, height: 100 }), "seller");
  assert.ok(!k.violations.some((v) => v.rule === "short_edge_too_small"));
  const alt = engine().evaluate("test.slot", mk({ width: 99, height: 99 }), "seller");
  assert.ok(alt.violations.some((v) => v.rule === "short_edge_too_small"));
  assert.equal(alt.allow, false);
});

test("[FR-016] oran toleransı BAĞIL: bant içi geçer, bant dışı ret", () => {
  // Not: 102/100 IEEE'de 1.02'nin bir tık ÜSTÜDÜR (0.0200000…018 > 0.02) ve
  // Python da aynı double'ı görür — tam eşik double'da temsil edilemiyor.
  // Bant içi örnek 101/100 (0.00999… ≤ 0.02).
  const ic = engine().evaluate("test.slot", mk({ width: 101, height: 100 }), "seller");
  assert.ok(!ic.violations.some((v) => v.rule === "ratio_not_allowed"));
  const dis = engine().evaluate("test.slot", mk({ width: 103, height: 100 }), "seller");
  assert.ok(dis.violations.some((v) => v.rule === "ratio_not_allowed"));
});

test("rol politikada yoksa ret; rol boşsa kural uygulanmaz", () => {
  const ret = engine().evaluate("test.slot", mk(), "davetsiz");
  assert.equal(ret.allow, false);
  assert.equal(ret.violations[0].code, "tst_role_not_allowed");
  const bos = engine().evaluate("test.slot", mk(), "");
  assert.ok(!bos.violations.some((v) => v.rule === "role_not_allowed"));
});

test("ölçülmeyen kural sessizce geçmez: skipped kaydına düşer", () => {
  const probe = mk({ width: 0, height: 0 });
  delete probe.scan_clean;
  const k = engine().evaluate("test.slot", probe, "seller");
  const kurallar = k.skipped.map((s) => s.rule);
  assert.ok(kurallar.includes("geometry"), "geometri ölçülemedi kaydı yok");
  assert.ok(kurallar.includes("av_scan"), "av taraması ölçülemedi kaydı yok");
});

test("EXIF 6 döndürülmüş ölçüyle karar verir (görünen oran, dosyadaki değil)", () => {
  // Dosyada 100×200 (1:2, izinsiz) ama orientation 6 → görünen 200×100 da 2:1;
  // ikisi de 1:1 değil → ihlal. Görünenin kullanıldığını mesajdaki w/h kanıtlar.
  const k = engine().evaluate(
    "test.slot",
    mk({ width: 100, height: 200, exif_orientation: 6 }),
    "seller"
  );
  const v = k.violations.find((x) => x.rule === "ratio_not_allowed");
  assert.ok(v);
  assert.equal(v.observed, 2); // 200/100 — döndürülmüş görünüm
});

test("[FR-049] birden çok ihlalde EN YÜKSEK aksiyon kazanır, uyarılar düşmez", () => {
  // min_long_edge altı (warn) + bilinmeyen uzantı (reject)
  const k = engine().evaluate(
    "test.slot",
    mk({ width: 120, height: 120, extension: ".gif", detected: "gif", mime: "image/jpeg" }),
    "seller"
  );
  assert.equal(k.action, "reject");
  assert.equal(k.allow, false);
  assert.ok(
    k.violations.some((v) => v.action === "warn"),
    "warn ihlali listede kalmalı"
  );
  assert.deepEqual(k.normalized_targets, {}, "ret kararında hedef üretilmez");
});

test("bilinmeyen slot PolicyNotFoundError fırlatır", () => {
  assert.throws(() => engine().evaluate("yok.boyle", mk()), PolicyNotFoundError);
});

test("normalized_targets: uzun kenar tavanı ölçeği, Python round paritesiyle", () => {
  const k = engine().evaluate("test.slot", mk({ width: 300, height: 300 }), "seller");
  const m = k.normalized_targets.master;
  // scale = 200/300 = 0.666… → round(scale, 6) = 0.666667 (Python ile aynı)
  assert.equal(m.width, 200);
  assert.equal(m.height, 200);
  assert.equal(m.scale, 0.666667);
  assert.equal(m.resize_needed, true);
  assert.deepEqual(m.source_size, [300, 300]);
});

test("pyRound CPython gibi yarıyı çifte yuvarlar", () => {
  assert.equal(pyRound(2.5), 2);
  assert.equal(pyRound(3.5), 4);
  assert.equal(pyRound(-2.5), -2);
  assert.equal(pyRound(0.125, 2), 0.12); // 0.125 tam temsil → gerçek yarı
  assert.equal(pyRound(0.375, 2), 0.38);
  assert.equal(pyRound(2.675, 2), 2.67); // 2.675 aslında 2.67499… → aşağı
  assert.equal(pyRound(1.0005, 6), 1.0005);
});

test("pyFixed Python'ın {:.3f} biçimiyle aynı", () => {
  assert.equal(pyFixed(1.5, 3), "1.500");
  assert.equal(pyFixed(2, 3), "2.000");
  assert.equal(pyFixed(0.0625, 3), "0.062"); // yarı-çift: 62.5 → 62
  assert.equal(pyFixed(0.1875, 3), "0.188");
});

test("parseRatio bozuk girdide 0 döner, kural değerlendirilmez", () => {
  assert.equal(parseRatio("4:5"), 0.8);
  assert.equal(parseRatio("bozuk"), 0);
  assert.equal(parseRatio("3:0"), 0);
  assert.equal(parseRatio(null), 0);
});

test("varsayılan motor vendor politikalarıyla kurulur ve gerçek slotu tanır", () => {
  const slots = defaultPolicyEngine().slots();
  assert.ok(slots.includes("product.image"));
  const k = evaluate(
    "product.image",
    mk({ width: 1200, height: 1200, byte_size: 200000 }),
    "seller"
  );
  assert.equal(k.allow, true);
  assert.equal(k.slot, "product.image");
});
