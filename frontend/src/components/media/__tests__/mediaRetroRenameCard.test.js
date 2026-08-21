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
 * `MediaRetroRenameCard` (Task 9, MOGEM-582) — operatör kartı: bekleyen
 * sayaç → önizle → onay → ilerleme → geri al.
 *
 *   ÖLÇÜLDÜ (SSR render, `useMediaRetroRename` gerçek composable'ı
 *   `fixtures/mediaRetroRenameStub.js` ile değiştirilerek) — üç durum:
 *     1. bekleyen sayaç (Önizle butonu + hint) / tümü tamam (allDone)
 *     2. çalışan iş (ilerleme çubuğu, sayaçlar, atlama nedeni rozetleri, Durdur)
 *     3. biten iş + geri alınabilir liste (yönlendirme tarihi, Kapat, Geri al)
 *   ÖLÇÜLMEDİ (kaynak metin üzerinden doğrulandı) — "önizleme açık" durumu:
 *   `previewOpen` kartın kendi local `ref`'i, tıklamayla açılıyor; SSR tek
 *   geçişte tıklama simüle edilemiyor (bu kısıt `mediaDetailDrawer.test.js`'de
 *   de var — aynı netlikle burada da not ediliyor). O yüzden "Önizle" →
 *   `loadPlan()` çağrısı, `planLoading` göstergesi ve plan istatistiklerinin
 *   şablonda bağlı olduğu kaynak metinden doğrulanıyor.
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const read = (p) => readFileSync(new URL(p, `file://${frontendRoot}/`), "utf8");
const cardSrc = read("src/components/media/MediaRetroRenameCard.vue");

let server;
let makeState;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    plugins: [vue()],
    resolve: {
      alias: [
        // Gerçek composable'ı sahteyle değiştir — polling/API yok, tek
        // amaç render'ın durağan durumları doğru bölümlere basması.
        {
          find: /^@\/composables\/useMediaRetroRename$/,
          replacement: `${frontendRoot}/src/components/media/__tests__/fixtures/mediaRetroRenameStub.js`,
        },
        { find: "@", replacement: `${frontendRoot}/src` },
      ],
    },
    server: { middlewareMode: true },
    appType: "custom",
  });
  ({ makeState } = await server.ssrLoadModule(
    "/src/components/media/__tests__/fixtures/mediaRetroRenameStub.js"
  ));
});

after(async () => {
  await server?.close();
});

