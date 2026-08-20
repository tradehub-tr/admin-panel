import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { effectScope } from "vue";
import { createServer } from "vite";

import { collectDroppedFiles, collectPastedFiles, MAX_DEPTH } from "../dropFiles.js";

/**
 * Kuyruk (`useMediaUpload`) ve bırakma toplayıcısı.
 *
 *   ÖLÇÜLÜR  — klasör ağacının gezildiği ve `readEntries` sayfalamasının
 *              tükenene kadar okunduğu, yapıştırılan adsız ekran görüntüsüne
 *              ad verildiği, ihlalli dosyanın kuyrukta KALIP tek bayt
 *              GÖNDERİLMEDİĞİ, uyan dosyanın gerçekten uçlara gittiği ve
 *              aynı dosyanın iki kez eklenmediği.
 *   ÖLÇÜLMEZ — Web Worker yolu (Node'da `Worker` + `import.meta.url` işçisi
 *              kurulmuyor; ölçüm ANA İŞ PARÇACIĞI yedek yolundan koşuyor),
 *              `browser-image-compression` / `mediabunny` ile küçültme
 *              (`compress: false` ile kapatıldı) ve GERÇEK SUNUCU — api
 *              sahte, HTTP ile DOĞRULANMADI.
 */

const frontendRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
const STUB = "/src/lib/media/upload/__tests__/fixtures/apiStub.js";

let server;
let useMediaUpload;
let ITEM_STATUS;
let apiStub;
let uploadPolicy;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: {
      alias: [
        // Ağ yok: gerçek `api.js` yerine sahte. Alias TAM eşleşme —
        // `@/utils/uploadPolicy` gerçeğiyle koşsun diye.
        { find: /^@\/utils\/api$/, replacement: `${frontendRoot}${STUB}` },
        { find: "@", replacement: `${frontendRoot}/src` },
      ],
    },
    server: { middlewareMode: true },
    appType: "custom",
  });
  ({ useMediaUpload, ITEM_STATUS } = await server.ssrLoadModule(
    "/src/composables/useMediaUpload.js"
  ));
  apiStub = await server.ssrLoadModule(STUB);
  uploadPolicy = await server.ssrLoadModule("/src/utils/uploadPolicy.js");
});

after(async () => {
  await server?.close();
});

// ── Bırakma toplayıcısı ────────────────────────────────────────────

function dosyaGirdisi(name, size = 10) {
  return {
    name,
    isFile: true,
    isDirectory: false,
    file: (ok) => ok(new File([new Uint8Array(size)], name)),
  };
}

function klasorGirdisi(name, cocuklar) {
  return {
    name,
    isFile: false,
    isDirectory: true,
    createReader() {
      let verildi = false;
      return {
        readEntries(ok) {
          // Gerçek `readEntries` tükenene kadar çağrılmalı; tek çağrıyla
          // yetinen bir uygulama burada yarısını kaybederdi.
          ok(verildi ? [] : cocuklar);
          verildi = true;
        },
      };
    },
  };
}

test("klasör bırakma ağacı geziliyor, gizli dosyalar atılıyor", async () => {
  const dt = {
    items: [
      {
        kind: "file",
        webkitGetAsEntry: () =>
          klasorGirdisi("urunler", [
            dosyaGirdisi("a.jpg"),
            dosyaGirdisi(".DS_Store"),
            klasorGirdisi("alt", [dosyaGirdisi("b.png")]),
          ]),
      },
    ],
    files: [],
  };
  const dosyalar = await collectDroppedFiles(dt);
  assert.deepEqual(
    dosyalar.map((f) => f.name),
    ["a.jpg", "b.png"]
  );
});

test("`readEntries` sayfalaması tükenene kadar okunuyor", async () => {
  // 3 sayfa hâlinde 5 dosya veren bir okuyucu.
  const sayfalar = [[dosyaGirdisi("1.jpg"), dosyaGirdisi("2.jpg")], [dosyaGirdisi("3.jpg")], []];
  let i = 0;
  const dizin = {
    name: "cok",
    isFile: false,
    isDirectory: true,
    createReader: () => ({ readEntries: (ok) => ok(sayfalar[i++] || []) }),
  };
  const dosyalar = await collectDroppedFiles({
    items: [{ kind: "file", webkitGetAsEntry: () => dizin }],
  });
  assert.equal(dosyalar.length, 3);
});

test("derinlik sınırı aşılınca daha derine inilmiyor", async () => {
  let kok = dosyaGirdisi("derin.jpg");
  for (let i = 0; i <= MAX_DEPTH; i += 1) kok = klasorGirdisi(`k${i}`, [kok]);
  const dosyalar = await collectDroppedFiles({
    items: [{ kind: "file", webkitGetAsEntry: () => kok }],
  });
  assert.equal(dosyalar.length, 0);
});

