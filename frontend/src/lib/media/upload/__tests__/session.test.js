import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BACKOFF_MS,
  METHOD_PREFIX,
  PHASE,
  SESSION_TTL_MS,
  STORE_KEY,
  createUploadSession,
  fingerprint,
  forgetSession,
  pruneSessions,
  readSession,
  uploadSingleShot,
  writeSession,
} from "../session.js";
import { setLimits } from "../../../../utils/uploadPolicy.js";

/**
 * Yükleme oturumu ve KESİNTİDEN devam.
 *
 *   ÖLÇÜLÜR  — `upload_begin/chunk/finish/abort/status` çağrı sırası ve
 *              gövdeleri, devam eden bir oturumun EKSİK parçaları gönderip
 *              gönderilmişleri ATLADIĞI, sunucunun oturumu unutmasının
 *              kullanıcıya hata olarak yansımadığı, parça planı uyuşmazsa
 *              devam edilmediği, denenebilir hatanın yeniden denendiği ve
 *              politika reddinin DENENMEDİĞİ, iptalin sunucudaki parçaları
 *              da temizlediği, ikinci `start()`in yeni istek üretmediği.
 *   ÖLÇÜLMEZ — GERÇEK SUNUCU. Bu testte `api` sahtedir; uçların gerçekten bu
 *              gövdeleri kabul ettiği HTTP ile DOĞRULANMADI. Sözleşme
 *              `tradehub_core/media/chunked.py` + `api/seller_media.py`
 *              okunarak çıkarıldı; ağ üzerinden bir kez bile koşturulmadı.
 *              Ayrıca base64 kodlayıcı burada enjekte ediliyor — gerçek
 *              `FileReader` yolu Node'da yok, ölçülmedi.
 */

// ── Sahteler ───────────────────────────────────────────────────────

/** `File` yerine: `slice` + `name` + `size` yeter. */
function sahteDosya(size, { name = "video.mp4", lastModified = 1000 } = {}) {
  return {
    name,
    size,
    lastModified,
    slice(bas, son) {
      return { _bas: bas, _son: Math.min(son, size) };
    },
  };
}

function sahteDepo(baslangic = {}) {
  const kutu = { ...baslangic };
  return {
    getItem: (k) => (k in kutu ? kutu[k] : null),
    setItem: (k, v) => {
      kutu[k] = String(v);
    },
    removeItem: (k) => {
      delete kutu[k];
    },
    _kutu: kutu,
  };
}

/** Çağrıları kaydeden sahte api. `yanitlar` uç adına göre fonksiyon verir. */
function sahteApi(yanitlar) {
  const cagrilar = [];
  const cek = (method, args) => {
    cagrilar.push({ method: method.replace(`${METHOD_PREFIX}.`, ""), args });
    const f = yanitlar[method.replace(`${METHOD_PREFIX}.`, "")];
    if (!f) throw new Error(`sahte api: ${method} tanımsız`);
    return Promise.resolve(f(args, cagrilar)).then((m) => ({ message: m }));
  };
  return {
    cagrilar,
    callMethod: (m, a) => cek(m, a),
    callMethodGET: (m, a) => cek(m, a),
  };
}

const kodla = async (dilim) => `parca:${dilim._bas}`;
const hemen = async () => {};

const CHUNK = 2 * 1024 * 1024;

// ── Kalıcılık ──────────────────────────────────────────────────────

test("parmak izi değişim zamanını da içeriyor — aynı ad + aynı boyut yetmez", () => {
  const a = sahteDosya(100, { lastModified: 1 });
  const b = sahteDosya(100, { lastModified: 2 });
  assert.notEqual(fingerprint(a), fingerprint(b));
});

test("kayıt yazılıp okunuyor, TTL geçince görünmüyor", () => {
  const depo = sahteDepo();
  const dosya = sahteDosya(100);
  writeSession(depo, dosya, { uploadId: "abc", chunkCount: 3 }, 1000);
  assert.equal(readSession(depo, dosya, 1000).uploadId, "abc");
  // Sunucu altı saat sonra oturumu zaten silmiş olacak; sormak boşuna.
  assert.equal(readSession(depo, dosya, 1000 + SESSION_TTL_MS + 1), null);
  forgetSession(depo, dosya);
  assert.equal(readSession(depo, dosya, 1000), null);
});

