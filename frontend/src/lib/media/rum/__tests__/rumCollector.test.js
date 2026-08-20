/**
 * T-123 — toplayıcı davranışı (örneklem kapısı, kuyruk, boşaltma) ve
 * bitirme koşulu #2'nin toplayıcı ucu: **uç yokken sayfa kırılmıyor.**
 *
 * `web-vitals` burada SAHTE — konu kütüphanenin ölçümü değil, toplayıcının
 * akışı. Gerçek kütüphaneyle yapılan doğrulama `rumCollectorVitals.test.js`
 * içinde.
 *
 *   ÖLÇÜLÜR  — örnekleme girmeyen oturumda hiç dinleyici kurulmadığı;
 *              metriklerin kuyruğa girip sayfa gizlenince gönderildiği;
 *              404/500/ağsız uçta toplayıcının ne fırlattığı ne de
 *              reddedilen söz döndürdüğü; `web-vitals` patlarsa toplayıcının
 *              hayatta kaldığı.
 *   ÖLÇÜLMEZ — Gerçek tarayıcı yaşam döngüsü (bfcache, iOS kapanışı).
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { createRumCollector } from "../collector.js";
import { ALWAYS_SAMPLED_TOKEN, setupBrowser, tick } from "./harness.js";

/** Geri çağrıları elde tutan sahte `web-vitals`. */
function sahteVitals() {
  const cb = {};
  const kayitli = [];
  const mk = (ad) => (fn) => {
    cb[ad] = fn;
    kayitli.push(ad);
  };
  return {
    kayitli,
    /** Bir metriği kütüphane raporlamış gibi ilet. */
    rapor(ad, metric) {
      if (cb[ad]) cb[ad](metric);
    },
    api: {
      onLCP: mk("LCP"),
      onCLS: mk("CLS"),
      onINP: mk("INP"),
      onTTFB: mk("TTFB"),
      onFCP: mk("FCP"),
    },
  };
}

function metrik(name, value, extra = {}) {
  return { name, value, rating: "good", navigationType: "navigate", ...extra };
}

function yakalayanTransport() {
  const govdeler = [];
  return {
    govdeler,
    transport: {
      send(g) {
        govdeler.push(JSON.parse(g));
        return Promise.resolve("ok");
      },
    },
  };
}

// ── Örneklem kapısı ────────────────────────────────────────────────

test("örnekleme girmeyen oturumda HİÇ dinleyici kurulmaz", async () => {
  const env = setupBrowser();
  try {
    const v = sahteVitals();
    const t = createRumCollector({ vitals: v.api, sampleRate: 0, token: ALWAYS_SAMPLED_TOKEN });
    await t.ready;
    assert.equal(t.isSampled(), false);
    assert.deepEqual(v.kayitli, [], "örnekleme dışıyken gözlemci kuruldu");
  } finally {
    env.cleanup();
  }
});

test("örnekleme giren oturumda dört metrik için dinleyici kurulur", async () => {
  const env = setupBrowser();
  try {
    const v = sahteVitals();
    const t = createRumCollector({ vitals: v.api, sampleRate: 1, token: ALWAYS_SAMPLED_TOKEN });
    await t.ready;
    assert.deepEqual(v.kayitli.sort(), ["CLS", "INP", "LCP", "TTFB"]);
  } finally {
    env.cleanup();
  }
});

test("örnekleme dışı oturumda metrik raporlansa bile kuyruğa girmez", async () => {
  const env = setupBrowser();
  try {
    const v = sahteVitals();
    const { transport, govdeler } = yakalayanTransport();
    const t = createRumCollector({
      vitals: v.api,
      transport,
      sampleRate: 0,
      token: ALWAYS_SAMPLED_TOKEN,
    });
    await t.ready;
    v.rapor("LCP", metrik("LCP", 1200));
    await t.flush();
    assert.equal(t.queueSize(), 0);
    assert.deepEqual(govdeler, []);
  } finally {
    env.cleanup();
  }
});

// ── Kuyruk ve boşaltma ─────────────────────────────────────────────

test("metrikler kuyruğa girer ve sayfa gizlenince gönderilir", async () => {
  const env = setupBrowser();
  try {
    const v = sahteVitals();
    const { transport, govdeler } = yakalayanTransport();
    const t = createRumCollector({
      vitals: v.api,
      transport,
      sampleRate: 1,
      token: ALWAYS_SAMPLED_TOKEN,
    });
    await t.ready;

    v.rapor("TTFB", metrik("TTFB", 120));
    v.rapor("CLS", metrik("CLS", 0.12));
    assert.equal(t.queueSize(), 2, "metrikler kuyruğa girmedi");
    assert.deepEqual(govdeler, [], "kuyruk erken boşaltıldı");

    env.hide();
    await tick(20);
    assert.equal(govdeler.length, 1, "sayfa gizlenince gönderilmedi");
    assert.equal(govdeler[0].samples.length, 2);
    assert.equal(t.queueSize(), 0);
  } finally {
    env.cleanup();
  }
});

