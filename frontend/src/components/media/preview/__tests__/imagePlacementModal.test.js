import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { installDom, loadSfc, settle } from "./mountSfc.js";

installDom();
const Vue = await import("vue");
const geometry = await import("../../../../lib/media/crop/geometry.js");
const places = await import("../../../../lib/media/preview/places.js");
const { default: messages } = await import("../../../../lib/media/preview/messages.js");
const realFocal = await import("../../../../composables/useFocalPoint.js");

const FILE = new URL("../ImagePlacementModal.vue", import.meta.url);

function build({
  target,
  getTarget = null,
  prefs = { autoopen: true },
  saveError = null,
  intentGate = null,
} = {}) {
  const calls = { prefs: [], save: [], target: [], intent: [] };
  const deps = {
    async getIntent(asset) {
      calls.intent.push(asset);
      if (intentGate) await intentGate;
      return { etag: '"e1"', exists: true, intent: { focal_x: 0.5, focal_y: 0.5 } };
    },
    async suggest() {
      return null;
    },
    async saveFocal(p) {
      calls.save.push(p);
      if (saveError) throw saveError;
      return { etag: '"e2"' };
    },
  };
  const FocalEditorStub = Vue.defineComponent({
    props: { disabled: Boolean },
    emits: ["set", "nudge", "center", "suggest", "natural"],
    setup:
      (p, { emit }) =>
      () =>
        Vue.h(
          "button",
          {
            type: "button",
            "data-fe": "",
            "data-disabled": String(p.disabled),
            onClick: () => emit("set", 0.78, 0.45),
          },
          "fe"
        ),
  });
  const PlaceListStub = Vue.defineComponent({
    props: ["items", "currentIndex", "src", "focal", "variant"],
    emits: ["select"],
    setup:
      (p, { emit }) =>
      () =>
        Vue.h(
          "ul",
          { "data-src": p.src },
          p.items.map((it, i) =>
            Vue.h("li", { key: it.id }, [
              Vue.h(
                "button",
                {
                  type: "button",
                  "data-place": it.id,
                  "aria-current": i === p.currentIndex ? "true" : undefined,
                  onClick: () => emit("select", i),
                },
                it.label
              ),
            ])
          )
        ),
  });
  const Modal = loadSfc(
    FILE,
    {
      "vue-i18n": {
        useI18n: () => ({
          t: (k, p) => (p ? `${k}${JSON.stringify(p)}` : k),
          locale: Vue.ref("tr"),
        }),
      },
      "./FocalEditor.vue": FocalEditorStub,
      "./PlaceList.vue": PlaceListStub,
      "./contexts/index.js": { CONTEXTS: {} },
      "@/composables/useFocalPoint.js": {
        useFocalPoint: (o) => realFocal.useFocalPoint({ ...o, deps }),
      },
      "@/composables/useScrollLock": { useScrollLock: () => ({ set() {} }) },
      "@/lib/media/crop/geometry.js": geometry,
      "@/lib/media/preview/messages.js": messages,
      "@/lib/media/preview/places.js": places,
      "@/lib/media/preview/previewApi.js": {
        getPreviewTarget: async (url, slot) => {
          calls.target.push([url, slot]);
          if (getTarget) return getTarget(url, slot, calls.target.length);
          return (
            target ?? {
              asset: "A1",
              processing: false,
              source: { width: 2000, height: 408, bytes: 123072, format: "webp" },
              focal: null,
              square: null,
            }
          );
        },
        getPreviewPrefs: async () => prefs,
        setPreviewPrefs: async (v) => {
          calls.prefs.push(v);
          return { autoopen: v };
        },
      },
    },
    Vue
  );
  return { Modal, calls };
}

async function mount(opts = {}, props = {}) {
  const { Modal, calls } = build(opts);
  const events = [];
  const open = Vue.ref(true);
  const extra = Vue.reactive({ ...props });
  const host = document.createElement("div");
  document.body.append(host);
  const app = Vue.createApp({
    render: () =>
      Vue.h(Modal, {
        open: open.value,
        "onUpdate:open": (v) => {
          open.value = v;
          events.push(["update:open", v]);
        },
        fileUrl: "/files/c2/ozgen-banner.webp",
        slotKey: "company.cover_image",
        context: { storeName: "Özgen Plastik" },
        onClose: () => events.push(["close"]),
        onSaved: (f) => events.push(["saved", f]),
        ...extra,
      }),
  });
  app.mount(host);
  await settle(Vue, 6);
  const root = () => host.querySelector('[role="dialog"]');
  const press = (k, extra = {}) =>
    root().dispatchEvent(
      new window.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...extra })
    );
  return {
    host,
    root,
    press,
    events,
    calls,
    open,
    extra,
    close: () => (app.unmount(), host.remove()),
  };
}

