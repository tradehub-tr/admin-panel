import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, test } from "node:test";

import { installDom, loadSfc, settle } from "../preview/__tests__/mountSfc.js";

/**
 * C · Yüzen tepsi — `MediaUploadQueue.vue` istemci tarafında (jsdom) koşar.
 *
 *   ÖLÇÜLDÜ  — özet sayıları/metni, küçült↔aç `aria-expanded`, telefonda
 *              modal alt sayfa (Esc, kaplama tıklaması, odak iadesi), satır
 *              düğmelerinin dosya adlı erişilebilir adları, her fazın küçük
 *              resim katmanı + metin etiketi, azaltılmış hareket CSS'i.
 *   ÖLÇÜLMEDİ — gerçek tarayıcıda yerleşim, kontrast ve animasyon (jsdom stil
 *              hesaplamaz; CSS yalnız kaynak metninden denetlenir).
 */

const dom = installDom();
const Vue = await import("vue");
const { createI18n } = await import("vue-i18n");
const { default: tr } = await import("../../../i18n/locales/tr.js");
const status = await import("../../../lib/media/status.js");
const tray = await import("../../../lib/media/uploadTray.js");
const focusTrap = await import("../../common/focusTrap.js");

const FILE = new URL("../MediaUploadQueue.vue", import.meta.url);
const SOURCE = readFileSync(FILE, "utf8");
// Satır/eylem stili ve küçük resim katmanı MediaTransferRow ile ortak dosyalarda.
const SHARED_STYLE = ["../../../assets/scss/upload-row.scss", "../MediaPhaseThumb.vue"]
  .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
  .join("\n");

const i18n = createI18n({ legacy: false, locale: "tr", fallbackLocale: "tr", messages: { tr } });
const { t, te } = i18n.global;

// Küçük resim + faz katmanı tepsiden ortak bileşene taşındı (MediaTransferRow da çiziyor).
const PhaseThumb = loadSfc(
  new URL("../MediaPhaseThumb.vue", import.meta.url),
  {
    "@/components/common/AppIcon.vue": Vue.defineComponent({ render: () => Vue.h("svg") }),
    "@/lib/media/uploadTray.js": tray,
    "@/utils/mediaFormat": { formatBytes: (n) => `${n} B`, iconForKind: () => "file" },
  },
  Vue
);
const Component = loadSfc(
  FILE,
  {
    "vue-i18n": { useI18n: () => ({ t, te }) },
    "@/components/common/AppIcon.vue": Vue.defineComponent({ render: () => Vue.h("svg") }),
    "@/composables/useMediaStatus.js": {
      useMediaStatus: () => ({ facts: Vue.ref({}), unavailable: Vue.ref(false) }),
    },
    "@/composables/useScrollLock.js": { useScrollLock: () => ({ set() {} }) },
    "@/components/common/focusTrap": focusTrap,
    "@/lib/media/status.js": status,
    "@/lib/media/uploadTray.js": tray,
    "@/utils/mediaFormat": { formatBytes: (n) => `${n} B`, iconForKind: () => "file" },
    "./MediaPhaseThumb.vue": PhaseThumb,
  },
  Vue
);

// <Transition> çıkışı iki animasyon karesi bekler; ardından v-show `display: none` yazar.
async function frames() {
  for (let i = 0; i < 3; i += 1) await new Promise((r) => requestAnimationFrame(r));
  await settle(Vue);
}

function setPhone(on) {
  dom.window.matchMedia = () => ({
    matches: on,
    addEventListener() {},
    removeEventListener() {},
  });
}

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    map,
  };
}

// Başarısız bir iddia `close()`u atlarsa bileşenin saniyelik zamanlayıcısı süreci açık tutar.
const open = new Set();
afterEach(() => {
  for (const w of [...open]) w.close();
});

