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
 * `MediaProductOptimizeCard` (2026-09-30, tek düğme): SSR render, gerçek
 * composable `fixtures/productOptimizeStub.js` ile değiştirilir.
 *   1. koşu yok → Prova var, Başlat kapalı + ipucu
 *   2. biten prova → özet tablo (5 adım, değişecek/zaten uygun/atlanan), Başlat açık,
 *      bilinmeyen gerekçe kodu ham basılmaz
 *   3. çalışan gerçek koşu → kare adımında canlı ilerleme + Durdur
 *   4. geri alınabilir son gerçek koşu → Geri al; AVIF bölümü her zaman ayrı
 *   5. i18n anahtarları dört dilde aynı
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
let server;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    plugins: [vue()],
    resolve: {
      alias: [
        {
          find: /^@\/composables\/useProductImageOptimize$/,
          replacement: `${frontendRoot}/src/components/media/__tests__/fixtures/productOptimizeStub.js`,
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
});

async function renderCard(state) {
  const { makeState } = await server.ssrLoadModule(
    "/src/components/media/__tests__/fixtures/productOptimizeStub.js"
  );
  globalThis.__productOptimizeState = makeState(state);
  const { default: Card } = await server.ssrLoadModule(
    "/src/components/media/MediaProductOptimizeCard.vue"
  );
  const app = createSSRApp({ render: () => h(Card) });
  app.component("RouterLink", {
    props: { to: { type: [Object, String], default: null } },
    setup:
      (props, { slots }) =>
      () =>
        h("a", { href: `#${props.to?.name}` }, slots.default?.()),
  });
  app.use(
    createI18n({
      legacy: false,
      locale: "tr",
      messages: { tr, en },
      missingWarn: false,
      fallbackWarn: false,
    })
  );
  return renderToString(app);
}

const ADIMLAR = ["on_kontrol", "kare", "seo_ad", "meta", "turev"];
function adimlar(over = {}) {
  return ADIMLAR.map((key) => ({
    key,
    state: "done",
    changed: 0,
    ok: 10,
    skipped: 0,
    failed: 0,
    reasons: {},
    ...(over[key] || {}),
  }));
}

test("koşu yokken Prova basılır, Başlat kapalı ve ipucu görünür", async () => {
  const html = await renderCard({});
  assert.match(html, /Ürün görsellerini optimize et/);
  assert.match(html, /data-testid="mpo-prova"[^>]*>\s*Prova/);
  assert.match(html, /data-testid="mpo-start"[^>]*disabled/);
  assert.match(html, /bu oturumda tamamlanmış bir Provadan sonra/);
  assert.doesNotMatch(html, /data-testid="mpo-table"/);
});

test("biten prova: 5 adımlı özet tablo, Değişecek başlığı, Başlat açık, ham kod sızmaz", async () => {
  const run = {
    job_key: "kare-opt-P1",
    mode: "optimize",
    dry_run: true,
    state: "completed",
    steps: adimlar({
      kare: { changed: 3, ok: 2500, skipped: 2, reasons: { disk_missing: 2 } },
      seo_ad: { skipped: 2, reasons: { handled_by_kare: 2 } },
      turev: { changed: 4, skipped: 1, reasons: { yeni_bilinmeyen_kod: 1 } },
      on_kontrol: {
        checks: [{ key: "profiles_enabled", ok: true, message: "product.image profilleri açık" }],
      },
    }),
  };
  const html = await renderCard({ run, provaDone: true });
  assert.match(html, /Prova — Tamamlandı/);
  assert.match(html, /Değişecek/);
  assert.match(html, /Prova hiçbir şey yazmadı/);
  for (const etiket of [
    "Ön kontroller",
    "Kare WebP ana görsel",
    "SEO dosya adları",
    "Dosya ve varlık künyesi",
    "WebP türevleri",
  ]) {
    assert.match(html, new RegExp(etiket));
  }
  assert.match(html, /Dosya diskte yok/); // kare kartının sözlüğünden
  assert.match(html, /Eski adlı; kare adımında ele alınır/);
  assert.match(html, /Diğer/);
  assert.doesNotMatch(html, /yeni_bilinmeyen_kod/);
  assert.match(html, /product.image profilleri açık/);
  assert.doesNotMatch(html, /data-testid="mpo-start"[^>]*disabled/);
});

test("mağaza görselleri adımı: iki satır, kendi gerekçeleri ve oran/alfa ipucu", async () => {
  const steps = [
    ...adimlar(),
    {
      key: "magaza",
      state: "done",
      changed: 58,
      ok: 7,
      skipped: 1,
      failed: 0,
      reasons: { not_store_image: 1 },
    },
    {
      key: "magaza_turev",
      state: "done",
      changed: 54,
      ok: 0,
      skipped: 18,
      failed: 0,
      reasons: { out_of_scope: 18 },
    },
  ];
  const html = await renderCard({
    run: { job_key: "kare-opt-P2", mode: "optimize", dry_run: true, state: "completed", steps },
    provaDone: true,
  });
  assert.match(html, /Mağaza görselleri \(logo, kapak, vitrin, galeri\)/);
  assert.match(html, /Mağaza görseli türevleri/);
  assert.match(html, /Mağaza görseli değil/);
  assert.doesNotMatch(html, /not_store_image/);
  assert.match(html, /oran ve şeffaflık korunur/);
});

test("çalışan gerçek koşu: kare adımında canlı sayaç ve Durdur", async () => {
  const run = {
    job_key: "kare-opt-R1",
    mode: "optimize",
    dry_run: false,
    state: "running",
    current_step: "kare",
    steps: adimlar({
      kare: { state: "running" },
      seo_ad: { state: "pending" },
      meta: { state: "pending" },
      turev: { state: "pending" },
    }),
  };
  const html = await renderCard({
    run,
    running: true,
    live: {
      processed: 40,
      total: 100,
      renamed: 7,
      errors: 0,
      skip_reasons: { already_square: 30 },
    },
  });
  assert.match(html, /Gerçek koşu — Çalışıyor/);
  assert.match(html, /Değişti/);
  assert.match(html, /40 \/ 100 işlendi/);
  assert.match(html, /data-testid="mpo-stop"/);
  assert.match(html, /data-testid="mpo-prova"[^>]*disabled/);
});

test("geri alınabilir son koşu: Geri al görünür; eski AVIF ayrı bölümde ve bağlantılı", async () => {
  const html = await renderCard({
    run: {
      job_key: "kare-opt-R2",
      mode: "optimize",
      dry_run: false,
      state: "completed",
      steps: adimlar(),
    },
    lastReal: { job_key: "kare-opt-R2", finished_at: "2026-09-30 12:00:00" },
    rollbackAvailable: true,
    avifSummary: { deletable_files: 7, deletable_bytes: 4 * 1024 * 1024 },
  });
  assert.match(html, /data-testid="mpo-rollback"/);
  assert.match(html, /urun_gorseli_kare_kapali/);
  assert.match(html, /Eski AVIF dosyaları \(ayrı adım\)/);
  assert.match(html, /7 dosya silinebilir \(4.0 MB\)/);
  assert.match(html, /href="#MediaOrphanAvif"/);
});

test("optimizeAll anahtarları dört dilde birebir aynı", () => {
  const anahtarlar = (o, p = "") =>
    Object.entries(o).flatMap(([k, v]) =>
      v && typeof v === "object" ? anahtarlar(v, `${p}${k}.`) : [`${p}${k}`]
    );
  const trK = anahtarlar(tr.media.optimizeAll).sort();
  for (const [ad, loc] of Object.entries({ en, ru, ar })) {
    assert.deepEqual(anahtarlar(loc.media.optimizeAll).sort(), trK, ad);
  }
});

test("Sistem → Medya: kart en üstte ve YALNIZ System Manager; eski kartlar 'Ayrıntılı araçlar' altında", () => {
  const view = readFileSync(`${frontendRoot}/src/views/system/MediaOptimizeView.vue`, "utf8");
  const tpl = view.slice(view.indexOf("<template>"));
  assert.match(
    tpl,
    /<MediaProductOptimizeCard v-if="auth\.userRoles\?\.includes\('System Manager'\)" \/>/
  );
  const kart = tpl.indexOf("<MediaProductOptimizeCard");
  assert.ok(kart > 0 && kart < tpl.indexOf("mo__stats"), "kart özet kartlarından önce");
  const detay = tpl.slice(tpl.indexOf('data-testid="media-advanced-tools"'));
  assert.ok(detay.indexOf("<MediaSquareCard") < detay.indexOf("</details>"));
  assert.ok(detay.indexOf("<MediaRetroRenameCard") < detay.indexOf("</details>"));
});

// ── Katlama (2026-10-01): başlık + Prova/Başlat hep görünür, gövde katlanır ──

const BITEN_PROVA = {
  job_key: "kare-opt-K1",
  mode: "optimize",
  dry_run: true,
  state: "completed",
  steps: adimlar(),
};

/** `localStorage` sahtesi: yalnız kartın katlama anahtarı okunur/yazılır. */
async function renderWithStorage(stored, state) {
  const had = Object.prototype.hasOwnProperty.call(globalThis, "localStorage");
  const orig = globalThis.localStorage;
  const map = new Map(stored == null ? [] : [["istoc.media.optimizeAll.open", stored]]);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: (k) => map.delete(k),
    },
  });
  try {
    return await renderCard(state);
  } finally {
    if (had)
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        writable: true,
        value: orig,
      });
    else delete globalThis.localStorage;
  }
}