const primary = (host) => host.querySelector(".ipm__btn--primary");

test("diyalog adı, rolü ve cihaz seçici aria-pressed", async () => {
  const v = await mount();
  try {
    const d = v.root();
    assert.equal(d.getAttribute("aria-modal"), "true");
    const title = document.getElementById(d.getAttribute("aria-labelledby"));
    assert.equal(title.textContent.trim(), "imagePlacement.title");
    const seg = [...v.host.querySelectorAll(".ipm__seg-btn")];
    assert.deepEqual(
      seg.map((b) => b.getAttribute("aria-pressed")),
      ["true", "false"]
    );
    seg[1].click();
    await settle(Vue);
    assert.deepEqual(
      [...v.host.querySelectorAll(".ipm__seg-btn")].map((b) => b.getAttribute("aria-pressed")),
      ["false", "true"]
    );
    assert.ok(v.host.querySelector('[role="status"][aria-live="polite"]'));
  } finally {
    v.close();
  }
});

test("yer listesinde seçim aria-current ile ilerler", async () => {
  const v = await mount();
  try {
    const rows = () => [...v.host.querySelectorAll("[data-place]")];
    assert.equal(rows()[0].getAttribute("aria-current"), "true");
    rows()[1].click();
    await settle(Vue);
    assert.equal(rows()[1].getAttribute("aria-current"), "true");
  } finally {
    v.close();
  }
});

test("Esc: değişiklik yoksa kapatır", async () => {
  const v = await mount();
  try {
    v.press("Escape");
    await settle(Vue);
    assert.deepEqual(v.events.slice(-2), [["update:open", false], ["close"]]);
  } finally {
    v.close();
  }
});

test("Esc: kaydedilmemiş değişiklikte onay ister", async () => {
  const v = await mount();
  try {
    v.host.querySelector("[data-fe]").click();
    await settle(Vue);
    v.press("Escape");
    await settle(Vue);
    assert.ok(v.host.querySelector('[role="alertdialog"]'));
    v.host.querySelector("[data-confirm-keep]").click();
    await settle(Vue);
    assert.equal(v.host.querySelector('[role="alertdialog"]'), null);
    assert.equal(v.open.value, true);
    v.press("Escape");
    await settle(Vue);
    v.host.querySelector("[data-confirm-discard]").click();
    await settle(Vue);
    assert.deepEqual(v.events.at(-1), ["close"]);
  } finally {
    v.close();
  }
});

test("odak tuzağı: son öğeden Tab başa, ilkten Shift+Tab sona", async () => {
  const v = await mount();
  try {
    const items = [
      ...v
        .root()
        .querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ),
    ];
    items.at(-1).focus();
    v.press("Tab");
    assert.equal(document.activeElement, items[0]);
    v.press("Tab", { shiftKey: true });
    assert.equal(document.activeElement, items.at(-1));
  } finally {
    v.close();
  }
});

test("Kaydet: yalnız odak gider, saved yayılır, pencere kapanır", async () => {
  const v = await mount();
  try {
    v.host.querySelector("[data-fe]").click();
    await settle(Vue);
    primary(v.host).click();
    await settle(Vue);
    assert.equal(v.calls.save[0].focalX, 0.78);
    assert.equal(v.calls.save[0].ifMatch, '"e1"');
    assert.ok(v.calls.save[0].previewed.length >= 1);
    assert.deepEqual(
      v.events.find((e) => e[0] === "saved"),
      ["saved", { x: 0.78, y: 0.45 }]
    );
    assert.deepEqual(v.events.at(-1), ["close"]);
  } finally {
    v.close();
  }
});

test("çakışma: pencere açık kalır, yeniden yükle düğmesi çıkar", async () => {
  const v = await mount({ saveError: Object.assign(new Error("x"), { status: 412 }) });
  try {
    v.host.querySelector("[data-fe]").click();
    await settle(Vue);
    primary(v.host).click();
    await settle(Vue);
    assert.equal(v.open.value, true);
    assert.match(v.host.textContent, /imagePlacement\.reload/);
  } finally {
    v.close();
  }
});

