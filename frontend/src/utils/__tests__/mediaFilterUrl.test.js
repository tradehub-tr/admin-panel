import assert from "node:assert/strict";
import { test } from "node:test";

import {
  decodeFilterQuery,
  decodeSorting,
  encodeFilterQuery,
  encodeSorting,
  foreignParams,
  sameQuery,
} from "../mediaFilterUrl.js";

/**
 * Filtrelerin adres çubuğu karşılığı (T-092 — "Filter state persists in URL;
 * shareable and back-button compatible").
 *
 * NE ÖLÇÜLDÜ  — kurulan süzgecin adrese eksiksiz yazıldığı, adresten aynı
 *               süzgecin geri kurulduğu (gidiş-dönüş), bozuk adresin listeyi
 *               boşaltmadığı ve iki tarafın birbirini tetiklemediği
 *               (`sameQuery` eşitliği).
 * NE ÖLÇÜLMEDİ — gerçek tarayıcıda geri/ileri tuşunun davranışı. Bunun için
 *               History API ve router gerekir; burada yalnız saf çeviri var.
 *               "Geri tuşu çalışıyor" DEMİYORUZ; "adres durumu kayıpsız
 *               taşıyor" diyoruz.
 */

/** MediaLibraryView'daki MEDIA_FIELDS'ten türeyen şemanın aynısı. */
const SCHEMA = [
  { key: "fileName", variant: "text" },
  { key: "ext", variant: "select" },
  { key: "bytes", variant: "range" },
  { key: "usageCount", variant: "range" },
  { key: "uploadedAt", variant: "date" },
  { key: "kind", variant: "select" },
  { key: "tags", variant: "select" },
  { key: "archived", variant: "select" },
];

const DEFAULTS = {
  sorting: [{ field: "uploadedAt", desc: true }],
  pageSize: 12,
  pageSizes: [12, 24, 48],
  sortableKeys: ["fileName", "ext", "bytes", "usageCount", "uploadedAt"],
};

const BOS_DURUM = {
  search: "",
  filters: {},
  sorting: DEFAULTS.sorting,
  page: 1,
  pageSize: DEFAULTS.pageSize,
};

test("filtresiz sayfa adrese HİÇBİR ŞEY yazmaz", () => {
  // Varsayılan da yazılsaydı "temiz adres" ile "filtreli adres" ayırt
  // edilemezdi ve her sayfa açılışı sorgu kuyruğuyla gelirdi.
  assert.deepEqual(encodeFilterQuery(BOS_DURUM, SCHEMA, DEFAULTS), {});
});

test("kurulan süzgecin tamamı adrese yazılır", () => {
  const q = encodeFilterQuery(
    {
      search: "vana",
      filters: {
        kind: ["video", "image"],
        ext: ["WEBP"],
        bytes: { min: 0.5, max: 5 },
        uploadedAt: { from: "2026-01-01", to: "2026-02-01" },
        tags: ["kampanya"],
        archived: ["archived"],
        fileName: "kapak",
      },
      sorting: [{ field: "bytes", desc: false }],
      page: 3,
      pageSize: 48,
    },
    SCHEMA,
    DEFAULTS
  );

  assert.deepEqual(q, {
    q: "vana",
    fileName: "kapak",
    ext: "WEBP",
    bytes: "0.5~5",
    uploadedAt: "2026-01-01~2026-02-01",
    kind: "video,image",
    tags: "kampanya",
    archived: "archived",
    sort: "bytes:asc",
    page: "3",
    size: "48",
  });
});

test("gidiş-dönüş kayıpsız: adresten kurulan durum yeniden aynı adresi verir", () => {
  const durum = {
    search: "kapak görseli",
    filters: {
      kind: ["image"],
      bytes: { min: null, max: 5 },
      uploadedAt: { from: "2026-03-01", to: null },
      tags: ["yeni", "kampanya"],
    },
    sorting: [{ field: "fileName", desc: false }],
    page: 2,
    pageSize: 24,
  };

  const adres = encodeFilterQuery(durum, SCHEMA, DEFAULTS);
  const geri = decodeFilterQuery(adres, SCHEMA, DEFAULTS);

  assert.equal(geri.search, durum.search);
  assert.deepEqual(geri.filters.kind, ["image"]);
  assert.deepEqual(geri.filters.bytes, { min: null, max: 5 });
  assert.deepEqual(geri.filters.uploadedAt, { from: "2026-03-01", to: null });
  assert.deepEqual(geri.filters.tags, ["yeni", "kampanya"]);
  assert.deepEqual(geri.sorting, [{ field: "fileName", desc: false }]);
  assert.equal(geri.page, 2);
  assert.equal(geri.pageSize, 24);

  // İkinci tur aynı adresi üretmeli — üretmezse ekran ile adres birbirini
  // sonsuza kadar tetikler.
  assert.deepEqual(encodeFilterQuery({ ...durum, ...geri }, SCHEMA, DEFAULTS), adres);
});

