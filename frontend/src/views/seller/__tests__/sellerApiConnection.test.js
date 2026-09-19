// MOGEM-665 — "API Bağlantısı" ekranının kablolama değişmezleri.
//
// Ekranın kendisi Vue çalışma zamanı ister (node:test'te render edilmez);
// burada kırılınca sessiz kalacak şeyler kilitlenir: route + sidebar kaydı,
// dört dilde eksiksiz çeviri, stil dili (hdr-btn/card/tbl) ve tarayıcı
// diyaloğu kullanılmaması (otomasyonu ve mobil kabuğu kilitler).

import assert from "node:assert/strict";
import test from "node:test";

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ar from "../../../i18n/locales/ar.js";
import en from "../../../i18n/locales/en.js";
import ru from "../../../i18n/locales/ru.js";
import tr from "../../../i18n/locales/tr.js";

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (rel) => readFileSync(join(SRC_DIR, rel), "utf8");

const VIEW = "views/seller/SellerApiConnectionView.vue";
const LOCALES = { tr, en, ar, ru };

test("apiConnection çeviri anahtarları dört dilde birebir aynı", () => {
  const ref = Object.keys(tr.apiConnection).sort();
  assert.ok(
    ref.length >= 60,
    `tr.apiConnection ${ref.length} anahtar — ekran bundan az metin kullanmıyor`
  );
  for (const [name, dict] of Object.entries(LOCALES)) {
    assert.deepEqual(
      Object.keys(dict.apiConnection).sort(),
      ref,
      `${name}.apiConnection anahtar kümesi sapmış`
    );
    for (const key of ref) {
      assert.equal(
        typeof dict.apiConnection[key],
        "string",
        `${name}.apiConnection.${key} metin değil`
      );
      assert.ok(dict.apiConnection[key].trim().length > 0, `${name}.apiConnection.${key} boş`);
    }
  }
});

test("yan anahtarlar (nav, rozet, geçmiş süzgeci, ürün süzgeci) dört dilde var", () => {
  for (const [name, dict] of Object.entries(LOCALES)) {
    assert.equal(typeof dict.nav.item.apiConnection, "string", `${name}: nav.item.apiConnection`);
    assert.equal(typeof dict.listingSource.api, "string", `${name}: listingSource.api`);
    assert.ok(
      dict.listingSource.apiTooltip.includes("{job}"),
      `${name}: apiTooltip {job} yer tutucusu`
    );
    for (const k of ["sourceLabel", "allSources", "sourceFile", "sourceFeed", "sourceApi"]) {
      assert.equal(typeof dict.bulkImportHistory[k], "string", `${name}: bulkImportHistory.${k}`);
    }
    assert.equal(
      typeof dict.sellerListings.sourceApi,
      "string",
      `${name}: sellerListings.sourceApi`
    );
  }
  assert.ok(tr.apiConnection.perMinute.includes("{n}"), "perMinute {n} yer tutucusu");
  assert.ok(tr.apiConnection.webhookFailures.includes("{n}"), "webhookFailures {n} yer tutucusu");
  assert.ok(
    tr.apiConnection.guideStep1.includes("{tokenUrl}"),
    "guideStep1 {tokenUrl} yer tutucusu"
  );
});

test("ekranın kullandığı her apiConnection.* anahtarı sözlükte tanımlı", () => {
  const src = read(VIEW);
  // `apiConnection.st_${status}` gibi dinamik önekler (sonu "_") aşağıda açılır.
  const used = new Set(
    [...src.matchAll(/apiConnection\.([A-Za-z0-9_]+)/g)]
      .map((m) => m[1])
      .filter((k) => !k.endsWith("_"))
  );
  // Şablonda dinamik üretilen anahtarlar (`st_${status}`, `reason_${reason}`) ayrıca sayılır.
  for (const s of ["queued", "sent", "failed", "dead", "skipped"]) used.add(`st_${s}`);
  for (const r of ["reserve", "release", "deduct", "refund", "manual"]) used.add(`reason_${r}`);
  const missing = [...used].filter((k) => !(k in tr.apiConnection));
  assert.deepEqual(missing, [], `sözlükte olmayan anahtarlar: ${missing.join(", ")}`);
});