test("varlık yoksa Kaydet kapalı ve neden yazılı; işleniyor bildirimi", async () => {
  const v = await mount({
    target: {
      asset: "",
      processing: true,
      source: { width: 0, height: 0, bytes: 0, format: "" },
      focal: null,
      square: null,
    },
  });
  try {
    assert.equal(primary(v.host).disabled, true);
    assert.match(v.host.textContent, /imagePlacement\.status\.cannotSave/);
    assert.match(v.host.textContent, /imagePlacement\.status\.processing/);
  } finally {
    v.close();
  }
});

test("otomatik açılma kutusu tercihi sunucuya yazar", async () => {
  const v = await mount();
  try {
    const box = v.host.querySelector('.ipm__check input[type="checkbox"]');
    assert.equal(box.checked, true);
    box.checked = false;
    box.dispatchEvent(new window.Event("change", { bubbles: true }));
    await settle(Vue);
    assert.deepEqual(v.calls.prefs, [false]);
  } finally {
    v.close();
  }
});

test("kapanınca odak açan düğmeye döner", async () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  const v = await mount({}, { returnFocus: opener });
  try {
    v.press("Escape");
    await settle(Vue);
    assert.equal(document.activeElement, opener);
  } finally {
    v.close();
    opener.remove();
  }
});

test("hareket: süreler spec §6, hareket azaltmada kapalı, yalnız transform/opacity", () => {
  const src = readFileSync(FILE, "utf8");
  assert.match(src, /\.ipm-enter-active[^{]*\{[^}]*200ms/);
  assert.match(src, /\.ipm-leave-active[^{]*\{[^}]*160ms/);
  assert.match(src, /animation: ipm-in 220ms cubic-bezier\(0\.2, 0\.8, 0\.2, 1\)/);
  assert.match(src, /@media \(prefers-reduced-motion: reduce\)/);
  for (const m of src.matchAll(/transition:\s*([^;]+);/g))
    // Tek özellik (virgüllü liste yok); eğrinin kendi virgülleri sayılmaz.
    assert.match(
      m[1],
      /^(none|(opacity|transform) \d+ms( (ease|linear|cubic-bezier\([^)]*\)))?)$/,
      m[1]
    );
  assert.doesNotMatch(src, /#6d6a61/i);
});

test("yüklenirken odak denetimleri ve Kaydet kapalı; yükleme bitince açılır", async () => {
  let release;
  const intentGate = new Promise((r) => (release = r));
  const v = await mount({ intentGate });
  try {
    assert.equal(v.host.querySelector("[data-fe]").dataset.disabled, "true");
    assert.equal(primary(v.host).disabled, true);
    release();
    await settle(Vue);
    assert.equal(v.host.querySelector("[data-fe]").dataset.disabled, "false");
    v.host.querySelector("[data-fe]").click();
    await settle(Vue);
    assert.equal(primary(v.host).disabled, false);
  } finally {
    v.close();
  }
});

test("telefon (<1024 px): sekmeler, ok tuşuyla geçiş, telefon yerleri ve sabit alt çubuk", async () => {
  const original = window.matchMedia;
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  const v = await mount();
  try {
    assert.equal(
      document.getElementById(v.root().getAttribute("aria-labelledby")).textContent.trim(),
      "imagePlacement.titleShort"
    );
    const tabs = () => [...v.host.querySelectorAll('[role="tab"]')];
    assert.deepEqual(
      tabs().map((b) => b.getAttribute("aria-selected")),
      ["true", "false"]
    );
    assert.equal(
      v.host.querySelector('[role="tabpanel"]').getAttribute("aria-labelledby"),
      tabs()[0].id
    );
    // Telefon görünümü telefon yerleriyle açılır.
    assert.ok(v.host.querySelector("[data-place]").dataset.place.startsWith("mobile:"));
    tabs()[0].focus();
    tabs()[0].dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true })
    );
    await settle(Vue);
    assert.deepEqual(
      tabs().map((b) => b.getAttribute("aria-selected")),
      ["false", "true"]
    );
    assert.equal(document.activeElement, tabs()[1]);
    assert.ok(v.host.querySelector("[data-fe]"));
    assert.ok(v.host.querySelector(".ipm__bar .ipm__btn--primary"));
  } finally {
    v.close();
    window.matchMedia = original;
  }
});

/* ── Fix turu 1: odak kayıpları (I-1, I-2, I-3) ve seçili durum karşıtlığı (I-4) ── */

