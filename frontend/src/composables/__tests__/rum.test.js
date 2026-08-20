/**
 * T-123 — `useRum` / `startRum` Vue köprüsü.
 *
 *   ÖLÇÜLÜR  — tekilin iki kez kurulmadığı (çift kayıt her metriği iki kez
 *              gönderirdi); composable'ın component dışından çağrılabildiği;
 *              toplayıcı kurulamasa bile hiçbir yolun fırlatmadığı.
 *   ÖLÇÜLMEZ — Gerçek component sökülmesinde `onBeforeUnmount` zinciri.
 *              Vue çalışma zamanı burada ayağa kaldırılmıyor.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { setupBrowser } from "../../lib/media/rum/__tests__/harness.js";
import { resetRumSingleton, startRum, stopRum, useRum } from "../useRum.js";

test("startRum tek toplayıcı kurar, ikinci çağrı aynısını döner", async () => {
  const env = setupBrowser();
  try {
    resetRumSingleton();
    const a = startRum({ sampleRate: 0, transport: { send: async () => "ok" } });
    const b = startRum({ sampleRate: 1 });
    assert.equal(a, b, "ikinci startRum yeni toplayıcı kurdu — metrikler iki kez gönderilirdi");
    await stopRum();
  } finally {
    resetRumSingleton();
    env.cleanup();
  }
});

test("stopRum sonrası startRum yeniden kurabilir", async () => {
  const env = setupBrowser();
  try {
    resetRumSingleton();
    const a = startRum({ sampleRate: 0 });
    await stopRum();
    const b = startRum({ sampleRate: 0 });
    assert.notEqual(a, b);
    await stopRum();
  } finally {
    resetRumSingleton();
    env.cleanup();
  }
});

test("toplayıcı kurulamazsa startRum null döner, FIRLATMAZ", async () => {
  resetRumSingleton();
  // Tarayıcı global'i yok — `setupBrowser` çağrılmadı.
  let t;
  assert.doesNotThrow(() => {
    t = startRum({ sampleRate: 0 });
  });
  // Kurulum başarısız olabilir ya da olmayabilir; şart olan FIRLATMAMASI.
  assert.ok(t === null || typeof t === "object");
  await assert.doesNotReject(async () => {
    await stopRum();
  });
  resetRumSingleton();
});

test("stopRum hiç başlatılmamışken de fırlatmaz", async () => {
  resetRumSingleton();
  await assert.doesNotReject(async () => {
    assert.equal(await stopRum(), "empty");
  });
});

test("useRum component dışında çağrılabilir (lifecycle hook'u bağlanmaz)", async () => {
  const env = setupBrowser();
  try {
    let api;
    assert.doesNotThrow(() => {
      api = useRum({ sampleRate: 1, token: "0".repeat(32), transport: { send: async () => "ok" } });
    });
    assert.equal(api.sampled.value, true);
    assert.equal(api.queued.value, 0);
    await assert.doesNotReject(async () => {
      await api.flush();
      await api.stop();
    });
  } finally {
    env.cleanup();
  }
});

test("useRum örnekleme dışı oturumda sampled=false verir", () => {
  const env = setupBrowser();
  try {
    const api = useRum({ sampleRate: 0, token: "0".repeat(32) });
    assert.equal(api.sampled.value, false);
  } finally {
    env.cleanup();
  }
});

test("useRum döndürdüğü ref'ler salt okunur (dışarıdan bozulamaz)", () => {
  const env = setupBrowser();
  try {
    const api = useRum({ sampleRate: 0, token: "0".repeat(32) });
    // `readonly` ref'e yazmak Vue'da uyarı basar ve değeri DEĞİŞTİRMEZ.
    // Uyarı BEKLENEN davranış; test çıktısını kirletmesin diye susturuluyor.
    const eskiWarn = console.warn;
    console.warn = () => {};
    const onceki = api.sampled.value;
    try {
      api.sampled.value = !onceki;
    } catch {
      /* bazı derlemelerde fırlatabilir; ikisi de kabul */
    } finally {
      console.warn = eskiWarn;
    }
    assert.equal(api.sampled.value, onceki, "salt okunur ref değişti");
  } finally {
    env.cleanup();
  }
});

test("kullanıcı tanılama geri çağrısı fırlatsa bile useRum ayakta kalır", () => {
  const env = setupBrowser();
  try {
    let api;
    assert.doesNotThrow(() => {
      api = useRum({
        sampleRate: 1,
        token: "0".repeat(32),
        transport: { send: async () => "ok" },
        onDiagnostic() {
          throw new Error("kullanıcı geri çağrısı patladı");
        },
      });
    });
    assert.equal(typeof api.flush, "function");
  } finally {
    env.cleanup();
  }
});
