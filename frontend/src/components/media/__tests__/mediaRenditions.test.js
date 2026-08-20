import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { after, before, beforeEach, test } from "node:test";
import { createServer } from "vite";

/**
 * Türev (rendition) listesi.
 *
 * `Media Rendition` DocType'ı KURULU ama tablo BOŞ: boru hattı bayrakları
 * kapalı, hiçbir türev üretilmedi. Bu yüzden testlerin ağırlığı boş durumda —
 * ekranın beklenen hâli "veri yok", "hata" değil.
 *
 * Veri artık ÖZEL uçtan geliyor: `media_manifest.manifest_batch` (T-083).
 * Eski 2 adımlı genel REST zinciri (File.name → Media Asset → Media
 * Rendition) sunucuya taşındı; dosya başına 2 istek yerine 1 istek atılır.
 * Bu dosyanın taşıma-katmanı iddiaları o güne aitti ve toplu uca
 * güncellendi; istek SAYISI ve toplu çağrının şekli asıl olarak
 * `src/composables/__tests__/mediaRenditions.test.js`te ölçülür — buradaki
 * testler ekran davranışını (boş durumlar, eşleme, yetki/arıza ayrımı) tutar.
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));

let server;
let useMediaRenditions;
/** Uca giden çağrılar — hangi uç, hangi argümanla. */
let calls;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: {
      alias: [
        // Gerçek `api.js` yerine sahte — sıra ÖNEMLİ, tam eşleşme önce.
        {
          find: /^@\/utils\/api$/,
          replacement: `${frontendRoot}/src/components/media/__tests__/fixtures/apiMock.js`,
        },
        { find: "@", replacement: `${frontendRoot}/src` },
      ],
    },
    server: { middlewareMode: true },
    appType: "custom",
  });
  ({ useMediaRenditions } = await server.ssrLoadModule("/src/composables/useMediaRenditions.js"));
});

after(async () => {
  await server?.close();
  delete globalThis.__mediaApiCallMock;
});

beforeEach(() => {
  calls = [];
});

const BATCH_METHOD = "tradehub_core.api.media_manifest.manifest_batch";

/** @param {(method: string, args: object) => unknown} impl */
function mockApi(impl) {
  globalThis.__mediaApiCallMock = async (method, args) => {
    calls.push({ method, args });
    return impl(method, args);
  };
}

/** Toplu ucun zarfı: `{message: {manifests: {adres: manifest|null}}}`. */
function batchYaniti(docname, manifest) {
  return { message: { manifests: { [docname]: manifest }, requested: 1, returned: 1 } };
}

test("dosya adı verilmezse hiç istek atılmaz", async () => {
  mockApi(() => assert.fail("istek atılmamalıydı"));
  const r = useMediaRenditions();

  await r.load("");

  assert.equal(calls.length, 0);
  assert.equal(r.emptyReason.value, "noAsset");
  assert.deepEqual(r.rows.value, []);
});

test("dosya boru hattından geçmemişse boş durum 'noAsset' olur", async () => {
  // Bugünün gerçeği: bayraklar kapalı, hiçbir dosyanın Media Asset kaydı yok.
  mockApi(() => batchYaniti("abc123", { file: "abc123", assets: [], renditions: [] }));
  const r = useMediaRenditions();

  await r.load("abc123");

  // TEK istek: varlık + türev okuması sunucuda; ikinci gidiş dönüş yok.
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, BATCH_METHOD);
  // Bağ docname üzerinden: `Media Asset.source_file` bir Link, dosya ADRESİ
  // değil (uç adresi de çözer ama panel docname yollar).
  assert.deepEqual(calls[0].args, { file_urls: ["abc123"] });
  assert.equal(r.emptyReason.value, "noAsset");
  assert.equal(r.error.value, "");
  assert.equal(r.denied.value, false);
});

