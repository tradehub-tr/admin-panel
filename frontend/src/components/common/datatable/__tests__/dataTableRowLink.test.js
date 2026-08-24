import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

import vue from "@vitejs/plugin-vue";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createI18n } from "vue-i18n";

import tr from "../../../../i18n/locales/tr.js";

/**
 * DataTable "stretched link" deseni — NE ÖLÇÜLDÜ, NE ÖLÇÜLMEDİ:
 *
 *   ÖLÇÜLDÜ  — sunucu çıktısının YAPISI: örtü yalnız `clickable` iken doğuyor
 *              mu, hangi hücrede doğuyor (seçim/eylem sütunlarını atlıyor mu),
 *              o hücreler örtünün üstüne çıkaran sınıfı alıyor mu, örtünün adı
 *              teknik anahtar yerine insan-okunur alana düşüyor mu; ve
 *              kaynaktaki TIKLAMA SÖZLEŞMESİ (`.stop` düzenleyicileri) ile
 *              `:deep()` allowlist'inin kapsamı.
 *   ÖLÇÜLMEDİ — GERÇEK fare olayı. Bileşen `node --test` altında yalnız SSR ile
 *              yüklenebiliyor (`ssrLoadModule` şablonu SSR için derler, istemci
 *              `render`ı yoktur), dolayısıyla "tıklandı, kaç kez emit edildi"
 *              DOM'da koşturulamadı. Onun yerine tek-emit'i GARANTİ EDEN
 *              düzenleyicilerin varlığı kaynakta kilitlendi; ayrıca örtünün
 *              görsel kapsamı ve odak halkası (CSS/düzen) burada ölçülemez.
 *
 * ## Bu dosyanın var oluş sebebi
 *
 * Desen `<tr>`ye `role="button"` basan eski çözümün yerine geçti ve panelin
 * TÜM listelerinde satır açmanın tek yolu oldu — test kapsamı SIFIRDI.
 * Kırılganlığı da görünmez cinsten: örtü mutlak konumlu olduğu için hangi
 * hücreye düştüğü ve hangi ögelerin üstünde kaldığı yalnız CSS'ten okunuyor;
 * biri allowlist'ten bir satır silse kutucuklar sessizce tıklanamaz olur,
 * biri `.stop`u kaldırsa her tıklama kaydı İKİ kez açar.
 */

const frontendRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
const DATATABLE = "/src/components/common/datatable/DataTable.vue";
const source = readFileSync(new URL("../DataTable.vue", import.meta.url), "utf8");

let server;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    plugins: [vue()],
    resolve: { alias: { "@": `${frontendRoot}/src` } },
    server: { middlewareMode: true },
    appType: "custom",
  });
});

after(async () => {
  await server?.close();
});

/** `useDataTable` sahtesi — bileşen yalnız bu yüzeyi okuyor. */
function fakeDt(columns) {
  return {
    visibleColumns: { value: columns },
    filters: {},
    page: { value: 1 },
    pageSize: { value: 20 },
    sorting: { value: [] },
    isFilterActive: () => false,
    sortStateFor: () => null,
    toggleSort() {},
    setFilter() {},
    setPage() {},
    setPageSize() {},
  };
}

async function render(props) {
  const { default: DataTable } = await server.ssrLoadModule(DATATABLE);
  const app = createSSRApp({ render: () => h(DataTable, props) });
  app.use(createI18n({ legacy: false, locale: "tr", fallbackLocale: "tr", messages: { tr } }));
  return renderToString(app);
}

/** Satırların hücrelerini (sınıf + içerik) okunur hâle getirir. */
function rowCells(html) {
  const { window } = new JSDOM(`<!doctype html><html lang="tr"><body>${html}</body></html>`);
  return [...window.document.querySelectorAll("tbody tr")].map((row) =>
    [...row.querySelectorAll("td")].map((cell) => ({
      classes: [...cell.classList],
      hasLink: !!cell.querySelector(".dt-row-link"),
      linkText: cell.querySelector(".dt-row-link")?.textContent?.trim() ?? null,
    }))
  );
}

const PLAIN_COLUMNS = [
  { key: "tracking_number", label: "Takip No" },
  { key: "carrier", label: "Taşıyıcı" },
];

const GUARDED_COLUMNS = [
  { key: "select", label: "" },
  { key: "tracking_number", label: "Takip No" },
  { key: "action", label: "" },
];

const ROWS = [{ name: "SHP-0001", tracking_number: "TR9", carrier: "Aras" }];

// ── (a) Örtü yalnız `clickable` iken var ─────────────────────

test("örtü YALNIZ clickable iken render ediliyor", async () => {
  const off = await render({ dt: fakeDt(PLAIN_COLUMNS), rows: ROWS, total: 0 });
  assert.ok(!off.includes("dt-row-link"), "clickable=false iken örtü basılmamalı");

  const on = await render({ dt: fakeDt(PLAIN_COLUMNS), rows: ROWS, total: 0, clickable: true });
  const cells = rowCells(on);
  assert.equal(cells.length, 1);
  assert.equal(cells[0].filter((c) => c.hasLink).length, 1, "satır başına TEK örtü");
});

// ── (d) rowLinkKey seçim/eylem sütunlarını atlıyor ───────────