const escOn = (el) =>
  el.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
  );

test("I-1: çakışmada 'Yeniden yükle' sonrası odak pencerede kalır; Esc odak nerede olursa olsun kapatır", async () => {
  const v = await mount({ saveError: Object.assign(new Error("x"), { status: 412 }) });
  try {
    v.host.querySelector("[data-fe]").click();
    await settle(Vue);
    primary(v.host).click();
    await settle(Vue);
    const reloadBtn = [...v.host.querySelectorAll(".ipm__alert button")][0];
    reloadBtn.focus();
    reloadBtn.click();
    await settle(Vue);
    assert.equal(reloadBtn.isConnected, false);
    assert.notEqual(document.activeElement, document.body);
    assert.ok(v.root().contains(document.activeElement), document.activeElement.outerHTML);
    // Odak bir şekilde gövdeye düşse bile Esc çalışmalı.
    document.activeElement.blur();
    assert.equal(document.activeElement, document.body);
    escOn(document.body);
    await settle(Vue);
    assert.deepEqual(v.events.slice(-2), [["update:open", false], ["close"]]);
  } finally {
    v.close();
  }
});

test("I-1: belge düzeyi Esc dinleyicisi pencere kapanınca/sökülünce kalkar", async () => {
  const v = await mount();
  v.close();
  const before = v.events.length;
  escOn(document.body);
  await settle(Vue);
  assert.equal(v.events.length, before);
});

test("I-2: v-if ile bağlanan pencere (gerçek çağrı yerleri) kapanınca odak açan düğmeye döner", async () => {
  const { Modal } = build();
  const opener = document.createElement("button");
  document.body.append(opener);
  const host = document.createElement("div");
  document.body.append(host);
  const state = Vue.reactive({ open: true });
  opener.focus();
  const app = Vue.createApp({
    render: () =>
      state.open
        ? Vue.h(Modal, {
            open: state.open,
            "onUpdate:open": (val) => (state.open = val),
            fileUrl: "/files/c2/ozgen-banner.webp",
            slotKey: "company.cover_image",
            returnFocus: () => opener,
          })
        : null,
  });
  app.mount(host);
  await settle(Vue, 6);
  try {
    assert.notEqual(document.activeElement, opener);
    escOn(host.querySelector('[role="dialog"]'));
    await settle(Vue, 6);
    assert.equal(host.querySelector('[role="dialog"]'), null);
    assert.equal(document.activeElement, opener);
    assert.notEqual(opener.inert, true); // jsdom `inert` yansıtmaz: undefined ya da false
  } finally {
    app.unmount();
    host.remove();
    opener.remove();
  }
});

test("I-3: onayda 'Düzenlemeye dön' ya da Esc, odağı onaydan önceki öğeye geri verir", async () => {
  const v = await mount();
  try {
    const fe = v.host.querySelector("[data-fe]");
    fe.click();
    await settle(Vue);
    for (const how of ["keep", "esc"]) {
      fe.focus();
      v.press("Escape");
      await settle(Vue);
      assert.ok(v.host.querySelector('[role="alertdialog"]'));
      assert.equal(document.activeElement, v.host.querySelector("[data-confirm-keep]"));
      if (how === "keep") v.host.querySelector("[data-confirm-keep]").click();
      else escOn(document.activeElement);
      await settle(Vue);
      assert.equal(v.host.querySelector('[role="alertdialog"]'), null, how);
      assert.equal(document.activeElement, fe, how);
    }
    assert.equal(v.open.value, true);
  } finally {
    v.close();
  }
});

test("I-4: cihaz seçici ve sekmelerde seçili öğe 2 px #1a1a1a halka taşır (1.4.11 ≥ 3:1)", () => {
  const src = readFileSync(FILE, "utf8");
  for (const sel of [
    /\.ipm__seg-btn--on\s*\{([^}]*)\}/,
    /\.ipm__tab\[aria-selected="true"\]\s*\{([^}]*)\}/,
  ]) {
    const body = src.match(sel)?.[1] || "";
    assert.match(body, /box-shadow:\s*inset 0 0 0 2px #1a1a1a/, sel.source);
  }
});