async function mount(props, listeners = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  const state = Vue.reactive({ floating: true, ...props });
  const calls = { retry: [], cancel: [], clear: 0, placement: [] };
  const app = Vue.createApp({
    render: () =>
      Vue.h(Component, {
        ...state,
        onRetry: (id) => calls.retry.push(id),
        onCancel: (id) => calls.cancel.push(id),
        onClear: () => (calls.clear += 1),
        ...listeners,
      }),
  });
  app.mount(host);
  await settle(Vue);
  const wrapper = {
    state,
    calls,
    q: (sel) => document.body.querySelector(sel),
    qa: (sel) => [...document.body.querySelectorAll(sel)],
    close() {
      if (!open.delete(wrapper)) return;
      app.unmount();
      host.remove();
    },
  };
  open.add(wrapper);
  return wrapper;
}

const done = (id, name, kind = "image") => ({
  id,
  name,
  kind,
  status: "done",
  bytes: 2000,
  progress: 100,
  result: { name: `F-${id}` },
});

test("özet: başlık aktif sayıyı, alt satır hazır/sorunlu/yüzdeyi söyler", async () => {
  globalThis.sessionStorage = memoryStorage();
  setPhone(false);
  const w = await mount({
    uploads: [
      { id: "a", name: "a.png", kind: "image", status: "uploading", progress: 40, bytes: 900 },
      done("b", "b.png"),
      { id: "c", name: "c.pdf", kind: "document", status: "error", errorCode: "", bytes: 10 },
    ],
    facts: { "F-b": { scan_status: "clean", asset_states: ["ready"] } },
  });
  assert.deepEqual(tray.trayCounts(["uploading", "ready", "uploadFailed"]), {
    total: 3,
    active: 1,
    ready: 1,
    issues: 1,
  });
  // (0.7·40 + 100 + 100) / 3 = 76
  assert.equal(w.q(".utray__title").textContent.trim(), "1 dosya işleniyor");
  assert.equal(w.q(".utray__sub").textContent.trim(), "1 hazır · 1 sorunlu · %76");
  assert.equal(w.q('.utray__sr[role="status"]').textContent, "3 dosya · 1 hazır · 1 sorunlu");
  assert.match(
    w.q(".utray__pill").getAttribute("aria-label"),
    /1 dosya işleniyor, 1 hazır, 1 sorunlu, toplam yüzde 76/
  );
  assert.equal(w.q(".utray__pill-text--long").textContent.trim(), "1 dosya yükleniyor · %76");
  assert.equal(w.q(".utray__pill-text--short").textContent.trim(), "1 dosya · %76");
  assert.match(w.q(".utray__badge").textContent, /1/);
  w.close();
});

test("hiç aktif satır yokken başlık 'Yüklenenler', yüzde gösterilmez", async () => {
  setPhone(false);
  const w = await mount({
    uploads: [done("b", "b.png")],
    facts: { "F-b": { scan_status: "clean", asset_states: ["ready"] } },
  });
  assert.equal(w.q(".utray__title").textContent.trim(), "Yüklenenler");
  assert.equal(w.q(".utray__sub").textContent.trim(), "1 hazır · 0 sorunlu");
  assert.equal(w.q(".utray__badge"), null);
  w.close();
});

test("masaüstü: modal olmayan bölge; küçült ↔ aç aria-expanded ve oturum tercihi", async () => {
  const storage = memoryStorage();
  globalThis.sessionStorage = storage;
  setPhone(false);
  const w = await mount({
    uploads: [{ id: "a", name: "a.png", kind: "image", status: "uploading", progress: 10 }],
  });
  const panel = w.q(".utray__panel");
  assert.equal(panel.getAttribute("role"), "region");
  assert.equal(panel.hasAttribute("aria-modal"), false);
  const toggle = w.q(".utray__toggle");
  const pill = w.q(".utray__pill");
  assert.equal(toggle.getAttribute("aria-expanded"), "true");
  assert.equal(pill.getAttribute("aria-controls"), panel.id);

  toggle.click();
  await frames();
  assert.equal(pill.getAttribute("aria-expanded"), "false");
  assert.equal(pill.style.display, "");
  assert.equal(panel.style.display, "none");
  assert.equal(document.activeElement, pill, "küçültünce odak hapa geçer");
  assert.equal(storage.map.get(tray.COLLAPSE_KEY), "1");

  pill.click();
  await settle(Vue);
  assert.equal(pill.getAttribute("aria-expanded"), "true");
  assert.notEqual(panel.style.display, "none");
  assert.equal(document.activeElement, toggle, "açınca odak küçültme düğmesine geçer");
  assert.equal(storage.map.get(tray.COLLAPSE_KEY), "0");
  w.close();
});

