/**
 * Ön kontrol işçisi — ölçüm ana iş parçacığından ÇIKARILIYOR.
 *
 * **Neden işçi.** T-091 kabul ölçütü: "50 dosyalık yüklemede arayüz akıcı
 * kalıyor (ana thread bloklanması <50 ms)". Ölçümün pahalı kısımları —
 * `createImageBitmap` çözümü, alfa örneklemesi, `mediabunny` ile video
 * ayrıştırma — ana iş parçacığında yapılırsa 50 dosyalık bir bırakma ekranı
 * saniyelerce dondurur. Bu dosya yalnız bir kapı: iş `probe.js`'te, o da hem
 * burada hem ana iş parçacığında (yedek yol) aynı kodla çalışıyor.
 *
 * `File` nesneleri yapılandırılmış klonlamayla işçiye geçiyor; içerik
 * kopyalanmıyor, referans taşınıyor.
 */

import { probeFile } from "./probe.js";

self.onmessage = async (event) => {
  const { id, file, opts } = event.data || {};
  try {
    const measure = await probeFile(file, opts || {});
    self.postMessage({ id, measure });
  } catch (e) {
    // İşçi çökmemeli: tek bir bozuk dosya bütün kuyruğun ölçümünü
    // durdurursa geri kalan 49 dosya sebepsiz bekler.
    self.postMessage({ id, error: String(e?.message || e) });
  }
};
