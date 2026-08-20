import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, test } from "node:test";
import { createServer } from "vite";

/**
 * Türev listesi (`useMediaRenditions`) — T-083 toplu manifest tüketimi.
 *
 * İki iddia ölçülür, ikisi de sayıyla:
 *
 *   • bir `load()` çağrısı TEK istek atar ve o istek toplu uçtur
 *     (`media_manifest.manifest_batch`, `{file_urls: [docname]}`) — eski
 *     akış aynı iş için 2 REST isteği atıyordu (Media Asset + Media
 *     Rendition listeleri);
 *   • `getList`e hiçbir yoldan düşülmez — stub `getList`i bilerek patlatır,
 *     yani gerileme sessiz kalamaz.
 *
 * Boş/eksik manifest dürüst boş-durum sözleşmesini korur: bayraklar kapalı
 * ve tablo boşken bu bir ARIZA değildir; `emptyReason` sebebi taşır,
 * `error`/`denied` boş kalır. Çözülemeyen adres (`null`) "yok" ile
 * "bakamazsın"ı AYIRT ETMEZ — sunucu sızdırmaz, ekran da uydurmaz.
 */

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));

let server;
let useMediaRenditions;
let apiStub;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: {
      alias: [
        // Sıra ÖNEMLİ: tam eşleşme "@" genel kuralından önce.
        {
          find: /^@\/utils\/api$/,
          replacement: `${frontendRoot}/src/composables/__tests__/fixtures/renditionApiStub.js`,
        },
        { find: "@", replacement: `${frontendRoot}/src` },
      ],
    },
    server: { middlewareMode: true },
    appType: "custom",
  });
  ({ useMediaRenditions } = await server.ssrLoadModule("/src/composables/useMediaRenditions.js"));
  apiStub = await server.ssrLoadModule("/src/composables/__tests__/fixtures/renditionApiStub.js");
});

after(async () => {
  await server?.close();
});

beforeEach(() => {
  apiStub.reset();
});

const BATCH_METHOD = "tradehub_core.api.media_manifest.manifest_batch";

/** Uçtan geldiği hâliyle bir türev satırı (backend alan adlarıyla). */
const HAM_TUREV = {
  name: "MR-0001",
  asset: "MA-0001",
  profile: "w384",
  width: 384,
  height: 384,
  format: "webp",
  file_url: "/files/media/MA-0001/w384.webp",
  bytes: 2048,
  ssim: 0.97,
  generation: "lazy",
  benefit_gate_passed: 1,
};

function manifestYaniti(docname, manifest) {
  return { message: { manifests: { [docname]: manifest }, requested: 1, returned: 1 } };
}

test("docname verilmezse hiç istek atılmaz", async () => {
  const r = useMediaRenditions();

  await r.load("");

  assert.equal(apiStub.calls.length, 0);
  assert.equal(r.emptyReason.value, "noAsset");
});

test("bir yükleme TEK toplu istek atar — eski akış aynı iş için 2 REST isteği atıyordu", async () => {
  apiStub.respondWith(() =>
    manifestYaniti("FILE-1", {
      file: "FILE-1",
      file_url: "/files/a.jpg",
      assets: ["MA-0001"],
      renditions: [HAM_TUREV],
    })
  );
  const r = useMediaRenditions();

  await r.load("FILE-1");

  // İstek SAYISI: tam 1 — ne 2 (eski akış), ne 0 (hiç sormamak).
  assert.equal(apiStub.calls.length, 1);
  assert.deepEqual(apiStub.calls[0], {
    kind: "callMethod",
    method: BATCH_METHOD,
    args: { file_urls: ["FILE-1"] },
  });
  // Tek tek REST'e hiç düşülmedi (stub `getList`i patlatıyor; sayı da sıfır).
  assert.equal(apiStub.calls.filter((c) => c.kind === "getList").length, 0);
});