test("masaüstü: oturumda küçültülmüşse yeni dosya tepsiyi zorla açmaz", async () => {
  const storage = memoryStorage();
  storage.setItem(tray.COLLAPSE_KEY, "1");
  globalThis.sessionStorage = storage;
  setPhone(false);
  const w = await mount({
    uploads: [{ id: "a", name: "a.png", status: "uploading", progress: 1 }],
  });
  assert.equal(w.q(".utray__panel").style.display, "none");
  w.state.uploads = [...w.state.uploads, { id: "b", name: "b.png", status: "uploading" }];
  await settle(Vue);
  assert.equal(w.q(".utray__panel").style.display, "none");
  w.close();
});

test("masaüstü: tercih yokken ilk ekleme tepsiyi açar", async () => {
  globalThis.sessionStorage = memoryStorage();
  setPhone(false);
  const w = await mount({ uploads: [] });
  assert.equal(w.q(".utray"), null, "satır yokken tepsi yok");
  w.state.uploads = [{ id: "a", name: "a.png", status: "uploading", progress: 3 }];
  await settle(Vue);
  assert.notEqual(w.q(".utray__panel").style.display, "none");
  w.close();
});

test("telefon: çubuk kapalı başlar; alt sayfa modal, Esc kapatır ve odak çubuğa döner", async () => {
  globalThis.sessionStorage = memoryStorage();
  setPhone(true);
  const w = await mount({
    uploads: [{ id: "a", name: "a.png", kind: "image", status: "uploading", progress: 50 }],
  });
  const pill = w.q(".utray__pill");
  const panel = w.q(".utray__panel");
  assert.ok(w.q(".utray--sheet"));
  assert.equal(pill.getAttribute("aria-expanded"), "false");
  assert.equal(panel.style.display, "none");

  pill.click();
  await settle(Vue);
  assert.equal(panel.getAttribute("role"), "dialog");
  assert.equal(panel.getAttribute("aria-modal"), "true");
  assert.equal(pill.getAttribute("aria-expanded"), "true");
  assert.equal(document.activeElement, w.q(".utray__toggle"));

  // Odak tuzağı: son öğeden Tab başa döner.
  const focusables = focusTrap.focusablesIn(panel);
  focusables.at(-1).focus();
  const tab = new dom.window.KeyboardEvent("keydown", {
    key: "Tab",
    bubbles: true,
    cancelable: true,
  });
  focusables.at(-1).dispatchEvent(tab);
  assert.equal(tab.defaultPrevented, true);
  assert.equal(document.activeElement, focusables[0]);

  const esc = new dom.window.KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
  });
  document.activeElement.dispatchEvent(esc);
  await frames();
  assert.equal(pill.getAttribute("aria-expanded"), "false");
  assert.equal(document.activeElement, pill, "Esc sonrası odak çubuğa döner");
  w.close();
});

test("telefon: kaplamaya dokunmak alt sayfayı kapatır", async () => {
  setPhone(true);
  const w = await mount({
    uploads: [{ id: "a", name: "a.png", status: "uploading", progress: 5 }],
  });
  w.q(".utray__pill").click();
  await settle(Vue);
  const scrim = w.q(".utray__scrim");
  assert.equal(scrim.getAttribute("aria-hidden"), "true");
  scrim.click();
  await settle(Vue);
  assert.equal(w.q(".utray__pill").getAttribute("aria-expanded"), "false");
  assert.equal(document.activeElement, w.q(".utray__pill"));
  w.close();
});