test("sayfa görünürken visibilitychange gelirse gönderilmez", async () => {
  const env = setupBrowser();
  try {
    const v = sahteVitals();
    const { transport, govdeler } = yakalayanTransport();
    const t = createRumCollector({
      vitals: v.api,
      transport,
      sampleRate: 1,
      token: ALWAYS_SAMPLED_TOKEN,
    });
    await t.ready;
    v.rapor("TTFB", metrik("TTFB", 120));
    env.window.document.dispatchEvent(new env.window.Event("visibilitychange", { bubbles: true }));
    await tick(20);
    assert.deepEqual(govdeler, [], "sayfa görünürken gönderildi");
    assert.equal(t.queueSize(), 1);
  } finally {
    env.cleanup();
  }
});

test("geçersiz metrik kuyruğa girmez, geçerliler etkilenmez", async () => {
  const env = setupBrowser();
  try {
    const v = sahteVitals();
    const { transport } = yakalayanTransport();
    const t = createRumCollector({
      vitals: v.api,
      transport,
      sampleRate: 1,
      token: ALWAYS_SAMPLED_TOKEN,
    });
    await t.ready;
    v.rapor("LCP", metrik("LCP", -5)); // negatif — şema reddeder
    assert.equal(t.queueSize(), 0);
    v.rapor("LCP", metrik("LCP", 1200));
    assert.equal(t.queueSize(), 1);
  } finally {
    env.cleanup();
  }
});

test("stop dinleyicileri çözer ve kalanı gönderir", async () => {
  const env = setupBrowser();
  try {
    const v = sahteVitals();
    const { transport, govdeler } = yakalayanTransport();
    const t = createRumCollector({
      vitals: v.api,
      transport,
      sampleRate: 1,
      token: ALWAYS_SAMPLED_TOKEN,
    });
    await t.ready;
    v.rapor("TTFB", metrik("TTFB", 120));
    await t.stop();
    assert.equal(govdeler.length, 1);

    // stop sonrası gizlenme yeni gönderim üretmemeli.
    env.hide();
    await tick(20);
    assert.equal(govdeler.length, 1, "stop sonrası dinleyici hâlâ bağlı");
  } finally {
    env.cleanup();
  }
});

// ── ASLA FIRLATMAZ: üç arıza toplayıcı seviyesinde ─────────────────

test("UÇ YOK (404) — toplayıcı fırlatmaz, sayfa yaşar", async () => {
  const env = setupBrowser();
  try {
    const v = sahteVitals();
    const t = createRumCollector({
      vitals: v.api,
      sampleRate: 1,
      token: ALWAYS_SAMPLED_TOKEN,
      endpoint: "/api/method/yok",
      // Gerçek transport kullanılıyor; yalnız ağ sahte.
      transport: undefined,
    });
    await t.ready;
    // `fetch` 404 döndürsün.
    const eskiFetch = globalThis.fetch;
    Object.defineProperty(globalThis, "fetch", {
      value: async () => ({ status: 404, ok: false }),
      configurable: true,
      writable: true,
    });
    try {
      assert.doesNotThrow(() => v.rapor("TTFB", metrik("TTFB", 120)));
      await assert.doesNotReject(async () => {
        await t.flush();
      });
      env.hide();
      await tick(20);
    } finally {
      if (eskiFetch) {
        Object.defineProperty(globalThis, "fetch", {
          value: eskiFetch,
          configurable: true,
          writable: true,
        });
      }
    }
  } finally {
    env.cleanup();
  }
});

test("SUNUCU 500 — toplayıcı fırlatmaz", async () => {
  const env = setupBrowser();
  try {
    const v = sahteVitals();
    const t = createRumCollector({
      vitals: v.api,
      sampleRate: 1,
      token: ALWAYS_SAMPLED_TOKEN,
      transport: {
        send: async () => {
          throw new Error("500 Internal Server Error");
        },
      },
    });
    await t.ready;
    assert.doesNotThrow(() => v.rapor("TTFB", metrik("TTFB", 120)));
    let sonuc;
    await assert.doesNotReject(async () => {
      sonuc = await t.flush();
    });
    assert.equal(sonuc, "failed", "reddeden transport yutulmalıydı");
  } finally {
    env.cleanup();
  }
});

