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
 * `MediaSquareCard` (Task 6, 2026-09-29 SDD planı — "Ürün görsellerini
 * kareye çevir"): operatör kartı. `MediaRetroRenameCard`in sadeleştirilmiş
 * kardeşi — ayrı bir "plan" ucu yok, "Prova" da `start_square(dry_run=1)`
 * ile aynı iş kuyruğu + polling sözleşmesini kullanır.
 *
 *   ÖLÇÜLDÜ (SSR render, gerçek `useMediaSquare` composable'ı
 *   `fixtures/mediaSquareStub.js` ile değiştirilerek) — dört durum:
 *     1. bekleyen sayaç (Prova + Başlat) / bekleyen yok (butonlar gizli)
 *     2. çalışan iş (ilerleme çubuğu, sayaçlar, bilinen + BİLİNMEYEN atlama
 *        nedeni rozetleri — bilinmeyen kod ham basılmaz, genel etikete düşer)
 *     3. biten iş + geri alınabilir son iş (Kapat, Geri al)
 *     4. biten prova "Çevrildi" demez, "Çevrilecek" der
 *   ÖLÇÜLMEDİ (kaynak metin üzerinden doğrulandı) — composable'ın
 *   `square_count`'u yalnız mount'ta ve iş bitince çağırdığı, poll
 *   döngüsünde ASLA çağırmadığı (görev talimatı).
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const read = (p) => readFileSync(new URL(p, `file://${frontendRoot}/`), "utf8");
const cardSrc = read("src/components/media/MediaSquareCard.vue");
const composableSrc = read("src/composables/useMediaSquare.js");

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
          find: /^@\/composables\/useMediaSquare$/,
          replacement: `${frontendRoot}/src/components/media/__tests__/fixtures/mediaSquareStub.js`,
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
    "/src/components/media/__tests__/fixtures/mediaSquareStub.js"
  );
  globalThis.__mediaSquareState = makeState(state);
  const { default: MediaSquareCard } = await server.ssrLoadModule(
    "/src/components/media/MediaSquareCard.vue"
  );
  const app = createSSRApp({ render: () => h(MediaSquareCard) });
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

// ── 1. Bekleyen sayaç / bekleyen yok ──

test("bekleyen görsel varken sayaç + Prova + Başlat basılır", async () => {
  const html = await renderCard({ pendingCount: 5 });
  assert.match(html, /5 ürün görseli/);
  assert.match(html, />\s*Prova</);
  assert.match(html, />\s*Başlat</);
});

test("bekleyen görsel yokken (0) Prova/Başlat basılmaz", async () => {
  const html = await renderCard({ pendingCount: 0 });
  assert.match(html, /0 ürün görseli/);
  assert.doesNotMatch(html, />\s*Prova</);
  assert.doesNotMatch(html, />\s*Başlat</);
});

// ── 2. Çalışan iş: bilinen + bilinmeyen atlama nedeni ──

test("iş çalışırken ilerleme çubuğu, sayaçlar ve Durdur basılır; bilinmeyen neden kodu ham basılmaz", async () => {
  const html = await renderCard({
    pendingCount: 40,
    running: true,
    job: {
      key: "J1",
      mode: "kare",
      state: "running",
      dry_run: false,
      total: 40,
      processed: 10,
      renamed: 6,
      skipped: 4,
      errors: 0,
      reasons: { already_square: 1, disk_missing: 2, weird_new_error_code: 1 },
      message: "",
    },
  });
  assert.match(html, /10 \/ 40/);
  assert.match(html, /width:\s*25%/); // 10/40 = %25
  assert.match(html, />Durdur</);
  assert.match(html, /Zaten uygun/); // alreadyOk
  assert.match(html, /Dosya diskte yok/); // reason_disk_missing rozeti
  assert.match(html, /Diğer/); // reasonOther — bilinmeyen kod için genel etiket
  assert.doesNotMatch(html, /weird_new_error_code/); // ham kod ekrana sızmaz
  // Terminal olmadığı için kapatma düğmesi basılmamalı.
  assert.doesNotMatch(html, /msq__close/);
});

// ── 3. Biten iş + geri alınabilir son iş ──

test("iş bitince Tamamlandı + Kapat basılır; geri alınabilir son iş varsa Geri al basılır", async () => {
  const html = await renderCard({
    pendingCount: 0,
    running: false,
    job: {
      key: "J1",
      mode: "kare",
      state: "completed",
      dry_run: false,
      total: 40,
      processed: 40,
      renamed: 38,
      skipped: 2,
      errors: 0,
      reasons: {},
      message: "",
    },
    lastJob: { jobKey: "J1", renamed: 38 },
  });
  assert.match(html, /Tamamlandı/);
  assert.match(html, /msq__close/); // terminal → kapat düğmesi basılı
  assert.match(html, /aria-label="Kapat"/); // kapat düğmesi title kadar aria-label da taşır
  assert.match(html, />Geri al</); // canRollback → geri al satırı
  assert.match(html, /38/); // lastJobChip sayısı
});