test("satır düğmeleri: erişilebilir ad dosya adını taşır, görünen metinle başlar", async () => {
  setPhone(false);
  const placed = [];
  const w = await mount(
    {
      uploads: [
        { id: "u", name: "yesil-supurge.png", kind: "image", status: "uploading", progress: 64 },
        { id: "e", name: "katalog.pdf", kind: "document", status: "error", errorCode: "" },
        done("r", "vitrin.png"),
      ],
      facts: { "F-r": { scan_status: "clean", asset_states: ["ready"] } },
    },
    { onPlacement: (up) => placed.push(up.id) }
  );
  const cancel = w.q('[data-phase="uploading"] .utray-act--icon');
  assert.equal(cancel.getAttribute("aria-label"), "yesil-supurge.png yüklemesini iptal et");
  assert.equal(cancel.textContent.trim(), "", "iptal yalnız ikon");

  const retry = w.q('[data-phase="uploadFailed"] .utray-act--primary');
  assert.match(retry.getAttribute("aria-label"), /^Dene: katalog\.pdf/);
  assert.equal(retry.querySelector(".utray-act__text").textContent, "Dene");

  const preview = w.q('[data-phase="ready"] .utray-act');
  assert.match(preview.getAttribute("aria-label"), /^Önizle: vitrin\.png/);
  for (const b of w.qa(".utray-act"))
    assert.ok(b.getAttribute("aria-label"), "her düğmenin adı var");

  cancel.click();
  retry.click();
  preview.click();
  assert.deepEqual(w.calls.cancel, ["u"]);
  assert.deepEqual(w.calls.retry, ["e"]);
  assert.deepEqual(placed, ["r"]);
  w.close();
});

test("Önizle yalnız dinleyen varken çizilir", async () => {
  setPhone(false);
  const w = await mount({
    uploads: [done("r", "vitrin.png")],
    facts: { "F-r": { scan_status: "clean", asset_states: ["ready"] } },
  });
  assert.equal(w.qa(".utray-act").length, 0);
  w.close();
});

test("ayrıntı: Güvenlik kontrolü / Hazırlama satır açılınca erişilebilir", async () => {
  setPhone(false);
  const w = await mount({
    uploads: [done("r", "vitrin.png")],
    facts: { "F-r": { scan_status: "clean", asset_states: ["ready"] } },
  });
  const info = w.q(".utray-row__info");
  const details = document.getElementById(info.getAttribute("aria-controls"));
  assert.equal(info.getAttribute("aria-expanded"), "false");
  assert.equal(details.style.display, "none");
  info.click();
  await settle(Vue);
  assert.equal(info.getAttribute("aria-expanded"), "true");
  assert.notEqual(details.style.display, "none");
  assert.match(details.textContent, /Güvenlik kontrolü/);
  assert.match(details.textContent, /Hazırlama/);
  w.close();
});

test("her faz kendi küçük resim katmanını ve metin etiketini çizer", async () => {
  setPhone(false);
  const F = (id, facts) => [{ ...done(id, `${id}.png`) }, facts];
  const cases = [
    ["queued", { id: "q", name: "q.png", status: "queued" }, null, "queued"],
    ["preparing", { id: "p", name: "p.png", status: "preparing" }, null, "stack"],
    ["uploading", { id: "u", name: "u.png", status: "uploading", progress: 30 }, null, "ring"],
    ["uploaded", ...F("d0", null), "shield"],
    ["scanning", ...F("d1", { scan_status: "pending" }), "shield"],
    ["processing", ...F("d2", { scan_status: "clean", asset_states: ["processing"] }), "stack"],
    ["ready", ...F("d3", { scan_status: "clean", asset_states: ["ready"] }), "check"],
    ["blocked", ...F("d4", { scan_status: "infected" }), "lock"],
    ["scanFailed", ...F("d5", { scan_status: "failed" }), "error"],
    ["processingFailed", ...F("d6", { scan_status: "clean", asset_states: ["failed"] }), "error"],
    ["review", ...F("d7", { scan_status: "clean", asset_states: ["review"] }), "warn"],
    ["unverified", ...F("d8", { scan_status: "", asset_states: ["ready"] }), "warn"],
    ["uploadFailed", { id: "e", name: "e.png", status: "error", errorCode: "" }, null, "error"],
    ["cancelled", { id: "c", name: "c.png", status: "cancelled" }, null, "cancel"],
  ];
  const facts = {};
  for (const [, up, f] of cases) if (f) facts[`F-${up.id}`] = f;
  const w = await mount({ uploads: cases.map(([, up]) => up), facts });
  for (const [phase, , , overlay] of cases) {
    const row = w.q(`li[data-phase="${phase}"]`);
    assert.ok(row, `${phase} satırı yok`);
    assert.ok(row.querySelector(`.utray-ov[data-overlay="${overlay}"]`), `${phase} → ${overlay}`);
    assert.equal(
      row.querySelector(".utray-row__label").textContent,
      t(`mediaFlow.phase.${phase}`),
      `${phase} metin etiketi`
    );
  }
  // Süresi bilinmeyen bekleme: ince kayan çizgi, ekran okuyucudan gizli.
  for (const phase of ["preparing", "uploaded", "scanning", "processing"])
    assert.ok(
      w.q(`li[data-phase="${phase}"] .utray-row__bar--indeterminate[aria-hidden="true"]`),
      `${phase} kayan çizgi`
    );
  const bar = w.q('li[data-phase="uploading"] [role="progressbar"]');
  assert.equal(bar.getAttribute("aria-valuenow"), "30");
  assert.equal(
    document.getElementById(bar.getAttribute("aria-labelledby")).textContent.trim(),
    "u.png"
  );
  w.close();
});

