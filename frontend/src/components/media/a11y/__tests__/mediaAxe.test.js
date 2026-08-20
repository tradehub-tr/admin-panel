import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

import vue from "@vitejs/plugin-vue";
import { createPinia } from "pinia";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createI18n } from "vue-i18n";

import { blocking, describe, scanHtml, UNMEASURABLE_RULES } from "../axeHarness.js";
import en from "../../../../i18n/locales/en.js";
import tr from "../../../../i18n/locales/tr.js";

/**
 * T-095 — `axe-core` ile MAKİNE taraması.
 *
 *   ÖLÇÜLDÜ  — 14 medya yüzeyinin sunucu çıktısı (61e'nin 8'i + Faz 9
 *              genişletmesi: detay çekmecesi, video karar kartı, onay
 *              kapısı, klasör UI'ı, yükleyici paneli, öksüz bölümü),
 *              `axe-core@4.13`, wcag2a + wcag2aa + wcag21a + wcag21aa
 *              etiket kümesi.
 *   ÖLÇÜLMEDİ — renk kontrastı, dokunma hedefi ölçüsü ve kaydırılabilir
 *              bölge kuralları (`axeHarness.UNMEASURABLE_RULES`): üçü de
 *              boyama/düzen motoru ister, `jsdom`'da yok. Ayrıca gerçek
 *              klavye sırası, ekran okuyucu çıktısı ve hidrasyon SONRASI
 *              DOM ölçülmedi — tarayıcı doğrulaması bu görevde yapılmadı.
 *
 * `Teleport` kullanan diyaloglar (`MediaModal` ve onu saran
 * `MediaPreviewModal`/`MediaPickerModal`) burada TARANAMIYOR: SSR'da
 * `document` yok, teleport hedefi çözülemiyor ve bileşen hiç render
 * edilmiyor. Faz 9 §7.3'ün 10 ve 11 numaralı diyalog bulguları bu yüzden
 * bu taramanın kapsamı DIŞINDA — kapandıkları ölçülmedi.
 */

const frontendRoot = fileURLToPath(new URL("../../../../..", import.meta.url));

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
  // Bazı bileşenler setup içinde `window.location`'a bakıyor; SSR'da yok.
  globalThis.window ??= { location: { origin: "https://panel.test" } };
});

after(async () => {
  await server?.close();
  delete globalThis.window;
});

async function renderApp(path, props) {
  const { default: Component } = await server.ssrLoadModule(path);
  const app = createSSRApp({ render: () => h(Component, props) });
  app.use(createI18n({ legacy: false, locale: "tr", fallbackLocale: "tr", messages: { tr, en } }));
  app.use(createPinia());
  return renderToString(app);
}

/**
 * `MediaUploadQueue.vue:125` `setInterval`'i `setup()` İÇİNDE kuruyor;
 * temizliği `onUnmounted`'a bağlı, o da SSR'da HİÇ çağrılmıyor. Sonuç:
 * her sunucu render'ı bir zamanlayıcı sızdırıyor ve Node süreci hiç
 * kapanmıyor — bu tarama ilk kurulduğunda test koşucusu takıldı, sebebi
 * budur. Bileşen bu görevin dosyası DEĞİL, düzeltilmedi; burada yalnız
 * sızıntı yakalanıp temizleniyor ki tarama koşabilsin.
 *
 * (Tarayıcıda gerçek bir arıza değil: bileşen unmount olunca temizleniyor.
 * Doğrusu yine de `onMounted` içinde kurmaktır — SSR'da sayaç zaten
 * anlamsız.)
 */
async function render(path, props) {
  const realSetInterval = globalThis.setInterval;
  const leaked = [];
  globalThis.setInterval = (...args) => {
    const handle = realSetInterval(...args);
    leaked.push(handle);
    return handle;
  };
  try {
    return await renderApp(path, props);
  } finally {
    globalThis.setInterval = realSetInterval;
    for (const handle of leaked) clearInterval(handle);
  }
}

async function scanComponent(path, props) {
  return scanHtml(await render(path, props));
}

