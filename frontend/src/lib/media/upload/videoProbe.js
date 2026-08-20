/**
 * Video ölçümü — `mediabunny` ile, ANA İŞ PARÇACIĞINDA.
 *
 * **Neden işçide değil.** İşçide olmasını isterdik; T-091 ölçümün Web
 * Worker'da koşmasını istiyor ve video en pahalı ölçüm. Ama `mediabunny`
 * devingen içe aktarılıyor (~540 KB; her yükleme akışına statik bağlamak
 * yalnız görsel yükleyen kullanıcıya da bu bedeli ödetirdi) ve devingen içe
 * aktarma işçi paketinde kod bölmesi üretiyor. Vite'ın işçi çıktı biçimi
 * varsayılan olarak `iife` ve bölünmüş çıktıyı kabul etmiyor:
 *
 *     Invalid value "iife" for option "output.format" —
 *     UMD and IIFE output formats are not supported for code-splitting builds
 *
 * (2026-08-19, `vite build` ile ÖLÇÜLDÜ.) Bunu işçide çözmenin yolu
 * `vite.config.js`'te `worker: { format: "es" }` — yapı yapılandırması bu
 * görevin kapsamı dışında. Bu yüzden bugünkü ayrım şu: görsel ölçümü işçide,
 * video ölçümü ana iş parçacığında. **Video ölçülürken ana iş parçacığı
 * bloklanabilir; bu ÖLÇÜLMEDİ.**
 *
 * Paket `compress.video.js` üzerinden zaten bağımlılıkta; yeni bağımlılık
 * eklenmedi.
 */

/**
 * Ölçümü YERİNDE doldur — `probe.js`'in ürettiği nesne üzerine yazar.
 *
 * Ölçülemeyen alan `null` bırakılıyor. `mediabunny` yüklenemez ya da dosya
 * açılamazsa `decodeFailed` işaretleniyor; ön kontrol bunu `manual_review`
 * yapıyor — sunucudaki `probe_unavailable` davranışının aynısı.
 */
export async function probeVideoWith(file, olcum) {
  try {
    const mb = await import("mediabunny");
    const input = new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(file) });

    const sure = await input.computeDuration();
    if (sure > 0) olcum.durationS = sure;

    const track = await input.getPrimaryVideoTrack();
    if (track) {
      olcum.width = await track.getDisplayWidth();
      olcum.height = await track.getDisplayHeight();
      olcum.videoCodec = track.codec || null;
      olcum.decoded = Boolean(olcum.width && olcum.height);
      // Kare hızı her konteynerde bulunmuyor; yoksa `null` bırakılıyor.
      // `false` ya da 0 yazmak, "ölçtüm ve sıfır çıktı" demek olurdu.
      try {
        const istatistik = await track.computePacketStats?.(100);
        if (istatistik?.averagePacketRate) olcum.frameRate = istatistik.averagePacketRate;
      } catch {
        /* kare hızı ölçülemedi */
      }
    }

    const ses = await input.getPrimaryAudioTrack?.();
    if (ses) olcum.audioCodec = ses.codec || null;
  } catch (e) {
    olcum.decodeFailed = true;
    olcum.probeError = String(e?.message || e);
  }
  return olcum;
}