test("bozuk depo yüklemeyi engellemiyor", () => {
  const depo = sahteDepo({ [STORE_KEY]: "{bozuk" });
  assert.equal(readSession(depo, sahteDosya(10)), null);
});

test("süresi geçen kayıtlar toplu atılıyor", () => {
  const depo = sahteDepo();
  writeSession(depo, sahteDosya(10, { name: "a" }), { uploadId: "1" }, 0);
  writeSession(depo, sahteDosya(10, { name: "b" }), { uploadId: "2" }, SESSION_TTL_MS);
  const atilan = pruneSessions(depo, SESSION_TTL_MS + 1);
  assert.equal(atilan, 1);
  assert.equal(readSession(depo, sahteDosya(10, { name: "b" }), SESSION_TTL_MS + 1).uploadId, "2");
});

// ── Temiz akış ─────────────────────────────────────────────────────

test("sıfırdan yükleme: begin → 3 parça → finish", async () => {
  const dosya = sahteDosya(CHUNK * 2 + 10);
  const api = sahteApi({
    upload_begin: () => ({
      upload_id: "s1",
      chunk_bytes: CHUNK,
      chunk_count: 3,
      file_name: dosya.name,
    }),
    upload_chunk: ({ index }) => ({ received: index + 1, chunk_count: 3, complete: index === 2 }),
    upload_finish: () => ({ file_url: "/files/video.mp4", bytes: dosya.size }),
  });

  const ilerleme = [];
  const oturum = createUploadSession(dosya, {
    api,
    encode: kodla,
    onProgress: (d) => ilerleme.push(d.percent),
  });
  const sonuc = await oturum.start();

  assert.equal(sonuc.file_url, "/files/video.mp4");
  assert.deepEqual(
    api.cagrilar.map((c) => c.method),
    ["upload_begin", "upload_chunk", "upload_chunk", "upload_chunk", "upload_finish"]
  );
  assert.deepEqual(
    api.cagrilar.filter((c) => c.method === "upload_chunk").map((c) => c.args.index),
    [0, 1, 2]
  );
  assert.equal(api.cagrilar[0].args.total_bytes, dosya.size);
  // Son %5 bitirme adımına ayrılıyor: sunucu birleştirip politikadan geçiriyor.
  assert.ok(ilerleme.includes(95));
  assert.equal(ilerleme.at(-1), 100);
  assert.equal(oturum.state.phase, PHASE.DONE);
});

test("küçük dosya tek istekte gidiyor", async () => {
  const api = sahteApi({ upload_media: () => ({ file_url: "/files/x.jpg" }) });
  const sonuc = await uploadSingleShot(sahteDosya(1000, { name: "x.jpg" }), {
    api,
    encode: async () => "AAAA",
  });
  assert.equal(sonuc.file_url, "/files/x.jpg");
  assert.deepEqual(
    api.cagrilar.map((c) => c.method),
    ["upload_media"]
  );
  assert.equal(api.cagrilar[0].args.content, "AAAA");
});

// ── Devam ──────────────────────────────────────────────────────────

test("kayıtlı oturum devam ediyor: gönderilmiş parçalar ATLANIYOR", async () => {
  const dosya = sahteDosya(CHUNK * 4);
  const depo = sahteDepo();
  writeSession(depo, dosya, { uploadId: "s9", chunkCount: 4 }, 0);

  const api = sahteApi({
    upload_status: () => ({ chunk_bytes: CHUNK, chunk_count: 4, received: [0, 1] }),
    upload_chunk: ({ index }) => ({ received: index + 1, chunk_count: 4 }),
    upload_finish: () => ({ file_url: "/files/video.mp4" }),
  });

  const oturum = createUploadSession(dosya, { api, storage: depo, encode: kodla, now: () => 0 });
  await oturum.start();

  // `upload_begin` HİÇ çağrılmadı — devam gerçekten devam.
  assert.equal(
    api.cagrilar.some((c) => c.method === "upload_begin"),
    false
  );
  assert.deepEqual(
    api.cagrilar.filter((c) => c.method === "upload_chunk").map((c) => c.args.index),
    [2, 3]
  );
  assert.equal(oturum.state.resumed, true);
  assert.equal(oturum.state.resumedChunks, 2);
  // Kayıt bitince siliniyor: bir sonraki yükleme ölü kimliğe devam etmemeli.
  assert.equal(readSession(depo, dosya, 0), null);
});

