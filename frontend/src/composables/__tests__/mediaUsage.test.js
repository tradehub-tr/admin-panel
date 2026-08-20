import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, test } from "node:test";
import { createServer } from "vite";

/**
 * Kullanım dökümü (`useMediaUsage`) — T-093.
 *
 * Bu composable silme kararını besliyor, o yüzden testlerin ağırlığı
 * "bilinmeyeni boş sayma" kuralında:
 *
 *   • cevap gelmeden `report` `null` kalır — "kullanılmıyor" DENMEZ
 *   • yetki reddi arıza sayılmaz, ayrı bayrağa düşer
 *   • arka taraf "hiçbir yerde yok" dediğinde bile ekran bunu taranan
 *     kaynaklarla sınırlı bir cevap olarak taşır (`notUsed`)
 *
 * Uç uydurulmadı: `tradehub_core.api.seller_media.get_my_usage`. Testte
 * gerçek uç çağrılmıyor, getirici enjekte ediliyor; varsayılan yola
 * düşülürse sahte modül patlıyor.
 */

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));

let server;
let useMediaUsage;
/** Vitrin kökü ortamdan geliyor (`VITE_STOREFRONT_URL`); testte sabit yazılmaz. */
let storefrontBase;
/** Getiriciye giden adresler — istek atılıp atılmadığı görülsün. */
let calls;

before(async () => {
  // `utils/storefrontUrl` modül yüklenirken `window.location.origin` okuyor
  // (ortam değişkeni yoksa). Node'da `window` yok — sahte kök konuyor ki
  // modül yüklenebilsin. Beklenen adres yine modülün kendi kökünden üretilir.
  globalThis.window = { location: { origin: "https://vitrin.test" } };

  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: {
      alias: [
        // Sıra ÖNEMLİ: tam eşleşme "@" genel kuralından önce.
        {
          find: /^@\/composables\/useSellerMedia$/,
          replacement: `${frontendRoot}/src/composables/__tests__/fixtures/sellerMediaStub.js`,
        },
        { find: "@", replacement: `${frontendRoot}/src` },
      ],
    },
    server: { middlewareMode: true },
    appType: "custom",
  });
  ({ useMediaUsage } = await server.ssrLoadModule("/src/composables/useMediaUsage.js"));
  ({ storefrontBase } = await server.ssrLoadModule("/src/utils/storefrontUrl.js"));
});

after(async () => {
  await server?.close();
  delete globalThis.window;
});

beforeEach(() => {
  calls = [];
});

/** @param {(fileUrl: string) => unknown} impl */
function fetcher(impl) {
  return async (fileUrl) => {
    calls.push(fileUrl);
    return impl(fileUrl);
  };
}

const BOS = { verdict: "unused", usages: [], orders: [], history: [], records: [] };

test("adres verilmezse hiç istek atılmaz", async () => {
  const u = useMediaUsage(fetcher(() => assert.fail("istek atılmamalıydı")));

  await u.load("");

  assert.equal(calls.length, 0);
  assert.equal(u.emptyReason.value, "noFile");
  assert.equal(u.report.value, null);
});

test("cevap gelmeden 'kullanılmıyor' denmez — report null kalır", () => {
  const u = useMediaUsage(fetcher(() => BOS));

  // Bilinçli olarak `await` YOK: istek uçarken ekranın gördüğü hâl bu.
  u.load("/files/a.webp");

  assert.equal(u.loading.value, true);
  assert.equal(u.report.value, null);
  // Boş sebep de yazılmamış olmalı; "notUsed" ancak cevap gelince konur.
  assert.equal(u.emptyReason.value, "");
});

test("taranan kaynaklarda bulunamayınca boş sebep 'notUsed' olur", async () => {
  const u = useMediaUsage(fetcher(() => BOS));

  await u.load("/files/a.webp");

  assert.deepEqual(calls, ["/files/a.webp"]);
  assert.equal(u.emptyReason.value, "notUsed");
  assert.equal(u.error.value, "");
  assert.equal(u.denied.value, false);
  // Cevap GELDİ: rapor artık var, sayılar boş.
  assert.equal(u.report.value.verdict, "unused");
  assert.deepEqual(u.report.value.groups, []);
});