test("aralığın tek ucu verilebilir", () => {
  assert.deepEqual(decodeFilterQuery({ bytes: "~5" }, SCHEMA, DEFAULTS).filters.bytes, {
    min: null,
    max: 5,
  });
  assert.deepEqual(decodeFilterQuery({ bytes: "0.5~" }, SCHEMA, DEFAULTS).filters.bytes, {
    min: 0.5,
    max: null,
  });
});

test("bozuk adres filtreyi HİÇ kurmaz — liste boş görünmez", () => {
  // Elle düzenlenmiş ya da yanlış kopyalanmış bir adres yüzünden kullanıcı
  // boş kütüphane görmemeli; anlamsız değer yok sayılır.
  const g = decodeFilterQuery(
    { bytes: "abc~def", uploadedAt: "~", ext: " , ,", fileName: "   " },
    SCHEMA,
    DEFAULTS
  );
  assert.deepEqual(g.filters, {});
});

test("sıralama alanı beyaz listeden geçmek zorunda", () => {
  // Sıralama sunucuya taşındığında bu değer sorguya girer; serbest metin
  // kabul etmek bugünden kapatılıyor.
  assert.equal(decodeSorting("dropTable:desc", DEFAULTS.sortableKeys), undefined);
  assert.deepEqual(decodeSorting("bytes:asc", DEFAULTS.sortableKeys), [
    { field: "bytes", desc: false },
  ]);
  // Çoklu sıralamada yalnız tanınan alanlar kalır.
  assert.deepEqual(decodeSorting("bytes:asc,uydurma:desc", DEFAULTS.sortableKeys), [
    { field: "bytes", desc: false },
  ]);
});

test("sayfa boyutu izinli listeden seçilir", () => {
  // "size=100000" bütün kütüphaneyi tek sayfaya basardı: ızgaranın kalem
  // sayısı sınırı adres çubuğundan aşılabilir olurdu.
  assert.equal(decodeFilterQuery({ size: "100000" }, SCHEMA, DEFAULTS).pageSize, undefined);
  assert.equal(decodeFilterQuery({ size: "48" }, SCHEMA, DEFAULTS).pageSize, 48);
});

test("bozuk sayfa numarası 1'e düşer", () => {
  assert.equal(decodeFilterQuery({ page: "-4" }, SCHEMA, DEFAULTS).page, 1);
  assert.equal(decodeFilterQuery({ page: "abc" }, SCHEMA, DEFAULTS).page, 1);
  assert.equal(decodeFilterQuery({ page: "7" }, SCHEMA, DEFAULTS).page, 7);
});

test("varsayılan sıralama ve sayfa boyutu adrese yazılmaz", () => {
  const q = encodeFilterQuery({ ...BOS_DURUM, filters: { kind: ["image"] } }, SCHEMA, DEFAULTS);
  assert.deepEqual(q, { kind: "image" });
});

test("bize ait olmayan adres parametreleri korunur", () => {
  const kalan = foreignParams({ kind: "image", page: "2", ref: "eposta", utm: "x" }, SCHEMA);
  assert.deepEqual(kalan, { ref: "eposta", utm: "x" });
});

test("sameQuery yazma döngüsünü kırar", () => {
  // Router bazı parametreleri dizi veriyor ve sayı/metin ayrımı yapmıyor;
  // ikisi de AYNI adres sayılmalı, yoksa her karşılaştırma yeni bir yazma
  // tetikler.
  assert.ok(sameQuery({ page: "2", kind: "image" }, { page: 2, kind: ["image"] }));
  assert.ok(sameQuery({ kind: "image", bos: "" }, { kind: "image" }));
  assert.ok(!sameQuery({ page: "2" }, { page: "3" }));
  assert.ok(!sameQuery({ page: "2" }, { page: "2", kind: "image" }));
});

test("aynı değer iki kez yazılmışsa bir kez alınır", () => {
  assert.deepEqual(
    decodeFilterQuery({ kind: "image,image,video" }, SCHEMA, DEFAULTS).filters.kind,
    ["image", "video"]
  );
});

test("encodeSorting çoklu sıralamayı sırasıyla korur", () => {
  assert.equal(
    encodeSorting([
      { field: "ext", desc: false },
      { field: "bytes", desc: true },
    ]),
    "ext:asc,bytes:desc"
  );
});