test("varlık var ama türev üretilmemişse boş durum 'noRenditions' olur", async () => {
  mockApi(() => batchYaniti("abc123", { file: "abc123", assets: ["AST-1"], renditions: [] }));
  const r = useMediaRenditions();

  await r.load("abc123");

  assert.equal(calls.length, 1);
  assert.equal(r.emptyReason.value, "noRenditions");
  // Boş liste HATA DEĞİL: bayrak açılınca dolacak.
  assert.equal(r.error.value, "");
});

test("türevler ekranın beklediği şekle çevrilir", async () => {
  mockApi(() =>
    batchYaniti("abc123", {
      file: "abc123",
      assets: ["AST-1"],
      // Uç genişliğe göre ARTAN sıralı gönderir (srcset okuma sırası) —
      // sıralama artık sunucunun sözleşmesi, istemci yeniden sıralamaz.
      renditions: [
        {
          name: "RND-1",
          // Politika profil adı (`w384`), Media Profile docname'i DEĞİL.
          profile: "w384",
          width: 384,
          height: 216,
          format: "webp",
          file_url: "/files/x__w384.webp",
          bytes: 24576,
          ssim: 0.987,
          generation: "eager",
        },
        {
          name: "RND-2",
          profile: "w96",
          width: 96,
          height: 54,
          format: "avif",
          file_url: "/files/x__w96.avif",
          bytes: 2048,
          ssim: 0,
        },
      ],
    })
  );
  const r = useMediaRenditions();

  await r.load("abc123");

  assert.equal(r.rows.value.length, 2);
  assert.deepEqual(r.rows.value[0], {
    id: "RND-1",
    profile: "w384",
    width: 384,
    height: 216,
    format: "WEBP",
    fileUrl: "/files/x__w384.webp",
    bytes: 24576,
    ssim: 0.987,
    generation: "eager",
  });
  // Ölçülmemiş SSIM 0 kalır; ekran onu "—" diye gösterir, "0,000" diye değil.
  assert.equal(r.rows.value[1].ssim, 0);
  assert.equal(r.rows.value[1].generation, "");
  assert.equal(r.emptyReason.value, "");
});

test("yetki reddi ARIZA olarak gösterilmez, ayrı bayrağa düşer", async () => {
  mockApi(() => {
    const e = new Error("Not permitted");
    e.status = 403;
    throw e;
  });
  const r = useMediaRenditions();

  await r.load("abc123");

  assert.equal(r.denied.value, true);
  assert.equal(r.error.value, "");
  assert.deepEqual(r.rows.value, []);
  assert.equal(r.loading.value, false);
});

test("gerçek arıza hata metnini taşır ve ekranı çökertmez", async () => {
  mockApi(() => {
    throw new Error("500 Internal Server Error");
  });
  const r = useMediaRenditions();

  await assert.doesNotReject(() => r.load("abc123"));
  assert.match(r.error.value, /500/);
  assert.equal(r.denied.value, false);
  assert.equal(r.loading.value, false);
});

test("ikinci yükleme önceki durumu temizler", async () => {
  mockApi(() => {
    const e = new Error("Not permitted");
    e.status = 403;
    throw e;
  });
  const r = useMediaRenditions();
  await r.load("abc123");
  assert.equal(r.denied.value, true);

  mockApi((method, args) => batchYaniti(args.file_urls[0], { assets: [], renditions: [] }));
  await r.load("def456");

  assert.equal(r.denied.value, false);
  assert.equal(r.emptyReason.value, "noAsset");
});

test("türev listesi satıcı detay panelinde ve yönetici gezgininde duruyor", () => {
  const read = (p) => readFileSync(new URL(p, `file://${frontendRoot}/`), "utf8");

  const panel = read("src/components/media/MediaDetailPanel.vue");
  assert.match(panel, /<MediaRenditionList :file-name="item\.docName \|\| ''" \/>/);

  // Satıcı satırındaki `docName` File docname'i taşır; olmadan zincir kurulamaz.
  const seller = read("src/composables/useSellerMedia.js");
  assert.match(seller, /docName: row\.name \|\| "",/);

  const explorer = read("src/views/system/MediaExplorerView.vue");
  assert.match(explorer, /<MediaRenditionList :file-name="item\.name" \/>/);
});