test("aynı ürünün birden çok alanı TEK kayıtta gruplanır", async () => {
  const u = useMediaUsage(
    fetcher(() => ({
      verdict: "in_use",
      usages: [
        {
          kind: "listing_main",
          field: "Ana görsel",
          doctype: "Listing",
          name: "LST-1",
          label: "Vera ip",
          status: "published",
          page_path: "/urun/vera-ip",
        },
        {
          kind: "listing_gallery",
          field: "Galeri",
          doctype: "Listing",
          name: "LST-1",
          label: "Vera ip",
          position: 3,
          page_path: "/urun/vera-ip",
        },
        {
          kind: "seller_logo",
          field: "Mağaza logosu",
          doctype: "Admin Seller Profile",
          name: "MAG-1",
          page_path: "",
        },
      ],
      orders: [],
      history: [],
      records: [],
    }))
  );

  await u.load("/files/a.webp");

  // İki satır tek ürün: gruplanmasaydı satıcı üç ürün sanırdı.
  assert.equal(u.report.value.groups.length, 2);
  const [ilan, magaza] = u.report.value.groups;
  assert.equal(ilan.fields.length, 2);
  assert.equal(ilan.fields[1].position, 3);
  assert.equal(ilan.pageUrl, `${storefrontBase()}/urun/vera-ip`);
  // Yayında olmayan kayıt için uydurma adres üretilmez.
  assert.equal(magaza.pageUrl, "");
  assert.equal(u.emptyReason.value, "");
});

test("sipariş kopyaları ve geçmiş izleri canlı kullanımdan AYRI taşınır", async () => {
  const u = useMediaUsage(
    fetcher(() => ({
      verdict: "order_only",
      usages: [],
      orders: [{ kind: "cart_snapshot", field: "Sepet anlık görüntüsü", name: "CART-9" }],
      history: [{ kind: "version", label: "Değişiklik geçmişi", count: 4 }],
      records: [],
    }))
  );

  await u.load("/files/a.webp");

  // Canlı kullanım yok ama iz var: "kullanılmıyor" DEĞİL.
  assert.equal(u.emptyReason.value, "");
  assert.equal(u.report.value.verdict, "order_only");
  assert.equal(u.report.value.orders.length, 1);
  assert.equal(u.report.value.history[0].count, 4);
});

test("File kayıtlarında 'bağ yok' ile 'hedef silinmiş' karıştırılmaz", async () => {
  const u = useMediaUsage(
    fetcher(() => ({
      ...BOS,
      verdict: "history_only",
      history: [{ kind: "deleted", label: "Silinmiş kayıt", count: 1 }],
      records: [
        { name: "F-1", file_name: "a.webp", target_exists: null },
        {
          name: "F-2",
          file_name: "a.webp",
          attached_to_doctype: "Listing",
          attached_to_name: "LST-7",
          target_exists: false,
        },
      ],
      redundant_records: 1,
    }))
  );

  await u.load("/files/a.webp");

  const [bagsiz, silinmis] = u.report.value.records;
  // Üç değerli kalıyor: `null` "bağ yok", `false` "hedef gerçekten silinmiş".
  assert.equal(bagsiz.targetExists, null);
  assert.equal(bagsiz.attachedTo, "");
  assert.equal(silinmis.targetExists, false);
  assert.equal(silinmis.attachedTo, "Listing · LST-7");
  assert.equal(u.report.value.redundantRecords, 1);
});

test("yetki reddi ARIZA olarak gösterilmez, ayrı bayrağa düşer", async () => {
  const u = useMediaUsage(
    fetcher(() => {
      const e = new Error("Not permitted");
      e.status = 403;
      throw e;
    })
  );

  await u.load("/files/a.webp");

  assert.equal(u.denied.value, true);
  assert.equal(u.error.value, "");
  // En kritik satır: reddedilen istek "kullanılmıyor" diye gösterilemez.
  assert.equal(u.report.value, null);
  assert.equal(u.emptyReason.value, "");
  assert.equal(u.loading.value, false);
});

test("gerçek arıza hata metnini taşır ve ekranı çökertmez", async () => {
  const u = useMediaUsage(
    fetcher(() => {
      throw new Error("500 Internal Server Error");
    })
  );

  await assert.doesNotReject(() => u.load("/files/a.webp"));
  assert.match(u.error.value, /500/);
  assert.equal(u.denied.value, false);
  assert.equal(u.report.value, null);
  assert.equal(u.loading.value, false);
});

test("ikinci yükleme önceki durumu temizler", async () => {
  let reddet = true;
  const u = useMediaUsage(
    fetcher(() => {
      if (!reddet) return BOS;
      const e = new Error("Not permitted");
      e.code = "PermissionError";
      throw e;
    })
  );

  await u.load("/files/a.webp");
  assert.equal(u.denied.value, true);

  reddet = false;
  await u.load("/files/b.webp");

  assert.equal(u.denied.value, false);
  assert.equal(u.emptyReason.value, "notUsed");
  assert.equal(u.error.value, "");
});

test("eksik alanlar çökertmez — arka taraf hiçbir anahtar göndermese bile", async () => {
  const u = useMediaUsage(fetcher(() => ({})));

  await u.load("/files/a.webp");

  assert.equal(u.report.value.verdict, "unknown");
  assert.deepEqual(u.report.value.groups, []);
  assert.equal(u.emptyReason.value, "notUsed");
  assert.equal(u.error.value, "");
});