test("çalışan iş varken geri al basılmaz (canRollback false)", async () => {
  const html = await renderCard({
    pendingCount: 0,
    running: true,
    job: {
      key: "J1",
      mode: "kare",
      state: "running",
      dry_run: false,
      total: 10,
      processed: 3,
      renamed: 0,
      skipped: 0,
      errors: 0,
      reasons: {},
      message: "",
    },
    lastJob: { jobKey: "J0", renamed: 12 },
  });
  assert.doesNotMatch(html, />Geri al</);
});

// Fix round 2: gerçek `get_square_status` yükü (yerel site, 2026-09-30) —
// alan adı `skip_reasons`, `reasons` değil; composable bunu `job.reasons`e
// normalize ediyor (bkz. `composables/__tests__/useMediaSquare.test.js`).
// Kart bu normalize edilmiş şekli render eder.
test("gerçek yük şekli: 2418 çevrildi / 1002 zaten uygun / 121 atlanacak basılır", async () => {
  const html = await renderCard({
    pendingCount: 0,
    running: false,
    job: {
      key: "J-REAL",
      mode: "kare",
      state: "completed",
      dry_run: false,
      total: 3541,
      processed: 3541,
      renamed: 2418,
      skipped: 1123,
      errors: 0,
      reasons: { already_square: 1002, archived: 6, disk_missing: 114, not_product: 1 },
      message: "",
    },
  });
  assert.match(html, /Çevrildi[\s\S]{0,40}<b[^>]*>2418<\/b>/);
  assert.match(html, /Zaten uygun[\s\S]{0,40}<b[^>]*>1002<\/b>/);
  assert.match(html, /Atlanacak[\s\S]{0,40}<b[^>]*>121<\/b>/); // 6 + 114 + 1
  assert.match(html, /Optimize arşivinde[\s\S]{0,20}<b[^>]*>6<\/b>/);
  assert.match(html, /Dosya diskte yok[\s\S]{0,20}<b[^>]*>114<\/b>/);
  assert.match(html, /Ürün dışı kullanım var[\s\S]{0,20}<b[^>]*>1<\/b>/);
});

// ── 3b. Terminal durum başlıkları: stopped/error/not_found "Tamamlandı" demez ──
// (`terminal` yalnız "artık çalışmıyor" demek; state'e göre ayrı başlık gerekir.)

test("durdurulan iş 'Durduruldu' der, 'Tamamlandı' demez", async () => {
  const html = await renderCard({
    pendingCount: 0,
    running: false,
    job: {
      key: "J1",
      mode: "kare",
      state: "stopped",
      dry_run: false,
      total: 40,
      processed: 12,
      renamed: 9,
      skipped: 3,
      errors: 0,
      reasons: {},
      message: "",
    },
  });
  assert.match(html, /Durduruldu/);
  assert.doesNotMatch(html, /Tamamlandı/);
});

test("hata veren iş 'Hata oluştu' der, 'Tamamlandı' demez", async () => {
  const html = await renderCard({
    pendingCount: 0,
    running: false,
    job: {
      key: "J1",
      mode: "kare",
      state: "error",
      dry_run: false,
      total: 40,
      processed: 5,
      renamed: 2,
      skipped: 0,
      errors: 3,
      reasons: {},
      message: "İş durumu alınamadı",
    },
  });
  assert.match(html, /Hata oluştu/);
  assert.doesNotMatch(html, /Tamamlandı/);
});

test("bulunamayan iş 'İş bulunamadı' der, 'Tamamlandı' demez", async () => {
  const html = await renderCard({
    pendingCount: 0,
    running: false,
    job: {
      key: "J1",
      mode: "kare",
      state: "not_found",
      dry_run: false,
      total: 0,
      processed: 0,
      renamed: 0,
      skipped: 0,
      errors: 0,
      reasons: {},
      message: "İş kuyruğa alınamadı ya da süresi doldu",
    },
  });
  assert.match(html, /İş bulunamadı/);
  assert.doesNotMatch(html, /Tamamlandı/);
});