test("kaydetme hatası başarı yeşiliyle yazılmaz", async () => {
  const v = await mount({ saveError: new Error("ağ") });
  try {
    v.host.querySelector("[data-fe]").click();
    await settle(Vue);
    primary(v.host).click();
    await settle(Vue);
    const st = v.host.querySelector('[role="status"]');
    assert.match(st.textContent, /imagePlacement\.status\.saveFailed/);
    assert.ok(st.classList.contains("ipm__status--error"), st.className);
  } finally {
    v.close();
  }
});

const EMPTY_TARGET = {
  asset: "",
  processing: true,
  source: { width: 0, height: 0, bytes: 0, format: "" },
  focal: null,
  square: null,
};
const readyTarget = (asset) => ({
  asset,
  processing: false,
  source: { width: 2000, height: 408, bytes: 1, format: "webp" },
  focal: null,
  square: null,
});
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
const pressed = (host) =>
  [...host.querySelectorAll(".ipm__seg-btn")].map((b) => b.getAttribute("aria-pressed"));

test("final I-1: yükleme sırasında seçilen 'Telefon' yükleme bitince geri alınmaz", async () => {
  const gate = deferred();
  const v = await mount({ getTarget: () => gate.promise.then(() => readyTarget("A1")) });
  try {
    assert.deepEqual(pressed(v.host), ["true", "false"]);
    v.host.querySelectorAll(".ipm__seg-btn")[1].click();
    await settle(Vue);
    assert.deepEqual(pressed(v.host), ["false", "true"]);
    gate.resolve();
    await settle(Vue, 8);
    assert.ok(v.host.querySelector("[data-fe]"), "hedef yüklendi");
    assert.deepEqual(pressed(v.host), ["false", "true"]);
  } finally {
    v.close();
  }
});

test("final I-3: pencere açıkken görsel değişirse hedef yeniden okunur, Kaydet yeni varlığa yazar", async () => {
  const assets = { "/files/c2/a.webp": "A1", "/files/c2/b.webp": "B1" };
  const v = await mount(
    { getTarget: (url) => readyTarget(assets[url]) },
    { fileUrl: "/files/c2/a.webp" }
  );
  try {
    assert.deepEqual(v.calls.target.at(-1), ["/files/c2/a.webp", "company.cover_image"]);
    v.extra.fileUrl = "/files/c2/b.webp";
    await settle(Vue, 8);
    assert.deepEqual(v.calls.target.at(-1), ["/files/c2/b.webp", "company.cover_image"]);
    v.host.querySelector("[data-fe]").click();
    await settle(Vue);
    primary(v.host).click();
    await settle(Vue);
    assert.equal(v.calls.save.length, 1);
    assert.equal(v.calls.save[0].asset, "B1");
  } finally {
    v.close();
  }
});

test("final I-3: eski hedefin geç gelen yanıtı yeni görselin üzerine yazılmaz", async () => {
  const slow = deferred();
  const v = await mount(
    {
      getTarget: (url) =>
        url === "/files/c2/a.webp" ? slow.promise.then(() => readyTarget("A1")) : readyTarget("B1"),
    },
    { fileUrl: "/files/c2/a.webp" }
  );
  try {
    v.extra.fileUrl = "/files/c2/b.webp";
    await settle(Vue, 8);
    slow.resolve();
    await settle(Vue, 8);
    v.host.querySelector("[data-fe]").click();
    await settle(Vue);
    primary(v.host).click();
    await settle(Vue);
    assert.deepEqual(
      v.calls.save.map((c) => c.asset),
      ["B1"]
    );
    assert.ok(!v.calls.intent.includes("A1"), "eski varlığın kaydı okunmadı");
  } finally {
    v.close();
  }
});

test("final I-5: varlık hazır değilken hedef aralıkla yeniden okunur, varlık gelince Kaydet açılır", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let ready = false;
  const v = await mount({ getTarget: () => (ready ? readyTarget("A1") : EMPTY_TARGET) });
  try {
    assert.equal(primary(v.host).disabled, true);
    assert.match(v.host.textContent, /imagePlacement\.status\.cannotSave/);
    t.mock.timers.tick(3000);
    await settle(Vue, 6);
    assert.equal(v.calls.target.length, 2);
    assert.equal(primary(v.host).disabled, true);
    ready = true;
    t.mock.timers.tick(3000);
    await settle(Vue, 8);
    assert.equal(v.calls.target.length, 3);
    assert.equal(primary(v.host).disabled, false);
    assert.doesNotMatch(v.host.textContent, /imagePlacement\.status\.cannotSave/);
    v.host.querySelector("[data-fe]").click();
    await settle(Vue);
    primary(v.host).click();
    await settle(Vue);
    assert.equal(v.calls.save[0].asset, "A1");
  } finally {
    v.close();
  }
});

