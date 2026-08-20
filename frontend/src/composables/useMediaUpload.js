/**
 * Yükleme kuyruğu — ön kontrol, sıkıştırma, oturum ve devam bir arada (T-081 · T-091).
 *
 * **Sıralama kasıtlı.** Bir dosya şu kapılardan bu sırayla geçiyor:
 *
 *     ölç → slot politikası → sunucu genel politikası → sıkıştır → gönder
 *
 * Ölçüm en başta, çünkü 80 megapiksellik bir görseli önce sıkıştırıp sonra
 * reddetmek, kullanıcıyı boşuna bekletmek olurdu. Sıkıştırma en sonda, çünkü
 * politika ORİJİNAL dosyaya uygulanmalı: küçültülmüş bir kopyayı denetlemek,
 * kullanıcının yüklediği dosyayı değil bizim ürettiğimizi denetlemek demekti.
 *
 * **İhlal yüklemeyi BAŞLATMIYOR.** T-091'in kabul ölçütü bu. `blocked`
 * durumundaki bir satır kuyrukta durur, sebebi ve düzeltme yolu görünür, ama
 * tek bayt gitmez.
 *
 * **Son söz sunucunun.** Buradaki hiçbir kontrol sunucudakinin yerine
 * geçmiyor; `upload_policy.check` her yolda yeniden çalışıyor. Ön kontrolün
 * tek işi kullanıcıyı beklemekten kurtarmak.
 *
 * Kullanım:
 *
 *     const q = useMediaUpload({ slotKey: "product.image" });
 *     q.add(files);
 *     // q.items · q.stats · q.start() · q.retry(id) · q.abort(id)
 */

import { computed, onScopeDispose, ref, toValue } from "vue";

import api from "@/utils/api";
import { prepareMedia } from "@/lib/media/compress.js";
import { duplicateFinding, findDuplicateInLibrary } from "@/lib/media/upload/dedupCheck.js";
import { disposePreflightWorker, runPreflight } from "@/lib/media/upload/preflightClient.js";
import { ACTION, SEVERITY, hasBlocker } from "@/lib/media/upload/preflight.js";
import {
  PHASE,
  createUploadSession,
  pruneSessions,
  readSession,
  uploadSingleShot,
} from "@/lib/media/upload/session.js";
import * as policy from "@/utils/uploadPolicy";

/** Kuyruk satırının durumu. */
export const ITEM_STATUS = {
  QUEUED: "queued",
  CHECKING: "checking",
  BLOCKED: "blocked",
  // T-042: içerik satıcının kütüphanesinde zaten var — satır kullanıcı
  // kararını bekliyor. Bu bir ENGEL değil: `proceed(id)` ("yine de yükle")
  // satırı READY yapar; sunucu da aynı içeriği zaten tekilleştiriyor.
  DUPLICATE: "duplicate",
  READY: "ready",
  PREPARING: "preparing",
  UPLOADING: "uploading",
  DONE: "done",
  FAILED: "failed",
  ABORTED: "aborted",
};

let sayac = 0;