test("`items` yoksa `files`e düşülüyor — çift ekleme yok", async () => {
  const f = new File([new Uint8Array(4)], "tek.jpg");
  const dosyalar = await collectDroppedFiles({ items: [], files: [f] });
  assert.deepEqual(
    dosyalar.map((x) => x.name),
    ["tek.jpg"]
  );
});

test("adsız ekran görüntüsüne zaman damgalı ad veriliyor", () => {
  const f = new File([new Uint8Array(4)], "image.png", { type: "image/png" });
  const [yeni] = collectPastedFiles(
    { clipboardData: { items: [{ kind: "file", getAsFile: () => f }] } },
    { now: () => new Date(Date.UTC(2026, 7, 19, 10, 30, 0)) }
  );
  // Adsız dosya sunucuda `upload_name_required` ile reddedilirdi.
  assert.match(yeni.name, /^yapistirilan-\d{14}\.png$/);
});

test("adı olan yapıştırma dosyası yeniden adlandırılmıyor", () => {
  const f = new File([new Uint8Array(4)], "rapor.pdf", { type: "application/pdf" });
  const [yeni] = collectPastedFiles({
    clipboardData: { items: [{ kind: "file", getAsFile: () => f }] },
  });
  assert.equal(yeni.name, "rapor.pdf");
});

// ── Kuyruk ─────────────────────────────────────────────────────────

/** Başlıktan boyut okunabilen gerçek bir PNG üret. */
function pngDosya(name, w, h, dolgu = 0) {
  const b = (n) => [(n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];
  const bas = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52];
  const govde = [...bas, ...b(w), ...b(h), 8, 6, 0, 0, 0, 0x49, 0x44, 0x41, 0x54];
  const bayt = Uint8Array.from([...govde, ...new Array(dolgu).fill(0)]);
  return new File([bayt], name, { type: "image/png", lastModified: 1 });
}

function sahteDepo() {
  const kutu = {};
  return {
    getItem: (k) => (k in kutu ? kutu[k] : null),
    setItem: (k, v) => {
      kutu[k] = String(v);
    },
    removeItem: (k) => {
      delete kutu[k];
    },
  };
}

/** Kuyruğu bir efekt kapsamında koştur — `onScopeDispose` yerini bulsun. */
async function kuyrukKur(opts) {
  const scope = effectScope();
  let q;
  scope.run(() => {
    q = useMediaUpload({ storage: sahteDepo(), compress: false, ...opts });
  });
  return { q, bitir: () => scope.stop() };
}

/** Kuyruk boşalana ya da sayaç dolana kadar bekle. */
async function dur(q, kosul, tur = 200) {
  for (let i = 0; i < tur; i += 1) {
    if (kosul(q)) return true;
    await new Promise((r) => setTimeout(r, 5));
  }
  return false;
}

test("politikaya uyan görsel gerçekten uçlara gidiyor", async () => {
  uploadPolicy.setLimits({
    media_extensions: [".png", ".jpg", ".webp"],
    extensions: [".png", ".jpg", ".webp"],
    denied_extensions: [".svg"],
    kinds: { ".png": "image" },
    max_bytes: { image: 25 * 1024 * 1024 },
    max_bytes_unknown: 25 * 1024 * 1024,
    single_shot_limit: 8 * 1024 * 1024,
    retryable_codes: [],
  });
  apiStub.__reset({
    upload_media: () => ({ file_url: "/files/urun.png", file_name: "urun.png" }),
  });

  const { q, bitir } = await kuyrukKur({ slotKey: "product.image" });
  q.add([pngDosya("urun.png", 2000, 2000, 4096)]);

  const bitti = await dur(q, (x) => x.items.value[0]?.status === ITEM_STATUS.DONE);
  assert.ok(
    bitti,
    `durum: ${q.items.value[0]?.status} · ${JSON.stringify(q.items.value[0]?.findings)}`
  );
  assert.equal(q.items.value[0].result.file_url, "/files/urun.png");
  // 8 MB altındaki dosya TEK istekte gidiyor; oturum uçları hiç açılmıyor.
  // (`upload_limits` çağrılmıyor: sınırlar testte `setLimits` ile verildi.)
  // `find_in_my_library` (T-042 kopya kontrolü) yüklemeden ÖNCE sorulur;
  // stub'da tanımsız olduğu için fail-open çalışır ve yükleme sürer —
  // uyarı yardımcısının hatası yüklemeyi durduramaz.
  assert.deepEqual(
    apiStub.__calls().map((c) => c.method),
    ["find_in_my_library", "upload_media"]
  );
  bitir();
});

