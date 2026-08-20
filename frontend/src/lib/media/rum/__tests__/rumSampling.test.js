/**
 * T-123 — örneklem kararı ve SHA-256.
 *
 *   ÖLÇÜLÜR  — elde yazılan SHA-256'nın Node'un `crypto`'suyla aynı özeti
 *              ürettiği; `decide()`'ın Python `rum.decide()` ile 49 vektörde
 *              aynı kararı verdiği; kararın oturum boyunca DEĞİŞMEDİĞİ;
 *              biçimsiz girdide `decideSafe`'in fırlatmadığı.
 *   ÖLÇÜLMEZ — Örneklemin gerçek trafikte %10'a yakınsadığı. Bu istatistiksel
 *              bir iddia ve gerçek token dağılımı gerektirir; burada yalnız
 *              sentetik token'larla yaklaşık dağılım gösterilir.
 */

import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { DEFAULT_SAMPLE_RATE, decide, decideSafe, randomHex, sessionToken } from "../sampling.js";
import { sha256Hex } from "../sha256.js";
import { SESSION_TOKEN_PATTERN } from "../contract.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VECTORS = JSON.parse(readFileSync(path.join(HERE, "../vendor/rum_vectors.json"), "utf8"));

// ── SHA-256 ────────────────────────────────────────────────────────

test("elde yazılan SHA-256, Node crypto ile birebir aynı", () => {
  const girdiler = [
    "",
    "abc",
    "0123456789abcdef",
    ":0123456789abcdef",
    "a".repeat(55), // blok sınırı - 1
    "a".repeat(56), // dolgu taşması
    "a".repeat(64), // tam blok
    "a".repeat(1000),
    "türkçe ığüşöç 🚀 çok baytlı",
  ];
  for (const g of girdiler) {
    assert.equal(
      sha256Hex(g),
      createHash("sha256").update(g, "utf8").digest("hex"),
      `sha256(${g.slice(0, 20)})`
    );
  }
});

test("SHA-256 rastgele girdilerde de aynı (100 tur)", () => {
  for (let i = 0; i < 100; i += 1) {
    const g = randomBytes(1 + (i % 200)).toString("hex");
    assert.equal(sha256Hex(g), createHash("sha256").update(g, "utf8").digest("hex"));
  }
});

test("token_hash paritesi — sunucu ham tokeni değil, özeti saklar", () => {
  for (const v of VECTORS.token_hash) {
    // Sunucu: sha256(f"{salt}:{token}")[:12]
    assert.equal(sha256Hex(`${v.salt}:${v.token}`).slice(0, 12), v.expected);
  }
});

// ── decide() paritesi ──────────────────────────────────────────────

test(`decide — ${VECTORS.decide.length} vektörde Python rum.decide() ile aynı`, () => {
  let girenSayisi = 0;
  for (const v of VECTORS.decide) {
    const alinan = decide(v.token, v.rate);
    assert.equal(alinan, v.expected, `decide(${v.token.slice(0, 12)}…, ${v.rate})`);
    if (alinan) girenSayisi += 1;
  }
  // Vektörlerin bir kısmı gerçekten örnekleme giriyor; hepsi false olsaydı
  // test boş yere yeşil olurdu.
  assert.ok(girenSayisi > 0, "hiçbir vektör örnekleme girmiyor — test boş");
  assert.ok(girenSayisi < VECTORS.decide.length, "tüm vektörler giriyor — test boş");
});

test("oran 0 hiç almaz, oran 1 hepsini alır", () => {
  for (let i = 0; i < 20; i += 1) {
    const t = randomHex(32);
    assert.equal(decide(t, 0), false);
    assert.equal(decide(t, 1), true);
  }
});

test("KARARLILIK: aynı token + aynı oran her çağrıda aynı kararı verir", () => {
  const t = "9e107d9d372bb6826bd81d3542a419d6";
  const ilk = decide(t, DEFAULT_SAMPLE_RATE);
  for (let i = 0; i < 50; i += 1) {
    assert.equal(decide(t, DEFAULT_SAMPLE_RATE), ilk, "karar oturum içinde değişti");
  }
});

