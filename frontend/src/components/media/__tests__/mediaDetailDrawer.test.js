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
import ru from "../../../i18n/locales/ru.js";
import ar from "../../../i18n/locales/ar.js";

/**
 * Detay çekmecesi — versiyon / türev / kullanım / kalite (T-093).
 *
 *   ÖLÇÜLDÜ  — sunucu çıktısındaki sekme sözleşmesi (tablist/tab/tabpanel,
 *              roving tabindex), sekmelerin TEMBEL olduğu (ziyaret edilmemiş
 *              sekme DOM'a girmez, isteği atılmaz), üç boş durumun da
 *              çökmeden ve "yok" demeden çizildiği, sınır notlarının her
 *              durumda görünür kaldığı.
 *   ÖLÇÜLMEDİ — DOLU hâlin çizimi. `Media Rendition` tablosu BOŞ ve SSR
 *              tek geçişte çizdiği için istek cevabı render'a yetişmiyor;
 *              veri gelmiş hâlin ekran çıktısı bu görevde ölçülmedi.
 *              Normalizasyon mantığı ayrıca `composables/__tests__/
 *              mediaUsage.test.js` içinde ölçülüyor.
 *              Tarayıcı doğrulaması da YAPILMADI.
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const read = (p) => readFileSync(new URL(p, `file://${frontendRoot}/`), "utf8");

let server;

before(async () => {
  // `utils/storefrontUrl` yüklenirken `window.location.origin` okuyor.
  globalThis.window = { location: { origin: "https://vitrin.test" } };

  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    plugins: [vue()],
    resolve: {
      alias: [
        // Sıra ÖNEMLİ: tam eşleşme "@" genel kuralından önce. Gerçek `api.js`
        // yüklenmesin — ne fetch ne CSRF ne 401 yönlendirmesi devreye girsin.
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
  delete globalThis.__mediaApiMock;
});

/**
 * Çeviri anahtarları henüz locale dosyalarında YOK (rota/menü/i18n bağlantısı
 * ayrı bir adımda yapılıyor). Bu yüzden metin değil YAPI doğrulanıyor;
 * anahtarların kendisi aşağıda kaynak taramasıyla ayrıca listeleniyor.
 */
const i18n = () =>
  createI18n({
    legacy: false,
    locale: "tr",
    fallbackLocale: "tr",
    messages: { tr, en },
    missingWarn: false,
    fallbackWarn: false,
  });

async function render(path, props) {
  const { default: Component } = await server.ssrLoadModule(path);
  const app = createSSRApp({ render: () => h(Component, props) });
  app.use(i18n());
  return renderToString(app);
}

const USAGE = "/src/components/media/MediaUsagePanel.vue";
const QUALITY = "/src/components/media/MediaQualityPanel.vue";
const DETAIL = "/src/components/media/MediaDetailPanel.vue";
const INFO_TIP = "/src/components/media/InfoTip.vue";

const item = {
  id: "/files/a.webp",
  fileUrl: "/files/a.webp",
  docName: "",
  fileName: "a.webp",
  ext: "WEBP",
  bytes: 132_000,
  width: 0,
  height: 0,
  kind: "image",
  title: "a",
  alt: "",
  description: "",
  tags: [],
  uploadedAt: "2026-08-01 10:00:00",
  liveUsage: 0,
};

// ── Kullanım paneli ───────────────────────────────────────────────

test("adres yoksa istek atılmaz ve panel çökmeden gerekçe gösterir", async () => {
  const html = await render(USAGE, {
    fileUrl: "",
    fetcher: () => assert.fail("istek atılmamalıydı"),
  });

  assert.match(html, /data-test="usage-notice"/);
  // Cevap yokken karar şeridi ÇİZİLMEZ: "kullanılmıyor" izlenimi vermez.
  assert.doesNotMatch(html, /data-test="usage-verdict"/);
});

test("yetki reddi ekranı çökertmez, boş liste gibi de göstermez", async () => {
  const html = await render(USAGE, {
    fileUrl: "/files/a.webp",
    fetcher: async () => {
      const e = new Error("Not permitted");
      e.status = 403;
      throw e;
    },
  });

  assert.match(html, /data-test="usage-notice"/);
  assert.doesNotMatch(html, /data-test="usage-verdict"/);
});

test("kullanım panelinin SINIR notu her durumda görünür", async () => {
  // Boş sonuçta bile: bu döküm kalıcı bir kullanım dizininden değil, istek
  // anında taranan sabit bir kaynak listesinden geliyor. Notu gizlemek
  // satıcıya "tam liste" izlenimi verirdi.
  const html = await render(USAGE, { fileUrl: "", fetcher: () => ({}) });

  assert.match(html, /data-test="usage-scope"/);
  assert.match(html, /media\.usage\.scanNote|Bu döküm|taranan/i);
});