async function renderCard(state) {
  globalThis.__mediaRetroRenameState = makeState(state);
  const { default: MediaRetroRenameCard } = await server.ssrLoadModule(
    "/src/components/media/MediaRetroRenameCard.vue"
  );
  const app = createSSRApp({ render: () => h(MediaRetroRenameCard) });
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

// ── 1. Bekleyen sayaç / tümü tamam ──

test("bekleyen dosya varken sayaç mesajı + Önizle butonu basılır", async () => {
  const html = await renderCard({ pendingCount: 3 });
  assert.match(html, /3 dosya hâlâ tahmin edilebilir/);
  assert.match(html, />Önizle</);
  assert.doesNotMatch(html, /Tüm dosyalar yeni adlandırma standardında/);
});

test("bekleyen dosya yokken (0) allDone mesajı basılır, Önizle yok", async () => {
  const html = await renderCard({ pendingCount: 0 });
  assert.match(html, /Tüm dosyalar yeni adlandırma standardında/);
  assert.doesNotMatch(html, />Önizle</);
});

// ── 2. Çalışan iş ──

test("iş çalışırken ilerleme çubuğu, sayaçlar, atlama rozetleri ve Durdur basılır", async () => {
  const html = await renderCard({
    pendingCount: 40,
    running: true,
    job: {
      key: "J1",
      mode: "rename",
      state: "running",
      dry_run: false,
      total: 40,
      processed: 10,
      renamed: 8,
      skipped: 2,
      errors: 0,
      skip_reasons: { disk_missing: 2 },
      expires_at: null,
      message: "",
    },
  });
  assert.match(html, /Çalışıyor/);
  assert.match(html, /10 \/ 40/);
  assert.match(html, /width:\s*25%/); // 10/40 = %25
  assert.match(html, /Diskte yok/); // skip.disk_missing rozeti
  assert.match(html, />Durdur</);
  // Terminal olmadığı için kapatma düğmesi basılmamalı.
  assert.doesNotMatch(html, /mrr__close/);
});

// ── 3. Biten iş + geri alınabilir liste ──

test("iş bitince yönlendirme tarihi + kapat basılır; geçmişte iş varsa geri al listesi görünür", async () => {
  const html = await renderCard({
    pendingCount: 0,
    running: false,
    job: {
      key: "J1",
      mode: "rename",
      state: "completed",
      dry_run: false,
      total: 40,
      processed: 40,
      renamed: 38,
      skipped: 2,
      errors: 0,
      skip_reasons: {},
      expires_at: "2026-11-19 00:00:00",
      message: "",
    },
    history: [{ job_key: "J1", count: 38, expires_at: "2026-11-19 00:00:00" }],
  });
  assert.match(html, /Tamamlandı/);
  assert.match(html, /Yönlendirme .* tarihine kadar/);
  assert.match(html, /mrr__close/); // terminal → kapat düğmesi basılı
  assert.match(html, />Geri al</); // history + !running → canRollback listesi
  assert.match(html, /38/); // rollback satırındaki dosya sayısı
});

// ── 4. Önizleme açık (kaynak metin — SSR tıklama simüle edemiyor) ──

test("Önizle tıklanınca loadPlan() çağrılır; planLoading göstergesi doğru i18n anahtarını kullanır", () => {
  assert.match(cardSrc, /function openPreview\(\)\s*{\s*previewOpen\.value = true;\s*r\.loadPlan\(\);/);
  assert.match(cardSrc, /r\.planLoading\.value/);
  assert.match(cardSrc, /t\(["']mediaRetroRename\.planLoading["']\)/);
});

test("önizleme paneli plan istatistiklerini ve dry-run onayını bağlar", () => {
  assert.match(cardSrc, /r\.plan\.value\.renamable/);
  assert.match(cardSrc, /r\.plan\.value\.orphans/);
  assert.match(cardSrc, /r\.plan\.value\.disk_missing/);
  assert.match(cardSrc, /r\.plan\.value\.collisions/);
  assert.match(cardSrc, /r\.plan\.value\.refs_readonly/);
  assert.match(cardSrc, /v-model="dryRun"/);
  assert.match(cardSrc, /askStart/);
});

// ── mount + rol kapısı ──

test("mount onMounted'ta loadPlan() DEĞİL loadCount()+loadHistory() çağırır (Controller notes)", () => {
  const setupBlock = cardSrc.slice(0, cardSrc.indexOf("</script>"));
  const onMountedBlock = setupBlock.match(/onMounted\(\(\) => \{[\s\S]*?\}\);/)?.[0] || "";
  assert.match(onMountedBlock, /r\.loadCount\(\)/);
  assert.match(onMountedBlock, /r\.loadHistory\(\)/);
  assert.doesNotMatch(onMountedBlock, /r\.loadPlan\(\)/);
});

test("MediaOptimizeView kartı YALNIZ System Manager rolüne açık (auth.isAdmin yetmez)", () => {
  // `auth.isAdmin` `user.is_admin` bayrağına bakıyor; kart geri alınamaz toplu
  // dosya taşıması başlattığı için backend `_guard_destructive` ile aynı rol
  // listesine indirildi.
  const view = read("src/views/system/MediaOptimizeView.vue");
  assert.match(
    view,
    /<MediaRetroRenameCard v-if="auth\.userRoles\?\.includes\('System Manager'\)" \/>/
  );
  assert.doesNotMatch(view, /<MediaRetroRenameCard v-if="auth\.isAdmin"/);
  assert.match(view, /useAuthStore/);
});

// `retro_rename.py`'nin `_bump_reason`'a yazdığı gerekçelerin TAMAMI. Kart
// `t("mediaRetroRename.skip." + reason)` ile basıyor; eksik anahtar ekranda
// ham anahtar adı (`mediaRetroRename.skip.disk_move`) gösteriyordu.
const SKIP_REASONS = [
  "disk_missing",
  "collision",
  "quarantined",
  "not_legacy",
  "dedup_leftover",
  "exception",
  "disk_read",
  "disk_move",
  "disk_revert_failed",
];

test("tr ve en locale'lerinde mediaRetroRename.* anahtarları var (9 atlama gerekçesi dahil)", () => {
  for (const [name, src] of [
    ["tr", read("src/i18n/locales/tr.js")],
    ["en", read("src/i18n/locales/en.js")],
  ]) {
    assert.match(src, /mediaRetroRename:\s*\{/, `${name}: mediaRetroRename kökü yok`);
    assert.match(src, /planLoading:/, `${name}: planLoading anahtarı yok`);
    assert.match(src, /rollbackConfirm:/, `${name}: rollbackConfirm anahtarı yok`);
    assert.match(src, /onlyDiskMissing:/, `${name}: onlyDiskMissing anahtarı yok`);
    assert.match(src, /refsUpdated:/, `${name}: refsUpdated anahtarı yok`);
    assert.match(src, /refsSkipped:/, `${name}: refsSkipped anahtarı yok`);

    const skipBlock = src.slice(src.indexOf("mediaRetroRename:")).match(/skip:\s*\{[\s\S]*?\}/)?.[0];
    assert.ok(skipBlock, `${name}: mediaRetroRename.skip bloğu yok`);
    for (const reason of SKIP_REASONS) {
      assert.ok(
        new RegExp(`\\b${reason}:`).test(skipBlock),
        `${name}: mediaRetroRename.skip.${reason} eksik`
      );
    }
  }
});

// ── 5. Referans sayaçları + diskte-yok ayrımı ──

test("sonuç bloğunda güncellenen/atlanan referans sayısı basılır", async () => {
  const html = await renderCard({
    pendingCount: 0,
    running: false,
    job: {
      key: "J1",
      mode: "rename",
      state: "completed",
      dry_run: false,
      total: 2,
      processed: 2,
      renamed: 2,
      skipped: 0,
      errors: 0,
      refs_updated: 12,
      refs_skipped: 3,
      skip_reasons: {},
      expires_at: null,
      message: "",
    },
  });
  assert.match(html, /Referans güncellendi/);
  assert.match(html, /12/);
  assert.match(html, /atlandı/);
  assert.match(html, /3/);
});

test("yalnız diskte-olmayan kayıt kaldıysa: taşınamaz mesajı, Önizle YOK, allDone YOK", async () => {
  const html = await renderCard({ pendingCount: 4, renamableCount: 0, diskMissingCount: 4 });
  assert.match(html, /4 kayıt diskte olmayan dosyaya işaret ediyor/);
  assert.doesNotMatch(html, />Önizle</);
  assert.doesNotMatch(html, /Tüm dosyalar yeni adlandırma standardında/);
});

test("taşınabilir kayıt varsa diskte-yok kırılımına rağmen Önizle basılır", async () => {
  const html = await renderCard({ pendingCount: 5, renamableCount: 2, diskMissingCount: 3 });
  assert.match(html, />Önizle</);
  assert.doesNotMatch(html, /kayıt diskte olmayan dosyaya işaret ediyor/);
});
