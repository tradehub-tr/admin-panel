import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { createServer } from "vite";

/**
 * Öksüz dosya raporu (`useMediaOrphans`) — T-043'ün ikinci yarısı.
 *
 * `useMediaUsage` ile aynı sözleşme test edilir, çünkü ikisi de silmeye
 * giden bir kararı besliyor ve orada en pahalı hata bilinmeyeni boş saymak:
 *
 *   • cevap gelmeden `total` `null` kalır — ekran "öksüz yok" DİYEMEZ
 *   • hata `total`'i 0 yapmaz — arıza "temiz kütüphane" gibi görünmez
 *   • yetki reddi arıza değil, ayrı bayrak
 *   • arka tarafın tarama sınırı beyanı (`scan`) olduğu gibi taşınır —
 *     ekran notu ona bakar, composable yorum katmaz
 *
 * Uç uydurulmadı: `tradehub_core.api.seller_media.list_orphans`. Testte
 * gerçek uç çağrılmıyor, getirici enjekte ediliyor.
 */

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));

let server;
let useMediaOrphans;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: { alias: [{ find: "@", replacement: `${frontendRoot}/src` }] },
    server: { middlewareMode: true },
    appType: "custom",
  });
  ({ useMediaOrphans } = await server.ssrLoadModule("/src/composables/useMediaOrphans.js"));
});

after(async () => {
  await server?.close();
});

/** Arka tarafın döndürdüğü biçimde bir satır. */
function satir(i) {
  return {
    file_url: `/files/oksuz-${i}.jpg`,
    file_name: `oksuz-${i}.jpg`,
    file_size: 1000 + i,
    uploaded_at: "2026-06-01 10:00:00",
    last_checked: "2026-08-20 12:00:00",
  };
}

/** Sayfalı sahte uç: `rows`'u start/page_length'e göre dilimler. */
function sahteUc(rows, calls) {
  return async (params) => {
    calls.push({ ...params });
    return {
      items: rows.slice(params.start, params.start + params.page_length),
      total: rows.length,
      start: params.start,
      page_length: params.page_length,
      days_unused: params.days_unused,
      scanned_at: "2026-08-20 12:00:00",
      scan: { live_fields: 17, order_fields: 5, history_scanned: false, failed_sources: [] },
    };
  };
}

test("cevap gelmeden total null — 'öksüz yok' denemez", async () => {
  const calls = [];
  const o = useMediaOrphans(sahteUc([satir(1)], calls));
  assert.equal(o.total.value, null);
  assert.equal(o.isEmpty.value, false, "cevapsızken boş sayıldı — yanlış iddia");
  assert.equal(calls.length, 0, "kurulum anında istek atıldı");
});

test("yükleme: satırlar eşlenir, total ve scan taşınır, parametreler doğru", async () => {
  const calls = [];
  const o = useMediaOrphans(sahteUc([satir(1), satir(2)], calls), { pageLength: 10 });
  await o.load();

  assert.deepEqual(calls, [{ days_unused: 30, start: 0, page_length: 10 }]);
  assert.equal(o.total.value, 2);
  assert.equal(o.items.value.length, 2);
  assert.deepEqual(o.items.value[0], {
    fileUrl: "/files/oksuz-1.jpg",
    fileName: "oksuz-1.jpg",
    bytes: 1001,
    uploadedAt: "2026-06-01 10:00:00",
    lastChecked: "2026-08-20 12:00:00",
  });
  // Tarama sınırı beyanı yorum katılmadan taşınır — ekran notu buna bakıyor.
  assert.equal(o.scan.value.history_scanned, false);
  assert.deepEqual(o.scan.value.failed_sources, []);
});

test("boş sonuç dürüst: total 0 bir CEVAPTIR, isEmpty ancak o zaman true", async () => {
  const o = useMediaOrphans(sahteUc([], []));
  await o.load();
  assert.equal(o.total.value, 0);
  assert.equal(o.isEmpty.value, true);
  assert.equal(o.hasMore.value, false);
});

test("yetki reddi arıza değil: denied bayrağı, error boş, total null kalır", async () => {
  const o = useMediaOrphans(async () => {
    const e = new Error("yasak");
    e.status = 403;
    throw e;
  });
  await o.load();
  assert.equal(o.denied.value, true);
  assert.equal(o.error.value, "");
  assert.equal(o.total.value, null, "ret '0 öksüz' olarak okundu");
  assert.equal(o.isEmpty.value, false);
});

test("arıza: error dolar, total null kalır — hata temiz kütüphane gibi görünmez", async () => {
  const o = useMediaOrphans(async () => {
    throw new Error("patladı");
  });
  await o.load();
  assert.equal(o.error.value, "patladı");
  assert.equal(o.denied.value, false);
  assert.equal(o.total.value, null);
});

test("sayfalama: loadMore ekler, tükendiğinde istek ATMAZ", async () => {
  const calls = [];
  const rows = [satir(1), satir(2), satir(3)];
  const o = useMediaOrphans(sahteUc(rows, calls), { pageLength: 2 });

  await o.load();
  assert.equal(o.items.value.length, 2);
  assert.equal(o.hasMore.value, true);

  await o.loadMore();
  assert.equal(o.items.value.length, 3);
  assert.equal(o.hasMore.value, false);
  assert.deepEqual(
    o.items.value.map((r) => r.fileUrl),
    ["/files/oksuz-1.jpg", "/files/oksuz-2.jpg", "/files/oksuz-3.jpg"],
    "sayfalar üst üste bindi ya da satır düştü"
  );

  const onceki = calls.length;
  await o.loadMore(); // tükendi — sessiz no-op olmalı
  assert.equal(calls.length, onceki, "tükenmiş listede gereksiz istek atıldı");
});

test("gün eşiği değişince liste baştan ve yeni eşikle sorulur", async () => {
  const calls = [];
  const o = useMediaOrphans(sahteUc([satir(1), satir(2), satir(3)], calls), { pageLength: 2 });
  await o.load();
  await o.loadMore();
  assert.equal(o.items.value.length, 3);

  await o.load(90);
  assert.equal(o.daysUnused.value, 90);
  assert.equal(calls.at(-1).days_unused, 90);
  assert.equal(calls.at(-1).start, 0, "eşik değişimi sayfayı sıfırlamadı");
  assert.equal(o.items.value.length, 2, "eski sayfalar yeni eşiğin listesine karıştı");
});