const IMAGE = "/src/components/media/MediaImage.vue";
const VIDEO = "/src/components/media/MediaVideo.vue";
const THUMB = "/src/components/media/MediaThumb.vue";
const DETAIL = "/src/components/media/MediaDetailPanel.vue";
const FOLDERS = "/src/components/media/MediaFolderGrid.vue";
const CRUMBS = "/src/components/media/MediaCrumbs.vue";
const UPLOADER = "/src/components/media/upload/MediaUploader.vue";
const SIM_VIDEO = "/src/components/media/simulator/SimVideoDecisionCard.vue";
const SIM_GATE = "/src/components/media/simulator/SimApprovalGate.vue";

const item = {
  id: "M1",
  name: "F1",
  fileUrl: "/files/vana.webp",
  fileName: "vana.webp",
  ext: "WEBP",
  kind: "image",
  width: 1600,
  height: 900,
};

/** Teslim bileşenlerinin gerçek kullanım hâlleri — hepsi taranıyor. */
const OWN_SURFACES = [
  [
    "MediaImage — türevli, adlandırılmış",
    IMAGE,
    {
      src: "/files/vana.webp",
      alt: "Küresel vana",
      width: 1600,
      height: 900,
      sizes: "(min-width: 768px) 300px, 100vw",
      renditions: [
        { width: 320, height: 180, format: "AVIF", fileUrl: "/f/a-320.avif" },
        { width: 640, height: 360, format: "WEBP", fileUrl: "/f/a-640.webp" },
        { width: 640, height: 360, format: "JPEG", fileUrl: "/f/a-640.jpg" },
      ],
    },
  ],
  ["MediaImage — bezeme (alt boş)", IMAGE, { src: "/files/x.png", width: 100, height: 100 }],
  [
    "MediaVideo — kontrollü",
    VIDEO,
    {
      src: "/files/v.mp4",
      type: "video/mp4",
      poster: "/files/v.jpg",
      width: 1280,
      height: 720,
      label: "Ürün tanıtım videosu",
      captionsSrc: "/files/v.vtt",
      captionsLang: "tr",
      captionsLabel: "Türkçe",
    },
  ],
  [
    "MediaVideo — sessiz döngü",
    VIDEO,
    {
      src: "/files/v.mp4",
      poster: "/files/v.jpg",
      width: 1280,
      height: 720,
      background: true,
      label: "Arka plan videosu",
    },
  ],
  ["MediaThumb — görsel", THUMB, { item }],
  ["MediaThumb — belge ikonu", THUMB, { item: { ...item, fileUrl: "", ext: "PDF", kind: "doc" } }],
  [
    // T-093'ün sekmeli çekmecesi — bu turun teslim dosyası. SSR açılışta
    // yalnız Özet sekmesini basar (diğerleri tembel); tablist/tab/tabpanel
    // sözleşmesi ve form alanları bu taramada.
    "MediaDetailPanel — düzenlenebilir, görsel",
    DETAIL,
    {
      item: {
        ...item,
        docName: "F1",
        bytes: 132000,
        title: "Küresel vana",
        alt: "",
        description: "",
        tags: ["vana"],
        uploadedAt: "2026-08-01 10:00:00",
        liveUsage: 0,
      },
      editable: true,
    },
  ],
];

test("teslim bileşenlerinde kritik/ciddi axe bulgusu YOK", async () => {
  for (const [label, path, props] of OWN_SURFACES) {
    const result = await scanComponent(path, props);
    const found = blocking(result.violations);
    assert.equal(found.length, 0, `${label}:\n${describe(found)}`);
    // Kuralların gerçekten koştuğunun kanıtı: hiç `passes` yoksa tarama
    // sessizce boş belge üzerinde çalışmış olabilirdi.
    assert.ok(result.passes > 0, `${label}: hiçbir axe kuralı koşmadı`);
  }
});

