/**
 * T-123 — bitirme koşulu #1: toplayıcı GERÇEKTEN metrik üretiyor mu?
 *
 * Burada `web-vitals` SAHTE DEĞİL. Kütüphanenin kendisi içe aktarılır; LCP
 * değerini, CLS toplamasını, INP seçimini ve attribution'ı o hesaplar.
 * Sahte olan yalnız tarayıcı zamanlama API'si (`PerformanceObserver`,
 * `performance`) — Node'da yokturlar.
 *
 *   ÖLÇÜLÜR  — sahte `PerformanceObserver`'a girdi verildiğinde gerçek
 *              `web-vitals` metrik üretiyor, toplayıcı onu sözleşmeye uygun
 *              gövdeye çeviriyor ve sayfa gizlenince gönderiyor. LCP
 *              gövdesinde türev/biçim/bölge etiketleri var, URL yok.
 *   ÖLÇÜLMEZ — Gerçek Chrome'da bu değerlerin doğru olduğu. `web-vitals`'ın
 *              ölçüm doğruluğu bu depoda DOĞRULANMADI; tarayıcıda
 *              koşturulmadı.
 *
 * TEK TEST, TEK KURULUM
 * ---------------------
 * `web-vitals` içe aktarıldığı anda modül düzeyinde `PerformanceObserver`
 * kurar. ESM modül önbelleği yüzünden ikinci bir içe aktarma İLK testin
 * global'lerine bağlı kalırdı. Bu yüzden gerçek kütüphaneyle yapılan tüm
 * doğrulamalar TEK test içinde, tek kurulumla yapılır.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { FORBIDDEN_FIELDS, ALLOWED_FIELDS } from "../contract.js";
import { createRumCollector } from "../collector.js";
import {
  ALWAYS_SAMPLED_TOKEN,
  eventEntry,
  fcpEntry,
  layoutShift,
  lcpEntry,
  setupBrowser,
  tick,
} from "./harness.js";

test("GERÇEK web-vitals + sahte PerformanceObserver → sözleşmeye uygun gövdeler", async () => {
  const env = setupBrowser({ url: "https://panel.test/urun/abc", innerWidth: 390, dpr: 2 });

  try {
    // Globaller yerleştikten SONRA içe aktar — kütüphane modül düzeyinde
    // `PerformanceObserver` kuruyor.
    const wv = await import("web-vitals/attribution");

    /**
     * LCP'yi `reportAllChanges` ile dinliyoruz. Gerekçe: `web-vitals` LCP'nin
     * NİHAİ değerini yalnız GÜVENİLİR (isTrusted) bir
     * click/keydown/visibilitychange olayında raporlar. jsdom'da
     * `Event.isTrusted` yeniden tanımlanamaz (own, non-configurable), yani o
     * yol Node'da tetiklenemez. `reportAllChanges` aynı metrik nesnesini
     * (aynı attribution ile) her aday için raporlar; ölçtüğümüz şey olan
     * "toplayıcı metriği gövdeye çeviriyor mu" değişmez.
     *
     * ÖLÇÜLMEDİ: LCP'nin nihai-değer yolu (güvenilir olay) — tarayıcı gerektirir.
     */
    const vitals = {
      onLCP: (cb) => wv.onLCP(cb, { reportAllChanges: true }),
      onCLS: (cb) => wv.onCLS(cb),
      onINP: (cb) => wv.onINP(cb),
      onTTFB: (cb) => wv.onTTFB(cb),
    };

    const gonderilen = [];
    const transport = {
      send: (govde) => {
        gonderilen.push(JSON.parse(govde));
        return Promise.resolve("ok");
      },
    };

    const toplayici = createRumCollector({
      vitals,
      transport,
      token: ALWAYS_SAMPLED_TOKEN,
      sampleRate: 1,
      engineVersion: "media-engine-test",
    });
    await toplayici.ready;
    assert.equal(toplayici.isSampled(), true);

    // ── Tarayıcı olaylarını canlandır ────────────────────────────
    env.emit("paint", [fcpEntry()]); // CLS ölçümü FCP'den sonra başlar
    await tick(20);
    env.emit("largest-contentful-paint", [env.window && lcpEntry(env.window)]);
    env.emit("layout-shift", [
      layoutShift(env.window, 0.05, 300),
      layoutShift(env.window, 0.07, 400),
    ]);
    env.emit("event", [eventEntry(env.window, env.PerformanceEventTiming, { duration: 250 })]);
    await tick(60);

    // Sayfa gizlenince kuyruk boşalmalı.
    env.hide();
    await tick(120);
    await toplayici.flush();
    await tick(20);

    const ornekler = gonderilen.flatMap((g) => g.samples);
    assert.ok(ornekler.length > 0, "hiç ölçüm üretilmedi — toplayıcı çalışmıyor");

    const adlar = new Set(ornekler.map((o) => o.metric));

    // ── Kabul kriteri #1: dört metrik ────────────────────────────
    for (const beklenen of ["LCP", "CLS", "INP", "TTFB"]) {
      assert.ok(adlar.has(beklenen), `${beklenen} üretilmedi (üretilenler: ${[...adlar]})`);
    }

    // ── Değerler gerçekten web-vitals'tan geliyor ────────────────
    const ttfb = ornekler.find((o) => o.metric === "TTFB");
    assert.equal(ttfb.value, 120, "TTFB navigation entry'sinin responseStart'ından türemeli");

    const cls = ornekler.find((o) => o.metric === "CLS");
    assert.ok(Math.abs(cls.value - 0.12) < 1e-6, `CLS 0,05+0,07 toplanmalı, gelen: ${cls.value}`);

    const inp = ornekler.find((o) => o.metric === "INP");
    assert.equal(inp.value, 250, "INP etkileşim süresinden türemeli");

    const lcp = ornekler.find((o) => o.metric === "LCP");
    assert.equal(lcp.value, 1200, "LCP renderTime'dan türemeli");

    // ── Kabul kriteri #2: LCP asset etiketleri ───────────────────
    assert.equal(lcp.lcp_profile, "w1280", "LCP türevi URL'den çıkarılmalı");
    assert.equal(lcp.lcp_format, "webp");
    assert.equal(
      lcp.lcp_region,
      "product_detail/main_image",
      "bölge, LCP elementinin data-rum-region atasından okunmalı"
    );

    // ── Bağlam ───────────────────────────────────────────────────
    assert.equal(lcp.route, "/urun/:slug", "rota şablonu URL'den türemeli");
    assert.equal(lcp.device_class, "phone", "390px genişlik phone kovası");
    assert.equal(lcp.viewport_width, 390);
    assert.equal(lcp.dpr, 2);
    assert.equal(lcp.sample_rate, 1);
    assert.equal(lcp.engine_version, "media-engine-test");

    // ── KVKK: hiçbir gövdede PII yok, şema dışı alan yok ─────────
    const ham = JSON.stringify(gonderilen);
    for (const o of ornekler) {
      for (const alan of Object.keys(o)) {
        assert.ok(ALLOWED_FIELDS.includes(alan), `şema dışı alan gönderildi: ${alan}`);
        assert.ok(!FORBIDDEN_FIELDS.includes(alan), `PII alanı gönderildi: ${alan}`);
      }
    }
    assert.equal(ham.includes("cdn.test"), false, "LCP kaynak URL'i gövdeye sızdı");
    assert.equal(ham.includes("panel.test"), false, "sayfa URL'i gövdeye sızdı");
    assert.equal(ham.includes("#hero"), false, "CSS seçici gövdeye sızdı");

    await toplayici.stop();
  } finally {
    env.cleanup();
  }
});
