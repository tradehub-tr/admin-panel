import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { installDom, loadSfc, settle } from "./mountSfc.js";

installDom();
const Vue = await import("vue");
const places = await import("../../../../lib/media/preview/places.js");
const { default: messages } = await import("../../../../lib/media/preview/messages.js");

const FILE = new URL("../FocalEditor.vue", import.meta.url);
const FocalEditor = loadSfc(
  FILE,
  {
    "vue-i18n": {
      useI18n: () => ({ t: (k, p) => (p ? `${k}${JSON.stringify(p)}` : k), locale: Vue.ref("tr") }),
    },
    "@/lib/media/preview/places.js": places,
    "@/lib/media/preview/messages.js": messages,
  },
  Vue
);

async function mount(props) {
  const events = [];
  const host = document.createElement("div");
  document.body.append(host);
  const app = Vue.createApp({
    render: () =>
      Vue.h(FocalEditor, {
        src: "/files/ozgen.webp",
        imageRatio: 2000 / 408,
        focal: { x: 0.78, y: 0.45 },
        frame: { left: 0.43, top: 0, width: 0.44, height: 1 },
        ...props,
        onSet: (...a) => events.push(["set", ...a]),
        onNudge: (...a) => events.push(["nudge", ...a]),
        onCenter: () => events.push(["center"]),
        onSuggest: () => events.push(["suggest"]),
      }),
  });
  app.mount(host);
  await settle(Vue);
  return { host, events, close: () => (app.unmount(), host.remove()) };
}

const key = (el, k, extra = {}) =>
  el.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...extra })
  );

test("işaret: ok %1, Shift+ok %10, Home ortalar", async () => {
  const v = await mount();
  try {
    const handle = v.host.querySelector(".fe__handle");
    assert.match(handle.getAttribute("aria-label"), /imagePlacement\.focal\.handle/);
    key(handle, "ArrowRight");
    key(handle, "ArrowUp", { shiftKey: true });
    key(handle, "Home");
    assert.deepEqual(v.events, [["nudge", 1, 0, false], ["nudge", 0, -1, true], ["center"]]);
  } finally {
    v.close();
  }
});

test("tıklama ile seçme (sürüklemeye alternatif)", async () => {
  const v = await mount();
  try {
    const box = v.host.querySelector(".fe__box");
    box.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
    });
    box.dispatchEvent(new window.MouseEvent("click", { clientX: 156, clientY: 45, bubbles: true }));
    const [kind, x, y] = v.events.at(-1);
    assert.equal(kind, "set");
    assert.ok(Math.abs(x - 0.78) < 1e-9 && Math.abs(y - 0.45) < 1e-9);
  } finally {
    v.close();
  }
});

test("sayı kutuları yüzdeyi 0-1'e çevirir", async () => {
  const v = await mount();
  try {
    const [inX] = v.host.querySelectorAll("input[type=number]");
    inX.value = "30";
    inX.dispatchEvent(new window.Event("change", { bubbles: true }));
    assert.deepEqual(v.events.at(-1), ["set", 0.3, 0.45]);
  } finally {
    v.close();
  }
});

test("RTL'de aynalanmaz: işaret görselin yüzde koordinatlarında kalır", async () => {
  const v = await mount();
  try {
    assert.equal(v.host.querySelector(".fe__box").getAttribute("dir"), "ltr");
    const anchor = v.host.querySelector(".fe__layer--handle");
    assert.equal(anchor.style.left, "78%");
    assert.equal(anchor.style.top, "45%");
    assert.equal(anchor.style.transform, "");
  } finally {
    v.close();
  }
});

test("telefon: artır/azalt düğmeleri adlandırılmış", async () => {
  const v = await mount({ compact: true });
  try {
    const inc = [...v.host.querySelectorAll("button")].find((b) =>
      b.getAttribute("aria-label")?.includes("imagePlacement.focal.incX")
    );
    inc.click();
    assert.deepEqual(v.events.at(-1), ["nudge", 1, 0, false]);
  } finally {
    v.close();
  }
});

test("hareket azaltma: geçişler kapanıyor", () => {
  const src = readFileSync(FILE, "utf8");
  assert.match(src, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(src, /transition: transform 220ms cubic-bezier\(0\.2, 0\.8, 0\.2, 1\)/);
  assert.doesNotMatch(src, /transition:[^;]*(left|top|width|height)/);
});

test("yüklenirken kapalı: işaret, kutular, düğmeler etkisiz (yükleme odağı ezmesin)", async () => {
  const v = await mount({ disabled: true });
  try {
    const box = v.host.querySelector(".fe__box");
    box.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
    });
    box.dispatchEvent(new window.MouseEvent("click", { clientX: 20, clientY: 20, bubbles: true }));
    key(v.host.querySelector(".fe__handle"), "ArrowRight");
    for (const el of v.host.querySelectorAll("button, input"))
      assert.equal(el.disabled, true, el.outerHTML);
    assert.deepEqual(v.events, []);
  } finally {
    v.close();
  }
});

test("telefon: yüzde değeri <bdi> ile yalıtılır (Arapça yön işaretleri taşmasın)", async () => {
  const v = await mount({ compact: true });
  try {
    const values = [...v.host.querySelectorAll(".fe__step-value")];
    assert.equal(values.length, 2);
    for (const el of values) assert.ok(el.querySelector("bdi"), el.outerHTML);
  } finally {
    v.close();
  }
});

test("final I-4: odak işaretinin odak halkası koyu görselde de görünür (2.4.13: koyu halka + beyaz hale)", () => {
  const src = readFileSync(FILE, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [...src.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => ({
    sel: m[1].trim(),
    body: m[2],
  }));
  const handle = rules.filter((r) =>
    r.sel.split(",").some((s) => s.trim() === ".fe__handle:focus-visible")
  );
  const body = handle.map((r) => r.body).join(";");
  assert.match(body, /outline:\s*3px solid #1a1a1a/);
  assert.match(body, /outline-offset:\s*2px/);
  // Beyaz hale ofset boşluğunu (2 px) doldurur: koyu zeminde beyaz, açık zeminde koyu halka görünür.
  assert.match(body, /box-shadow:\s*0 0 0 2px #(fff|ffffff)\b/i);
});
