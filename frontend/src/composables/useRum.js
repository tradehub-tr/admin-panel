/**
 * T-123 — RUM toplayıcısının Vue köprüsü.
 *
 * Toplayıcının kendisi çerçeveden bağımsızdır (`@/lib/media/rum`); bu
 * composable yalnız YAŞAM DÖNGÜSÜ ekler: component sökülürken dinleyicileri
 * çözer ve kuyrukta kalanı gönderir.
 *
 * MONTAJ — bu dosyanın işi DEĞİL
 * ------------------------------
 * Toplayıcı uygulama başına BİR kez kurulmalıdır. Doğru yer `main.js`'tir ve
 * `main.js` bu görevin dokunma yetkisi DIŞINDA (orkestratörde). Montajın
 * nasıl yapılacağı aşağıda tarif edildi; burada yapılmadı.
 *
 * `main.js` içine, `app.mount()` çağrısından SONRA:
 *
 *     import { startRum } from "@/composables/useRum";
 *     startRum({ sampleRate: 0.1 });
 *
 * `app.mount()`'tan sonra olmasının nedeni: `web-vitals` LCP'yi ilk boyamaya
 * kadar gözler; toplayıcıyı mount'tan önce kurmak ölçümü değiştirmez ama
 * `PerformanceObserver` kurulumunu kritik yola sokar. Sonrasında kurmak
 * ölçümü KAYBETTİRMEZ, çünkü `PerformanceObserver` `buffered: true` ile
 * geçmiş girdileri de teslim eder — `web-vitals` bunu kendi içinde yapar.
 *
 * Bir Vue component'i içinden kullanmak gerekirse `useRum()` çağrılır;
 * o zaman toplayıcı component'in ömrüne bağlanır.
 */

import { getCurrentInstance, onBeforeUnmount, readonly, ref } from "vue";

// Göreli yol BİLİNÇLİ (`@/lib/...` değil): bu dosya `node --test` altında
// doğrudan içe aktarılıyor ve Node `@` alias'ını çözmez. Alias kullanan
// composable'lar (`useCropStudio`) testte Vite sunucusu ayağa kaldırmak
// zorunda kalıyor; telemetri için o maliyet gereksiz.
import { DEFAULT_SAMPLE_RATE, createRumCollector } from "../lib/media/rum/index.js";

/** Uygulama ömrü boyunca tek toplayıcı. `startRum` iki kez çağrılırsa
 *  ikincisi yok sayılır — çift kayıt her metriği iki kez gönderirdi. */
let tekil = null;

/**
 * Uygulama genelinde toplayıcıyı başlat. **Asla fırlatmaz.**
 *
 * @param {object} [opts] `createRumCollector` seçenekleri
 * @returns {object|null} toplayıcı, ya da kurulamadıysa `null`
 */
export function startRum(opts = {}) {
  try {
    if (tekil) return tekil;
    tekil = createRumCollector({ sampleRate: DEFAULT_SAMPLE_RATE, ...opts });
    return tekil;
  } catch {
    // Telemetri kurulumu uygulamanın açılışını engelleyemez.
    return null;
  }
}

/** Çalışan toplayıcıyı durdur ve tekili sıfırla. **Asla fırlatmaz.** */
export function stopRum() {
  try {
    const t = tekil;
    tekil = null;
    return t ? t.stop() : Promise.resolve("empty");
  } catch {
    return Promise.resolve("failed");
  }
}

/** Test ve hot-reload için: tekili sıfırla, durdurmadan. */
export function resetRumSingleton() {
  tekil = null;
}

/**
 * Component ömrüne bağlı RUM toplayıcısı.
 *
 * Uygulama genelinde ölçüm için `startRum()` yeğdir; bu composable tek bir
 * ekranı ölçmek ya da toplayıcı durumunu arayüzde göstermek içindir.
 *
 * @param {object} [opts] `createRumCollector` seçenekleri
 * @returns {{sampled: Readonly<import("vue").Ref<boolean>>,
 *            queued: Readonly<import("vue").Ref<number>>,
 *            lastEvent: Readonly<import("vue").Ref<string>>,
 *            flush: Function, stop: Function}}
 */
export function useRum(opts = {}) {
  const sampled = ref(false);
  const queued = ref(0);
  const lastEvent = ref("");

  let toplayici = null;

  try {
    toplayici = createRumCollector({
      ...opts,
      onDiagnostic(kod, ayrinti) {
        // Tanılama yalnız yerel duruma yazılır; konsola BASILMAZ.
        // Telemetrinin kendi gürültüsü, ölçtüğü sayfanın konsolunu
        // kirletmemeli.
        lastEvent.value = kod;
        queued.value = toplayici ? toplayici.queueSize() : 0;
        if (typeof opts.onDiagnostic === "function") {
          try {
            opts.onDiagnostic(kod, ayrinti);
          } catch {
            /* yoksay */
          }
        }
      },
    });
    sampled.value = toplayici.isSampled();
  } catch {
    toplayici = null;
  }

  const flush = () => (toplayici ? toplayici.flush() : Promise.resolve("empty"));
  const stop = () => (toplayici ? toplayici.stop() : Promise.resolve("empty"));

  // Lifecycle hook'u YALNIZ senkron setup içinde ve component varsa bağla
  // (kural 9 / 7). `useRum` bir component dışından da çağrılabilir.
  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      stop();
    });
  }

  return {
    sampled: readonly(sampled),
    queued: readonly(queued),
    lastEvent: readonly(lastEvent),
    flush,
    stop,
  };
}
