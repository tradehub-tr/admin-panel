import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { createI18n } from "vue-i18n";
import { renderToString } from "@vue/server-renderer";

import tr from "../../../i18n/locales/tr.js";
import en from "../../../i18n/locales/en.js";

/**
 * T-093 — detay çekmecesinin SÜRÜM sekmesi artık GERÇEK veri basıyor.
 *
 *   ÖLÇÜLDÜ  — `manifest_batch.version` alanlarının composable'a BİREBİR
 *              aktığı (dpi/renk uzayı/alpha/sınıflandırma/format zinciri),
 *              sürümsüz dosyanın `null` kaldığı (uydurma yok), `clear`'ın
 *              sürümü de sıfırladığı ve panel şablonunun sürüm sözleşmesi
 *              (tembellik, dürüst boş durum, yeniden işle kablosu).
 *   ÖLÇÜLMEDİ — DOLU hâlin SSR çizimi: sekme tembel + SSR tek geçiş, cevap
 *              render'a yetişmiyor (mediaDetailDrawer.test.js ile aynı sınır).
 *              Dolu hâl composable katmanında ölçülüyor; tarayıcı doğrulaması
 *              E2E/elle katmanda.
 *
 * Sabit veri UYDURMA DEĞİL: `version` gövdesi 2026-08-20'de canlı siteden
 * ölçülen gerçek yanıttan alındı (asset 7pa8r42g7d, bench console probu —
 * rapor 89). Vacuity kanıtı: fixture'dan `version` anahtarı kesilince
 * "sürüm alanları akar" testi KIRMIZI (rapor 89'da koşum çıktısı).
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const read = (p) => readFileSync(new URL(p, `file://${frontendRoot}/`), "utf8");

let server;

before(async () => {
  globalThis.window = { location: { origin: "https://vitrin.test" } };
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    plugins: [vue()],
    resolve: {
      alias: [
        {
          find: /^@\/utils\/api$/,
          replacement: `${frontendRoot}/src/components/media/__tests__/fixtures/apiMock.js`,
        },
        { find: "@", replacement: `${frontendRoot}/src` },
      ],
    },
    server: { middlewareMode: true },
    appType: "custom",
  });
});

after(async () => {
  await server?.close();
  delete globalThis.window;
  delete globalThis.__mediaApiCallMock;
});

/** Canlı yanıttan alınan sürüm gövdesi (kısaltılmış lqip). */
const VERSION_FIXTURE = {
  version_hash: "5ba6043d099188886e00351ae8d6629d7dc3573f42e26d750dd3ff048cb34fa3",
  is_active: 0,
  width: 800,
  height: 800,
  dpi: 72,
  colorspace: "sRGB",
  has_alpha: false,
  classification: "photo",
  classification_confidence: "low",
  format_chain: [
    { fmt: "AVIF", lossless: false, quality_bump: 0, requires: [] },
    { fmt: "WEBP", lossless: false, quality_bump: 0, requires: [] },
    { fmt: "JPEG", lossless: false, quality_bump: 0, requires: [] },
  ],
  lqip: "7wcWBwCqh4eXeHhfdZd2WIh4p3r5VWkA",
  dominant_color: "#f8f8f8",
};

function manifestBatchYaniti(fileName, manifest) {
  return { message: { manifests: { [fileName]: manifest }, requested: 1, returned: 1 } };
}

async function composable() {
  const { useMediaRenditions } = await server.ssrLoadModule("/src/composables/useMediaRenditions.js");
  return useMediaRenditions();
}

// ── Composable: sürüm verisi ──────────────────────────────────────

test("manifest.version alanları composable'a BİREBİR akar", async () => {
  globalThis.__mediaApiCallMock = (method, args) => {
    assert.equal(method, "tradehub_core.api.media_manifest.manifest_batch");
    assert.deepEqual(args, { file_urls: ["F1"] });
    return manifestBatchYaniti("F1", {
      file: "F1",
      file_url: "/files/a.webp",
      assets: ["7pa8r42g7d"],
      renditions: [],
      version: VERSION_FIXTURE,
    });
  };

  const { version, load } = await composable();
  await load("F1");

  // Ekranın basacağı alanların hepsi: dpi, renk uzayı, alpha, sınıflandırma,
  // format zinciri, ölçü, özet. Biri düşerse satır "—"a geriler — test kırılır.
  assert.equal(version.value?.dpi, 72);
  assert.equal(version.value?.colorspace, "sRGB");
  assert.equal(version.value?.has_alpha, false);
  assert.equal(version.value?.classification, "photo");
  assert.equal(version.value?.classification_confidence, "low");
  assert.deepEqual(
    (version.value?.format_chain || []).map((c) => c.fmt),
    ["AVIF", "WEBP", "JPEG"]
  );
  assert.equal(version.value?.width, 800);
  assert.equal(version.value?.version_hash, VERSION_FIXTURE.version_hash);
});

