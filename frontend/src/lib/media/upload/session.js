/**
 * Yükleme oturumu — kesintiden SONRA kaldığı yerden devam eden parçalı gönderim (T-081).
 *
 * ── Protokol UYDURULMADI ────────────────────────────────────────────────
 *
 * T-081 metni "tus" diyor. **Sunucuda tus YOK.** `docs/api/openapi-http.yaml`
 * (87 uç, 2026-08-19) içinde tek bir tus başlığı ya da `PATCH` uploads ucu
 * geçmiyor; `tradehub_core/media/chunked.py` kendi sözleşmesini tanımlıyor:
 *
 *     upload_begin(file_name, total_bytes) → {upload_id, chunk_bytes, chunk_count, file_name}
 *     upload_chunk(upload_id, index, content)  → {received, chunk_count, complete}
 *     upload_finish(upload_id)                 → {file_url, file_name, bytes, video_status}
 *     upload_abort(upload_id)                  → {aborted}
 *     upload_status(upload_id)                 → {chunk_count, chunk_bytes, received[], created}
 *
 * `tus-js-client` kurmak, konuşacağı bir sunucu olmadan ölü bir bağımlılık
 * olurdu. Devam edebilirlik tus'un TEKELİNDE değil: `upload_status` sunucuda
 * DURAN parça sıralarını (`received[]`) döndürüyor, yani "son bayttan devam"
 * ile aynı sonucu veren "eksik parçalardan devam" burada mümkün. Kurulan şey
 * bu.
 *
 * ── Devam nasıl çalışıyor ───────────────────────────────────────────────
 *
 * Oturum kimliği dosyanın parmak iziyle (`ad|boyut|değişim zamanı`) eşleşerek
 * `localStorage`'a yazılıyor. Sayfa yenilenince ya da tarayıcı kapanıp
 * açılınca aynı dosya seçildiğinde:
 *
 *   1. Kayıt bulunur, yaşı sunucudaki TTL'den (6 saat, `chunked.SESSION_TTL_
 *      HOURS`) büyükse ATILIR — sunucu zaten silmiş olacak, sormak boşuna.
 *   2. `upload_status` sorulur. Sunucu "oturum yok" derse kayıt atılır ve
 *      sıfırdan başlanır; kullanıcı bir hata görmez.
 *   3. Dönen `received[]` atlanır, yalnız EKSİK parçalar gönderilir.
 *
 * Parmak izi `lastModified`'ı da içeriyor: aynı adla aynı boyutta ama
 * DEĞİŞTİRİLMİŞ bir dosya seçilirse eski oturuma parça eklemek, iki farklı
 * dosyanın baytlarını birbirine karıştırmak olurdu.
 *
 * ── Bilerek yapılmayanlar ───────────────────────────────────────────────
 *
 * **Idempotency-Key YOK.** T-081 "aynı anahtarla ikinci `finalize` yeni kayıt
 * açmasın" diyor; sunucuda böyle bir alan yok (`upload_finish(upload_id)` tek
 * parametre). Burada yapılan tek şey `finish`i istemci tarafında TEK SEFERE
 * kilitlemek: aynı oturumda ikinci çağrı aynı sözü döndürür, yeni istek
 * gitmez. Ağ koptuktan sonra sunucunun kaydı açıp açmadığı istemciden
 * GÖRÜLEMEZ — bu boşluk sunucuda kapanmalı, burada gizlenmemeli.
 *
 * **Parçalar SIRAYLA gidiyor.** Sunucu sırasız kabul ediyor ve paralel
 * gönderim daha hızlı olurdu; ama kopma hâlinde hangi parçanın gittiği
 * belirsizleşir ve ilerleme zıplar. Devam edebilirliğin doğruluğu, sırayla
 * göndermenin sadeliğine bağlı.
 */

import { isRetryable } from "../../../utils/uploadPolicy.js";

/** Devam kayıtlarının tutulduğu anahtar. */
export const STORE_KEY = "th-upload-sessions";

/** Sunucudaki oturum ömrü — `chunked.SESSION_TTL_HOURS`. */
export const SESSION_TTL_MS = 6 * 60 * 60 * 1000;

/** Frappe uç ön eki. */
export const METHOD_PREFIX = "tradehub_core.api.seller_media";

/** Yeniden deneme aralıkları (ms). Sabit değil, artan — ağ toparlansın diye. */
export const BACKOFF_MS = [400, 1200, 3000];

