/**
 * T-123 — istemci sözleşmesi sunucudakiyle AYNI MI?
 *
 *   ÖLÇÜLÜR  — `contract.js` sabitlerinin `rum.py`'den üretilmiş vektörlerle
 *              birebir aynı olduğu; `routeTemplate`/`viewportBucket`/`rating`
 *              fonksiyonlarının Python karşılıklarıyla aynı sonucu verdiği;
 *              vendor dosyasının hâlâ güncel `rum.py`'den üretildiği.
 *   ÖLÇÜLMEZ — Sunucunun bu gövdeyi gerçekten kabul ettiği. HTTP ucu YOK;
 *              uçtan uca doğrulama YAPILAMADI.
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  ALLOWED_FIELDS,
  CONNECTION_TYPES,
  DEVICE_CLASSES,
  FORBIDDEN_FIELDS,
  METRICS,
  METRIC_GROUP_BY,
  NAVIGATION_TYPES,
  RATING_THRESHOLDS,
  REQUIRED_FIELDS,
  ROUTE_TEMPLATES,
  UNITLESS,
  VIEWPORT_BUCKETS,
} from "../contract.js";
import { routeTemplate, viewportBucket } from "../context.js";
import { rating } from "../payload.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VECTORS = JSON.parse(readFileSync(path.join(HERE, "../vendor/rum_vectors.json"), "utf8"));
const ISTOC = path.resolve(HERE, "../../../../../../..");
const RUM_PY = path.join(ISTOC, VECTORS.source_file);

// ── Kopya ayrışması ────────────────────────────────────────────────

test("vendor vektörleri güncel rum.py'den üretilmiş (ayrışma yok)", () => {
  if (!existsSync(RUM_PY)) {
    // Panel tek başına klonlanmış olabilir; o zaman ayrışma ÖLÇÜLEMEZ.
    // Testi yeşil göstermek yerine ne olduğunu söyle.
    assert.ok(VECTORS.source_sha256, "vendor dosyasında kaynak özeti yok");
    return;
  }
  const sha = createHash("sha256").update(readFileSync(RUM_PY)).digest("hex");
  assert.equal(
    sha,
    VECTORS.source_sha256,
    `rum.py değişmiş ama vendor/rum_vectors.json yenilenmemiş.\n` +
      `Beklenen ${VECTORS.source_sha256}\nBulunan  ${sha}\n` +
      `Yeniden üret: contract.js başlığındaki python3 komutu.`
  );
});

// ── Sabitler ───────────────────────────────────────────────────────

const c = VECTORS.constants;

test("metrik listesi ve birimsiz metrikler sunucuyla aynı", () => {
  assert.deepEqual([...METRICS], c.METRICS);
  assert.deepEqual([...UNITLESS], c.UNITLESS);
});

test("rota şablonları, cihaz sınıfları, bağlantı tipleri sunucuyla aynı", () => {
  assert.deepEqual([...ROUTE_TEMPLATES], c.ROUTE_TEMPLATES);
  assert.deepEqual([...DEVICE_CLASSES], c.DEVICE_CLASSES);
  assert.deepEqual([...CONNECTION_TYPES], c.CONNECTION_TYPES);
  assert.deepEqual([...NAVIGATION_TYPES], c.NAVIGATION_TYPES);
  assert.deepEqual([...VIEWPORT_BUCKETS], c.VIEWPORT_BUCKETS);
  assert.deepEqual([...METRIC_GROUP_BY], c.METRIC_GROUP_BY);
});

test("CWV eşikleri sunucuyla aynı", () => {
  for (const [ad, esik] of Object.entries(c.RATING_THRESHOLDS)) {
    assert.deepEqual([...RATING_THRESHOLDS[ad]], esik, `eşik ayrışması: ${ad}`);
  }
  assert.equal(Object.keys(RATING_THRESHOLDS).length, Object.keys(c.RATING_THRESHOLDS).length);
});

test("izinli alan kümesi sunucu şemasının properties'i ile birebir", () => {
  assert.deepEqual([...ALLOWED_FIELDS].sort(), [...c.SCHEMA_PROPERTIES].sort());
});

test("zorunlu alanlar sunucu şemasıyla aynı", () => {
  assert.deepEqual([...REQUIRED_FIELDS].sort(), [...c.SCHEMA_REQUIRED].sort());
});

test("yasak alanların HİÇBİRİ izinli listede değil", () => {
  assert.deepEqual([...FORBIDDEN_FIELDS], c.FORBIDDEN_FIELDS);
  const sizinti = FORBIDDEN_FIELDS.filter((f) => ALLOWED_FIELDS.includes(f));
  assert.deepEqual(sizinti, [], `PII alanı şemaya sızmış: ${sizinti}`);
});

// ── Fonksiyon paritesi ─────────────────────────────────────────────

test(`routeTemplate — ${VECTORS.route_template.length} vektörde Python ile aynı`, () => {
  for (const v of VECTORS.route_template) {
    assert.equal(routeTemplate(v.input), v.expected, `route_template(${JSON.stringify(v.input)})`);
  }
});

test(`viewportBucket — ${VECTORS.viewport_bucket.length} vektörde Python ile aynı`, () => {
  for (const v of VECTORS.viewport_bucket) {
    assert.equal(viewportBucket(v.width), v.expected, `viewport_bucket(${v.width})`);
  }
});

test(`rating — ${VECTORS.rating.length} vektörde Python ile aynı`, () => {
  for (const v of VECTORS.rating) {
    assert.equal(rating(v.metric, v.value), v.expected, `rating(${v.metric}, ${v.value})`);
  }
});

// ── Ölçülmüş uyumsuzluk: panel rotaları beyaz listede yok ───────────

test("ÖLÇÜLMÜŞ BOŞLUK: admin panel rotalarının hepsi `other` kovasına düşüyor", () => {
  // Bunlar `src/router/index.js`'ten alınmış GERÇEK panel yollarıdır.
  const panelYollari = [
    "/dashboard",
    "/media-library",
    "/seller-orders",
    "/seo/redirects",
    "/category-management",
    "/my-media-explorer",
    "/theme-manager",
  ];
  for (const yol of panelYollari) {
    assert.equal(
      routeTemplate(yol),
      "other",
      `${yol} artık beyaz listede — sunucu ROUTE_TEMPLATES genişletildiyse bu test ` +
        `ve contract.js güncellenmeli.`
    );
  }
  // Sonuç: panelden toplanan veride sayfa tipi kırılımı OLUŞMAZ. Kabul
  // kriteri #1 bu hâliyle karşılanamaz; gerekçe contract.js başlığında.
});

test("storefront rotaları beyaz listede — toplayıcı oraya monte edilirse kırılım oluşur", () => {
  assert.equal(routeTemplate("/urun/bonny-kap?utm_source=x"), "/urun/:slug");
  assert.equal(routeTemplate("/urunler"), "/urunler");
  assert.equal(routeTemplate("/magaza/ST-0001"), "/magaza/:code");
  assert.equal(routeTemplate("/sepet"), "/sepet");
});

test("PII: sorgu dizgesi ve kimlik taşıyan yol ASLA saklanmaz", () => {
  assert.equal(routeTemplate("/hesabim/siparis/SO-00042"), "other");
  assert.equal(routeTemplate("/urun/x?email=a@b.com&token=secret"), "/urun/:slug");
  assert.equal(routeTemplate("/ara?q=kullanici+arama+sorgusu"), "other");
});