// ── Kalite paneli ─────────────────────────────────────────────────

test("türev yokken kalite paneli 'ölçüm yok' der, sıfır uydurmaz", async () => {
  const html = await render(QUALITY, { item, fileName: "" });

  assert.match(html, /data-test="quality-notice"/);
  // Tasarruf oranı hesaplanamıyor: iki gerçek sayı yok. "%0 tasarruf"
  // yazmak ölçülmemiş bir şeyi ölçülmüş gibi gösterirdi.
  assert.doesNotMatch(html, /data-test="quality-savings"/);
  // SSIM satırı da çizilmez (notice varken); ölçüm yokluğu tek yerden söylenir.
  assert.doesNotMatch(html, /data-test="quality-ssim"/);
});

test("ölçülmemiş kaynak künyesi '—' ile durur, satır gizlenmez", async () => {
  const html = await render(QUALITY, { item, fileName: "" });

  // Dosya adı yokken ölçüm gelmez: DPI / renk uzayı / alfa satırları
  // gizlenmez, "—" ile durur ki "ölçülmedi" ile "sorunsuz" karıştırılmasın.
  // Dolu hâlin hücre biçimi `qualityFacts.test.js`te ölçülür.
  assert.match(html, /media\.quality\.attr\.dpi|DPI/i);
  assert.match(html, /media\.quality\.attr\.colorSpace|Renk uzayı/i);
  assert.match(html, /media\.quality\.attr\.alpha|Alfa/i);
  // Ölçüsü bilinmeyen dosyada çözünürlük hücresi "—".
  assert.match(html, /—/);
  assert.match(html, /data-test="quality-scope"/);
});

// ── Çekmece: sekmeler ─────────────────────────────────────────────

test("çekmece beş sekmeli ve ARIA tab sözleşmesi eksiksiz", async () => {
  const html = await render(DETAIL, { item, editable: true });

  assert.match(html, /role="tablist"/);
  assert.equal((html.match(/role="tab"/g) || []).length, 5);
  assert.equal((html.match(/role="tabpanel"/g) || []).length, 5);
  // Roving tabindex: yalnız etkin sekme Tab sırasında. Beşi birden Tab
  // sırasında olsaydı klavye kullanıcısı içeriğe beş Tab'da ulaşırdı.
  assert.equal((html.match(/tabindex="0"/g) || []).length, 1);
  assert.equal((html.match(/tabindex="-1"/g) || []).length, 4);
  assert.equal((html.match(/aria-selected="true"/g) || []).length, 1);
});

test("ziyaret edilmemiş sekme DOM'a girmez — istek de atılmaz", async () => {
  globalThis.__mediaApiMock = () => assert.fail("kapalı sekme istek atmamalı");
  const html = await render(DETAIL, { item, editable: true });

  // Açılışta yalnız Özet dolu; Türevler/Kullanım/Kalite/Sürüm kabuk olarak
  // var ama içerikleri yok. (Sürüm sekmesi T-093 ile GERÇEK veri çeker oldu —
  // artık o da tembel: ziyaret edilmeden ne DOM'a girer ne istek atar.)
  assert.doesNotMatch(html, /data-test="usage-scope"/);
  assert.doesNotMatch(html, /data-test="quality-scope"/);
  assert.doesNotMatch(html, /class="mrend"/);
  assert.doesNotMatch(html, /data-test="versions-facts"/);
  assert.doesNotMatch(html, /data-test="versions-none"/);
  delete globalThis.__mediaApiMock;
});

// ── Kaynak sözleşmeleri ───────────────────────────────────────────

test("türev listesi çağrısı bozulmadan sekmeye taşındı", () => {
  const panel = read("src/components/media/MediaDetailPanel.vue");

  // `Media Asset.source_file` bir Link ve File DOCNAME tutar — dosya adresi
  // değil. Zincirin girişi bu satır.
  assert.match(panel, /<MediaRenditionList :file-name="item\.docName \|\| ''" \/>/);
  // Kullanım ucu ise tam tersini ister: dosya ADRESİ.
  assert.match(panel, /:file-url="item\.fileUrl \|\| item\.id \|\| ''"/);
});

test("sekmeler tembel: içerik ziyaret edilene kadar mount edilmez", () => {
  const panel = read("src/components/media/MediaDetailPanel.vue");

  for (const id of ["renditions", "usage", "quality"]) {
    assert.match(panel, new RegExp(`seen\\.includes\\('${id}'\\)`));
  }
});

