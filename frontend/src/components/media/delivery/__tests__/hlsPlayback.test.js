import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";

import { PLAYBACK, decidePlayback, loadHlsEngine, startHlsPlayback } from "../hlsPlayback.js";

/**
 * W7 — hls.js entegrasyonunun SÖZLEŞMESİ.
 *
 *   ÖLÇÜLDÜ  — oynatma yolu KARARI (saf fonksiyon), motor yükleyicinin
 *              savunmacılığı (yok/patlak/MSE'siz ortam), motorun bağlanma
 *              ve ölümcül-hata protokolü (sahte Hls ile), hls.js'in ana
 *              pakete statik olarak GİRMEDİĞİ (kaynak okuma) ve SSR
 *              çıktısında tembelliğin korunduğu.
 *   ÖLÇÜLMEDİ — gerçek hls.js'in MSE üzerinde segment oynatması. hls.js
 *              jsdom/node'da çalışmaz; bu ancak canlı tarayıcı ister ve bu
 *              görevde tarayıcı doğrulaması YAPILMADI.
 *
 * `mediaDelivery.test.js`'e bilerek DOKUNULMADI — o dosya T-120
 * sözleşmesini ölçer; buradaki her şey W7'nin eklediği davranış.
 */

// ── decidePlayback — yol kararı ───────────────────────────────────────

test("yerli HLS varken karar native — hls.js hiç gündeme gelmez", () => {
  const mode = decidePlayback({ hlsSrc: "/v.m3u8", src: "/v.mp4", nativeHls: true });
  assert.equal(mode, PLAYBACK.NATIVE_HLS);
});

test("yerli HLS yokken hlsSrc verilirse karar hls-js", () => {
  // VACUITY hedefi: bu karar "her zaman progresif"e bozulursa bu test kırmızı.
  const mode = decidePlayback({ hlsSrc: "/v.m3u8", src: "/v.mp4", nativeHls: false });
  assert.equal(mode, PLAYBACK.HLS_JS);
});

test("hlsSrc yoksa yerli destek olsa bile karar progresif", () => {
  assert.equal(decidePlayback({ src: "/v.mp4", nativeHls: true }), PLAYBACK.PROGRESSIVE);
  assert.equal(decidePlayback({ src: "/v.mp4" }), PLAYBACK.PROGRESSIVE);
});

test("hiç kaynak yoksa karar none", () => {
  assert.equal(decidePlayback({}), PLAYBACK.NONE);
  assert.equal(decidePlayback(), PLAYBACK.NONE);
});

// ── loadHlsEngine — savunmacı yükleme ────────────────────────────────

test("motor default export'tan gelir ve isSupported doğrulanır", async () => {
  class Hls {
    static isSupported() {
      return true;
    }
  }
  assert.equal(await loadHlsEngine(async () => ({ default: Hls })), Hls);
  // Bazı paketleyiciler namespace döndürür — default'suz da tanınır.
  assert.equal(await loadHlsEngine(async () => Hls), Hls);
});

test("MSE desteklenmiyorsa motor null — progresif kaynağa düşülür", async () => {
  class Hls {
    static isSupported() {
      return false;
    }
  }
  assert.equal(await loadHlsEngine(async () => ({ default: Hls })), null);
});

test("import patlarsa ya da şekil bozuksa motor null, ASLA fırlatmaz", async () => {
  assert.equal(
    await loadHlsEngine(async () => {
      throw new Error("paket yok");
    }),
    null
  );
  assert.equal(await loadHlsEngine(async () => ({ default: {} })), null);
  assert.equal(await loadHlsEngine(async () => null), null);
});

// ── startHlsPlayback — bağlama ve ölümcül-hata protokolü ─────────────

function makeFakeHls() {
  const calls = [];
  class FakeHls {
    static Events = Object.freeze({ ERROR: "hlsError" });
    static ErrorTypes = Object.freeze({
      MEDIA_ERROR: "mediaError",
      NETWORK_ERROR: "networkError",
    });
    static isSupported() {
      return true;
    }
    constructor() {
      this.handlers = {};
      FakeHls.last = this;
    }
    on(evt, cb) {
      this.handlers[evt] = cb;
    }
    emit(data) {
      this.handlers[FakeHls.Events.ERROR]?.(FakeHls.Events.ERROR, data);
    }
    loadSource(url) {
      calls.push(["loadSource", url]);
    }
    attachMedia(el) {
      calls.push(["attachMedia", el]);
    }
    recoverMediaError() {
      calls.push(["recoverMediaError"]);
    }
    destroy() {
      calls.push(["destroy"]);
    }
  }
  return { FakeHls, calls };
}