export const PHASE = {
  IDLE: "idle",
  RESUMING: "resuming",
  BEGINNING: "beginning",
  UPLOADING: "uploading",
  FINISHING: "finishing",
  DONE: "done",
  ABORTED: "aborted",
  FAILED: "failed",
};

/** Dosyanın kimliği — aynı içerik aynı oturuma devam etsin diye. */
export function fingerprint(file) {
  return [file?.name || "", file?.size || 0, file?.lastModified || 0].join("|");
}

function storeOku(storage) {
  try {
    return JSON.parse(storage?.getItem(STORE_KEY) || "{}") || {};
  } catch {
    // Bozuk kayıt yüklemeyi engellememeli; sıfırdan başlanır.
    return {};
  }
}

function storeYaz(storage, veri) {
  try {
    storage?.setItem(STORE_KEY, JSON.stringify(veri));
  } catch {
    // Kota dolu ya da depolama kapalı. Devam edebilirlik kaybolur, yükleme
    // kaybolmaz — sessizce geçiliyor.
  }
}

/** Bir dosyanın kayıtlı oturumu — yoksa ya da süresi geçtiyse `null`. */
export function readSession(storage, file, now = Date.now()) {
  const fp = fingerprint(file);
  const kayit = storeOku(storage)[fp];
  if (!kayit) return null;
  if (now - (kayit.savedAt || 0) > SESSION_TTL_MS) return null;
  return kayit;
}

export function writeSession(storage, file, kayit, now = Date.now()) {
  const veri = storeOku(storage);
  veri[fingerprint(file)] = { ...kayit, savedAt: now };
  storeYaz(storage, veri);
}

export function forgetSession(storage, file) {
  const veri = storeOku(storage);
  delete veri[fingerprint(file)];
  storeYaz(storage, veri);
}

/** Süresi geçmiş kayıtları at — yükleyici açılınca bir kez çağrılır. */
export function pruneSessions(storage, now = Date.now()) {
  const veri = storeOku(storage);
  let atilan = 0;
  for (const [fp, kayit] of Object.entries(veri)) {
    if (now - (kayit?.savedAt || 0) > SESSION_TTL_MS) {
      delete veri[fp];
      atilan += 1;
    }
  }
  if (atilan) storeYaz(storage, veri);
  return atilan;
}

function iptalHatasi() {
  const e = new Error("Yükleme iptal edildi");
  e.name = "AbortError";
  return e;
}

/** Frappe zarfını aç: `{message: X}` → `X`. */
function ac(yanit) {
  return yanit?.message ?? yanit;
}

/**
 * Blob'u base64'e çevir.
 *
 * Sunucu içeriği base64 bekliyor (`upload_chunk(content)`), çünkü bu kurulumda
 * çok parçalı gönderim oturum katmanında CSRF uyuşmazlığı üretiyor
 * (`seller_media.upload_media` docstring). %33 şişme bu yüzden kaçınılmaz;
 * parça boyutu (2 MB) zaten buna göre seçilmiş.
 */
export async function blobToBase64(blob) {
  const bayt = new Uint8Array(await blob.arrayBuffer());
  // `String.fromCharCode(...bayt)` 2 MB'lık bir parçada çağrı yığınını taşırır;
  // dilim dilim çevriliyor. 8 KB pencere hem güvenli hem yeterince az çağrı.
  const PENCERE = 8192;
  let ikili = "";
  for (let i = 0; i < bayt.length; i += PENCERE) {
    ikili += String.fromCharCode.apply(null, bayt.subarray(i, i + PENCERE));
  }
  return btoa(ikili);
}

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Tek istekte yükle — küçük dosyalar için.
 *
 * Sunucu `single_shot_limit` (8 MB) altındaki dosyayı tek çağrıda kabul
 * ediyor. Küçük bir dosya için oturum açıp kapatmak üç fazla gidiş-geliş
 * demekti; parçalı yol yalnız gerçekten gerektiğinde kuruluyor.
 *
 * Devam edebilirlik BURADA YOK ve olamaz: tek istek ya gider ya gitmez,
 * yarısı diye bir durumu yok.
 */
export async function uploadSingleShot(file, { api, signal = null, encode = blobToBase64 } = {}) {
  if (!api) throw new Error("uploadSingleShot: api zorunlu");
  const govde = await encode(file);
  if (signal?.aborted) throw iptalHatasi();
  return ac(
    await api.callMethod(`${METHOD_PREFIX}.upload_media`, {
      file_name: file.name,
      content: govde,
    })
  );
}

