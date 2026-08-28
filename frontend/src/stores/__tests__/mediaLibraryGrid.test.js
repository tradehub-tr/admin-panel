import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createPinia, setActivePinia } from "pinia";

/**
 * Medya kütüphanesi ızgarası — DOM'A BASILAN KALEM SAYISI ve toplu işlem
 * dökümü (T-092, T-094).
 *
 * NE ÖLÇÜLDÜ:
 *   • API 10.000 toplam bildirse bile ızgaranın yalnız sunucudan gelen sayfayı
 *     bastığı; ikinci kez yerel slice/filter uygulanmadığı.
 *   • `MediaLibraryView` ızgarasının gerçekten `paged`'i döndüğü (kaynak
 *     metni). İki iddia ayrı ayrı doğru olup birbirine bağlanmazsa bir sonraki
 *     düzenlemede ızgara `filtered`'a çevrilir ve sınır sessizce kalkar.
 *   • Filtrelerin tarih/birim/sıralama dönüşümüyle API sözleşmesine taşındığı.
 *   • Arka tarafın kısmi sonucunun (`failed`, `skipped`) ekrana taşınabilir
 *     bir döküme çevrildiği.
 *
 * NE ÖLÇÜLMEDİ:
 *   • Gerçek tarayıcıda kaç DOM düğümü oluştuğu, kaydırma akıcılığı, süre ya
 *     da kare hızı. Burada düzen motoru yok. "Akıcı kaydırıyor" DEMİYORUZ;
 *     "ızgaranın kaynağı sayfa boyutuyla sınırlı" diyoruz.
 *   • Sanal pencereleme MATEMATİĞİ — o klasör seviyesinin işi ve kendi
 *     testlerinde (`composables/__tests__/virtualGrid.test.js`).
 *
 * HİÇBİR UÇ ÇAĞRILMAZ: kayıtlar doğrudan `store.items`'a konuyor; istek
 * parametreleri ve toplu işlem dökümü saf fonksiyonlarla sınanıyor.
 */

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));

let server;
let media;

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
  media = await server.ssrLoadModule("/src/stores/media.js");
});

after(async () => {
  await server?.close();
});

/** Ekranın beklediği kayıt şekli — `useSellerMedia.bicimle()` ile aynı alanlar. */
function kayit(i, ustune = {}) {
  const tur = i % 5 === 0 ? "video" : i % 7 === 0 ? "document" : "image";
  return {
    id: `/files/dosya-${i}.webp`,
    fileUrl: `/files/dosya-${i}.webp`,
    fileName: `dosya-${i}.webp`,
    title: `Dosya ${i}`,
    alt: i % 3 === 0 ? "" : `alt ${i}`,
    description: "",
    ext: tur === "video" ? "MP4" : tur === "document" ? "PDF" : "WEBP",
    kind: tur,
    bytes: 100_000 + i * 1000,
    uploadedAt: `2026-01-${String((i % 28) + 1).padStart(2, "0")} 10:00:00`,
    tags: i % 4 === 0 ? ["kampanya"] : [],
    favorite: i % 11 === 0,
    liveUsage: i % 3,
    owner: "self",
    archived: false,
    width: 1200,
    height: 800,
    ...ustune,
  };
}

function magazaKur(adet, uretici = kayit) {
  setActivePinia(createPinia());
  const store = media.useMediaStore();
  store.items = Array.from({ length: adet }, (_, i) => uretici(i));
  return store;
}

// ── T-092: ızgaranın kalem sayısı ────────────────────────────────────

test("10.000 toplamda ızgara yalnız API'nin döndürdüğü sayfayı basar", () => {
  const store = magazaKur(48);
  store.serverTotal = 10_000;
  store.pageSize = 48;

  assert.equal(store.filtered.length, 48);
  assert.equal(store.paged.length, 48);
  assert.equal(store.totalPages, 209);
});

test("son sayfa API'den gelen eksik kalemleri yeniden dilimlemez", () => {
  const store = magazaKur(2);
  store.serverTotal = 50;
  store.pageSize = 12;
  store.page = 5;
  assert.equal(store.paged.length, 2);
  assert.equal(store.totalPages, 5);
});