test("KARARLILIK: bir oturumun tüm metrikleri aynı kararı paylaşır (yarım oturum yok)", () => {
  // `rum.py`: "aynı oturum tokeni aynı oranda hep aynı kararı alır, yoksa
  // tek bir oturumun bazı metrikleri düşer ve p75 çarpıtılır."
  for (let i = 0; i < 200; i += 1) {
    const t = randomHex(32);
    const kararlar = ["LCP", "CLS", "INP", "TTFB"].map(() => decide(t, 0.1));
    assert.equal(new Set(kararlar).size, 1, "aynı oturumda metrikler farklı karar aldı");
  }
});

test("örneklem oranı yaklaşık tutuyor (sentetik token'larla)", () => {
  const N = 4000;
  const oran = 0.1;
  let giren = 0;
  for (let i = 0; i < N; i += 1) if (decide(randomHex(32), oran)) giren += 1;
  const gerceklesen = giren / N;
  // Geniş bant: bu bir dağılım kontrolü, kesinlik iddiası DEĞİL.
  assert.ok(
    gerceklesen > 0.07 && gerceklesen < 0.13,
    `beklenen ~%10, gerçekleşen %${(gerceklesen * 100).toFixed(2)}`
  );
});

test("varsayılan oran dokümandaki %10", () => {
  assert.equal(DEFAULT_SAMPLE_RATE, 0.1);
});

// ── Hata davranışı ─────────────────────────────────────────────────

test("decide geçersiz oranda ve biçimsiz tokende FIRLATIR (sessizce düzeltmez)", () => {
  assert.throws(() => decide("0".repeat(32), 1.5), RangeError);
  assert.throws(() => decide("0".repeat(32), -0.1), RangeError);
  assert.throws(() => decide("kisa", 0.5), RangeError);
  assert.throws(() => decide("ZZZZ".repeat(8), 0.5), RangeError);
});

test("decideSafe ASLA fırlatmaz — geçersiz girdide örnekleme almaz", () => {
  const kotu = [
    ["", 0.5],
    ["kisa", 0.5],
    ["0".repeat(32), 2],
    [null, 0.5],
    [undefined, undefined],
    ["0".repeat(32), NaN],
    [{}, "abc"],
  ];
  for (const [t, r] of kotu) {
    assert.doesNotThrow(() => decideSafe(t, r));
    assert.equal(decideSafe(t, r), false, `decideSafe(${t}, ${r}) örnekleme aldı`);
  }
});

// ── Oturum tokeni ──────────────────────────────────────────────────

test("üretilen token şema biçimine uyuyor", () => {
  for (let i = 0; i < 50; i += 1) {
    assert.match(randomHex(32), SESSION_TOKEN_PATTERN);
  }
});

test("token aynı oturumda depodan yeniden okunur", () => {
  const kutu = new Map();
  const depo = {
    getItem: (k) => (kutu.has(k) ? kutu.get(k) : null),
    setItem: (k, v) => kutu.set(k, v),
  };
  const ilk = sessionToken({ storage: depo });
  assert.match(ilk, SESSION_TOKEN_PATTERN);
  assert.equal(sessionToken({ storage: depo }), ilk, "token her çağrıda değişti");
});

test("depodaki bozuk token yok sayılır, yenisi üretilir", () => {
  const kutu = new Map([["tradehub.rum.token", "BOZUK-TOKEN"]]);
  const depo = { getItem: (k) => kutu.get(k) ?? null, setItem: (k, v) => kutu.set(k, v) };
  const t = sessionToken({ storage: depo });
  assert.match(t, SESSION_TOKEN_PATTERN);
});

test("depo erişimi fırlatsa bile token üretilir (gizli sekme)", () => {
  const patlayan = {
    getItem() {
      throw new Error("SecurityError");
    },
    setItem() {
      throw new Error("SecurityError");
    },
  };
  let t;
  assert.doesNotThrow(() => {
    t = sessionToken({ storage: patlayan });
  });
  assert.match(t, SESSION_TOKEN_PATTERN);
});

test("depo yoksa (null) yine geçerli token döner", () => {
  const t = sessionToken({ storage: null });
  assert.match(t, SESSION_TOKEN_PATTERN);
});