test("satır eşlemesi çağıran bileşenlerin sözleşmesini korur", async () => {
  apiStub.respondWith(() =>
    manifestYaniti("FILE-1", {
      file: "FILE-1",
      file_url: "/files/a.jpg",
      assets: ["MA-0001"],
      renditions: [HAM_TUREV, { ...HAM_TUREV, name: "MR-0002", ssim: 0, generation: "" }],
    })
  );
  const r = useMediaRenditions();

  const rows = await r.load("FILE-1");

  assert.deepEqual(rows[0], {
    id: "MR-0001",
    profile: "w384",
    width: 384,
    height: 384,
    format: "WEBP",
    fileUrl: "/files/media/MA-0001/w384.webp",
    bytes: 2048,
    ssim: 0.97,
    generation: "lazy",
  });
  // Ölçülmemiş SSIM 0 kalır — bileşen onu "—" basar, "0,00" değil.
  assert.equal(rows[1].ssim, 0);
  assert.equal(rows[1].generation, "");
  assert.equal(r.emptyReason.value, "");
});

test("cevap gelmeden satır uydurulmaz — loading açık, rows boş", () => {
  apiStub.respondWith(() => manifestYaniti("FILE-1", { assets: [], renditions: [] }));
  const r = useMediaRenditions();

  // Bilinçli olarak `await` YOK: istek uçarken ekranın gördüğü hâl bu.
  r.load("FILE-1");

  assert.equal(r.loading.value, true);
  assert.deepEqual(r.rows.value, []);
  assert.equal(r.emptyReason.value, "");
});

test("çözülemeyen adres (null) arıza DEĞİL — boru hattında yok sayılır", async () => {
  apiStub.respondWith(() => manifestYaniti("FILE-YOK", null));
  const r = useMediaRenditions();

  await r.load("FILE-YOK");

  assert.equal(r.emptyReason.value, "noAsset");
  assert.equal(r.error.value, "");
  assert.equal(r.denied.value, false);
  assert.deepEqual(r.rows.value, []);
});

test("varlık var ama türev yoksa sebep 'noRenditions' olur", async () => {
  apiStub.respondWith(() =>
    manifestYaniti("FILE-1", { file: "FILE-1", assets: ["MA-0001"], renditions: [] })
  );
  const r = useMediaRenditions();

  await r.load("FILE-1");

  assert.equal(r.emptyReason.value, "noRenditions");
  assert.equal(r.error.value, "");
});

test("varlık da yoksa sebep 'noAsset' olur — bayrak kapalıyken beklenen hâl", async () => {
  apiStub.respondWith(() =>
    manifestYaniti("FILE-1", { file: "FILE-1", assets: [], renditions: [] })
  );
  const r = useMediaRenditions();

  await r.load("FILE-1");

  assert.equal(r.emptyReason.value, "noAsset");
  assert.equal(r.error.value, "");
  assert.equal(r.denied.value, false);
});

test("403 yetki reddine, diğer hatalar arızaya düşer", async () => {
  apiStub.respondWith(() => {
    const e = new Error("yasak");
    e.status = 403;
    throw e;
  });
  const r = useMediaRenditions();
  await r.load("FILE-1");
  assert.equal(r.denied.value, true);
  assert.equal(r.error.value, "");

  apiStub.respondWith(() => {
    throw new Error("ağ koptu");
  });
  const r2 = useMediaRenditions();
  await r2.load("FILE-1");
  assert.equal(r2.denied.value, false);
  assert.equal(r2.error.value, "ağ koptu");
});

test("yeni yükleme öncekini temizler", async () => {
  apiStub.respondWith(() =>
    manifestYaniti("FILE-1", { file: "FILE-1", assets: ["MA-0001"], renditions: [HAM_TUREV] })
  );
  const r = useMediaRenditions();
  await r.load("FILE-1");
  assert.equal(r.rows.value.length, 1);

  apiStub.respondWith(() => manifestYaniti("FILE-2", null));
  await r.load("FILE-2");
  assert.deepEqual(r.rows.value, []);
  assert.equal(r.emptyReason.value, "noAsset");
});