test("temizle: dinleyiciye iletilir; satır kalmayınca tepsi kalkar", async () => {
  setPhone(false);
  const w = await mount({
    uploads: [done("r", "vitrin.png")],
    facts: { "F-r": { scan_status: "clean", asset_states: ["ready"] } },
  });
  w.q(".utray__clear").click();
  assert.equal(w.calls.clear, 1);
  w.state.uploads = [];
  await settle(Vue);
  assert.equal(w.q(".utray"), null);
  w.close();
});

test("genel tepsi, sayfanın kendi tepsisi açıkken çekilir", async () => {
  setPhone(false);
  const ambient = await mount({
    ambient: true,
    uploads: [{ id: "a", name: "a.png", status: "uploading", progress: 1 }],
  });
  assert.notEqual(ambient.q(".utray").style.display, "none");
  const page = await mount({ uploads: [{ id: "b", name: "b.png", status: "uploading" }] });
  await settle(Vue);
  const [first] = ambient.qa(".utray");
  assert.equal(first.style.display, "none");
  page.close();
  await settle(Vue);
  assert.notEqual(ambient.q(".utray").style.display, "none");
  ambient.close();
});

test("hareket CSS'i: yalnız transform/opacity; azaltılmış harekette döngü ve kayma yok", () => {
  const own = SOURCE.slice(SOURCE.indexOf("<style"));
  const reduced = own.slice(own.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.ok(reduced.length > 40, "reduced-motion bloğu yok");
  assert.match(reduced, /animation: none/);
  assert.match(reduced, /transform: none/);
  assert.match(own, /@use "@\/assets\/scss\/upload-row" as row;/);
  assert.match(own, /@include row\.row;/);
  assert.match(SOURCE, /<MediaPhaseThumb/);
  const style = `${own}\n${SHARED_STYLE}`;
  // Ortak katman ve satır dosyalarının her biri kendi azaltılmış hareket bloğunu taşır.
  for (const file of SHARED_STYLE.split("@media (prefers-reduced-motion: reduce)").slice(1))
    assert.match(file.slice(0, 400), /animation: none/);
  assert.match(style, /utray-pop-enter-active[\s\S]*?transform 220ms \$ease-out/);
  assert.match(style, /utray-sheet-enter-active[\s\S]*?transform 280ms \$ease-drawer/);
  assert.match(style, /utray-row-enter-from[\s\S]*?translateY\(4px\)/);
  // Animasyonlu özellikler: genişlik/yükseklik/konum geçişi yok.
  for (const m of style.matchAll(/transition:\s*([^;]+);/g))
    assert.doesNotMatch(m[1], /\b(width|height|top|left|right|bottom|max-height)\b/, m[1]);
  // 3 px odak halkası, 44 px hedefler.
  assert.match(style, /outline: 3px solid/);
  assert.match(style, /height: 44px/);
});