test("AĞ YOK — transport senkron fırlatsa bile toplayıcı fırlatmaz", async () => {
  const env = setupBrowser();
  try {
    const v = sahteVitals();
    const t = createRumCollector({
      vitals: v.api,
      sampleRate: 1,
      token: ALWAYS_SAMPLED_TOKEN,
      transport: {
        send() {
          throw new TypeError("Failed to fetch");
        },
      },
    });
    await t.ready;
    v.rapor("TTFB", metrik("TTFB", 120));
    await assert.doesNotReject(async () => {
      assert.equal(await t.flush(), "failed");
    });
    // Gizlenme yolu da sessiz olmalı.
    v.rapor("CLS", metrik("CLS", 0.1));
    assert.doesNotThrow(() => env.hide());
    await tick(20);
  } finally {
    env.cleanup();
  }
});

// ── Diğer arıza kipleri ────────────────────────────────────────────

test("web-vitals hiç yüklenemezse toplayıcı sessizce devre dışı kalır", async () => {
  const env = setupBrowser();
  try {
    const olaylar = [];
    const t = createRumCollector({
      vitals: null,
      sampleRate: 1,
      token: ALWAYS_SAMPLED_TOKEN,
      // `web-vitals` paketi çözülemezse `loadVitals` null döner. Burada
      // paket kurulu olduğu için doğrudan boş bir API veriyoruz.
      metrics: [],
      onDiagnostic: (k) => olaylar.push(k),
    });
    assert.equal(await t.ready, false);
    assert.doesNotThrow(() => t.flush());
  } finally {
    env.cleanup();
  }
});

test("bir metriğin gözlemcisi patlarsa diğerleri kurulmaya devam eder", async () => {
  const env = setupBrowser();
  try {
    const kayitli = [];
    const api = {
      onLCP() {
        throw new Error("desteklenmiyor");
      },
      onCLS: () => kayitli.push("CLS"),
      onINP: () => kayitli.push("INP"),
      onTTFB: () => kayitli.push("TTFB"),
    };
    const t = createRumCollector({ vitals: api, sampleRate: 1, token: ALWAYS_SAMPLED_TOKEN });
    assert.equal(await t.ready, true);
    assert.deepEqual(kayitli.sort(), ["CLS", "INP", "TTFB"]);
  } finally {
    env.cleanup();
  }
});

test("bozuk metrik nesnesi toplayıcıyı düşürmez", async () => {
  const env = setupBrowser();
  try {
    const v = sahteVitals();
    const t = createRumCollector({ vitals: v.api, sampleRate: 1, token: ALWAYS_SAMPLED_TOKEN });
    await t.ready;
    for (const kotu of [null, undefined, {}, { name: "LCP" }, { name: 42, value: "x" }]) {
      assert.doesNotThrow(
        () => v.rapor("LCP", kotu),
        `bozuk metrik fırlattı: ${JSON.stringify(kotu)}`
      );
    }
    assert.equal(t.queueSize(), 0);
  } finally {
    env.cleanup();
  }
});

test("tanılama geri çağrısı fırlatsa bile toplayıcı çalışır", async () => {
  const env = setupBrowser();
  try {
    const v = sahteVitals();
    const { transport } = yakalayanTransport();
    const t = createRumCollector({
      vitals: v.api,
      transport,
      sampleRate: 1,
      token: ALWAYS_SAMPLED_TOKEN,
      onDiagnostic() {
        throw new Error("tanılama patladı");
      },
    });
    await t.ready;
    assert.doesNotThrow(() => v.rapor("TTFB", metrik("TTFB", 120)));
    assert.equal(t.queueSize(), 1);
  } finally {
    env.cleanup();
  }
});

test("kuyruk üst sınırı aşılınca erken boşaltılır (bellek sızıntısı yok)", async () => {
  const env = setupBrowser();
  try {
    const v = sahteVitals();
    const { transport, govdeler } = yakalayanTransport();
    const t = createRumCollector({
      vitals: v.api,
      transport,
      sampleRate: 1,
      token: ALWAYS_SAMPLED_TOKEN,
    });
    await t.ready;
    for (let i = 0; i < 25; i += 1) v.rapor("TTFB", metrik("TTFB", 100 + i));
    assert.ok(govdeler.length >= 1, "üst sınırda erken boşaltma olmadı");
    assert.ok(t.queueSize() < 20, `kuyruk sınırsız büyüdü: ${t.queueSize()}`);
  } finally {
    env.cleanup();
  }
});