test("API boş sayfa döndürürse görünüm boş kalır, toplam korunur", () => {
  const store = magazaKur(0);
  store.serverTotal = 30;
  store.pageSize = 12;
  store.page = 99;
  assert.deepEqual(store.paged, []);
});

test("ızgara ŞABLONU gerçekten `paged` döner — sınır kaynakta da duruyor", () => {
  // Yukarıdaki sınır yalnız şablon bu listeyi döndüğü sürece geçerli.
  // `filtered` ya da `items`'a çevrilirse 10.000 kart DOM'a iner.
  //
  // T-092 (2026-08-20): ızgara artık `paged`'in PENCERELENMİŞ dilimini basıyor
  // (`useCardGridWindow` → `visibleCards`). Sınır GEVŞEMEDİ, sıkılaştı: basılan
  // küme `paged`'in bir alt kümesi. Bu yüzden iki iddia birden aranıyor —
  // pencerenin kaynağının `paged` olduğu, ve şablonun `filtered`/`items`'a
  // kaymadığı. İkincisi olmadan `visibleCards` adı tek başına bir şey garanti
  // etmezdi: pencere `filtered` üzerine kurulsaydı ad yine `visibleCards` olurdu.
  const kaynak = readFileSync(
    new URL("../../views/seller/MediaLibraryView.vue", import.meta.url),
    "utf8"
  );

  const izgara = /<ul\s+v-if="effectiveMode === 'grid'[\s\S]*?<\/ul>/.exec(kaynak);
  assert.ok(izgara, "ızgara bloğu bulunamadı — test kaynakla birlikte güncellenmeli");
  assert.match(izgara[0], /v-for="\(item, i\) in visibleCards"/);
  assert.doesNotMatch(izgara[0], /v-for="[^"]*\b(filtered|items)\b/);
  assert.match(kaynak, /items: \(\) => paged\.value/);

  const satirlar = /<ul\s+v-else-if="effectiveMode === 'rows'[\s\S]*?<\/ul>/.exec(kaynak);
  assert.ok(satirlar, "satır listesi bloğu bulunamadı");
  assert.match(satirlar[0], /v-for="\(item, i\) in paged"/);

  // Sayfa boyutu seçenekleri de sınırın parçası: liste büyürse üst sınır da
  // büyür. Adres çubuğu da yalnız bu değerleri kabul ediyor.
  assert.match(kaynak, /const PAGE_SIZES = \[12, 24, 48\];/);
});

// ── T-092: arama ve filtre ───────────────────────────────────────────

test("farklı filtreler API'ye ayrı aileler, kovalar tek OR listesi olarak gider", () => {
  const params = media.buildMediaListParams({
    page: 3,
    pageSize: 24,
    kindFilter: ["image"],
    sizeFilter: ["small", "large"],
    formatFilter: ["WEBP"],
    orientationFilter: ["landscape"],
  });

  assert.equal(params.page, 3);
  assert.equal(params.pageSize, 24);
  assert.deepEqual(params.kinds, ["image"]);
  assert.deepEqual(params.sizeBuckets, ["small", "large"]);
  assert.deepEqual(params.formats, ["WEBP"]);
  assert.deepEqual(params.orientations, ["landscape"]);
});

test("çoklu etiket süzgeci HEPSİNİN eşleşmesini ister", () => {
  const params = media.buildMediaListParams({ tagFilter: ["a", "b"] });
  assert.deepEqual(params.tags, ["a", "b"]);
});

test("çoklu kategori süzgeci sunucuya kimlik dizisi olarak gider", () => {
  const params = media.buildMediaListParams({ categoryFilter: ["cat-a", "cat-b"] });
  assert.deepEqual(params.categories, ["cat-a", "cat-b"]);
});

test("arama, sütun adı ve sıralama sunucu parametrelerine dönüşür", () => {
  const params = media.buildMediaListParams({
    search: "  kampanya ",
    nameFilter: " hero ",
    sorting: [{ field: "bytes", desc: false }],
  });
  assert.equal(params.search, "kampanya");
  assert.equal(params.nameSearch, "hero");
  assert.equal(params.sortBy, "size");
  assert.equal(params.sortDir, "asc");
});

