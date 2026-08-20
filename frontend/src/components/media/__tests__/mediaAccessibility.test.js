import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";

/**
 * Medya gezginlerinin erişilebilirliği — NE ÖLÇÜLDÜ, NE ÖLÇÜLMEDİ:
 *
 *   ÖLÇÜLDÜ  — sunucu çıktısındaki ARIA sözleşmesi (rol, ad, küme konumu,
 *              roving tabindex, aria-current, canlı bölge), klavye gezinme
 *              MANTIĞI (`utils/gridNavigation` testinde ayrıca) ve renk
 *              kontrast oranları (tokenlerden hesaplanıyor).
 *   ÖLÇÜLMEDİ — gerçek ekran okuyucuyla dinleme (NVDA/VoiceOver), odak
 *              halkasının görsel görünürlüğü ve tarayıcıda gerçek odak
 *              sırası. Bunlar için canlı tarayıcı gerekir; bu görevde
 *              tarayıcı doğrulaması yapılmadı.
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const read = (p) => readFileSync(new URL(p, `file://${frontendRoot}/`), "utf8");

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

async function renderComponent(path, props) {
  const { default: Component } = await server.ssrLoadModule(path);
  const app = createSSRApp({ render: () => h(Component, props) });
  return renderToString(app);
}

const GRID = "/src/components/media/MediaFolderGrid.vue";
const CRUMBS = "/src/components/media/MediaCrumbs.vue";

const folders = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `F-${i}`,
    label: `Klasör ${i}`,
    icon: "folder",
    countText: `${i} dosya`,
  }));

// ── Klasör ızgarası ───────────────────────────────────────────────

test("ızgara liste rolü ve erişilebilir ad taşır", async () => {
  const html = await renderComponent(GRID, { items: folders(3), ariaLabel: "Klasörler" });

  // `list-style: none` verilen bir <ul>'un liste semantiğini Safari düşürür;
  // rol bu yüzden AÇIKÇA yazılıyor.
  assert.match(html, /role="list"/);
  assert.match(html, /aria-label="Klasörler"/);
});

test("her kalem küme içindeki yerini bildirir", async () => {
  const html = await renderComponent(GRID, { items: folders(3) });

  // Pencereleme açıkken DOM'da yalnız görünen kalemler durur; `aria-setsize`
  // olmadan ekran okuyucu "3 ögeden 1." yerine yanlış toplam okur.
  assert.equal((html.match(/aria-setsize="3"/g) || []).length, 3);
  for (const pos of [1, 2, 3]) assert.match(html, new RegExp(`aria-posinset="${pos}"`));
});

test("ızgara TEK Tab durağıdır — roving tabindex", async () => {
  const html = await renderComponent(GRID, { items: folders(5) });

  // 300 klasörlük bir seviyede her kartın Tab durağı olması sayfayı
  // klavyeyle kullanılamaz yapardı (WAI-ARIA grid deseni).
  assert.equal((html.match(/tabindex="0"/g) || []).length, 1);
  assert.equal((html.match(/tabindex="-1"/g) || []).length, 4);
});

test("boş klasör metni ızgara yerine geçer, ızgara boş kalmaz", async () => {
  const html = await renderComponent(GRID, { items: [], emptyText: "Bu klasör boş." });
  assert.match(html, /Bu klasör boş\./);
  assert.doesNotMatch(html, /aria-posinset/);
});

test("uzun listede pencereleme sınıfı devreye girer", async () => {
  const kisa = await renderComponent(GRID, { items: folders(10) });
  const uzun = await renderComponent(GRID, { items: folders(300) });

  assert.doesNotMatch(kisa, /mfgrid--windowed/);
  // Sabit satır yüksekliği pencerelemenin ŞARTI: değişken yükseklikte
  // görünmeyen satırların yerine konan boşluk gerçeğinden sapar.
  assert.match(uzun, /mfgrid--windowed/);
  // SSR'de ölçüm yok → hepsi basılır; pencere ancak tarayıcıda daralır.
  assert.equal((uzun.match(/aria-posinset=/g) || []).length, 300);
});

test("ızgara klavye gezinmesini kendi bağlar", () => {
  const src = read("src/components/media/MediaFolderGrid.vue");
  assert.match(src, /@keydown="onKeydown"/);
  assert.match(src, /nextGridIndex/);
  // Odak imleci pencere dışına düşerse tarayıcı odağı body'ye atar.
  assert.match(src, /vg\.pin\(index\)/);
});

// ── Kırıntı şeridi ────────────────────────────────────────────────

test("kırıntıda bulunulan klasör aria-current ile işaretlenir", async () => {
  const html = await renderComponent(CRUMBS, {
    items: [
      { key: "root", label: "Medya" },
      { key: "scope", label: "Herkese açık" },
      { key: "store", label: "Vana Ltd." },
    ],
    ariaLabel: "Medya Gezgini",
  });

  assert.match(html, /<nav[^>]*aria-label="Medya Gezgini"/);
  // Sıralı liste: ekran okuyucu ağaçta ne kadar derinde olunduğunu söyler.
  assert.match(html, /<ol/);
  assert.equal((html.match(/<li/g) || []).length, 3);
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  // Ayraç ikonu bilgi değil gürültü.
  assert.match(html, /aria-hidden="true"/);
});

// ── Ekran seviyesindeki sözleşmeler ───────────────────────────────

test("iki gezgin de klasör değişimini canlı bölgeden duyurur", () => {
  for (const path of [
    "src/views/system/MediaExplorerView.vue",
    "src/views/seller/SellerMediaExplorerView.vue",
  ]) {
    const src = read(path);
    // Klasöre girmek sayfayı yeniden yüklemiyor; duyuru olmadan görme engelli
    // kullanıcı için hiçbir şey olmamış gibi görünüyordu.
    assert.match(src, /role="status" aria-live="polite"/, path);
    assert.match(src, /statusText/, path);
    // Izgaranın erişilebilir adı ekranın sözlüğünden geliyor.
    assert.match(src, /folderGridAria/, path);
  }
});

test("türev listesi açılır bölüm sözleşmesini kurar", () => {
  const src = read("src/views/system/MediaExplorerView.vue");
  assert.match(src, /:aria-expanded="openRenditions === item\.name"/);
  assert.match(src, /:aria-controls="`mx-rend-\$\{item\.name\}`"/);
  assert.match(src, /:id="`mx-rend-\$\{item\.name\}`"/);
});

test("türev tablosu sütun başlıklarını ilişkilendirir", () => {
  const src = read("src/components/media/MediaRenditionList.vue");
  // Sayısal kolonlu veri liste değil TABLO: ekran okuyucu "genişlik sütunu,
  // 384" diye okuyabilsin.
  assert.match(src, /<caption/);
  assert.equal((src.match(/scope="col"/g) || []).length, 5);
  assert.match(src, /scope="row"/);
  assert.match(src, /:aria-busy="loading"/);
});

// ── Kontrast ──────────────────────────────────────────────────────

/** WCAG 2.1 bağıl parlaklık. */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Tokenler tek kaynaktan okunur — testte hex tekrar edilmez. */
function tokens() {
  const src = read("src/assets/scss/variables.scss");
  const map = {};
  for (const [, name, value] of src.matchAll(/^\$([\w-]+):\s*(#[0-9a-fA-F]{6});/gm)) {
    map[name] = value;
  }
  return map;
}

test("yeni medya yüzeylerinin metin kontrastı WCAG AA'yı geçer", () => {
  const c = tokens();
  const pairs = [
    // Türev bilgi/boş durum satırı — ekranın tek bilgisi olduğunda okunmalı.
    ["l-text-900", "l-bg-muted", 4.5],
    ["d-text", "d-bg-elevated", 4.5],
    // Klasör kartındaki sayaç ve türev tablosunun başlıkları (`muted(1)`).
    ["l-text-500", "l-bg-muted", 4.5],
    ["d-text-muted", "d-bg-elevated", 4.5],
  ];

  for (const [fg, bg, min] of pairs) {
    assert.ok(c[fg], `token yok: ${fg}`);
    assert.ok(c[bg], `token yok: ${bg}`);
    const ratio = contrast(c[fg], c[bg]);
    assert.ok(ratio >= min, `${fg} / ${bg} = ${ratio.toFixed(2)} < ${min}`);
  }
});