/**
 * Yükleme oturumu kur.
 *
 * @param {File} file
 * @param {object} opts
 * @param {object} opts.api `callMethod` / `callMethodGET` taşıyan nesne (`@/utils/api`).
 * @param {Storage} [opts.storage] devam kayıtları için; verilmezse devam kapalı.
 * @param {AbortSignal} [opts.signal]
 * @param {(durum: object) => void} [opts.onProgress]
 * @param {(blob: Blob) => Promise<string>} [opts.encode] parça kodlayıcı (test için).
 * @param {() => number} [opts.now] saat (test için).
 * @param {number[]} [opts.backoff] yeniden deneme aralıkları.
 */
export function createUploadSession(file, opts = {}) {
  const {
    api,
    storage = null,
    signal = null,
    onProgress = null,
    encode = blobToBase64,
    now = Date.now,
    backoff = BACKOFF_MS,
    sleep = bekle,
  } = opts;

  if (!api) throw new Error("createUploadSession: api zorunlu");

  const durum = {
    phase: PHASE.IDLE,
    uploadId: "",
    chunkBytes: 0,
    chunkCount: 0,
    sentChunks: 0,
    resumedChunks: 0,
    resumed: false,
    percent: 0,
    bytesSent: 0,
    etaSeconds: null,
    error: null,
  };

  let bitirmeSozu = null;
  let baslangicZamani = 0;

  function duyur() {
    onProgress?.({ ...durum });
  }

  function ilerlemeGuncelle(gonderilen) {
    durum.sentChunks = gonderilen;
    durum.bytesSent = Math.min(file.size, gonderilen * durum.chunkBytes);
    // Son %5 bitirme adımına ayrılıyor: sunucu parçaları birleştiriyor,
    // politikadan geçiriyor ve kaydı açıyor. %100 gösterip beklemek yalan olurdu.
    durum.percent = durum.chunkCount ? (gonderilen / durum.chunkCount) * 95 : 0;

    // Kalan süre YALNIZ bu oturumda gerçekten gönderilen parçalardan
    // kestiriliyor. Devralınan parçalar (`resumedChunks`) hesaba katılsaydı
    // "0 saniyede 40 parça gitti" gibi bir hız çıkar, kalan süre sıfır görünürdü.
    const buOturumda = gonderilen - durum.resumedChunks;
    const gecen = (now() - baslangicZamani) / 1000;
    if (buOturumda > 0 && gecen > 0) {
      const parcaBasi = gecen / buOturumda;
      durum.etaSeconds = Math.max(0, Math.round((durum.chunkCount - gonderilen) * parcaBasi));
    } else {
      durum.etaSeconds = null;
    }
    duyur();
  }

  function iptalKontrol() {
    if (signal?.aborted) throw iptalHatasi();
  }

  /** Kayıtlı oturumu sunucuya doğrulat. Uymuyorsa `null`. */
  async function devamDene() {
    if (!storage) return null;
    const kayit = readSession(storage, file, now());
    if (!kayit?.uploadId) return null;

    durum.phase = PHASE.RESUMING;
    duyur();
    try {
      const s = ac(
        await api.callMethodGET(`${METHOD_PREFIX}.upload_status`, {
          upload_id: kayit.uploadId,
        })
      );
      // Sunucunun parça planı istemcininkiyle aynı olmalı: `chunk_bytes`
      // sunucu sabitinden geliyor ve değişebilir. Uyuşmuyorsa devam etmek,
      // yanlış sınırlardan kesilmiş parçalar göndermek olurdu.
      const beklenen = Math.ceil(file.size / (s?.chunk_bytes || 1));
      if (!s?.chunk_count || s.chunk_count !== beklenen) {
        forgetSession(storage, file);
        return null;
      }
      return {
        uploadId: kayit.uploadId,
        chunkBytes: s.chunk_bytes,
        chunkCount: s.chunk_count,
        received: new Set(s.received || []),
      };
    } catch {
      // Oturum yok / süresi dolmuş / başka mağazanın. Kullanıcıya hata
      // göstermek yanlış olurdu — sıfırdan başlıyoruz, o farkı görmemeli.
      forgetSession(storage, file);
      return null;
    }
  }

  async function baslat() {
    durum.phase = PHASE.BEGINNING;
    duyur();
    const b = ac(
      await api.callMethod(`${METHOD_PREFIX}.upload_begin`, {
        file_name: file.name,
        total_bytes: file.size,
      })
    );
    return {
      uploadId: b.upload_id,
      chunkBytes: b.chunk_bytes,
      chunkCount: b.chunk_count,
      received: new Set(),
    };
  }

  /** Tek parçayı, yeniden denemeleriyle birlikte gönder. */
  async function parcaGonder(index) {
    const dilim = file.slice(index * durum.chunkBytes, (index + 1) * durum.chunkBytes);
    const govde = await encode(dilim);

    for (let deneme = 0; ; deneme += 1) {
      iptalKontrol();
      try {
        return ac(
          await api.callMethod(`${METHOD_PREFIX}.upload_chunk`, {
            upload_id: durum.uploadId,
            index,
            content: govde,
          })
        );
      } catch (e) {
        // Politika reddi kesin karardır — tekrar denemek yalnız gürültü.
        // Ağ kopması ve 5xx denenir (`uploadPolicy.isRetryable`).
        if (deneme >= backoff.length || !isRetryable(e)) throw e;
        await sleep(backoff[deneme]);
      }
    }
  }

  async function calistir() {
    baslangicZamani = now();
    iptalKontrol();

    const oturum = (await devamDene()) || (await baslat());
    durum.uploadId = oturum.uploadId;
    durum.chunkBytes = oturum.chunkBytes;
    durum.chunkCount = oturum.chunkCount;
    durum.resumed = oturum.received.size > 0;
    durum.resumedChunks = oturum.received.size;
    durum.phase = PHASE.UPLOADING;

    if (storage) {
      writeSession(
        storage,
        file,
        { uploadId: durum.uploadId, chunkCount: durum.chunkCount },
        now()
      );
    }

    let gonderilen = oturum.received.size;
    ilerlemeGuncelle(gonderilen);

    for (let i = 0; i < durum.chunkCount; i += 1) {
      if (oturum.received.has(i)) continue;
      iptalKontrol();
      const sonuc = await parcaGonder(i);
      // Sayaç sunucunun saydığından okunuyor. İstemcinin kendi sayması,
      // yeniden gönderilen bir parçayı iki kez saymaya açıktı.
      gonderilen = typeof sonuc?.received === "number" ? sonuc.received : gonderilen + 1;
      ilerlemeGuncelle(gonderilen);
    }

    durum.phase = PHASE.FINISHING;
    duyur();
    const sonuc = ac(
      await api.callMethod(`${METHOD_PREFIX}.upload_finish`, {
        upload_id: durum.uploadId,
      })
    );

    if (storage) forgetSession(storage, file);
    durum.phase = PHASE.DONE;
    durum.percent = 100;
    durum.etaSeconds = 0;
    duyur();
    return sonuc;
  }

  return {
    /** Salt okunur anlık durum. */
    get state() {
      return { ...durum };
    },

    /**
     * Yüklemeyi başlat ya da devam ettir.
     *
     * İkinci çağrı YENİ istek göndermez, ilkinin sözünü döndürür. Sunucuda
     * `Idempotency-Key` olmadığı için istemci tarafındaki tek koruma bu.
     */
    start() {
      if (bitirmeSozu) return bitirmeSozu;
      bitirmeSozu = calistir().catch(async (e) => {
        if (e?.name === "AbortError") {
          durum.phase = PHASE.ABORTED;
        } else {
          durum.phase = PHASE.FAILED;
          durum.error = e;
        }
        duyur();
        throw e;
      });
      return bitirmeSozu;
    },

    /**
     * İptal et — sunucudaki parçaları da temizle.
     *
     * Yalnız isteği kesmek yetmezdi: yarıda kalan parçalar diskte kalır ve
     * altı saat boyunca yer kaplar. `upload_abort` başarısız olursa asıl
     * iptal yine de geçerli; sunucudaki zamanlanmış temizlik devralır.
     */
    async abort() {
      if (storage) forgetSession(storage, file);
      if (!durum.uploadId) {
        durum.phase = PHASE.ABORTED;
        duyur();
        return;
      }
      try {
        await api.callMethod(`${METHOD_PREFIX}.upload_abort`, { upload_id: durum.uploadId });
      } catch {
        /* zamanlanmış temizlik devralır */
      }
      durum.phase = PHASE.ABORTED;
      duyur();
    },
  };
}