test("arşiv görünümü ayrı backend state'i kullanır", () => {
  assert.equal(media.buildMediaListParams({ trashed: false }).state, "");
  assert.equal(media.buildMediaListParams({ trashed: true }).state, "trashed");
});

test("tarih kovası, özel aralık ve MB sınırı standart API değerine dönüşür", () => {
  const params = media.buildMediaListParams(
    {
      dateFilter: ["week", "month"],
      dateRange: { from: "2026-08-10", to: "2026-08-20" },
      sizeRange: { min: 0.5, max: 5 },
    },
    new Date(2026, 7, 24, 12, 0, 0)
  );

  // "month" OR kümenin en geniş penceresi; özel başlangıç bununla AND olur.
  assert.equal(params.dateFrom, "2026-08-10");
  assert.equal(params.dateTo, "2026-08-20");
  assert.equal(params.minBytes, 500_000);
  assert.equal(params.maxBytes, 5_000_000);
});

test("kullanılan/kullanılmayan seçimi kullanım aralığıyla kesişir", () => {
  const used = media.buildMediaListParams({
    usageFilter: ["used"],
    usageRange: { min: 0, max: 8 },
  });
  assert.equal(used.usageMin, 1);
  assert.equal(used.usageMax, 8);

  const unused = media.buildMediaListParams({ usageFilter: ["unused"] });
  assert.equal(unused.usageMax, 0);
});

test("sayaçlar filtreden ETKİLENMEZ — rozet rakamları sabit kalır", () => {
  const store = magazaKur(100);
  const once = { ...store.counts };
  store.kindFilter = ["video"];
  store.search = "dosya-9";
  assert.deepEqual({ ...store.counts }, once);
});

test("tenant kota özeti döküm, uyarı ve aylık işlem alanlarını kaybetmez", () => {
  const storage = media.normalizeQuotaSummary({
    bytes: 80,
    original_bytes: 50,
    rendition_bytes: 30,
    original_files: 4,
    renditions: 12,
    quota_bytes: 100,
    remaining_bytes: 20,
    usage_percent: 80,
    quota_mode: "limited",
    quota_state: "warning",
    warning_threshold_percent: 80,
    is_warning: true,
    processing_jobs_month: 7,
    processing_duration_ms_month: 1234,
    processing_period_start: "2026-08-01",
    scope: { public_originals: true, private_originals: false, renditions: true },
  });

  assert.equal(storage.originalBytes, 50);
  assert.equal(storage.renditionBytes, 30);
  assert.equal(storage.remainingBytes, 20);
  assert.equal(storage.quotaState, "warning");
  assert.equal(storage.processingJobsMonth, 7);
  assert.equal(storage.scope.private_originals, false);
});

test("sınırsız kotada null sayı 0'a çevrilmez", () => {
  const storage = media.normalizeQuotaSummary({
    bytes: 500,
    quota_bytes: null,
    remaining_bytes: null,
    usage_percent: null,
    quota_mode: "unlimited",
    quota_state: "unlimited",
  });

  assert.equal(storage.quotaBytes, null);
  assert.equal(storage.remainingBytes, null);
  assert.equal(storage.usagePercent, null);
  assert.equal(storage.quotaMode, "unlimited");
});

// ── T-094: toplu işlemin kısmi sonucu ────────────────────────────────

test("kısmi sonuç: kaç oldu, kaç olmadı, kaç atlandı — üçü de taşınır", () => {
  // `seller_media.py:_toplu()` yanıtının birebir şekli.
  const rapor = media.summarizeBulk(
    "archive",
    {
      archived: 48,
      failed: [
        { file_url: "/files/a.webp", error: "Dosya kullanımda" },
        { file_url: "/files/b.webp", error: "Kilitli" },
      ],
      skipped: 3,
      details: [],
    },
    "archived"
  );

  assert.equal(rapor.ok, 48);
  assert.equal(rapor.skipped, 3);
  assert.deepEqual(rapor.failed, [
    { id: "/files/a.webp", error: "Dosya kullanımda" },
    { id: "/files/b.webp", error: "Kilitli" },
  ]);
  assert.equal(rapor.partial, true, "eksik kalan varken başarı bildirimi çıkmamalı");
});