test("motor manifesti yükler ve videoya bağlanır", () => {
  const { FakeHls, calls } = makeFakeHls();
  const videoEl = { sahte: true };
  const hls = startHlsPlayback(FakeHls, videoEl, "/files/v.m3u8");
  assert.deepEqual(calls, [
    ["loadSource", "/files/v.m3u8"],
    ["attachMedia", videoEl],
  ]);
  assert.equal(typeof hls.destroy, "function");
});

test("ölümcül OLMAYAN hata karışılmadan geçer", () => {
  const { FakeHls, calls } = makeFakeHls();
  let fatalSayisi = 0;
  startHlsPlayback(FakeHls, {}, "/v.m3u8", { onFatal: () => (fatalSayisi += 1) });
  FakeHls.last.emit({ fatal: false, type: FakeHls.ErrorTypes.NETWORK_ERROR });
  assert.equal(fatalSayisi, 0);
  assert.ok(!calls.some(([ad]) => ad === "destroy"));
});

test("ölümcül medya hatasında BİR kez toparlanır, ikincisinde kapanır", () => {
  const { FakeHls, calls } = makeFakeHls();
  let fatalSayisi = 0;
  startHlsPlayback(FakeHls, {}, "/v.m3u8", { onFatal: () => (fatalSayisi += 1) });

  FakeHls.last.emit({ fatal: true, type: FakeHls.ErrorTypes.MEDIA_ERROR });
  assert.equal(calls.filter(([ad]) => ad === "recoverMediaError").length, 1);
  assert.equal(fatalSayisi, 0, "ilk medya hatası henüz ölümcül sayılmaz");

  FakeHls.last.emit({ fatal: true, type: FakeHls.ErrorTypes.MEDIA_ERROR });
  assert.equal(calls.filter(([ad]) => ad === "recoverMediaError").length, 1, "toparlama tek hak");
  assert.equal(calls.filter(([ad]) => ad === "destroy").length, 1);
  assert.equal(fatalSayisi, 1);
});

test("ölümcül ağ hatasında motor kapanır ve çağırana haber verilir", () => {
  const { FakeHls, calls } = makeFakeHls();
  const fatals = [];
  startHlsPlayback(FakeHls, {}, "/v.m3u8", { onFatal: (d) => fatals.push(d) });
  FakeHls.last.emit({ fatal: true, type: FakeHls.ErrorTypes.NETWORK_ERROR });
  assert.equal(calls.filter(([ad]) => ad === "destroy").length, 1);
  assert.equal(fatals.length, 1);
});

// ── Paket sözleşmesi — hls.js ana pakete GİRMEZ ──────────────────────

const vueSource = readFileSync(
  new URL("../../MediaVideo.vue", import.meta.url),
  "utf8"
);
const playbackSource = readFileSync(new URL("../hlsPlayback.js", import.meta.url), "utf8");

test("hls.js YALNIZ dinamik import ile gelir — statik import yasak", () => {
  // `web-vitals` deseni (collector.js): kullanmayan oturum baytını indirmez.
  assert.doesNotMatch(vueSource, /from\s+["']hls\.js["']/);
  assert.match(playbackSource, /import\(["']hls\.js["']\)/);
});

test("bileşen motoru görünürlük anına (attach) bağlıyor", () => {
  // Tembellik sözleşmesi: `engageHls` tek tetiği `attach` — kaynaklar gibi
  // motorun kendisi de görünürlüğe kadar beklemeli.
  assert.match(vueSource, /function attach\(\)[^]*?engageHls\(\)/);
  assert.match(vueSource, /decidePlayback\(/);
});

// ── SSR sözleşmesi — tembellik hls.js eklendikten sonra da duruyor ───

const frontendRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
const VIDEO = "/src/components/media/MediaVideo.vue";

let server;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    plugins: [vue()],
    resolve: { alias: { "@": `${frontendRoot}/src` } },
    server: { middlewareMode: true },
    appType: "custom",
  });
});

after(async () => {
  await server?.close();
});

test("SSR çıktısında hlsSrc verilse de kaynak bağlanmaz, motor anılmaz", async () => {
  const { default: Component } = await server.ssrLoadModule(VIDEO);
  const html = await renderToString(
    createSSRApp({
      render: () =>
        h(Component, {
          src: "/files/v.mp4",
          hlsSrc: "/files/v.m3u8",
          width: 1280,
          height: 720,
          label: "x",
        }),
    })
  );
  assert.doesNotMatch(html, /<source/);
  assert.doesNotMatch(html, /m3u8/);
  assert.match(html, /preload="none"/);
});