const toggleAttrs = (html) => html.match(/<button([^>]*data-testid="mpo-toggle"[^>]*)>/)?.[1] || "";
const bodyAttrs = (html) => html.match(/<div([^>]*data-testid="mpo-body"[^>]*)>/)?.[1] || "";

test("katlama: koşu yok + kayıt yok → kapalı; gövde inert, başlık düğmeleri görünür", async () => {
  const html = await renderWithStorage(null, {});
  assert.match(toggleAttrs(html), /aria-expanded="false"/);
  assert.match(toggleAttrs(html), /aria-controls="mpo-body"/);
  assert.match(toggleAttrs(html), /aria-label="Ürün görsellerini optimize et kartını aç\/kapat"/);
  assert.match(bodyAttrs(html), /id="mpo-body"/);
  assert.match(bodyAttrs(html), /\binert\b/, "kapalı gövde Tab/AT'ye açık kalmış");
  assert.doesNotMatch(html, /class="[^"]*\bmpo--open\b/);
  // Prova/Başlat başlıkta, gövdenin DIŞINDA — kapalıyken de basılabilir.
  const govde = html.indexOf('data-testid="mpo-body"');
  assert.ok(html.indexOf('data-testid="mpo-prova"') < govde);
  assert.ok(html.indexOf('data-testid="mpo-start"') < govde);
  // Aç/kapat düğmesi boş: eylem düğmeleri onun İÇİNDE değil (tıklama kartı katlamaz).
  assert.match(html, /<button[^>]*data-testid="mpo-toggle"[^>]*><\/button>/);
});