test("route + sidebar kaydı (statik yedek) + backend registry spec birlikte kablolu", () => {
  const router = read("router/index.js");
  assert.match(router, /path: "seller-api"/, "router: seller-api yolu yok");
  assert.match(router, /SellerApiConnectionView/, "router: view import edilmemiş");
  assert.match(router, /section: "products"/, "router: products bölümü");

  const nav = read("data/navigation.js");
  assert.match(nav, /route: "\/seller-api"/, "navigation.js: /seller-api kalemi yok");
  assert.match(
    nav,
    /feature: "feature\.api\.access"/,
    "navigation.js: paket kapısı (feature.api.access) yok"
  );
});

test("stil dili: hdr-btn/card/tbl; th-btn ve slate-* yok; tarayıcı diyaloğu yok; v-html yok", () => {
  const src = read(VIEW);
  assert.match(src, /hdr-btn-primary/);
  assert.match(src, /class="card/);
  assert.match(src, /tbl-th/);
  assert.doesNotMatch(src, /th-btn-/, "eski buton ailesi");
  assert.doesNotMatch(src, /\bslate-/, "eski gri tonu");
  assert.doesNotMatch(
    src,
    /window\.confirm|confirm\(|alert\(/,
    "tarayıcı diyaloğu — satır içi onay kullanılmalı"
  );
  assert.doesNotMatch(src, /v-html/);
  // Sır yalnız oluşturma cevabından; okuma ucundan asla — ekran has_secret bayrağını okur.
  assert.match(src, /has_secret/);
  assert.match(src, /freshSecret/);
});

test("composable Frappe yolu tek yerde ve api.callMethod üzerinden", () => {
  const src = read("composables/useCatalogApi.js");
  assert.match(src, /const CATALOG_API = "tradehub_core\.api\.catalog_integration"/);
  assert.doesNotMatch(src, /fetch\(/, "doğrudan fetch yasak — api.request üzerinden");
  for (const fn of [
    "get_connection",
    "create_or_rotate_credentials",
    "set_webhook",
    "revoke_credentials",
    "list_outbound_events",
    "retry_outbound_event",
  ]) {
    assert.ok(src.includes(`\${CATALOG_API}.${fn}`), `composable ${fn} çağırmıyor`);
  }
});

test("geçmiş ekranı kaynak süzgecini backend'e geçirir ve ?source=api ile açılır", () => {
  const src = read("views/bulk-import/BulkImportHistoryView.vue");
  assert.match(src, /source: sourceFilter\.value === "all" \? "" : sourceFilter\.value/);
  assert.match(src, /route\.query\.source/);
  assert.match(src, /data-testid="bih-source"/);
  assert.match(src, /src-badge--\$\{job\.source/, "rozet sınıfı job.source'tan türemeli");
  assert.match(src, /&--api/, "API rozet stili");
});

test("SourceBadge API varyantı ve kullanım noktaları import_source geçirir", () => {
  const badge = read("components/common/SourceBadge.vue");
  assert.match(badge, /source: \{ type: String, default: null \}/);
  assert.match(badge, /listingSource\.api/);
  for (const rel of [
    "views/seller/SellerListingsView.vue",
    "views/products/ListingModerationView.vue",
  ]) {
    const src = read(rel);
    const total = (src.match(/<SourceBadge\b/g) || []).length; // prettier etiketi satıra bölebilir
    const wired = (src.match(/:source="[a-z]+\.import_source"/g) || []).length;
    assert.ok(total > 0, `${rel}: SourceBadge kullanılmıyor`);
    assert.equal(wired, total, `${rel}: ${total} rozetten ${wired} tanesi import_source geçiriyor`);
  }
});
