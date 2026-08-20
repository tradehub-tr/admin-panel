import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { createPinia, setActivePinia } from "pinia";

/**
 * Asgari-boyut kapısı — sayfa-içi dropzone / PickerModal yolu (rapor 102).
 *
 * NE ÖLÇÜLÜR:
 *   • Slot verilince küçük görsel (kısa kenar < slotun asgarisi) SEÇİM ANINDA
 *     elenir: kuyruk satırı "error" + `short_edge_too_small` olur ve tek bir
 *     `upload_media` isteği GİTMEZ.
 *   • Yeterince büyük görsel aynı yoldan geçer (kuyrukta "uploading").
 *   • VACUITY — slot verilmezse kapı KOŞMAZ: aynı küçük görsel bugünkü
 *     davranışla yüklemeye başlar. Kapıyı kaldırmak = bu davranışa dönmek =
 *     ilk testin kırmızıya dönmesi.
 *   • Kapı yalnız görsele bakar: küçük "görsel boyutlu" bir PDF gate'e takılmaz.
 *
 * NE ÖLÇÜLMEZ:
 *   • Gerçek tarayıcı ölçüm işçisi (Node'da `Worker` kurulmaz; probe ANA İŞ
 *     PARÇACIĞI başlıktan-boyut yedeğinden koşar) ve GERÇEK SUNUCU (api sahte).
 *   • Yüklemenin tamamlanması — 1200 görselinde yalnız kuyruğa "uploading"
 *     olarak girdiği doğrulanır; sıkıştırma/base64/ağ bu testin konusu değil.
 *
 * Ölçüm dosyası: minimal PNG başlığı (imza + IHDR genişlik/yükseklik). `probe.js`
 * boyutu başlıktan okur; `createImageBitmap` gerekmez, Node'da da çözülür.
 */

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));
const STUB = "/src/lib/media/upload/__tests__/fixtures/apiStub.js";

// Sunucu sınırları — `precheck` (uzantı/bayt/tehlikeli) bunlarla GEÇSİN de
// tek karar veren SIZE gate olsun. Boyut kapısı bu sınırlardan bağımsız,
// slot politikasından (vendor manifest) beslenir.
const LIMITS = {
  media_extensions: [".png", ".jpg", ".jpeg", ".webp"],
  extensions: [".png", ".jpg", ".pdf"],
  denied_extensions: [],
  max_bytes: {},
  max_bytes_unknown: 50 * 1024 * 1024,
  kinds: {},
  single_shot_limit: 50 * 1024 * 1024,
  retryable_codes: [],
};

let server;
let media;
let apiStub;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: {
      alias: [
        // Ağ yok: gerçek `api.js` yerine sahte; `uploadPolicy` gerçeğiyle koşsun.
        { find: /^@\/utils\/api$/, replacement: `${frontendRoot}${STUB}` },
        { find: "@", replacement: `${frontendRoot}/src` },
      ],
    },
    server: { middlewareMode: true },
    appType: "custom",
  });
  media = await server.ssrLoadModule("/src/stores/media.js");
  apiStub = await server.ssrLoadModule(STUB);
});

after(async () => {
  await server?.close();
});

/**
 * Minimal PNG — yalnız `readDimensions` için: 8 bayt imza + IHDR (uzunluk +
 * "IHDR" + genişlik/yükseklik u32 big-endian). İçerik geçerli bir görüntü
 * DEĞİL; probe boyutu başlıktan okuduğu için yeterli.
 */
function pngFile(name, w, h) {
  const b = new Uint8Array(24);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  b.set([0, 0, 0, 13], 8); // IHDR uzunluğu
  b.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  const dv = new DataView(b.buffer);
  dv.setUint32(16, w); // big-endian — bytes.js u32 ile aynı
  dv.setUint32(20, h);
  return new File([b], name, { type: "image/png" });
}

function yeniMagaza() {
  setActivePinia(createPinia());
  apiStub.__reset({
    upload_limits: () => LIMITS,
    upload_media: () => ({ file_url: "/files/x.png" }),
  });
  return media.useMediaStore();
}

function sonSatir(store) {
  return store.uploads[store.uploads.length - 1];
}

function uploadIstekSayisi() {
  return apiStub.__calls().filter((c) => c.method === "upload_media").length;
}

// ── Kapı kapalı: küçük görsel elenir ─────────────────────────────────

test("900×900, slot verilince İSTEMCİDE elenir — 0 upload isteği", async () => {
  const store = yeniMagaza();

  await store.enqueueUploads([pngFile("kucuk.png", 900, 900)], { slotKey: "product.image" });

  const satir = sonSatir(store);
  assert.equal(satir.status, "error", "küçük görsel kuyruğa hata olarak girmeli");
  assert.equal(satir.errorCode, "short_edge_too_small", "sebep asgari kısa kenar olmalı");
  assert.equal(satir.errorParams?.limit, 1000, "product.image asgari kısa kenarı 1000");
  assert.equal(satir.errorParams?.measured, 900);
  assert.equal(uploadIstekSayisi(), 0, "reddedilen dosya için tek bayt gitmemeli");
});

// ── Kapı açık: yeterli görsel geçer ──────────────────────────────────

test("1200×1200, slot verilince kapıdan GEÇER — kuyrukta 'uploading'", async () => {
  const store = yeniMagaza();

  await store.enqueueUploads([pngFile("buyuk.png", 1200, 1200)], { slotKey: "product.image" });

  const satir = sonSatir(store);
  assert.equal(satir.errorCode, null, "yeterli görsel boyut kapısına takılmamalı");
  assert.equal(satir.status, "uploading", "kapıdan geçen dosya yüklemeye başlamalı");
});

// ── VACUITY: kapı kaldırılırsa küçük görsel yine turlar ──────────────

test("slot verilmezse kapı KOŞMAZ — 900×900 bugünkü davranışla yüklenir", async () => {
  const store = yeniMagaza();

  // slotKey yok: `boyutKapisi` erken döner, yalnız `precheck` karar verir.
  await store.enqueueUploads([pngFile("kucuk.png", 900, 900)]);

  const satir = sonSatir(store);
  assert.equal(satir.errorCode, null, "slotsuz yolda boyut reddi OLMAMALI");
  assert.equal(satir.status, "uploading", "slotsuz küçük görsel bugün turluyor — kapının vacuity kanıtı");
});

// ── Kapı yalnız görsele bakar ─────────────────────────────────────────

test("küçük 'görsel boyutlu' PDF slot verilse de boyut kapısına takılmaz", async () => {
  const store = yeniMagaza();
  const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "belge.pdf", {
    type: "application/pdf",
  });

  await store.enqueueUploads([pdf], { slotKey: "product.image" });

  const satir = sonSatir(store);
  assert.notEqual(satir.errorCode, "short_edge_too_small", "PDF asgari görsel boyutuna tabi değil");
});