test("katlama: çalışan koşu ya da bu oturumda biten prova → açık, inert yok", async () => {
  const calisan = await renderWithStorage("0", {
    run: { ...BITEN_PROVA, dry_run: false, state: "running" },
    running: true,
  });
  assert.match(
    toggleAttrs(calisan),
    /aria-expanded="true"/,
    "çalışan koşu kayıtlı 'kapalı'yı ezer"
  );
  assert.doesNotMatch(bodyAttrs(calisan), /\binert\b/);
  assert.match(calisan, /class="[^"]*\bmpo--open\b/);

  const prova = await renderWithStorage(null, { run: BITEN_PROVA, provaDone: true });
  assert.match(toggleAttrs(prova), /aria-expanded="true"/);
});

test("katlama: kayıtlı tercih okunur ('1' açık, '0' kapalı), eski koşu tek başına açmaz", async () => {
  const eski = { ...BITEN_PROVA, dry_run: false };
  assert.match(toggleAttrs(await renderWithStorage("1", { run: eski })), /aria-expanded="true"/);
  assert.match(toggleAttrs(await renderWithStorage("0", { run: eski })), /aria-expanded="false"/);
  assert.match(toggleAttrs(await renderWithStorage(null, { run: eski })), /aria-expanded="false"/);
});

test("katlama sözleşmesi: elle seçim localStorage'a yazılır (try/catch), hareket kuralları", () => {
  const src = readFileSync(
    `${frontendRoot}/src/components/media/MediaProductOptimizeCard.vue`,
    "utf8"
  );
  // SSR'de tıklama koşmaz — yazma yolunu kaynakta kilitle.
  const toggle = src.slice(
    src.indexOf("function toggleExpanded"),
    src.indexOf("function openForAction")
  );
  assert.match(toggle, /writeOpen\(manualExpanded\.value\)/);
  const write = src.slice(src.indexOf("function writeOpen"), src.indexOf("const storedOpen"));
  assert.match(write, /try\s*{[\s\S]*localStorage\.setItem[\s\S]*}\s*catch/);

  const css = src.slice(src.indexOf("<style")).replace(/\/\/[^\n]*/g, "");
  assert.match(css, /grid-template-rows: 0fr;/);
  assert.match(css, /grid-template-rows: 1fr;/);
  assert.match(css, /grid-template-rows \$d-pop \$ease-out/);
  assert.match(css, /transition: transform \$d-pop \$ease-out/);
  assert.match(css, /outline: 3px solid/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css, /max-height|transition:\s*all|ease-in[^-]/);
});