test("final I-5: yeniden deneme sırasında taşınan odak varlık gelince korunur", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let ready = false;
  const v = await mount({ getTarget: () => (ready ? readyTarget("A1") : EMPTY_TARGET) });
  try {
    v.host.querySelector("[data-fe]").click();
    await settle(Vue);
    ready = true;
    t.mock.timers.tick(3000);
    await settle(Vue, 8);
    primary(v.host).click();
    await settle(Vue);
    assert.equal(v.calls.save[0].focalX, 0.78);
    assert.equal(v.calls.save[0].focalY, 0.45);
  } finally {
    v.close();
  }
});

test("final I-5: ~60 sn sonra deneme durur, mesaj sayfayı kaydedip yeniden açmayı söyler", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const v = await mount({ getTarget: () => EMPTY_TARGET });
  try {
    for (let i = 0; i < 25; i += 1) {
      t.mock.timers.tick(3000);
      await settle(Vue, 3);
    }
    const calls = v.calls.target.length;
    assert.ok(calls >= 15 && calls <= 22, `deneme sayısı ${calls}`);
    assert.match(v.host.textContent, /imagePlacement\.status\.cannotSaveReopen/);
    t.mock.timers.tick(30000);
    await settle(Vue, 3);
    assert.equal(v.calls.target.length, calls);
  } finally {
    v.close();
  }
});

test("final I-5: pencere kapanınca yeniden deneme durur", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const v = await mount({ getTarget: () => EMPTY_TARGET });
  try {
    v.press("Escape");
    await settle(Vue);
    const calls = v.calls.target.length;
    t.mock.timers.tick(30000);
    await settle(Vue, 3);
    assert.equal(v.calls.target.length, calls);
  } finally {
    v.close();
  }
});

test("yeni yüklenen görsel önce 404 dönerse kırık kalmaz, yeniden denenir", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const probes = [];
  globalThis.Image = class {
    set src(u) {
      this._src = u;
      probes.push(this);
    }
    get src() {
      return this._src;
    }
  };
  const v = await mount();
  try {
    const srcs = () =>
      [...v.root().querySelectorAll("[data-src]")].map((i) => i.getAttribute("data-src"));
    assert.ok(srcs().length > 0, "pencerede görsel var");
    assert.ok(
      srcs().every((s) => s.startsWith("data:")),
      "yüklenene kadar kırık ikon yerine yer tutucu"
    );
    probes.at(-1).onerror();
    t.mock.timers.tick(2000);
    await settle(Vue);
    assert.equal(probes.at(-1).src, "/files/c2/ozgen-banner.webp?r=1");
    probes.at(-1).onload();
    await settle(Vue);
    assert.ok(srcs().every((s) => s === "/files/c2/ozgen-banner.webp?r=1"));
    v.press("Escape");
    await settle(Vue);
    const n = probes.length;
    t.mock.timers.tick(10000);
    assert.equal(probes.length, n, "kapanınca yeniden deneme durur");
  } finally {
    delete globalThis.Image;
    v.close();
  }
});

test("ürün görseli henüz kare değilse 'tamamlandı' denmez, kaydedince olacağı söylenir", async () => {
  const kare = (square, source) => ({
    asset: "A1",
    processing: false,
    source: { bytes: 97484, format: "webp", ...source },
    focal: null,
    square,
  });
  const v = await mount(
    { target: kare({ original: null, size: 0 }, { width: 1672, height: 941 }) },
    { slotKey: "product.image" }
  );
  try {
    const box = v.root().querySelector(".ipm__square");
    assert.ok(box, "kare kutusu var");
    assert.match(box.textContent, /square\.pendingTitle/);
    assert.doesNotMatch(box.textContent, /square\.title/);
    assert.match(box.textContent, /1672 × 941 →\s*1672 × 1672/);
  } finally {
    v.close();
  }
  const w = await mount(
    {
      target: kare(
        { original: { width: 800, height: 1000 }, size: 1000 },
        { width: 1000, height: 1000 }
      ),
    },
    { slotKey: "product.image" }
  );
  try {
    const box = w.root().querySelector(".ipm__square");
    assert.match(box.textContent, /square\.title/);
    assert.match(box.textContent, /800 × 1000 →\s*1000 × 1000/);
  } finally {
    w.close();
  }
});
