import "./fixtures/jsdomGlobals.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { compileScript, parse } from "@vue/compiler-sfc";
import * as Vue from "vue";
import * as status from "../../../lib/media/status.js";
import * as tray from "../../../lib/media/uploadTray.js";
import tr from "../../../i18n/mediaFlow.js";

/**
 * `MediaTransferRow` — onaylı yüzen tepsi satırının aynısı (C · Yüzen tepsi).
 * Küçük resim katmanı gerçek `MediaPhaseThumb` ile çizilir (tepsiyle ortak
 * bileşen); `MediaAttentionList` gerçek satırla birlikte bağlanır.
 */
function load(file, stubs) {
  const { descriptor } = parse(readFileSync(new URL(file, import.meta.url), "utf8"));
  const compiled = compileScript(descriptor, { id: "transfer-test", inlineTemplate: true });
  const program = compiled.content
    .replace(/import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'];?/g, (_, bindings, path) => {
      const target = path === "vue" ? "Vue" : `stubs[${JSON.stringify(path)}]`;
      return bindings.trim().startsWith("{")
        ? `const ${bindings.replace(/\s+as\s+/g, ":")} = ${target};`
        : `const ${bindings.trim()} = ${target};`;
    })
    .replace("export default", "return");
  return new Function("Vue", "stubs", program)(Vue, stubs);
}
const t = (key, params = {}) =>
  (
    key
      .replace("mediaFlow.", "")
      .split(".")
      .reduce((value, field) => value?.[field], tr.tr) || key
  ).replace(/\{(\w+)\}/g, (_, name) => params[name] ?? "");
