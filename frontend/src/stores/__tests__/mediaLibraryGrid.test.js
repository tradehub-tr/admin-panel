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
 *   • Süzgeçten 10.000 kayıt geçse bile ızgaranın kaynağı olan `paged`
 *     listesinin sayfa boyutunu AŞMADIĞI — yani şablonun basacağı kart
 *     sayısının üst sınırı.
 *   • `MediaLibraryView` ızgarasının gerçekten `paged`'i döndüğü (kaynak
 *     metni). İki iddia ayrı ayrı doğru olup birbirine bağlanmazsa bir sonraki
 *     düzenlemede ızgara `filtered`'a çevrilir ve sınır sessizce kalkar.
 *   • Filtrelerin kesişim (AND) / kova (OR) davranışı.
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
 * HİÇBİR UÇ ÇAĞRILMAZ: kayıtlar doğrudan `store.items`'a konuyor, toplu işlem
 * dökümü saf `summarizeBulk` ile sınanıyor. Testin veri silme yolu yok.
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

test("10.000 kayıtta bile ızgaranın kaynağı sayfa boyutunu aşmaz", () => {
  const store = magazaKur(10_000);

  assert.equal(store.filtered.length, 10_000, "süzgeçten hepsi geçmeli");

  // Ekranda seçilebilen üç sayfa boyutu (PAGE_SIZES = [12, 24, 48]).
  for (const boyut of [12, 24, 48]) {
    store.pageSize = boyut;
    store.page = 1;
    assert.equal(store.paged.length, boyut, `${boyut} kayıtlık sayfa aşıldı`);
  }

  // En büyük sayfada bile toplamın binde beşinden azı basılıyor.
  store.pageSize = 48;
  assert.ok(store.paged.length / store.filtered.length < 0.005);
});

test("son sayfa taşmaz — eksik kalan kadar kalem basılır", () => {
  const store = magazaKur(50);
  store.pageSize = 12;
  store.page = 5; // 48–50 arası: 2 kayıt
  assert.equal(store.paged.length, 2);
  assert.equal(store.totalPages, 5);
});

test("var olmayan sayfa boş basar, çökmez", () => {
  const store = magazaKur(30);
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

test("farklı filtreler kesişir (AND), kovalar birleşir (OR)", () => {
  const store = magazaKur(300);

  store.kindFilter = ["image"];
  store.sizeFilter = ["small", "medium"];
  assert.ok(store.filtered.every((m) => m.kind === "image"));
  assert.ok(store.filtered.every((m) => m.bytes < 5_000_000));

  // Kesişim daralmalı: aynı süzgece format eklenince sonuç büyüyemez.
  const oncesi = store.filtered.length;
  store.formatFilter = ["WEBP"];
  assert.ok(store.filtered.length <= oncesi);
});

test("çoklu etiket süzgeci HEPSİNİN eşleşmesini ister", () => {
  const store = magazaKur(6, (i) =>
    kayit(i, { tags: i === 0 ? ["a", "b"] : i === 1 ? ["a"] : [] })
  );
  store.tagFilter = ["a", "b"];
  assert.deepEqual(
    store.filtered.map((m) => m.id),
    ["/files/dosya-0.webp"]
  );
});

test("arama süzgeçle birlikte çalışır ve sayfayı aşmaz", () => {
  const store = magazaKur(500);
  store.search = "dosya-1";
  store.pageSize = 12;
  assert.ok(store.filtered.length > 12, "eşleşme sayfadan fazla olmalı");
  assert.equal(store.paged.length, 12);
  assert.ok(store.filtered.every((m) => m.fileName.includes("dosya-1")));
});

test("arşiv süzgeci iki listeyi birbirine karıştırmaz", () => {
  const store = magazaKur(20, (i) => kayit(i, { archived: i < 5 }));
  assert.equal(store.filtered.length, 15);
  store.showArchived = true;
  assert.equal(store.filtered.length, 5);
});

test("sayaçlar filtreden ETKİLENMEZ — rozet rakamları sabit kalır", () => {
  const store = magazaKur(100);
  const once = { ...store.counts };
  store.kindFilter = ["video"];
  store.search = "dosya-9";
  assert.deepEqual({ ...store.counts }, once);
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