test("çeviri anahtarları tek listede — i18n bağlantısı bunları bekliyor", () => {
  const panel = read("src/components/media/MediaDetailPanel.vue");
  const usage = read("src/components/media/MediaUsagePanel.vue");
  const quality = read("src/components/media/MediaQualityPanel.vue");

  for (const anahtar of [
    "media.detail.tabsLabel",
    "media.versions.title",
    "media.versions.none",
    "media.versions.activeScopeNote",
    "media.versions.reprocess",
  ]) {
    assert.ok(panel.includes(anahtar), `${anahtar} eksik`);
  }
  assert.match(panel, /media\.detail\.tab\.\$\{tab\.id\}/);

  for (const anahtar of [
    "media.usage.title",
    "media.usage.loading",
    "media.usage.denied",
    "media.usage.failed",
    "media.usage.noFile",
    "media.usage.notFound",
    "media.usage.unknown",
    "media.usage.scanNote",
  ]) {
    assert.ok(usage.includes(anahtar), `${anahtar} eksik`);
  }

  for (const anahtar of [
    "media.quality.title",
    "media.quality.notMeasured",
    "media.quality.ssimNone",
    "media.quality.scopeNote",
  ]) {
    assert.ok(quality.includes(anahtar), `${anahtar} eksik`);
  }
});

// ── Yatay taşma düzeltmesi (Kullanım/Özet kartları) ────────────────
//
// Kök neden: flex çocuğunun (ürün adı, kategori adı) örtük minimum genişliği
// metnin TAM genişliğiydi (`min-width: 0` yoktu) — yanındaki rozet dışarı
// itiliyor, panel yatayda kayıyordu. Gerçek tarayıcı ölçümü bu görevde
// yapılmadı (jsdom layout motoru yok, `scrollWidth`/`clientWidth` her zaman
// 0 döner); düzeltme bu yüzden KAYNAK üzerinden doğrulanıyor — aynı dosyanın
// kendi `ÖLÇÜLMEDİ` deseniyle tutarlı.

