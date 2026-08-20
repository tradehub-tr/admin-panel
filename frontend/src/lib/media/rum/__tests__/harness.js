/**
 * T-123 testleri için jsdom + sahte `PerformanceObserver` düzeneği.
 *
 * NE SAHTE, NE GERÇEK
 * -------------------
 * GERÇEK : `web-vitals` kütüphanesinin kendisi. Testler onu içe aktarır ve
 *          metrikleri gerçekten o hesaplar (LCP değeri, CLS toplaması, INP
 *          p98 mantığı, attribution üretimi). Bizim kodumuz onun ürettiği
 *          metrik nesnesini alır.
 * SAHTE  : `PerformanceObserver` ve `performance` — Node'da tarayıcı
 *          zamanlama API'si yok. Sahte gözlemci, `emit()` ile beslenen
 *          girdileri gerçek kütüphaneye teslim eder.
 *
 * ÖLÇÜLMEZ (dürüstlük notu)
 * -------------------------
 * Bu düzenek GERÇEK bir tarayıcıda çalıştırılmadı. Kanıtladığı şey
 * "toplayıcı, `web-vitals`'ın ürettiği metrikten sözleşmeye uygun gövde
 * üretiyor"dur; "Chrome'da LCP doğru ölçülüyor" DEĞİLDİR. İkincisi
 * `web-vitals`'ın kendi sorumluluğu ve bu depoda doğrulanmadı.
 */

import { JSDOM } from "jsdom";

/** Sahte gözlemcinin desteklediğini söylediği girdi tipleri. */
const SUPPORTED = [
  "navigation",
  "paint",
  "largest-contentful-paint",
  "layout-shift",
  "event",
  "first-input",
  "long-animation-frame",
  "resource",
];

/**
 * jsdom penceresi kur, tarayıcı global'lerini yerleştir.
 *
 * @param {object} [opts]
 * @param {string} [opts.url]
 * @param {string} [opts.html]
 * @param {number} [opts.responseStart] TTFB'nin türeyeceği değer
 * @returns {{window: object, emit: Function, observers: Array,
 *            hide: Function, cleanup: Function, PerformanceEventTiming: Function}}
 */
export function setupBrowser(opts = {}) {
  const dom = new JSDOM(
    opts.html ||
      `<!doctype html><html><body>
         <div data-rum-region="product_detail/main_image"><img id="hero"></div>
       </body></html>`,
    { url: opts.url || "https://panel.test/urun/abc", pretendToBeVisual: true }
  );
  const { window } = dom;

  const observers = [];
  class FakePerformanceObserver {
    static supportedEntryTypes = SUPPORTED;
    constructor(cb) {
      this.cb = cb;
      this.types = [];
      observers.push(this);
    }
    observe(o) {
      this.types.push(o.type || (o.entryTypes && o.entryTypes[0]));
    }
    disconnect() {
      this.types = [];
    }
    takeRecords() {
      return [];
    }
  }

  class PerformanceNavigationTiming {}
  class PerformanceEventTiming {}
  // `interactionId` prototipte OLMAK ZORUNDA: `web-vitals` INP desteğini
  // tam olarak bu özelliğin varlığıyla algılar.
  Object.defineProperty(PerformanceEventTiming.prototype, "interactionId", {
    value: 0,
    configurable: true,
    writable: true,
  });

  const navigationEntry = Object.assign(new PerformanceNavigationTiming(), {
    entryType: "navigation",
    name: opts.url || "https://panel.test/urun/abc",
    type: "navigate",
    startTime: 0,
    duration: 900,
    responseStart: opts.responseStart ?? 120,
    activationStart: 0,
    workerStart: 0,
    fetchStart: 10,
    domainLookupStart: 20,
    connectStart: 30,
    connectEnd: 60,
    requestStart: 80,
    domInteractive: 400,
    domContentLoadedEventStart: 600,
    domContentLoadedEventEnd: 610,
    domComplete: 800,
    loadEventEnd: 820,
    navigationId: 0,
  });

  const performanceStub = {
    now: () => 1500,
    timeOrigin: 0,
    interactionCount: 0,
    getEntriesByType: (t) => (t === "navigation" ? [navigationEntry] : []),
    getEntriesByName: () => [],
  };

  const globals = {
    window,
    self: window,
    document: window.document,
    navigator: window.navigator,
    location: window.location,
    sessionStorage: window.sessionStorage,
    localStorage: window.localStorage,
    performance: performanceStub,
    PerformanceObserver: FakePerformanceObserver,
    PerformanceNavigationTiming,
    PerformanceEventTiming,
    Event: window.Event,
    Blob: window.Blob,
    devicePixelRatio: opts.dpr ?? 2,
    innerWidth: opts.innerWidth ?? 1280,
    addEventListener: window.addEventListener.bind(window),
    removeEventListener: window.removeEventListener.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    requestIdleCallback: (cb) =>
      setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 0),
    cancelIdleCallback: (id) => clearTimeout(id),
  };

  const onceki = new Map();
  for (const [k, v] of Object.entries(globals)) {
    onceki.set(k, Object.getOwnPropertyDescriptor(globalThis, k));
    Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  }

  return {
    window,
    observers,
    PerformanceEventTiming,

    /** Sahte gözlemcilere girdi teslim et. */
    emit(type, entries) {
      for (const o of observers) {
        if (o.types.includes(type)) o.cb({ getEntries: () => entries }, o);
      }
    },

    /** Sayfayı gizle ve `visibilitychange` yay. */
    hide() {
      Object.defineProperty(window.document, "visibilityState", {
        value: "hidden",
        configurable: true,
      });
      window.document.dispatchEvent(new window.Event("visibilitychange", { bubbles: true }));
    },

    cleanup() {
      for (const [k, d] of onceki) {
        if (d) Object.defineProperty(globalThis, k, d);
        else delete globalThis[k];
      }
      window.close();
    },
  };
}

/** Olay döngüsünü birkaç tur çevir — `queueMicrotask` + `setTimeout` zincirleri için. */
export function tick(ms = 40) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Örneklem kararı testin konusu değilse kullanılan, hep seçilen token. */
export const ALWAYS_SAMPLED_TOKEN = "0".repeat(32);

/** LCP girdisi üret. */
export function lcpEntry(window, { url, startTime = 1200 } = {}) {
  return {
    entryType: "largest-contentful-paint",
    startTime,
    duration: 0,
    size: 50000,
    url: url === undefined ? "https://cdn.test/media/abc-w1280.webp" : url,
    element: window.document.getElementById("hero"),
    renderTime: startTime,
    loadTime: startTime - 50,
    navigationId: 0,
  };
}

/** FCP girdisi — CLS ölçümü FCP'den SONRA başlar, bu yüzden gerekli. */
export function fcpEntry() {
  return { entryType: "paint", name: "first-contentful-paint", startTime: 900, duration: 0 };
}

/** Düzen kayması girdisi. */
export function layoutShift(window, value, startTime) {
  return {
    entryType: "layout-shift",
    startTime,
    duration: 0,
    value,
    hadRecentInput: false,
    sources: [{ node: window.document.getElementById("hero") }],
  };
}

/** Etkileşim girdisi (INP). */
export function eventEntry(window, Ctor, { duration = 250, startTime = 500 } = {}) {
  const e = new Ctor();
  Object.assign(e, {
    entryType: "event",
    name: "pointerdown",
    startTime,
    duration,
    processingStart: startTime + 20,
    processingEnd: startTime + 100,
    cancelable: true,
    target: window.document.getElementById("hero"),
  });
  e.interactionId = 1;
  return e;
}