test("örtü seçim ve eylem sütunlarını ATLAR, ilk veri hücresine düşer", async () => {
  const cells = rowCells(
    await render({ dt: fakeDt(GUARDED_COLUMNS), rows: ROWS, total: 0, clickable: true })
  );

  assert.deepEqual(
    cells[0].map((c) => c.hasLink),
    [false, true, false],
    "örtü select/action hücresinde DOĞMAMALI"
  );
});

// ── (c) Kutucuk/aksiyon hücresi satırı açmıyor ───────────────

test("seçim ve eylem hücresi BÜTÜN olarak örtünün üstünde — tıklama satırı açmaz", async () => {
  const cells = rowCells(
    await render({ dt: fakeDt(GUARDED_COLUMNS), rows: ROWS, total: 0, clickable: true })
  );

  assert.deepEqual(
    cells[0].map((c) => c.classes.includes("dt-guard-cell")),
    [true, false, true],
    "yalnız select/action hücreleri korumalı olmalı"
  );

  // Sınıf tek başına yetmez: hücre örtünün ÜSTÜNE gerçekten çıkmalı, yoksa
  // boş pikselleri yine örtüye düşer.
  assert.match(source, /\.tbl-td\.dt-guard-cell\s*{[^}]*position:\s*relative/);
  assert.match(source, /\.tbl-td\.dt-guard-cell\s*{[^}]*z-index:\s*1/);

  // Ve olay satır `@click`ine ÇIKMAMALI — durdurucu canlı kod.
  assert.match(source, /@click="isGuardCell\(col\.key\) && \$event\.stopPropagation\(\)"/);
});

// ── (b) Bir tıklama = TEK emit ───────────────────────────────

test("örtü tıklaması satır @click'ine ÇIKMAZ — tek tıklama tek row-click", () => {
  // Örtü `<tr>`nin İÇİNDE duruyor; `.stop` olmasaydı aynı tıklama hem butondan
  // hem satırdan emit edilir, kayıt iki kez açılırdı (ikinci gezinme geri
  // düğmesini de bozar).
  assert.match(source, /class="dt-row-link"\s*\n\s*@click\.stop="\$emit\('row-click', row\)"/);
  assert.match(source, /<tr[\s\S]*?@click="clickable && \$emit\('row-click', row\)"/);
});

// ── Erişilebilir ad: teknik anahtar okunmaz ──────────────────

test("örtünün adı URL/teknik anahtar yerine insan-okunur alana düşer", async () => {
  const rows = [
    { id: "/files/vana-detay.png", fileName: "vana-detay.png" },
    { id: "/private/files/kilit-2026.jpg" },
  ];
  const cells = rowCells(
    await render({
      dt: fakeDt([{ key: "fileName", label: "Dosya" }]),
      rows,
      rowKey: "id",
      total: 0,
      clickable: true,
    })
  );

  const names = cells.map((row) => row.find((c) => c.hasLink).linkText);
  assert.ok(names[0].includes("vana-detay.png"), names[0]);
  assert.ok(!names[0].includes("/files/"), `tam URL okunmamalı: ${names[0]}`);
  // İnsan-okunur alan YOKSA en azından yolun son parçası okunur.
  assert.ok(names[1].includes("kilit-2026.jpg"), names[1]);
  assert.ok(!names[1].includes("/private/"), `tam URL okunmamalı: ${names[1]}`);
});

test("rowLinkLabel verildiyse varsayılan tahmin devreye GİRMEZ", async () => {
  const cells = rowCells(
    await render({
      dt: fakeDt(PLAIN_COLUMNS),
      rows: ROWS,
      total: 0,
      clickable: true,
      rowLinkLabel: (row) => `Gönderiyi aç: ${row.carrier}`,
    })
  );
  assert.equal(cells[0].find((c) => c.hasLink).linkText, "Gönderiyi aç: Aras");
});

// ── `:deep()` allowlist'i daralmasın ─────────────────────────

test("örtünün üstünde kalan ögeler listesi TAM — sessizce tıklanamaz kontrol kalmaz", () => {
  // Listeden düşen her seçici, o ögeyi örtünün ALTINDA bırakır: kullanıcı
  // tıklar, kontrol tepki vermez, satır açılır. Hata mesajı vermeyen cinsten.
  const required = [
    "a",
    "button:not(.dt-row-link)",
    "input",
    "select",
    "textarea",
    "label",
    "summary",
    "[tabindex]",
    '[contenteditable]:not([contenteditable="false"])',
    '[role="button"]',
    '[role="checkbox"]',
    '[role="switch"]',
    '[role="menuitem"]',
  ];
  for (const selector of required) {
    assert.ok(source.includes(`.tbl-td :deep(${selector})`), `allowlist'te eksik: ${selector}`);
  }
});

test("kopyalanabilir içerik örtünün üstünde ve SEÇİLEBİLİR kalıyor", () => {
  // Takip numarası (`<code>`) kullanıcının seçip taşıyıcı sitesine
  // yapıştırdığı şey; örtü mousedown'ı yutarsa seçilemez.
  assert.match(
    source,
    /\.tbl-td :deep\(code\),\s*\n\s*\.tbl-td :deep\(\.dt-selectable\)\s*{[^}]*user-select:\s*text/
  );
});
