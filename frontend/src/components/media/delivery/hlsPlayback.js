/**
 * W7 — HLS oynatma kararı + hls.js motoru.
 *
 * `MediaVideo.vue`'nun HLS beyni. Bileşenin dışında duruyor çünkü karar
 * mantığı (`decidePlayback`) ve motor yükleme sözleşmesi (`loadHlsEngine`)
 * tarayıcısız test edilmek zorunda — hls.js jsdom'da çalışmaz, ama kararın
 * kendisi saf fonksiyondur.
 *
 * ## Karar sırası
 *
 * 1. Yerli HLS (Safari/iOS `canPlayType`) → `<source>` etiketi yeter,
 *    hls.js hiç indirilmez.
 * 2. Yerli destek yok ama `hlsSrc` var → hls.js ADAYI. "Aday" çünkü motor
 *    ancak istemcide `Hls.isSupported()` (MSE var mı) derse kurulur;
 *    kurulamazsa progresif `src` tek yol olarak kalır.
 * 3. `hlsSrc` yok → progresif ya da hiçbiri.
 *
 * ## hls.js ana pakete GİRMEZ
 *
 * Motor yalnız `loadHlsEngine` içindeki dinamik `import("hls.js")` ile
 * gelir — `web-vitals`'ın `collector.js`'teki deseniyle birebir aynı
 * gerekçe: paketi kullanmayan (Safari, ya da videosuz sayfa) hiçbir oturum
 * onun baytlarını indirmemeli. Bileşen dosyasında statik `import ... from
 * "hls.js"` YAZILMAZ; bu sözleşme testte kaynak okunarak doğrulanıyor.
 */

/** Oynatma yolları. Dizgeler test çıktısında okunur olsun diye açık. */
export const PLAYBACK = Object.freeze({
  NONE: "none",
  PROGRESSIVE: "progressive",
  NATIVE_HLS: "native-hls",
  HLS_JS: "hls-js",
});

/**
 * Hangi yolun deneneceğine karar ver. Saf fonksiyon — DOM'a dokunmaz.
 *
 * @param {object} girdi
 * @param {string}  [girdi.hlsSrc]    `.m3u8` manifesti
 * @param {string}  [girdi.src]       progresif kaynak
 * @param {boolean} [girdi.nativeHls] tarayıcı HLS'i yerli çözüyor mu
 * @returns {string} `PLAYBACK` üyelerinden biri
 */
export function decidePlayback({ hlsSrc = "", src = "", nativeHls = false } = {}) {
  if (hlsSrc && nativeHls) return PLAYBACK.NATIVE_HLS;
  if (hlsSrc) return PLAYBACK.HLS_JS;
  if (src) return PLAYBACK.PROGRESSIVE;
  return PLAYBACK.NONE;
}

/**
 * hls.js'i getir ve ortamın onu ÇALIŞTIRABİLDİĞİNİ doğrula. Geç ve
 * savunmacı — `collector.js`'teki `loadVitals` ile aynı duruş: paket yoksa,
 * import patlarsa ya da MSE desteklenmiyorsa `null` döner ve çağıran
 * progresif kaynağa düşer. Bu fonksiyon ASLA fırlatmaz.
 *
 * @param {Function} [importer] test için enjekte edilebilir `import()` sarmalı
 * @returns {Promise<object|null>} `Hls` sınıfı ya da `null`
 */
export async function loadHlsEngine(importer = () => import("hls.js")) {
  try {
    const mod = await importer();
    const Hls = mod?.default ?? mod;
    if (typeof Hls?.isSupported === "function" && Hls.isSupported()) return Hls;
    return null;
  } catch {
    return null;
  }
}

/**
 * Motoru videoya bağla ve manifesti yükle.
 *
 * Hata sözleşmesi (hls.js API dokümanındaki öneri):
 *   - ölümcül OLMAYAN hatalar → hls.js kendi kendine toparlar, karışılmaz.
 *   - ölümcül MEDIA_ERROR → BİR kez `recoverMediaError()` denenir (kod
 *     çözücü takılması çoğu zaman kurtulur); ikincisinde motor kapatılır.
 *   - diğer ölümcüller (ağ dahil) → motor kapatılır, `onFatal` çağrılır;
 *     çağıran progresif kaynağa düşmekten ya da `error` yaymaktan sorumlu.
 *
 * @param {object} Hls       `loadHlsEngine`'in verdiği sınıf
 * @param {object} videoEl   bağlanacak `<video>` elementi
 * @param {string} hlsSrc    manifest adresi
 * @param {object} [opts]
 * @param {Function} [opts.onFatal] `(data) => void`
 * @returns {{destroy: Function}} en azından `destroy`'u olan motor örneği
 */
export function startHlsPlayback(Hls, videoEl, hlsSrc, { onFatal } = {}) {
  const hls = new Hls();
  let mediaRecoveryUsed = false;

  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (!data?.fatal) return;
    if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !mediaRecoveryUsed) {
      mediaRecoveryUsed = true;
      hls.recoverMediaError();
      return;
    }
    hls.destroy();
    if (typeof onFatal === "function") onFatal(data);
  });

  hls.loadSource(hlsSrc);
  hls.attachMedia(videoEl);
  return hls;
}