test("kütüphanedeki kopya UYARILIR ama ENGELLENMEZ: satır bekler, 'yine de yükle' yükler", async () => {
  uploadPolicy.setLimits({
    media_extensions: [".png"],
    extensions: [".png"],
    denied_extensions: [],
    kinds: { ".png": "image" },
    max_bytes: { image: 25 * 1024 * 1024 },
    max_bytes_unknown: 25 * 1024 * 1024,
    single_shot_limit: 8 * 1024 * 1024,
    retryable_codes: [],
  });
  apiStub.__reset({
    find_in_my_library: () => ({
      found: true,
      file: { file_url: "/files/ab/eski.png", file_name: "eski.png", uploaded_at: "2026-08-01" },
    }),
    upload_media: () => ({ file_url: "/files/ab/eski.png" }),
  });

  const { q, bitir } = await kuyrukKur({ slotKey: "product.image" });
  q.add([pngDosya("kopya.png", 2000, 2000, 4096)]);

  // 1) Satır DUPLICATE durumunda BEKLER — otomatik başlatma onu almaz.
  const bekliyor = await dur(q, (x) => x.items.value[0]?.status === ITEM_STATUS.DUPLICATE);
  assert.ok(bekliyor, `durum: ${q.items.value[0]?.status}`);
  const satir = q.items.value[0];
  assert.equal(satir.duplicate.file_name, "eski.png");
  assert.ok(satir.findings.some((f) => f.reason === "duplicate_in_library"));
  // Uyarı ENGEL değil: bulgular arasında BLOCK yok.
  assert.ok(!satir.findings.some((f) => f.severity === "block"));
  // Tek bayt gitmedi: yükleme ucu çağrılmadı.
  assert.ok(!apiStub.__calls().some((c) => c.method === "upload_media"));

  // 2) "Yine de yükle" — kullanıcı kararı satırı yola çıkarır.
  q.proceed(satir.id);
  const bitti = await dur(q, (x) => x.items.value[0]?.status === ITEM_STATUS.DONE);
  assert.ok(bitti, `durum: ${q.items.value[0]?.status}`);
  assert.ok(apiStub.__calls().some((c) => c.method === "upload_media"));
  // Uyarı bulgusu karar sonrasında da satırda DURUR.
  assert.ok(q.items.value[0].findings.some((f) => f.reason === "duplicate_in_library"));
  bitir();
});

test("politika ihlalinde TEK BAYT gitmiyor, satır kuyrukta kalıyor", async () => {
  uploadPolicy.setLimits({
    media_extensions: [".png"],
    extensions: [".png"],
    denied_extensions: [],
    kinds: { ".png": "image" },
    max_bytes: { image: 25 * 1024 * 1024 },
    max_bytes_unknown: 25 * 1024 * 1024,
    single_shot_limit: 8 * 1024 * 1024,
    retryable_codes: [],
  });
  apiStub.__reset({ upload_media: () => ({ file_url: "/olmamali" }) });

  const { q, bitir } = await kuyrukKur({ slotKey: "product.image" });
  // 200×200: product.image min_short_edge 1000 — ihlal.
  q.add([pngDosya("kucuk.png", 200, 200)]);

  const engellendi = await dur(q, (x) => x.items.value[0]?.status === ITEM_STATUS.BLOCKED);
  assert.ok(engellendi, `durum: ${q.items.value[0]?.status}`);
  assert.ok(q.items.value[0].findings.some((f) => f.reason === "short_edge_too_small"));
  // Satır SİLİNMİYOR: kullanıcı sebebini görebilmeli.
  assert.equal(q.items.value.length, 1);
  assert.equal(q.stats.value.blocked, 1);
  // Yükleme uçlarına hiç gidilmedi.
  assert.equal(
    apiStub.__calls().some((c) => c.method === "upload_media"),
    false
  );
  bitir();
});

test("aynı dosya iki kez eklenmiyor", async () => {
  uploadPolicy.setLimits({
    media_extensions: [".png"],
    extensions: [".png"],
    denied_extensions: [],
    kinds: { ".png": "image" },
    max_bytes: { image: 25 * 1024 * 1024 },
    max_bytes_unknown: 25 * 1024 * 1024,
    single_shot_limit: 8 * 1024 * 1024,
    retryable_codes: [],
  });
  apiStub.__reset({ upload_media: () => ({ file_url: "/f" }) });

  const { q, bitir } = await kuyrukKur({ slotKey: "product.image", autoStart: false });
  const f = pngDosya("ayni.png", 200, 200);
  q.add([f]);
  q.add([f]);
  assert.equal(q.items.value.length, 1);
  bitir();
});
