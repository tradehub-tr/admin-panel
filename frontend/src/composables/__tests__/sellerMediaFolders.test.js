import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, test } from "node:test";
import { createServer } from "vite";

/**
 * Gerçek klasörler (T-094) — `useSellerMedia`'nın klasör katmanı.
 *
 * Uçlar uydurulmadı: `tradehub_core.api.seller_media.list_folders`,
 * `create_folder`, `rename_folder`, `delete_folder`, `move_media`,
 * `list_folder_media`. Testler üç şeyi sabitler:
 *
 *   1. Her fonksiyon DOĞRU uca, DOĞRU parametre adlarıyla gider — parametre
 *      adı backend imzasının parçası, sessizce değişirse istek 400 değil
 *      "eksik parametre = varsayılan" olur ve yanlış iş yapar.
 *   2. Hiçbir klasör çağrısı `store` parametresi TAŞIMAZ. İzolasyon mağazanın
 *      oturumdan çözülmesine dayanıyor; istemciden mağaza gönderen bir çağrı
 *      o dayanağı deler (dosyanın başındaki sözleşme).
 *   3. Frappe'nin `message` sarmalı açılır ve klasör dosya listesi kütüphane
 *      satırı biçimine (`bicimle`) çevrilir — ekran iki kaynağı tek şablonla
 *      çizebilsin.
 */

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));
const YOL = "tradehub_core.api.seller_media";

let server;
let useSellerMedia;
let apiStub;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: {
      alias: [
        // Sıra ÖNEMLİ: tam eşleşmeler "@" genel kuralından önce.
        {
          find: /^@\/utils\/api$/,
          replacement: `${frontendRoot}/src/composables/__tests__/fixtures/sellerMediaApiStub.js`,
        },
        {
          find: /^@\/lib\/media\/compress\.js$/,
          replacement: `${frontendRoot}/src/composables/__tests__/fixtures/sellerMediaPipelineStub.js`,
        },
        {
          find: /^@\/utils\/uploadPolicy$/,
          replacement: `${frontendRoot}/src/composables/__tests__/fixtures/sellerMediaPipelineStub.js`,
        },
        { find: "@", replacement: `${frontendRoot}/src` },
      ],
    },
    server: { middlewareMode: true },
    appType: "custom",
  });
  ({ useSellerMedia } = await server.ssrLoadModule("/src/composables/useSellerMedia.js"));
  apiStub = await server.ssrLoadModule("/src/composables/__tests__/fixtures/sellerMediaApiStub.js");
});

after(async () => {
  await server?.close();
});

beforeEach(() => {
  apiStub.resetApiStub();
});

function sonCagri() {
  return apiStub.calls[apiStub.calls.length - 1];
}

test("listFolders doğru uca GET atar ve message sarmalını açar", async () => {
  apiStub.resetApiStub({
    list_folders: {
      message: {
        folders: [{ name: "F1", folder_name: "Kampanya", parent_folder: "", file_count: 3 }],
        max_depth: 5,
      },
    },
  });
  const m = useSellerMedia();
  const res = await m.listFolders();

  const cagri = sonCagri();
  assert.equal(cagri.http, "GET");
  assert.equal(cagri.method, `${YOL}.list_folders`);
  assert.equal(res.max_depth, 5);
  assert.equal(res.folders[0].folder_name, "Kampanya");
});

test("createFolder ad ve ebeveyni backend'in beklediği adlarla gönderir", async () => {
  apiStub.resetApiStub({ create_folder: { message: { name: "F2" } } });
  const m = useSellerMedia();
  await m.createFolder("Yeni Sezon", "F1");

  const cagri = sonCagri();
  assert.equal(cagri.http, "POST");
  assert.equal(cagri.method, `${YOL}.create_folder`);
  assert.deepEqual(cagri.params, { folder_name: "Yeni Sezon", parent_folder: "F1" });
});

test("createFolder ebeveyn verilmezse köke açar (boş dize, undefined değil)", async () => {
  apiStub.resetApiStub({ create_folder: { message: { name: "F3" } } });
  const m = useSellerMedia();
  await m.createFolder("Kök Klasör");
  assert.deepEqual(sonCagri().params, { folder_name: "Kök Klasör", parent_folder: "" });
});