test("sürümsüz manifest'te version NULL kalır — boş nesne uydurulmaz", async () => {
  globalThis.__mediaApiCallMock = () =>
    manifestBatchYaniti("F2", {
      file: "F2",
      file_url: "/files/b.webp",
      assets: ["MA-2"],
      renditions: [],
      version: null,
    });

  const { version, load } = await composable();
  await load("F2");
  // `null` = "sürüm kaydı yok"; ekran bunu boş tablo değil dürüst boş durum
  // olarak basar. Boş nesne dönseydi tüm satırlar "—" olur ve "ölçülmedi"
  // ile "yok" karışırdı.
  assert.equal(version.value, null);
});

test("clear() sürümü de sıfırlar — önceki dosyanın künyesi taşınmaz", async () => {
  globalThis.__mediaApiCallMock = () =>
    manifestBatchYaniti("F1", {
      file: "F1",
      file_url: "/files/a.webp",
      assets: ["7pa8r42g7d"],
      renditions: [],
      version: VERSION_FIXTURE,
    });

  const { version, load, clear } = await composable();
  await load("F1");
  assert.ok(version.value);
  clear();
  assert.equal(version.value, null);
});

// ── Panel: SSR kabuğu ─────────────────────────────────────────────

const DETAIL = "/src/components/media/MediaDetailPanel.vue";

const item = {
  id: "/files/a.webp",
  fileUrl: "/files/a.webp",
  docName: "F1",
  fileName: "a.webp",
  ext: "WEBP",
  bytes: 132_000,
  width: 800,
  height: 800,
  kind: "image",
  title: "a",
  alt: "",
  description: "",
  tags: [],
  uploadedAt: "2026-08-01 10:00:00",
  liveUsage: 0,
};

async function renderPanel(props) {
  const { default: Component } = await server.ssrLoadModule(DETAIL);
  const app = createSSRApp({ render: () => h(Component, props) });
  app.use(
    createI18n({
      legacy: false,
      locale: "tr",
      fallbackLocale: "tr",
      messages: { tr, en },
      missingWarn: false,
      fallbackWarn: false,
    })
  );
  return renderToString(app);
}

test("'kurulu değil' yalanı kalktı; sürüm sekmesi tembel, açılışta istek yok", async () => {
  globalThis.__mediaApiCallMock = () => assert.fail("ziyaret edilmemiş sekme istek atmamalı");
  const html = await renderPanel({ item, editable: true });

  // Media Version artık GERÇEK — eski "kurulu değil" metni artık yalan olurdu.
  assert.doesNotMatch(html, /versions-not-installed/);
  assert.doesNotMatch(html, /media\.versions\.notInstalled/);
  // Tembellik: içerik ziyarete kadar DOM'a girmez.
  assert.doesNotMatch(html, /data-test="versions-facts"/);
  assert.doesNotMatch(html, /data-test="versions-none"/);
  assert.doesNotMatch(html, /data-test="versions-reprocess"/);
  delete globalThis.__mediaApiCallMock;
});

// ── Kaynak sözleşmeleri ───────────────────────────────────────────

test("sürüm sekmesi sözleşmesi: dürüst boş durum + tüm künye satırları", () => {
  const panel = read("src/components/media/MediaDetailPanel.vue");

  // Dolu hâl ve boş hâl AYRI data-test'ler — ikisi tek şablonda karışmaz.
  assert.match(panel, /data-test="versions-facts"/);
  assert.match(panel, /"versions-none"/);
  // Künye satırları: dpi/renk uzayı/alpha/sınıflandırma/format zinciri.
  for (const anahtar of [
    "media.versions.attr.dimensions",
    "media.versions.attr.colorspace",
    "media.versions.attr.alpha",
    "media.versions.attr.classification",
    "media.versions.attr.formatChain",
    "media.versions.attr.hash",
  ]) {
    assert.ok(panel.includes(anahtar), `${anahtar} eksik`);
  }
  // Sekme diğerleriyle aynı tembellik kaydında.
  assert.match(panel, /seen\.includes\('versions'\)|seen\.includes\("versions"\)/);
});

test("yeniden işle MEVCUT optimize akışına bağlı — yeni uç yazılmadı", () => {
  const panel = read("src/components/media/MediaDetailPanel.vue");

  // Ölçüldü (2026-08-20): backend'de `reprocess` adında whitelist ucu YOK;
  // idempotent rerun `_run_rendition_job` yükleme kancasından koşuyor. Düğme
  // bu yüzden `useMediaOptimize.start`'a tekil dosyayla gider ve koşum durumu
  // aynı job-polling'den okunur.
  assert.match(panel, /useMediaOptimize\(\{ refreshOnDone: false \}\)/);
  assert.match(panel, /start\(\{ fileNames: \[props\.item\.docName\] \}\)/);
  assert.match(panel, /data-test="versions-reprocess"/);
  // İzin: yalnız düzenlenebilir görünümde (paylaşılan/salt-okunur değil).
  assert.match(panel, /v-if="editable"[\s\S]{0,400}versions-reprocess/);
});
