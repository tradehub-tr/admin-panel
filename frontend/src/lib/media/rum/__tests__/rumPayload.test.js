/**
 * T-123 — gövde kurma, PII reddi, LCP etiketleri.
 *
 *   ÖLÇÜLÜR  — üretilen gövdenin YALNIZ şemadaki alanları taşıdığı; her
 *              yasak alanın gövdeyi reddettirdiği; LCP etiketlerinin URL
 *              göndermeden türetildiği; `buildPayloadSafe`'in fırlatmadığı.
 *   ÖLÇÜLMEZ — Sunucunun `validate()`'inin bu gövdeyi kabul ettiği; uç yok.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { ALLOWED_FIELDS, FORBIDDEN_FIELDS, LIMITS } from "../contract.js";
import {
  RumPayloadError,
  buildPayload,
  buildPayloadSafe,
  piiFields,
  roundValue,
} from "../payload.js";
import { lcpAssetTags, normalizeRegion, parseFormat, parseProfile } from "../lcpAsset.js";

const TABAN = Object.freeze({
  metric: "LCP",
  value: 2431.77,
  route: "/urun/:slug",
  device_class: "phone",
  viewport_width: 390,
  sample_rate: 0.1,
});

// ── Mutlu yol ──────────────────────────────────────────────────────

test("geçerli girdi şemaya uygun gövde üretir", () => {
  const g = buildPayload({ ...TABAN, dpr: 2.625, connection: "4g", navigation_type: "navigate" });
  assert.equal(g.metric, "LCP");
  assert.equal(g.value, 2431.8, "ms metriği 1 haneye yuvarlanmalı");
  assert.equal(g.route, "/urun/:slug");
  assert.equal(g.device_class, "phone");
  assert.equal(g.viewport_width, 390);
  assert.equal(g.sample_rate, 0.1);
  assert.equal(g.dpr, 2.63);
  assert.equal(g.connection, "4g");
});

test("gövdedeki HER alan şemanın izin verdiği kümede", () => {
  const g = buildPayload({
    ...TABAN,
    dpr: 2,
    connection: "3g",
    navigation_type: "reload",
    session_token: "a".repeat(32),
    lcp_region: "product_detail/main_image",
    lcp_profile: "w1280",
    lcp_format: "webp",
    engine_version: "media-engine-1.2.3",
  });
  for (const alan of Object.keys(g)) {
    assert.ok(ALLOWED_FIELDS.includes(alan), `şema dışı alan üretildi: ${alan}`);
  }
});

test("CLS 4 haneye, milisaniye metrikleri 1 haneye yuvarlanır", () => {
  assert.equal(roundValue("CLS", 0.123456), 0.1235);
  assert.equal(roundValue("LCP", 2431.77), 2431.8);
  assert.equal(buildPayload({ ...TABAN, metric: "CLS", value: 0.123456 }).value, 0.1235);
});

// ── PII ────────────────────────────────────────────────────────────

test("HER yasak alan gövdeyi reddettirir", () => {
  for (const alan of FORBIDDEN_FIELDS) {
    const girdi = { ...TABAN, [alan]: "sizinti" };
    assert.deepEqual(piiFields(girdi), [alan], `piiFields ${alan} alanını görmedi`);
    assert.throws(
      () => buildPayload(girdi),
      (e) => e instanceof RumPayloadError && e.field === alan,
      `yasak alan geçti: ${alan}`
    );
  }
});

test("şemada olmayan rastgele alan gövdeye SIZMAZ", () => {
  const g = buildPayload({ ...TABAN, nonce: "abc", tracking_pixel: 1, __proto__hack: true });
  assert.equal(g.nonce, undefined);
  assert.equal(g.tracking_pixel, undefined);
  assert.equal(Object.keys(g).length, 6);
});

test("tam URL göndermenin tek yolu `url` alanıdır ve o yasak", () => {
  assert.throws(
    () => buildPayload({ ...TABAN, url: "https://x/urun/a?email=a@b.com" }),
    RumPayloadError
  );
  assert.throws(() => buildPayload({ ...TABAN, href: "https://x" }), RumPayloadError);
  assert.throws(() => buildPayload({ ...TABAN, referrer: "https://x" }), RumPayloadError);
});

// ── Doğrulama ──────────────────────────────────────────────────────

test("bilinmeyen metrik, geçersiz değer, beyaz liste dışı rota reddedilir", () => {
  assert.throws(() => buildPayload({ ...TABAN, metric: "FID" }), /Bilinmeyen metrik/);
  assert.throws(() => buildPayload({ ...TABAN, value: -1 }), /value/);
  assert.throws(() => buildPayload({ ...TABAN, value: NaN }), /value/);
  assert.throws(() => buildPayload({ ...TABAN, value: Infinity }), /value/);
  assert.throws(() => buildPayload({ ...TABAN, route: "/dashboard" }), /beyaz listede yok/);
});

test("cihaz, viewport, oran, dpr sınırları uygulanır", () => {
  assert.throws(() => buildPayload({ ...TABAN, device_class: "watch" }), /device_class/);
  assert.throws(() => buildPayload({ ...TABAN, viewport_width: 0 }), /viewport_width/);
  assert.throws(() => buildPayload({ ...TABAN, viewport_width: 10001 }), /viewport_width/);
  assert.throws(() => buildPayload({ ...TABAN, sample_rate: 0 }), /sample_rate/);
  assert.throws(() => buildPayload({ ...TABAN, sample_rate: 1.1 }), /sample_rate/);
  assert.throws(() => buildPayload({ ...TABAN, dpr: 0.1 }), /dpr/);
  assert.throws(() => buildPayload({ ...TABAN, dpr: 99 }), /dpr/);
  assert.throws(() => buildPayload({ ...TABAN, connection: "5g" }), /connection/);
  assert.throws(() => buildPayload({ ...TABAN, navigation_type: "teleport" }), /navigation_type/);
});

test("LCP etiketleri yalnız LCP metriğinde gönderilir", () => {
  const etiketler = {
    lcp_region: "product_detail/main_image",
    lcp_profile: "w1280",
    lcp_format: "webp",
  };
  const lcp = buildPayload({ ...TABAN, ...etiketler });
  assert.equal(lcp.lcp_profile, "w1280");
  const cls = buildPayload({ ...TABAN, metric: "CLS", value: 0.1, ...etiketler });
  assert.equal(cls.lcp_profile, undefined, "CLS gövdesine LCP etiketi sızdı");
  assert.equal(cls.lcp_region, undefined);
});

test("biçimsiz LCP etiketi reddedilir (sunucu tüm kaydı atardı)", () => {
  assert.throws(
    () => buildPayload({ ...TABAN, lcp_region: "ProductDetail/MainImage" }),
    /lcp_region/
  );
  assert.throws(() => buildPayload({ ...TABAN, lcp_region: "tekparca" }), /lcp_region/);
  assert.throws(() => buildPayload({ ...TABAN, lcp_profile: "large" }), /lcp_profile/);
  assert.throws(
    () => buildPayload({ ...TABAN, lcp_format: "x".repeat(LIMITS.lcpFormatMaxLength + 1) }),
    /lcp_format/
  );
  assert.throws(
    () => buildPayload({ ...TABAN, engine_version: "x".repeat(LIMITS.engineVersionMaxLength + 1) }),
    /engine_version/
  );
});

test("buildPayloadSafe ASLA fırlatmaz — geçersizde null döner", () => {
  const kotu = [
    null,
    undefined,
    42,
    "metin",
    {},
    { ...TABAN, metric: "FID" },
    { ...TABAN, url: "x" },
  ];
  for (const g of kotu) {
    assert.doesNotThrow(() => buildPayloadSafe(g));
    assert.equal(buildPayloadSafe(g), null, `geçersiz girdi gövde üretti: ${JSON.stringify(g)}`);
  }
  assert.notEqual(buildPayloadSafe(TABAN), null, "geçerli girdi null döndü — test boş olurdu");
});

// ── LCP asset etiketleri ───────────────────────────────────────────

test("türev profili URL'den çıkarılır, URL'in kendisi ASLA dönmez", () => {
  assert.equal(parseProfile("https://cdn/media/abc-w1280.webp"), "w1280");
  assert.equal(parseProfile("https://cdn/media/abc_w96.avif"), "w96");
  assert.equal(parseProfile("https://cdn/media/w640/abc.jpg"), "w640");
  assert.equal(parseProfile("https://cdn/media/abc.jpg?w=1024"), "w1024");
  assert.equal(parseProfile("https://cdn/media/abc.jpg?width=768&x=1"), "w768");
  // Türev izi yoksa TAHMİN ETMEZ.
  assert.equal(parseProfile("https://cdn/media/abc.jpg"), "unknown");
  assert.equal(parseProfile(""), "unknown");
  // 5 haneli genişlik şemaya uymaz → unknown.
  assert.equal(parseProfile("https://cdn/media/abc-w123456.webp"), "unknown");
});

test("biçim uzantıdan çıkarılır, uzun/eksik uzantı boş döner", () => {
  assert.equal(parseFormat("https://cdn/a-w96.webp"), "webp");
  assert.equal(parseFormat("https://cdn/a.AVIF?x=1"), "avif");
  assert.equal(parseFormat("https://cdn/a"), "");
  assert.equal(parseFormat(""), "");
});

test("bölge etiketi biçimsizse boş döner (ölçüm kaybedilmez)", () => {
  assert.equal(normalizeRegion("product_detail/main_image"), "product_detail/main_image");
  assert.equal(normalizeRegion("Product_Detail/Main_Image"), "product_detail/main_image");
  assert.equal(normalizeRegion("tekparca"), "");
  assert.equal(normalizeRegion("a/b/c"), "");
  assert.equal(normalizeRegion(null), "");
});

test("lcpAssetTags ASLA fırlatmaz — bozuk metrik nesnesinde boş etiket döner", () => {
  const kotu = [null, undefined, {}, { attribution: null }, { attribution: { url: 12345 } }, 42];
  for (const m of kotu) {
    let out;
    assert.doesNotThrow(() => {
      out = lcpAssetTags(m);
    });
    assert.deepEqual(Object.keys(out).sort(), ["lcp_format", "lcp_profile", "lcp_region"]);
  }
});

test("lcpAssetTags URL'den etiket üretir ve URL'i dışarı vermez", () => {
  const out = lcpAssetTags(
    { attribution: { url: "https://cdn.test/media/abc-w1280.webp", target: "#hero" } },
    { doc: null }
  );
  assert.equal(out.lcp_profile, "w1280");
  assert.equal(out.lcp_format, "webp");
  assert.equal(JSON.stringify(out).includes("cdn.test"), false, "URL etiketlere sızdı");
});