test("renameFolder ve deleteFolder klasörü kimliğiyle hedefler", async () => {
  apiStub.resetApiStub({
    rename_folder: { message: { name: "F1", folder_name: "Arşiv" } },
    delete_folder: { message: { deleted: "F1" } },
  });
  const m = useSellerMedia();

  await m.renameFolder("F1", "Arşiv");
  assert.equal(sonCagri().method, `${YOL}.rename_folder`);
  assert.deepEqual(sonCagri().params, { folder: "F1", new_name: "Arşiv" });

  await m.deleteFolder("F1");
  assert.equal(sonCagri().method, `${YOL}.delete_folder`);
  assert.deepEqual(sonCagri().params, { folder: "F1" });
});

test("moveToFolder adres listesini ve hedefi gönderir; hedefsiz çağrı köke taşır", async () => {
  apiStub.resetApiStub({ move_media: { message: { moved: 2, failed: [], skipped: 0 } } });
  const m = useSellerMedia();

  const res = await m.moveToFolder(["/files/a.webp", "/files/b.webp"], "F1");
  assert.deepEqual(sonCagri().params, {
    file_urls: ["/files/a.webp", "/files/b.webp"],
    folder: "F1",
  });
  assert.equal(res.moved, 2);

  await m.moveToFolder(["/files/a.webp"]);
  assert.deepEqual(sonCagri().params, { file_urls: ["/files/a.webp"], folder: "" });
});

test("folderMedia sayfalama/aramayı geçirir ve satırları kütüphane biçimine çevirir", async () => {
  apiStub.resetApiStub({
    list_folder_media: {
      message: {
        items: [
          {
            name: "FILE1",
            file_url: "/files/ab/vana.webp",
            file_name: "vana.webp",
            file_size: 512,
            creation: "2026-08-01 10:00:00",
            tags: ["kampanya"],
          },
        ],
        total: 41,
      },
    },
  });
  const m = useSellerMedia();
  const res = await m.folderMedia("F1", { page: 2, pageSize: 10, search: "vana" });

  const cagri = sonCagri();
  assert.equal(cagri.http, "GET");
  assert.equal(cagri.method, `${YOL}.list_folder_media`);
  assert.deepEqual(cagri.params, { folder: "F1", page: 2, page_size: 10, search: "vana" });

  assert.equal(res.total, 41);
  const satir = res.items[0];
  // `bicimle` biçimi: kimlik adres, docname ayrı, uzantı/tür türetilmiş.
  assert.equal(satir.id, "/files/ab/vana.webp");
  assert.equal(satir.docName, "FILE1");
  assert.equal(satir.fileName, "vana.webp");
  assert.equal(satir.ext, "WEBP");
  assert.equal(satir.kind, "image");
  assert.equal(satir.bytes, 512);
  assert.deepEqual(satir.tags, ["kampanya"]);
});

test("hiçbir klasör çağrısı istemciden mağaza göndermez", async () => {
  apiStub.resetApiStub({
    list_folders: { message: { folders: [] } },
    create_folder: { message: {} },
    rename_folder: { message: {} },
    delete_folder: { message: {} },
    move_media: { message: { moved: 0, failed: [], skipped: 0 } },
    list_folder_media: { message: { items: [], total: 0 } },
  });
  const m = useSellerMedia();
  await m.listFolders();
  await m.createFolder("X");
  await m.renameFolder("F1", "Y");
  await m.deleteFolder("F1");
  await m.moveToFolder(["/files/a.webp"], "F1");
  await m.folderMedia("F1");

  assert.equal(apiStub.calls.length, 6);
  for (const cagri of apiStub.calls) {
    assert.ok(
      !("store" in (cagri.params || {})),
      `${cagri.method} mağaza parametresi taşıyor — izolasyon sözleşmesi delinmiş`
    );
  }
});

test("boş yanıtta bile patlamaz: folderMedia boş liste döner", async () => {
  // Frappe bazı kurulumlarda gövdeyi sarmadan döndürür — `ac` iki hâli de açar.
  apiStub.resetApiStub({ list_folder_media: { items: [], total: 0 } });
  const m = useSellerMedia();
  const res = await m.folderMedia("F1");
  assert.deepEqual(res, { items: [], total: 0 });
});