export function useMediaUpload(options = {}) {
  const {
    slotKey = "",
    // İki dosya aynı anda. Daha fazlası tarayıcının bağlantı havuzunu doldurup
    // ilerleme bildirimlerini seyrekleştiriyor; biri ise ağı boş bırakıyor.
    concurrency = 2,
    autoStart = true,
    compress = true,
    storage = typeof localStorage !== "undefined" ? localStorage : null,
  } = options;

  const items = ref([]);
  const running = ref(0);
  const workerActive = ref(null);

  // Yarım kalan eski kayıtlar sunucuda zaten silinmiş olacak; yerelde
  // tutmanın tek etkisi her açılışta boşuna `upload_status` sormak.
  if (storage) pruneSessions(storage);

  const stats = computed(() => {
    const s = {
      total: items.value.length,
      blocked: 0,
      done: 0,
      failed: 0,
      uploading: 0,
      pending: 0,
      warnings: 0,
    };
    for (const it of items.value) {
      if (it.status === ITEM_STATUS.BLOCKED) s.blocked += 1;
      else if (it.status === ITEM_STATUS.DONE) s.done += 1;
      else if (it.status === ITEM_STATUS.FAILED) s.failed += 1;
      else if (it.status === ITEM_STATUS.UPLOADING || it.status === ITEM_STATUS.PREPARING)
        s.uploading += 1;
      else s.pending += 1;
      s.warnings += it.findings.filter((f) => f.severity === SEVERITY.WARN).length;
    }
    return s;
  });

  /** Yüklenmeye hazır (engellenmemiş, bitmemiş) satırlar. */
  const uploadable = computed(() =>
    items.value.filter((i) => i.status === ITEM_STATUS.READY || i.status === ITEM_STATUS.QUEUED)
  );

  const overallPercent = computed(() => {
    const sayilan = items.value.filter((i) => i.status !== ITEM_STATUS.BLOCKED);
    if (!sayilan.length) return 0;
    return Math.round(sayilan.reduce((t, i) => t + i.percent, 0) / sayilan.length);
  });

  function bul(id) {
    return items.value.find((i) => i.id === id) || null;
  }

  /**
   * Dosyaları kuyruğa ekle ve ölçümlerini başlat.
   *
   * Aynı dosya iki kez bırakılırsa (sürükle-bırak + yapıştır) tek satır
   * kalır: parmak izi ad + boyut + değişim zamanı.
   */
  function add(files) {
    const gelen = Array.from(files || []).filter(Boolean);
    const yeni = [];
    for (const file of gelen) {
      const fp = `${file.name}|${file.size}|${file.lastModified}`;
      if (items.value.some((i) => i.fingerprint === fp && i.status !== ITEM_STATUS.FAILED))
        continue;
      sayac += 1;
      const satir = {
        id: `u${sayac}`,
        file,
        fingerprint: fp,
        name: file.name,
        size: file.size,
        status: ITEM_STATUS.QUEUED,
        percent: 0,
        etaSeconds: null,
        findings: [],
        measure: null,
        action: null,
        resumable: Boolean(storage && readSession(storage, file)),
        resumed: false,
        duplicate: null,
        result: null,
        error: null,
        compressedFrom: null,
        _session: null,
        _controller: null,
      };
      items.value.push(satir);
      // ÇIPLAK `satir` DEĞİL, dizideki REAKTİF vekili biriktirilir. `push`
      // ham nesneyi saklar; ham referans üzerinden yapılan mutasyonları Vue
      // GÖREMEZ — kuyruk satırı ekranda sonsuza dek "sırada" görünüyordu
      // (W5 kablolamasında canlı panelde ölçüldü; birim testleri değerleri
      // doğrudan okuduğu için yakalayamadı). Diğer bütün yollar (`bul`,
      // `start`) satırı zaten `items.value` üzerinden — vekil olarak — alıyor.
      yeni.push(items.value[items.value.length - 1]);
    }
    if (yeni.length) onKontrol(yeni);
    return yeni;
  }

  /** Satırların ön kontrolünü sırayla koştur. */
  async function onKontrol(satirlar) {
    // Sunucunun genel sınırları (uzantı, bayt, tek-istek eşiği) bir kez
    // alınır. Alınamazsa ön kontrolün o katmanı atlanır — kapıyı kapatmak
    // değil, sunucuya sormak doğru davranış.
    await policy.loadLimits();

    const anahtar = toValue(slotKey) || "";
    for (const satir of satirlar) {
      if (satir.status !== ITEM_STATUS.QUEUED) continue;
      satir.status = ITEM_STATUS.CHECKING;
      try {
        // `count`: bu slota giden kaçıncı dosya olduğu — `max_count` için.
        const sayi = items.value.filter(
          (i) => i.status !== ITEM_STATUS.BLOCKED && i.status !== ITEM_STATUS.ABORTED
        ).length;
        const sonuc = await runPreflight(satir.file, { slotKey: anahtar, count: sayi });
        if (workerActive.value === null) workerActive.value = sonuc.workerUsed;

        satir.measure = sonuc.measure;
        satir.action = sonuc.action;
        satir.findings = sonuc.findings.slice();

        // Sunucunun genel politikası (slottan bağımsız): uzantı yasak listesi,
        // tür başına bayt tavanı, tehlikeli içerik. Slot seçilmemiş serbest
        // yüklemede tek kapı bu.
        const genel = await policy.precheck(satir.file, { media: true });
        if (!genel.ok) {
          satir.findings.push({
            reason: genel.code,
            severity: SEVERITY.BLOCK,
            params: genel.params || {},
            server: true,
          });
        }

        // T-042: dosya kütüphanede zaten var mı — UYARI, engel değil.
        // Zaten engellenmiş satır için sorulmaz (hash + istek boşa gider);
        // kontrol HERHANGİ bir sebeple yapılamazsa `null` döner ve satır
        // normal akışına devam eder (fail-open, `dedupCheck.js` başlığı).
        if (!hasBlocker(satir.findings)) {
          satir.duplicate = await findDuplicateInLibrary(satir.file, {
            call: (method, args) => api.callMethod(method, args),
          });
          if (satir.duplicate) satir.findings.push(duplicateFinding(satir.duplicate));
        }

        satir.status = hasBlocker(satir.findings)
          ? ITEM_STATUS.BLOCKED
          : satir.duplicate
            ? ITEM_STATUS.DUPLICATE
            : ITEM_STATUS.READY;
      } catch (e) {
        // Ölçüm çöktü. Reddetmiyoruz — sunucu bakacak; ama sessiz de
        // geçmiyoruz, satırda "ölçülemedi" uyarısı duruyor.
        satir.findings.push({
          reason: "probe_unavailable",
          severity: SEVERITY.WARN,
          params: { detail: String(e?.message || e) },
        });
        satir.action = ACTION.MANUAL_REVIEW;
        satir.status = ITEM_STATUS.READY;
      }
    }
    if (autoStart) start();
  }

  /** Boştaki yuvalar dolana kadar sıradaki satırları başlat. */
  function start() {
    while (running.value < concurrency) {
      const sonraki = items.value.find((i) => i.status === ITEM_STATUS.READY);
      if (!sonraki) break;
      calistir(sonraki);
    }
  }

  async function calistir(satir) {
    running.value += 1;
    satir.status = ITEM_STATUS.PREPARING;
    satir.error = null;
    const kontrol = new AbortController();
    satir._controller = kontrol;

    try {
      let gonderilecek = satir.file;

      if (compress) {
        // Cihaz bütçesine göre küçültme. `prepareMedia` başaramazsa
        // ORİJİNALİ döndürüyor — sıkıştırma başarısızlığı yüklemeyi
        // düşürmüyor, iş sunucuya devrediliyor.
        try {
          const hazir = await prepareMedia(satir.file);
          if (hazir?.blob && hazir.blob !== satir.file) {
            gonderilecek = new File([hazir.blob], hazir.name || satir.file.name, {
              type: hazir.blob.type,
              lastModified: satir.file.lastModified,
            });
            satir.compressedFrom = satir.file.size;
          }
        } catch {
          gonderilecek = satir.file;
        }
      }

      if (kontrol.signal.aborted) throw iptal();

      satir.status = ITEM_STATUS.UPLOADING;

      if (!policy.needsChunking(gonderilecek)) {
        satir.percent = 5;
        satir.result = await uploadSingleShot(gonderilecek, { api, signal: kontrol.signal });
      } else {
        const oturum = createUploadSession(gonderilecek, {
          api,
          storage,
          signal: kontrol.signal,
          onProgress: (d) => {
            satir.percent = Math.round(d.percent);
            satir.etaSeconds = d.etaSeconds;
            satir.resumed = d.resumed;
            if (d.phase === PHASE.RESUMING) satir.status = ITEM_STATUS.UPLOADING;
          },
        });
        satir._session = oturum;
        satir.result = await oturum.start();
      }

      satir.percent = 100;
      satir.etaSeconds = 0;
      satir.status = ITEM_STATUS.DONE;
    } catch (e) {
      if (e?.name === "AbortError") {
        satir.status = ITEM_STATUS.ABORTED;
      } else {
        satir.status = ITEM_STATUS.FAILED;
        satir.error = e?.message || String(e);
        satir.errorCode = e?.code || "";
        // Devam edebilir bir hata mı — ekran "yeniden dene" mi yoksa
        // "dosyayı düzelt" mi diyeceğini buradan biliyor.
        satir.retryable = policy.isRetryable(e);
      }
    } finally {
      satir._controller = null;
      running.value -= 1;
      // Bir yuva boşaldı; sıradaki hemen girsin.
      if (autoStart) start();
    }
  }

  function iptal() {
    const e = new Error("Yükleme iptal edildi");
    e.name = "AbortError";
    return e;
  }

  /**
   * Yarıda kalan satırı yeniden dene.
   *
   * Parçalı yüklemede bu GERÇEKTEN kaldığı yerden devam eder: oturum kimliği
   * hâlâ kayıtlı ve `upload_status` sunucudaki parçaları söyler.
   */
  function retry(id) {
    const satir = bul(id);
    if (!satir) return;
    if (satir.status !== ITEM_STATUS.FAILED && satir.status !== ITEM_STATUS.ABORTED) return;
    satir.status = ITEM_STATUS.READY;
    satir.error = null;
    satir.percent = 0;
    if (autoStart) start();
  }

  /**
   * "Yine de yükle" — kopya uyarısına rağmen kullanıcının bilinçli kararı
   * (T-042). Uyarı bulgusu satırda KALIR: karar verildikten sonra da neyin
   * kopyası olduğu görünür olmalı. `start()` koşulsuz: düğmeye basmak açık
   * bir kullanıcı eylemi, `autoStart` tercihini beklemez.
   */
  function proceed(id) {
    const satir = bul(id);
    if (!satir || satir.status !== ITEM_STATUS.DUPLICATE) return;
    satir.status = ITEM_STATUS.READY;
    start();
  }

  /** Tek satırı iptal et — sunucudaki parçalar da temizlenir. */
  async function abort(id) {
    const satir = bul(id);
    if (!satir) return;
    satir._controller?.abort();
    await satir._session?.abort();
    satir.status = ITEM_STATUS.ABORTED;
    satir.etaSeconds = null;
  }

  async function abortAll() {
    await Promise.all(
      items.value
        .filter((i) => i.status === ITEM_STATUS.UPLOADING || i.status === ITEM_STATUS.PREPARING)
        .map((i) => abort(i.id))
    );
  }

  /** Satırı kuyruktan çıkar; sürüyorsa önce iptal et. */
  async function remove(id) {
    const satir = bul(id);
    if (!satir) return;
    if (satir.status === ITEM_STATUS.UPLOADING || satir.status === ITEM_STATUS.PREPARING) {
      await abort(id);
    }
    items.value = items.value.filter((i) => i.id !== id);
  }

  function clearFinished() {
    items.value = items.value.filter(
      (i) => i.status !== ITEM_STATUS.DONE && i.status !== ITEM_STATUS.ABORTED
    );
  }

  onScopeDispose(() => {
    // Sayfadan çıkılırken süren istekleri kesiyoruz; `upload_abort`
    // beklenmiyor (sayfa gidiyor), sunucudaki zamanlanmış temizlik devralır.
    for (const it of items.value) it._controller?.abort();
    disposePreflightWorker();
  });

  return {
    items,
    stats,
    uploadable,
    overallPercent,
    workerActive,
    add,
    start,
    retry,
    proceed,
    abort,
    abortAll,
    remove,
    clearFinished,
  };
}