const i18n = { useI18n: () => ({ t }) };
const formatting = { formatBytes: (n) => `${n} B`, iconForKind: () => "file" };
const PhaseThumb = load("../MediaPhaseThumb.vue", {
  "@/components/common/AppIcon.vue": { render: () => Vue.h("svg") },
  "@/components/media/MediaThumb.vue": {
    props: ["item"],
    setup: (props) => () => Vue.h("img", { class: "thumb-stub", src: props.item.fileUrl }),
  },
  "@/lib/media/uploadTray.js": tray,
  "@/utils/mediaFormat": formatting,
});
const component = load("../MediaTransferRow.vue", {
  "vue-i18n": i18n,
  "./MediaPhaseThumb.vue": PhaseThumb,
  "@/utils/mediaFormat": formatting,
  "@/lib/media/status.js": status,
  "@/lib/media/uploadTray.js": tray,
});
const AttentionList = load("../MediaAttentionList.vue", {
  "vue-i18n": i18n,
  "./MediaTransferRow.vue": component,
  "@/lib/media/status.js": status,
});
function mountWith(Comp, overrides, host = document.createElement("div")) {
  const props = Vue.reactive({ ...overrides });
  document.body.append(host);
  const app = Vue.createApp({ render: () => Vue.h(Comp, props) });
  app.mount(host);
  return {
    props,
    host,
    close: () => {
      app.unmount();
      host.remove();
    },
  };
}
function mount(overrides = {}) {
  return mountWith(
    component,
    { name: "report.pdf", kind: "document", bytes: 1200, phase: "ready", ...overrides },
    document.createElement("ul")
  );
}
test("ready document has no bar, repeated success paragraph or optimization stage", () => {
  const { host, close } = mount({ facts: { scan_status: "clean" } });
  assert.equal(host.querySelector('[role="progressbar"]'), null);
  assert.equal(host.querySelector(".utray-row__bar"), null);
  assert.equal(host.querySelector(".media-transfer__reason"), null);
  assert.doesNotMatch(host.querySelector("dl").textContent, /Hazırlama/);
  close();
});
test("progress and phase updates keep row, detail button and focus", async () => {
  const { host, props, close } = mount({ phase: "uploading", progress: 12 });
  const row = host.querySelector("li");
  const button = host.querySelector("button");
  button.focus();
  button.click();
  props.progress = 61;
  await Vue.nextTick();
  assert.equal(host.querySelector('[role="progressbar"]').getAttribute("aria-valuenow"), "61");
  props.phase = "scanning";
  await Vue.nextTick();
  assert.equal(host.querySelector("li"), row);
  assert.equal(host.querySelector("button"), button);
  assert.equal(document.activeElement, button);
  assert.equal(button.getAttribute("aria-expanded"), "true");
  assert.equal(host.querySelector('[role="progressbar"]'), null);
  // Süresi bilinmeyen bekleme: ekran okuyucudan gizli ince kayan çizgi.
  assert.ok(host.querySelector('.utray-row__bar--indeterminate[aria-hidden="true"]'));
  close();
});
test("unknown transfer percentage is indeterminate and security error is not malware", async () => {
  const { host, props, close } = mount({ phase: "uploading", progress: null });
  assert.equal(host.querySelector('[role="progressbar"]').hasAttribute("aria-valuenow"), false);
  assert.ok(host.querySelector('[role="progressbar"].utray-row__bar--indeterminate'));
  props.phase = "scanFailed";
  await Vue.nextTick();
  const reason = host.querySelector(".media-transfer__reason").textContent;
  assert.match(reason, /sonuçlanmadı/);
  assert.doesNotMatch(reason, /Zararlı içerik bulundu/);
  // Sebep görünür ikinci satırda da (etiket + metin, renk tek başına değil).
  assert.match(host.querySelector(".utray-row__meta").textContent, /sonuçlanmadı/);
  close();
});
test("details are collapsed by default and the row's own disclosure toggles them", async () => {
  const { host, close } = mount({
    name: "vitrin.png",
    kind: "image",
    phase: "scanning",
    bytes: 97485,
    facts: { scan_status: "pending" },
  });
  const toggle = host.querySelector(".utray-row__info");
  const details = document.getElementById(toggle.getAttribute("aria-controls"));
  assert.ok(details, "aria-controls ayrıntı bölgesini gösterir");
  assert.equal(toggle.getAttribute("aria-expanded"), "false");
  assert.equal(details.style.display, "none");
  // Görünür satır: ad + "<strong>Güvenlik kontrolü</strong> · boyut".
  assert.equal(host.querySelector(".utray-row__name").textContent, "vitrin.png");
  assert.equal(host.querySelector(".utray-row__label").tagName, "STRONG");
  assert.equal(
    host.querySelector(".utray-row__meta").textContent.replace(/\s+/g, " ").trim(),
    "Güvenlik kontrolü · 97485 B"
  );
  toggle.click();
  await Vue.nextTick();
  assert.equal(toggle.getAttribute("aria-expanded"), "true");
  assert.notEqual(details.style.display, "none");
  assert.match(details.textContent, /Güvenlik kontrolü/);
  assert.match(details.textContent, /Hazırlama/);
  toggle.click();
  await Vue.nextTick();
  assert.equal(toggle.getAttribute("aria-expanded"), "false");
  assert.equal(details.style.display, "none");
  close();
});
test("every phase draws its thumbnail overlay and a text label", async () => {
  const cases = {
    queued: "queued",
    preparing: "stack",
    uploading: "ring",
    uploaded: "shield",
    scanning: "shield",
    processing: "stack",
    ready: "check",
    blocked: "lock",
    scanFailed: "error",
    processingFailed: "error",
    uploadFailed: "error",
    review: "warn",
    unverified: "warn",
    cancelled: "cancel",
  };
  for (const [phase, overlay] of Object.entries(cases)) {
    const { host, close } = mount({ phase, kind: "image", progress: 40 });
    const li = host.querySelector("li");
    assert.equal(li.dataset.tone, tray.rowTone(phase), `${phase} tonu`);
    assert.ok(host.querySelector(`.utray-ov[data-overlay="${overlay}"]`), `${phase} → ${overlay}`);
    assert.equal(
      host.querySelector(".utray-row__thumb").getAttribute("aria-hidden"),
      "true",
      "katman bezeme; durum metinde"
    );
    assert.equal(
      host.querySelector(".utray-row__label").textContent,
      t(`mediaFlow.phase.${phase}`)
    );
    close();
  }
});
test("library item renders its real thumbnail; otherwise local preview or kind icon", () => {
  const lib = mount({ phase: "scanning", media: { fileUrl: "/files/a.png", fileName: "a.png" } });
  assert.equal(lib.host.querySelector(".thumb-stub").getAttribute("src"), "/files/a.png");
  lib.close();
  const local = mount({ phase: "uploading", previewUrl: "blob:x" });
  assert.equal(local.host.querySelector(".utray-row__img").getAttribute("src"), "blob:x");
  local.close();
  const doc = mount({ phase: "ready" });
  assert.ok(doc.host.querySelector(".utray-row__kind"));
  doc.close();
});
test("attention list: card header with counts; action says 'Ayrıntılar' and names the file", () => {
  const opened = [];
  const items = [
    { id: "a", fileName: "vana.png", kind: "image", bytes: 97485, scan_status: "pending" },
    { id: "b", fileName: "kilit.png", kind: "image", bytes: 10, scan_status: "infected" },
    { id: "c", fileName: "hazir.png", kind: "image", bytes: 10, scan_status: "clean" },
  ];
  const { host, close } = mountWith(AttentionList, {
    items,
    onOpen: (item) => opened.push(item.id),
  });
  const section = host.querySelector("section.media-attention");
  const title = document.getElementById(section.getAttribute("aria-labelledby"));
  assert.equal(title.textContent, "İlgilenmeniz gereken dosyalar (2)");
  assert.equal(
    host.querySelector(".media-attention__sub").textContent,
    "Engellendi: 1 · Güvenlik kontrolü: 1"
  );
  const actions = [...host.querySelectorAll(".media-transfer__action")];
  assert.equal(actions.length, 2);
  for (const button of actions) {
    assert.equal(button.textContent.trim(), "Ayrıntılar");
    assert.doesNotMatch(button.textContent, /^ayrıntıları$/);
  }
  assert.equal(actions[0].getAttribute("aria-label"), "vana.png ayrıntıları");
  assert.equal(actions[1].getAttribute("aria-label"), "kilit.png ayrıntıları");
  actions[0].click();
  assert.deepEqual(opened, ["a"]);
  // Satır içi ayrıntı yine kapalı başlar.
  for (const toggle of host.querySelectorAll(".utray-row__info"))
    assert.equal(toggle.getAttribute("aria-expanded"), "false");
  close();
});
test("attention list title says 'in progress' when nothing needs action", () => {
  const { host, close } = mountWith(AttentionList, {
    items: [{ id: "a", fileName: "vana.png", kind: "image", scan_status: "pending" }],
  });
  assert.equal(host.querySelector("h2").textContent, "İşlemi süren dosyalar (1)");
  close();
});
test("detailsShort and attention strings exist in all four languages", () => {
  for (const lang of ["tr", "en", "ru", "ar"]) {
    assert.ok(tr[lang].detailsShort, `${lang}.detailsShort`);
    for (const key of ["titleActive", "titleIssues", "count"])
      assert.match(tr[lang].attention[key], /\{n\}/, `${lang}.attention.${key}`);
  }
  assert.equal(tr.tr.detailsShort, "Ayrıntılar");
});