test("kısmen tamamlanan iş 'Tamamlandı (hatalı dosyalar var)' der", async () => {
  const html = await renderCard({
    pendingCount: 0,
    running: false,
    job: {
      key: "J1",
      mode: "kare",
      state: "partial",
      dry_run: false,
      total: 40,
      processed: 40,
      renamed: 30,
      skipped: 8,
      errors: 2,
      reasons: {},
      message: "",
    },
  });
  assert.match(html, /Tamamlandı \(hatalı dosyalar var\)/);
});

// ── 4. Biten prova "Çevrildi" demez ──

test("biten prova 'Çevrilecek' der, 'Çevrildi' demez", async () => {
  const html = await renderCard({
    pendingCount: 2,
    running: false,
    job: {
      key: "J1",
      mode: "kare",
      state: "completed",
      dry_run: true,
      total: 10,
      processed: 10,
      renamed: 8,
      skipped: 2,
      errors: 0,
      reasons: { already_square: 1 },
      message: "",
    },
  });
  assert.match(html, /Çevrilecek/);
  assert.doesNotMatch(html, /Çevrildi/);
});

// ── 5. Kaynak metin üzerinden doğrulanan sözleşmeler ──

test("mount onMounted'ta yalnız loadCount() çağırır", () => {
  const setupBlock = cardSrc.slice(0, cardSrc.indexOf("</script>"));
  const onMountedBlock = setupBlock.match(/onMounted\(\(\) => \{[\s\S]*?\}\);/)?.[0] || "";
  assert.match(onMountedBlock, /r\.loadCount\(\)/);
});

test("MediaOptimizeView kartı YALNIZ System Manager rolüne açık", () => {
  const view = read("src/views/system/MediaOptimizeView.vue");
  assert.match(view, /<MediaSquareCard v-if="auth\.userRoles\?\.includes\('System Manager'\)" \/>/);
});