test("her şey olduysa kısmi değildir — ekran sade başarı gösterir", () => {
  const rapor = media.summarizeBulk("purge", { purged: 5, failed: [], skipped: 0 }, "purged");
  assert.equal(rapor.ok, 5);
  assert.equal(rapor.partial, false);
});

test("toplu etiket de aynı kısmi sonuç sözleşmesini kullanır", () => {
  const rapor = media.summarizeBulk(
    "tag",
    {
      tagged: 1,
      processed: 2,
      failed: [{ file_url: "/files/locked.webp", error: "Kilitli" }],
      skipped: 1,
    },
    "tagged"
  );
  assert.equal(rapor.action, "tag");
  assert.equal(rapor.ok, 1);
  assert.equal(rapor.partial, true);
  assert.deepEqual(rapor.failed, [{ id: "/files/locked.webp", error: "Kilitli" }]);
  assert.equal(rapor.skipped, 1);
});

test("yeniden işleme 48 başarılı 2 hatalı sonucu dosya gerekçeleriyle taşır", () => {
  const rapor = media.summarizeReprocess({
    status: "completed",
    total: 50,
    processed: 50,
    succeeded: 48,
    failed: 2,
    skipped: 0,
    failures: [
      { file_url: "/files/a.webp", error_code: "processing_failed", error: "İşlenemedi" },
      { file_url: "/files/b.webp", error_code: "image_asset_missing" },
    ],
  });

  assert.equal(rapor.action, "reprocess");
  assert.equal(rapor.ok, 48);
  assert.equal(rapor.partial, true);
  assert.deepEqual(rapor.failed, [
    { id: "/files/a.webp", error: "İşlenemedi" },
    { id: "/files/b.webp", error: "image_asset_missing" },
  ]);
});

test("yeniden işleme hata sayacı ayrıntı listesi boş olsa da başarı sayılmaz", () => {
  const rapor = media.summarizeReprocess({ succeeded: 0, failed: 1, failures: [] });
  assert.equal(rapor.ok, 0);
  assert.equal(rapor.partial, true);
});

test("hiçbiri olmadıysa da kısmi sayılır — 'işlem tamam' denmez", () => {
  const rapor = media.summarizeBulk(
    "archive",
    { archived: 0, failed: [{ file_url: "/files/a.webp", error: "x" }], skipped: 0 },
    "archived"
  );
  assert.equal(rapor.ok, 0);
  assert.equal(rapor.partial, true);
});

test("eksik ya da bozuk yanıtta sayı uydurulmaz", () => {
  // Ağ hatasında ya da uç şekli değiştiğinde "48 kayıt işlendi" demek en kötü
  // sonuç: kullanıcı olmayan bir işlemi olmuş sayar.
  for (const yanit of [null, undefined, {}, { archived: "abc", failed: "x", skipped: null }]) {
    const rapor = media.summarizeBulk("archive", yanit, "archived");
    assert.equal(rapor.ok, 0);
    assert.deepEqual(rapor.failed, []);
    assert.equal(rapor.skipped, 0);
  }
});

test("boş seçimde toplu işlem uca GİTMEZ", async () => {
  // Uç çağrılsaydı test gerçekten veri silmeye çalışırdı; boş listede hiçbir
  // ağ isteği olmadığı buradan doğrulanıyor (çağrı olsa `fetch` patlardı).
  const store = magazaKur(10);
  for (const rapor of [
    await store.archiveMany([]),
    await store.removeMany([]),
    await store.purgeMany([]),
  ]) {
    assert.equal(rapor.ok, 0);
    assert.equal(rapor.partial, false);
  }
  assert.equal(await store.previewRelease([]), null);
  assert.equal(store.bulkBusy, false);
});

test("döküm elle kapatılabilir", () => {
  const store = magazaKur(1);
  store.bulkReport = media.summarizeBulk("archive", { archived: 1, skipped: 1 }, "archived");
  assert.ok(store.bulkReport.partial);
  store.clearBulkReport();
  assert.equal(store.bulkReport, null);
});
