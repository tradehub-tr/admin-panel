/**
 * Ön kontrolü çalıştır — işçi varsa işçide, yoksa aynı kodla burada.
 *
 * **Yedek yol gerçek bir yol.** Web Worker kurulamadığı ortamlar var:
 * Storybook'un bazı yapılandırmaları, `file://` üzerinden açılan bir yapı,
 * eski bir WebView. İşçi kurulamayınca ön kontrolü ATLAMAK, kullanıcıyı
 * 80 MB'lık bir yüklemenin sonunda reddedilmeye göndermek demekti — aynı
 * `probe.js` ana iş parçacığında çağrılıyor. Akıcılık kaybı ilan ediliyor:
 * `workerUsed: false` ile dönülüyor.
 *
 * **Tek işçi, sıralı kuyruk.** Paralel işçi havuzu kurulmadı: ölçüm zaten
 * I/O ağırlıklı ve her ek işçi kendi paket kopyasını yüklüyor. Havuzun
 * kazandıracağı ÖLÇÜLMEDİ; ölçmeden karmaşıklık eklemek yerine tek işçiyle
 * başlanıyor.
 *
 * **Video işçiye gitmiyor.** Gerekçe `videoProbe.js` başlığında: `mediabunny`
 * devingen içe aktarması işçi paketinde kod bölmesi üretiyor ve Vite'ın
 * varsayılan işçi biçimi (`iife`) bunu reddediyor — üretim yapısı kırılıyor.
 * Görsel ölçümü işçide; video ana iş parçacığında ve orada bloklama olabilir.
 */

import { ACTION, evaluate, getSlotPolicy } from "./preflight.js";
import { isVideoFile, probeFile } from "./probe.js";
import { probeVideoWith } from "./videoProbe.js";

let isci = null;
let iscKurulamadi = false;
let sayac = 0;
const bekleyenler = new Map();

function workerAl() {
  if (isci || iscKurulamadi) return isci;
  try {
    isci = new Worker(new URL("./preflight.worker.js", import.meta.url), { type: "module" });
    isci.onmessage = (event) => {
      const { id, measure, error } = event.data || {};
      const bekleyen = bekleyenler.get(id);
      if (!bekleyen) return;
      bekleyenler.delete(id);
      if (error) bekleyen.reject(new Error(error));
      else bekleyen.resolve(measure);
    };
    isci.onerror = () => {
      // İşçi tamamen düştü: bekleyen herkesi reddet ve bir daha kurma —
      // yeniden denemek aynı hatayı her dosyada tekrarlardı.
      iscKurulamadi = true;
      for (const [, b] of bekleyenler) b.reject(new Error("preflight worker error"));
      bekleyenler.clear();
      isci = null;
    };
  } catch {
    iscKurulamadi = true;
    isci = null;
  }
  return isci;
}

/** Test ve sayfa kapanışı için: işçiyi bırak. */
export function disposePreflightWorker() {
  isci?.terminate?.();
  isci = null;
  bekleyenler.clear();
}

function iscideOlc(file, opts) {
  const w = workerAl();
  if (!w) return null;
  sayac += 1;
  const id = sayac;
  return new Promise((resolve, reject) => {
    bekleyenler.set(id, { resolve, reject });
    try {
      w.postMessage({ id, file, opts });
    } catch (e) {
      bekleyenler.delete(id);
      reject(e);
    }
  });
}

/**
 * Bir dosyayı ölç ve slot politikasına vur.
 *
 * @param {File} file
 * @param {{slotKey?: string, count?: number}} opts
 * @returns {Promise<{action, findings, slot, measure, workerUsed}>}
 */
export async function runPreflight(file, { slotKey = "", count = 1 } = {}) {
  const slot = getSlotPolicy(slotKey);
  const probeOpts = {
    // Tavan ölçüm katmanına da veriliyor: aşan görsel HİÇ ÇÖZÜLMESİN.
    maxMegapixels: slot?.accept?.maxMegapixelsHard || 0,
    // Alfa yalnız politikada bir alfa kuralı olan slotlarda ölçülüyor;
    // gereksiz yere her görseli çözmek ölçümün en pahalı adımı.
    wantAlpha: Boolean(slot?.require?.alphaChannel),
  };

  let measure = null;
  let workerUsed = false;

  // Video işçiye GİTMİYOR — gerekçe `videoProbe.js` başlığında: `mediabunny`
  // devingen içe aktarması işçi paketinde kod bölmesi üretiyor ve Vite'ın
  // varsayılan işçi biçimi (`iife`) bölünmüş çıktıyı reddediyor. Görsel
  // ölçümü işçide kalıyor; ayrımın bedeli ilan ediliyor.
  const videoMu = isVideoFile(file);
  if (!videoMu) {
    try {
      const iscSonuc = iscideOlc(file, probeOpts);
      if (iscSonuc) {
        measure = await iscSonuc;
        workerUsed = true;
      }
    } catch {
      // İşçi başarısız oldu — ana iş parçacığında aynı ölçüm yapılır.
      measure = null;
    }
  }
  if (!measure) {
    measure = await probeFile(file, {
      ...probeOpts,
      probeVideoFn: videoMu ? probeVideoWith : null,
    });
  }

  const sonuc = evaluate(measure, { slotKey, count });
  return { ...sonuc, workerUsed };
}

/**
 * Bir kuyruğu sırayla ölç.
 *
 * `onResult` her dosya bitince çağrılır — ekran hepsini beklemeden dolar.
 * Sayım (`max_count`) kuyruktaki sıraya göre artıyor: 13. ürün görselinde
 * `count_exceeded` çıkması için ilk 12'nin sayılmış olması gerekiyor.
 */
export async function runPreflightQueue(files, { slotKey = "", startCount = 0, onResult } = {}) {
  const sonuclar = [];
  let sayi = startCount;
  for (const file of files) {
    sayi += 1;
    const sonuc = await runPreflight(file, { slotKey, count: sayi });
    sonuclar.push(sonuc);
    onResult?.(file, sonuc);
  }
  return sonuclar;
}

export { ACTION };