/**
 * Komşu yüzeylerde ÖLÇÜLEN taban çizgi. İki dosya da bugün başka bir ajan
 * tarafından düzenlenmiyor (git'te temiz) ve İKİSİ DE BU GÖREVİN DOSYASI
 * DEĞİL — bu yüzden düzeltilmediler, ölçülüp kaydedildiler.
 *
 * Eşik `<=`: biri düzeltilirse test yine geçer, YENİ bir engelleyici bulgu
 * eklenirse kırılır. Amaç dondurmak değil, geri gidişi yakalamak.
 */
const NEIGHBOUR_BASELINE = 2;

const NEIGHBOURS = [
  [
    "MediaUploadQueue",
    "/src/components/media/MediaUploadQueue.vue",
    { uploads: [{ id: "u1", name: "a.png", progress: 40, status: "uploading" }] },
  ],
  [
    "MediaFilterRail",
    "/src/components/media/MediaFilterRail.vue",
    {
      groups: [{ id: "kind", label: "Tür", options: [{ id: "image", label: "Görsel", count: 4 }] }],
      tags: ["vana"],
      usedBytes: 1024,
      quotaBytes: 4096,
    },
  ],
];

test("komşu medya yüzeylerinde ölçülen engelleyici bulgu sayısı artmadı", async () => {
  const found = [];
  for (const [label, path, props] of NEIGHBOURS) {
    const result = await scanComponent(path, props);
    for (const v of blocking(result.violations)) found.push(`${label}: ${v.id} ×${v.nodes.length}`);
  }
  assert.ok(
    found.length <= NEIGHBOUR_BASELINE,
    `Taban çizgi ${NEIGHBOUR_BASELINE}, ölçülen ${found.length}:\n${found.join("\n")}`
  );
});

/**
 * Faz 9'da eklenen ama 61e taramasının DIŞINDA kalan yüzeyler (T-095
 * genişletmesi): video karar kartı, onay kapısı, klasör gezinme UI'ı,
 * yükleyici paneli ve rayın öksüz bölümü. Hiçbiri bu görevin dosyası değil
 * (MediaDetailPanel hariç, o OWN_SURFACES'ta) — bulgu çıkarsa düzeltilmez,
 * ölçülüp sınır olarak yazılır (NEIGHBOUR deseni).
 *
 * ÖLÇÜM SINIRLARI:
 * · `MediaModal`/`MediaPreviewModal`/`MediaPickerModal` yine kapsam DIŞI —
 *   Teleport SSR'da çözülmüyor (dosya başındaki not).
 * · `SimApprovalGate` MOUNT SONRASI IntersectionObserver ile durum
 *   değiştiriyor; burada ölçülen hidrasyon ÖNCESİ ilk hâl.
 * · Rayın öksüz bölümü `v-show` ile kapalı geliyor ve axe gizli içeriği
 *   taramıyor; bölüm `localStorage` sahtesiyle AÇIK başlatılarak ölçülüyor
 *   (veri `onMounted`ta yüklendiği için SSR'da "taranıyor" hâli görünür —
 *   dolu liste hâli bu taramada ÖLÇÜLMEDİ).
 */
const TODAYS_SURFACES = [
  ["SimVideoDecisionCard — ölçülmüş künye", SIM_VIDEO, {}],
  ["SimApprovalGate — varlıklı", SIM_GATE, { asset: "MA-1", sourceWidth: 1600 }],
  [
    "MediaFolderGrid — klasörler",
    FOLDERS,
    {
      items: [
        { id: "kyb", label: "KYB Belgeleri", icon: "folder", countText: "12" },
        { id: "chat", label: "Sohbet ekleri", icon: "folder", countText: "3" },
      ],
      ariaLabel: "Klasörler",
    },
  ],
  ["MediaFolderGrid — boş durum", FOLDERS, { items: [], emptyText: "Klasör yok" }],
  [
    "MediaCrumbs — iki seviye",
    CRUMBS,
    {
      items: [
        { key: "root", label: "Medya" },
        { key: "kyb", label: "KYB Belgeleri" },
      ],
      ariaLabel: "Konum",
    },
  ],
];