test("kullanım kartında ürün adı sarar, rozet asla kırpılmaz", () => {
  const usage = read("src/components/media/MediaUsagePanel.vue");

  assert.match(usage, /\.musage__label\s*\{[^}]*min-width:\s*0/s);
  assert.match(usage, /\.musage__label\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(usage, /\.musage__status\s*\{[^}]*flex-shrink:\s*0/s);
});

test("bağlı kayıtlar satırı ve sınır notu uzun metinde sarar", () => {
  const usage = read("src/components/media/MediaUsagePanel.vue");

  assert.match(usage, /\.musage__row\s*\{[^]*?span\s*\{[^}]*overflow-wrap:\s*anywhere/);
  assert.match(usage, /\.musage__row\s*\{[^]*?code\s*\{[^}]*overflow-wrap:\s*anywhere/);
  assert.match(usage, /\.musage__hint,\s*\n\s*\.musage__scope\s*\{[^}]*overflow-wrap:\s*anywhere/s);
});

test("Özet sekmesindeki kategori adı da aynı desenle sarar", () => {
  const panel = read("src/components/media/MediaDetailPanel.vue");

  assert.match(panel, /class="detail__category-name"/);
  assert.match(panel, /\.detail__category-name\s*\{[^}]*min-width:\s*0/s);
  assert.match(panel, /\.detail__category-name\s*\{[^}]*overflow-wrap:\s*anywhere/s);
});

test("çekmecenin kaydırma alanı yatayda kilitli — gerçek taşma nedenleri ayrı düzeltildi", () => {
  const panel = read("src/components/media/MediaDetailPanel.vue");

  assert.match(panel, /\.detail__scroll\s*\{[^}]*overflow-x:\s*hidden/s);
});

test("Türevler ve Kalite tabloları kendi yatay kaydırma sarmalayıcısında — panel değil", () => {
  const renditions = read("src/components/media/MediaRenditionList.vue");
  const quality = read("src/components/media/MediaQualityPanel.vue");

  assert.match(renditions, /<div v-else class="mrend__scroll">/);
  assert.match(renditions, /\.mrend__scroll\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(quality, /<div class="mqual__scroll">/);
  assert.match(quality, /\.mqual__scroll\s*\{[^}]*overflow-x:\s*auto/s);
});

// ── SSIM bilgi ipucu ────────────────────────────────────────────────

test("bilgi ipucu düğmesi erişilebilir addan render edilir ve varsayılan kapalıdır", async () => {
  const html = await render(INFO_TIP, {
    text: "Açıklama metni buraya",
    title: "SSIM nedir?",
    label: "SSIM nedir?",
  });

  assert.match(html, /aria-label="SSIM nedir\?"/);
  assert.match(html, /role="tooltip"/);
  assert.match(html, /aria-expanded="false"/);
  // Balon HER ZAMAN DOM'da (SSR metninde bulunabilir), yalnız CSS ile gizli —
  // ekran okuyucu `aria-describedby` ile ona ulaşabilsin diye kaldırılmaz.
  assert.match(html, /Açıklama metni buraya/);
  // Başlık ayrı, kalın bir satır olarak çiziliyor — gövdeyle karışmıyor.
  assert.match(html, /<strong class="infotip__bubble-title"[^>]*>SSIM nedir\?<\/strong>/);
  assert.doesNotMatch(html, /infotip__bubble--on/);
});

test("başlıksız kullanımda <strong> hiç çizilmez", async () => {
  const html = await render(INFO_TIP, { text: "Sade açıklama", label: "Bilgi" });

  assert.doesNotMatch(html, /infotip__bubble-title/);
});

test("Türevler'in SSIM başlığı ve Kalite'nin SSIM satırı bilgi ipucu kullanıyor", () => {
  const renditions = read("src/components/media/MediaRenditionList.vue");
  const quality = read("src/components/media/MediaQualityPanel.vue");

  assert.match(renditions, /<InfoTip\s+:text="t\('media\.ssimInfo\.text'\)"/);
  assert.match(quality, /<InfoTip\s+:text="t\('media\.ssimInfo\.text'\)"/);
  assert.match(renditions, /:title="t\('media\.ssimInfo\.title'\)"/);
  assert.match(quality, /:title="t\('media\.ssimInfo\.title'\)"/);
  // "SSIM" etiketi aynı kalmalı — görev metni bunu istiyor.
  assert.match(renditions, /t\("media\.renditions\.col\.ssim"\)/);
});

test("SSIM açıklaması dört dilde de tanımlı ve boş değil", () => {
  for (const locale of [tr, en, ru, ar]) {
    assert.equal(typeof locale.media.ssimInfo?.label, "string");
    assert.ok(locale.media.ssimInfo.label.trim().length > 0);
    assert.equal(typeof locale.media.ssimInfo?.title, "string");
    assert.ok(locale.media.ssimInfo.title.trim().length > 0);
    assert.equal(typeof locale.media.ssimInfo?.text, "string");
    // Uydurma kısa metin değil — gerçek açıklama uzunluğunda olmalı.
    assert.ok(locale.media.ssimInfo.text.trim().length > 40);
    // Ölçek listesi madde madde: 4 satır da mevcut.
    assert.equal((locale.media.ssimInfo.text.match(/•/g) || []).length, 4);
  }
});

// ── Balonun tipografi sıfırlaması — kök neden regresyonu ────────────
//
// Bu balon bir tablo BAŞLIĞININ (`<th>`) içinde açılıyor. `position: fixed`
// yalnız kırpılma/kaydırma zincirinden kaçar, CSS inheritance'tan KAÇMAZ —
// ilk sürümde bu unutulmuştu: `thead th`'nin BÜYÜK HARF + `nowrap` +
// kalın kuralı balona miras kaldı, metin tek satıra sıkışıp panelin
// sağından taştı (ekran görüntüsüyle bildirildi, 2026-09-30). Bu testler
// sıfırlamanın KAYNAKTA durduğunu kanıtlar — CSS motoru olmadığı için
// gerçek piksel sonucu `infoTipPlacement.test.js`teki konum testleriyle
// ve bu dosyanın üstündeki "ÖLÇÜLMEDİ" notuyla birlikte okunmalı.
test("balon üst bağlamdan (tablo başlığı) hiçbir tipografi mirası almaz", () => {
  const infoTip = read("src/components/media/InfoTip.vue");
  const bubbleBlock = infoTip.match(/\.infotip__bubble\s*\{[\s\S]*?\n {2}\}/)?.[0] || "";

  assert.ok(bubbleBlock, "`.infotip__bubble` kuralı bulunamadı");
  for (const reset of [
    "text-transform: none",
    "letter-spacing: normal",
    "font-weight: 400",
    "white-space: normal",
    "text-align: start",
  ]) {
    assert.ok(bubbleBlock.includes(reset), `${reset} eksik — miras sızabilir`);
  }
  // Madde listesi (`\n` ile) yalnız GÖVDEDE `pre-line` ile satır sonu sayılır;
  // kutunun geneli `pre` DEĞİL, uzun satırlar yine normal sarmalı.
  assert.match(infoTip, /\.infotip__bubble-body\s*\{[^}]*white-space:\s*pre-line/s);
});

test("balon genişliği viewport'a göre sınırlı — 280px üst sınır, 16px kenar payı", () => {
  const placement = read("src/components/media/infoTipPlacement.js");
  const infoTip = read("src/components/media/InfoTip.vue");

  assert.match(placement, /maxWidth\s*=\s*280/);
  assert.match(placement, /margin\s*=\s*16/);
  // CSS üst sınırı (`max-width`) JS'teki üst sınırla TUTARLI kalmalı —
  // biri değişip diğeri unutulursa balon ya JS'te dar hesaplanıp CSS'te
  // geniş çizilir ya da tersi.
  assert.match(infoTip, /max-width:\s*17\.5rem/); // 280px
});