test("bilinmeyen atlama kodu için genel etiket kuralı kaynakta var (KNOWN_REASONS + reasonOther)", () => {
  assert.match(cardSrc, /const KNOWN_REASONS = new Set\(\[/);
  assert.match(cardSrc, /"disk_missing"/);
  assert.match(cardSrc, /"too_large"/);
  assert.match(
    cardSrc,
    /function reasonLabel\(code\) \{\s*if \(KNOWN_REASONS\.has\(code\)\) return t\(`media\.square\.reason_\$\{code\}`\);\s*return t\("media\.square\.reasonOther"\);/
  );
});

test("jobTitle stopped/error/not_found/partial durumlarını ayrı eşler (terminal ≠ done)", () => {
  assert.match(cardSrc, /const jobTitle = computed\(\(\) => \{/);
  assert.match(cardSrc, /if \(s === "stopped"\) return t\("media\.square\.stopped"\);/);
  assert.match(cardSrc, /if \(s === "error"\) return t\("media\.square\.error"\);/);
  assert.match(cardSrc, /if \(s === "not_found"\) return t\("media\.square\.notFound"\);/);
  assert.match(cardSrc, /if \(s === "partial"\) return t\("media\.square\.donePartial"\);/);
  assert.match(cardSrc, /<strong v-if="terminal">\{\{ jobTitle \}\}<\/strong>/);
});

test("square_count yalnız mount ve iş bitince çağrılır — poll döngüsünde ÇAĞRILMAZ", () => {
  const loadCountCalls = composableSrc.match(/await loadCount\(\)/g) || [];
  assert.equal(
    loadCountCalls.length,
    2,
    "loadCount() yalnız not_found ve TERMINAL dallarında iki kez çağrılmalı"
  );
  assert.match(composableSrc, /if \(state === "not_found"\)[\s\S]{0,400}await loadCount\(\)/);
  assert.match(composableSrc, /if \(TERMINAL\.has\(state\)\)[\s\S]{0,900}await loadCount\(\)/);
  // Yorum satırı da niyeti kayıt altına alıyor.
  assert.match(composableSrc, /yalnız iş bittiğinde tazelenir/);
});

test("localStorage okuma/yazma try/catch ile sarılı", () => {
  assert.match(
    composableSrc,
    /function readLastJob\(\) \{\s*try \{[\s\S]*?catch \{[\s\S]*?return null;[\s\S]*?\}\s*\}/
  );
  assert.match(
    composableSrc,
    /function writeLastJob\(value\) \{\s*try \{[\s\S]*?catch \{[\s\S]*?\}\s*\}/
  );
});

// ── 6. Dört locale'de media.square.* anahtarları var ──

const REQUIRED_KEYS = [
  "title",
  "desc",
  "count",
  "preview",
  "start",
  "stop",
  "rollback",
  "willConvert",
  "alreadyOk",
  "willSkip",
  "converted",
  "confirm",
  "done",
  "donePartial",
  "stopped",
  "error",
  "notFound",
  "reason_not_product",
  "reason_archived",
  "reason_animated",
  "reason_unreadable",
  "reason_disk_missing",
  "reason_kept_for_orders",
  "reason_too_large",
  "reasonOther",
];

test("dört locale'de media.square.* anahtarları var (too_large + genel etiket dahil)", () => {
  for (const [name, src] of [
    ["tr", read("src/i18n/locales/tr.js")],
    ["en", read("src/i18n/locales/en.js")],
    ["ar", read("src/i18n/locales/ar.js")],
    ["ru", read("src/i18n/locales/ru.js")],
  ]) {
    const mediaStart = src.indexOf("\n  media: {");
    assert.ok(mediaStart >= 0, `${name}: media kökü yok`);
    const squareBlock = src.slice(mediaStart).match(/square:\s*\{[\s\S]*?\n {4}\},/)?.[0];
    assert.ok(squareBlock, `${name}: media.square bloğu yok`);
    for (const key of REQUIRED_KEYS) {
      assert.ok(new RegExp(`\\b${key}:`).test(squareBlock), `${name}: media.square.${key} eksik`);
    }
  }
});

test("tr locale'de metinler görev talimatıyla harfiyen eşleşir", () => {
  const square = tr.media.square;
  assert.equal(square.title, "Ürün görsellerini kareye çevir");
  assert.equal(
    square.desc,
    "Ürün görselleri 1000–2000 px kareye tamamlanır, boşluklar beyaz olur. Eski adresler yeni görsele yönlenir."
  );
  assert.equal(square.count, "{n} ürün görseli");
  assert.equal(square.preview, "Prova");
  assert.equal(square.start, "Başlat");
  assert.equal(square.stop, "Durdur");
  assert.equal(square.rollback, "Geri al");
  assert.equal(square.willConvert, "Çevrilecek");
  assert.equal(square.alreadyOk, "Zaten uygun");
  assert.equal(square.willSkip, "Atlanacak");
  assert.equal(square.converted, "Çevrildi");
  assert.equal(
    square.confirm,
    "Görseller kareye çevrilecek; eski adresler 90 gün yönlenecek, orijinaller 30 gün geri alınabilir."
  );
  assert.equal(square.done, "Tamamlandı");
  assert.equal(square.donePartial, "Tamamlandı (hatalı dosyalar var)");
  assert.equal(square.stopped, "Durduruldu");
  assert.equal(square.error, "Hata oluştu");
  assert.equal(square.notFound, "İş bulunamadı");
  assert.equal(square.reason_not_product, "Ürün dışı kullanım var");
  assert.equal(square.reason_archived, "Optimize arşivinde");
  assert.equal(square.reason_animated, "Hareketli görsel");
  assert.equal(square.reason_unreadable, "Okunamadı");
  assert.equal(square.reason_disk_missing, "Dosya diskte yok");
  assert.equal(square.reason_kept_for_orders, "Siparişte kullanıldığı için eski dosya korundu");
  assert.equal(square.reason_too_large, "Çok büyük görsel");
  assert.ok(square.reasonOther);
});

// ── Final review: backend'in üretebildiği her gerekçe kodunun 4 dilde etiketi var ──

test("KNOWN_REASONS'taki her kodun dört locale'de reason_<kod> etiketi var", () => {
  const codes = [
    ...cardSrc.match(/const KNOWN_REASONS = new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/"(\w+)"/g),
  ].map((m) => m[1]);
  for (const code of [
    "redirect_exists",
    "healed",
    "lock_timeout",
    "disk_write",
    "invalid_name",
    "invalid_path",
    "exception",
    "archive_missing",
    "db_restore",
    "rollback_failed",
  ]) {
    assert.ok(codes.includes(code), `KNOWN_REASONS ${code} içermeli`);
  }
  for (const [name, src] of [
    ["tr", read("src/i18n/locales/tr.js")],
    ["en", read("src/i18n/locales/en.js")],
    ["ar", read("src/i18n/locales/ar.js")],
    ["ru", read("src/i18n/locales/ru.js")],
  ]) {
    const mediaStart = src.indexOf("\n  media: {");
    const squareBlock = src.slice(mediaStart).match(/square:\s*\{[\s\S]*?\n {4}\},/)?.[0];
    for (const code of codes) {
      assert.ok(
        new RegExp(`\\breason_${code}:`).test(squareBlock),
        `${name}: reason_${code} eksik`
      );
    }
    assert.ok(/\brollbackHint:/.test(squareBlock), `${name}: rollbackHint eksik`);
  }
});