test("sunucu oturumu unutmuşsa sessizce sıfırdan başlanıyor", async () => {
  const dosya = sahteDosya(CHUNK);
  const depo = sahteDepo();
  writeSession(depo, dosya, { uploadId: "olu", chunkCount: 1 }, 0);

  const api = sahteApi({
    upload_status: () => {
      // `chunked._read_meta` süresi dolmuş oturumda `upload_session_unknown` atıyor.
      const e = new Error("Yükleme oturumu bulunamadı");
      e.code = "upload_session_unknown";
      throw e;
    },
    upload_begin: () => ({ upload_id: "yeni", chunk_bytes: CHUNK, chunk_count: 1 }),
    upload_chunk: () => ({ received: 1, chunk_count: 1 }),
    upload_finish: () => ({ file_url: "/files/a.mp4" }),
  });

  const oturum = createUploadSession(dosya, { api, storage: depo, encode: kodla, now: () => 0 });
  await oturum.start();
  assert.equal(oturum.state.uploadId, "yeni");
  assert.equal(oturum.state.resumed, false);
  assert.equal(readSession(depo, dosya, 0), null);
});

test("parça planı uyuşmazsa devam EDİLMİYOR", async () => {
  // Sunucunun `chunk_bytes` sabiti değişmişse kayıtlı oturumun parça
  // sınırları dosyanınkiyle uyuşmaz; devam etmek yanlış kesilmiş parçalar
  // göndermek olurdu.
  const dosya = sahteDosya(CHUNK * 4);
  const depo = sahteDepo();
  writeSession(depo, dosya, { uploadId: "eski", chunkCount: 4 }, 0);

  const api = sahteApi({
    upload_status: () => ({ chunk_bytes: CHUNK, chunk_count: 9, received: [0] }),
    upload_begin: () => ({ upload_id: "yeni", chunk_bytes: CHUNK, chunk_count: 4 }),
    upload_chunk: ({ index }) => ({ received: index + 1, chunk_count: 4 }),
    upload_finish: () => ({ file_url: "/f" }),
  });

  const oturum = createUploadSession(dosya, { api, storage: depo, encode: kodla, now: () => 0 });
  await oturum.start();
  assert.equal(oturum.state.uploadId, "yeni");
  assert.equal(api.cagrilar.filter((c) => c.method === "upload_chunk").length, 4);
});

test("depo verilmezse devam kapalı — `upload_status` hiç sorulmuyor", async () => {
  const dosya = sahteDosya(CHUNK);
  const api = sahteApi({
    upload_begin: () => ({ upload_id: "s", chunk_bytes: CHUNK, chunk_count: 1 }),
    upload_chunk: () => ({ received: 1, chunk_count: 1 }),
    upload_finish: () => ({ file_url: "/f" }),
  });
  await createUploadSession(dosya, { api, encode: kodla }).start();
  assert.equal(
    api.cagrilar.some((c) => c.method === "upload_status"),
    false
  );
});

// ── Yeniden deneme ─────────────────────────────────────────────────

test("ağ kopması yeniden deneniyor, sonra başarıyla gidiyor", async () => {
  setLimits({ retryable_codes: ["upload_chunk_order", "upload_chunk_missing"] });
  const dosya = sahteDosya(CHUNK);
  let deneme = 0;
  const api = sahteApi({
    upload_begin: () => ({ upload_id: "s", chunk_bytes: CHUNK, chunk_count: 1 }),
    upload_chunk: () => {
      deneme += 1;
      if (deneme < 3) {
        // `status` yok = ağ kopması; `uploadPolicy.isRetryable` bunu denenebilir sayıyor.
        throw new Error("Sunucuya bağlanılamadı");
      }
      return { received: 1, chunk_count: 1 };
    },
    upload_finish: () => ({ file_url: "/f" }),
  });

  const oturum = createUploadSession(dosya, { api, encode: kodla, sleep: hemen });
  await oturum.start();
  assert.equal(deneme, 3);
  assert.equal(oturum.state.phase, PHASE.DONE);
});