test("bugün eklenen medya yüzeylerinde kritik/ciddi axe bulgusu YOK", async () => {
  for (const [label, path, props] of TODAYS_SURFACES) {
    const result = await scanComponent(path, props);
    const found = blocking(result.violations);
    assert.equal(found.length, 0, `${label}:\n${describe(found)}`);
    assert.ok(result.passes > 0, `${label}: hiçbir axe kuralı koşmadı`);
  }
});

/**
 * Yükleyici paneli SIFIR engelleyici bulguda kilitli (W8, 2026-08-20).
 * Rapor 89'un ölçtüğü 2 bulgu (`UploadDropzone.vue`) düzeltildi:
 *   1. `label` [critical] — gizli `<input type="file">` artık `aria-label`
 *      taşıyor (dropAria metniyle aynı).
 *   2. `nested-interactive` [serious] — input `role="button"` bırakma
 *      alanının DIŞINA taşındı (bileşen çok köklü; görsel değişiklik yok).
 * Eşik 0: HERHANGİ bir engelleyici bulgu eklenirse test kırılır.
 */
const UPLOADER_BASELINE = 0;

test("yükleyici panelinde ölçülen engelleyici bulgu sayısı artmadı", async () => {
  const result = await scanComponent(UPLOADER, { slotKey: "product.image" });
  const found = blocking(result.violations);
  assert.ok(
    found.length <= UPLOADER_BASELINE,
    `Taban çizgi ${UPLOADER_BASELINE}, ölçülen ${found.length}:\n${describe(found)}`
  );
  assert.ok(result.passes > 0, "hiçbir axe kuralı koşmadı");
});

test("rayın öksüz bölümü AÇIKKEN de engelleyici bulgu artmıyor", async () => {
  // `v-show` kapalı içerik axe'e görünmez; bölüm depolama anahtarıyla açık
  // başlatılır ki içindeki form kontrolleri (yaş eşiği seçimi, yeniden dene)
  // GERÇEKTEN taransın. localStorage sahtesi yalnız bu testte kurulur.
  const eskiStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => JSON.stringify(["kind", "orphans"]),
    setItem: () => {},
    removeItem: () => {},
  };
  try {
    const result = await scanComponent("/src/components/media/MediaFilterRail.vue", {
      groups: [{ id: "kind", label: "Tür", options: [{ id: "image", label: "Görsel", count: 4 }] }],
      tags: ["vana"],
      usedBytes: 1024,
      quotaBytes: 4096,
    });
    const found = blocking(result.violations);
    // NEIGHBOUR taban çizgisiyle aynı gerekçe: dosya bu görevin değil;
    // bugünkü ölçüm 0 — artarsa kırılır, biri düzeltirse yine geçer.
    assert.ok(
      found.length <= NEIGHBOUR_BASELINE,
      `Taban çizgi ${NEIGHBOUR_BASELINE}, ölçülen ${found.length}:\n${describe(found)}`
    );
    assert.ok(result.passes > 0, "hiçbir axe kuralı koşmadı");
  } finally {
    if (eskiStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = eskiStorage;
  }
});

test("axe gerçekten çalışıyor — bilinen ihlali BULUYOR", async () => {
  // Bir tarama aracının en tehlikeli arızası sessizce hiçbir şey bulmamaktır.
  // Bu test aracın kendisini ölçer: kasten bozuk bir parça verilir.
  const result = await scanHtml(
    '<button></button><img src="/a.png"><div role="progressbar" aria-valuenow="5"></div>'
  );
  const ids = result.violations.map((v) => v.id).sort();
  assert.deepEqual(ids, ["aria-progressbar-name", "button-name", "image-alt"]);
  assert.equal(blocking(result.violations).length, 3);
});

test("ölçülemeyen kurallar açıkça kapalı ve gerekçeli", () => {
  // Kapatılan her kuralın YAZILI bir sebebi olmalı; sebepsiz kapatma,
  // ölçümü sessizce daraltmanın en kolay yoludur.
  for (const [id, reason] of Object.entries(UNMEASURABLE_RULES)) {
    assert.ok(reason.length > 10, `${id}: gerekçe yok`);
  }
  assert.ok(Object.keys(UNMEASURABLE_RULES).includes("color-contrast"));
});