test("[FR-060] politika reddi YENİDEN DENENMİYOR — aynı dosya aynı cevabı verir", async () => {
  setLimits({ retryable_codes: ["upload_chunk_order"] });
  const dosya = sahteDosya(CHUNK);
  let cagri = 0;
  const api = sahteApi({
    upload_begin: () => ({ upload_id: "s", chunk_bytes: CHUNK, chunk_count: 1 }),
    upload_chunk: () => {
      cagri += 1;
      const e = new Error("Dosya çok büyük");
      e.code = "upload_too_large";
      e.status = 417;
      throw e;
    },
    upload_abort: () => ({ aborted: true }),
  });

  const oturum = createUploadSession(dosya, { api, encode: kodla, sleep: hemen });
  await assert.rejects(() => oturum.start(), /çok büyük/);
  assert.equal(cagri, 1);
  assert.equal(oturum.state.phase, PHASE.FAILED);
});

test("deneme sayısı geri çekilme tablosuyla sınırlı", async () => {
  setLimits({ retryable_codes: [] });
  const dosya = sahteDosya(CHUNK);
  let cagri = 0;
  const api = sahteApi({
    upload_begin: () => ({ upload_id: "s", chunk_bytes: CHUNK, chunk_count: 1 }),
    upload_chunk: () => {
      cagri += 1;
      throw new Error("Sunucuya bağlanılamadı");
    },
  });
  const bekleyenler = [];
  const oturum = createUploadSession(dosya, {
    api,
    encode: kodla,
    sleep: async (ms) => bekleyenler.push(ms),
  });
  await assert.rejects(() => oturum.start());
  // İlk deneme + tablo boyu kadar yeniden deneme.
  assert.equal(cagri, BACKOFF_MS.length + 1);
  assert.deepEqual(bekleyenler, BACKOFF_MS);
});

// ── İptal ──────────────────────────────────────────────────────────

test("iptal sunucudaki parçaları da temizliyor ve kaydı siliyor", async () => {
  const dosya = sahteDosya(CHUNK * 3);
  const depo = sahteDepo();
  const api = sahteApi({
    upload_begin: () => ({ upload_id: "s", chunk_bytes: CHUNK, chunk_count: 3 }),
    upload_chunk: ({ index }) => ({ received: index + 1, chunk_count: 3 }),
    upload_abort: () => ({ aborted: true }),
  });

  const kontrol = new AbortController();
  const oturum = createUploadSession(dosya, {
    api,
    storage: depo,
    encode: async (d) => {
      // İlk parçadan sonra iptal: gerçek kullanıcı da ortada basıyor.
      if (d._bas > 0) kontrol.abort();
      return "x";
    },
    signal: kontrol.signal,
    now: () => 0,
  });

  await assert.rejects(
    () => oturum.start(),
    (e) => e.name === "AbortError"
  );
  await oturum.abort();

  assert.ok(api.cagrilar.some((c) => c.method === "upload_abort"));
  assert.equal(readSession(depo, dosya, 0), null);
  assert.equal(oturum.state.phase, PHASE.ABORTED);
});

test("iptal isteği başarısız olsa da iptal geçerli", async () => {
  const dosya = sahteDosya(CHUNK);
  const api = sahteApi({
    upload_begin: () => ({ upload_id: "s", chunk_bytes: CHUNK, chunk_count: 1 }),
    upload_chunk: () => ({ received: 1, chunk_count: 1 }),
    upload_finish: () => ({ file_url: "/f" }),
    upload_abort: () => {
      throw new Error("sunucu düştü");
    },
  });
  const oturum = createUploadSession(dosya, { api, encode: kodla });
  await oturum.start();
  await oturum.abort();
  assert.equal(oturum.state.phase, PHASE.ABORTED);
});

// ── Tek seferlik başlatma ──────────────────────────────────────────

test("ikinci `start()` YENİ istek üretmiyor — sunucuda Idempotency-Key yok", async () => {
  const dosya = sahteDosya(CHUNK);
  const api = sahteApi({
    upload_begin: () => ({ upload_id: "s", chunk_bytes: CHUNK, chunk_count: 1 }),
    upload_chunk: () => ({ received: 1, chunk_count: 1 }),
    upload_finish: () => ({ file_url: "/f" }),
  });
  const oturum = createUploadSession(dosya, { api, encode: kodla });
  const [a, b] = await Promise.all([oturum.start(), oturum.start()]);
  assert.deepEqual(a, b);
  assert.equal(api.cagrilar.filter((c) => c.method === "upload_finish").length, 1);
});

test("api verilmeden oturum kurulamıyor", () => {
  assert.throws(() => createUploadSession(sahteDosya(10), {}), /api zorunlu/);
});
