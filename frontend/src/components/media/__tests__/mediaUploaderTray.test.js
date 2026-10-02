import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { installDom, loadSfc, settle } from "../preview/__tests__/mountSfc.js";

/**
 * "Medya Yükle" yükleyicisi ↔ yüzen tepsi köprüsü (jsdom).
 *
 *   ÖLÇÜLDÜ  — yükleyici satırlarının (ITEM_STATUS) tepside doğru faz/katman/
 *              metinle çizildiği, sayım ve genel yüzdenin iki kaynağı birlikte
 *              saydığı, tepsi eylemlerinin (dene/iptal/temizle) doğru kuyruğa
 *              gittiği, modal kapandıktan sonra biten yüklemenin listeyi bir kez
 *              tazelediği, yükleyicinin kabulden sonra satır içi listeyi
 *              "tepside sürüyor" satırıyla değiştirdiği, karar isteyen satırları
 *              (engel/kopya) modalda tuttuğu ve sökülünce kuyruğa dokunmadığı.
 *   BAŞKA YERDE — ortak kuyruğun bileşen kapsamı ölünce de yüklemeyi
 *              bitirdiği gerçek composable ile `queue.test.js`'te ölçülüyor.
 *   ÖLÇÜLMEDİ — gerçek tarayıcıda yerleşim (FAB/tab bar/tepsi çubuğu).
 */

const dom = installDom();
const Vue = await import("vue");
const { createI18n } = await import("vue-i18n");
const { default: tr } = await import("../../../i18n/locales/tr.js");
const status = await import("../../../lib/media/status.js");
const tray = await import("../../../lib/media/uploadTray.js");
const focusTrap = await import("../../common/focusTrap.js");

const i18n = createI18n({ legacy: false, locale: "tr", fallbackLocale: "tr", messages: { tr } });
const { t, te } = i18n.global;

// useMediaUpload.js'in ITEM_STATUS'u (gerçek modül api/işçi çeker; burada kopya).
const ITEM_STATUS = {
  QUEUED: "queued",
  CHECKING: "checking",
  BLOCKED: "blocked",
  DUPLICATE: "duplicate",
  READY: "ready",
  PREPARING: "preparing",
  UPLOADING: "uploading",
  DONE: "done",
  FAILED: "failed",
  ABORTED: "aborted",
};

function setPhone(on) {
  dom.window.matchMedia = () => ({
    matches: on,
    addEventListener() {},
    removeEventListener() {},
  });
}

const open = new Set();
afterEach(() => {
  for (const w of [...open]) w.close();
});

async function mountComp(Component, props = {}, listeners = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = Vue.createApp({ render: () => Vue.h(Component, { ...props, ...listeners }) });
  app.mount(host);
  await settle(Vue);
  const w = {
    q: (sel) => document.body.querySelector(sel),
    qa: (sel) => [...document.body.querySelectorAll(sel)],
    close() {
      if (!open.delete(w)) return;
      app.unmount();
      host.remove();
    },
  };
  open.add(w);
  return w;
}

/** useMediaUpload satırı — yalnız tepsinin okuduğu alanlar. */
const item = (id, statusValue, extra = {}) => ({
  id,
  name: `${id}.png`,
  size: 1000,
  kind: "image",
  status: statusValue,
  percent: 0,
  findings: [],
  result: null,
  error: null,
  ...extra,
});

/** Sahte ortak kuyruk: gerçek API'si ile aynı yüz, çağrıları kaydeder. */
function fakeShared(initial = []) {
  const calls = { add: [], retry: [], remove: [], abort: [], abortAll: 0, clearFinished: 0 };
  const items = Vue.ref(initial);
  const claimed = new Set();
  let seq = 0;
  return {
    calls,
    items,
    stats: Vue.computed(() => ({ total: items.value.length })),
    overallPercent: Vue.ref(0),
    workerActive: Vue.ref(null),
    add(files, opts) {
      calls.add.push(opts);
      const yeni = Array.from(files).map((f) => {
        seq += 1;
        return item(`n${seq}`, ITEM_STATUS.QUEUED, { name: f.name, ...opts });
      });
      items.value.push(...yeni);
      return yeni.map((y) => items.value.find((i) => i.id === y.id));
    },
    retry: (id) => calls.retry.push(id),
    proceed() {},
    abort: (id) => calls.abort.push(id),
    remove: (id) => {
      calls.remove.push(id);
      items.value = items.value.filter((i) => i.id !== id);
    },
    abortAll: () => (calls.abortAll += 1),
    clearFinished: () => (calls.clearFinished += 1),
    claimDone(id) {
      if (claimed.has(id)) return false;
      claimed.add(id);
      return true;
    },
  };
}

// ── Uyarlayıcı (saf) ──────────────────────────────────────────────

test("uyarlayıcı: her ITEM_STATUS tepsinin bir fazına düşer", () => {
  const phaseOf = (it, fact) => {
    const up = tray.fromUploaderItem(it);
    return up.phase || status.uploadPhase(up, fact);
  };
  const cases = [
    [item("a", "queued"), "queued"],
    [item("b", "ready"), "queued"],
    [item("c", "checking"), "preparing"],
    [item("d", "preparing"), "preparing"],
    [item("e", "uploading", { percent: 40, progressKnown: true }), "uploading"],
    [item("f", "failed", { error: "x" }), "uploadFailed"],
    [item("g", "aborted"), "cancelled"],
    [item("h", "duplicate"), "review"],
    [
      item("i", "blocked", {
        findings: [{ reason: "ext_not_allowed", severity: "block", params: { ext: ".svg" } }],
      }),
      "blocked",
    ],
  ];
  for (const [it, phase] of cases) assert.equal(phaseOf(it), phase, it.status);
  // Biten satırın fazı sunucu kanıtından: tarama sürüyor → scanning, temiz+hazır → ready.
  const done = item("j", "done", { result: { name: "F-j" } });
  assert.equal(phaseOf(done, { scan_status: "pending" }), "scanning");
  assert.equal(phaseOf(done, { scan_status: "clean", asset_states: ["ready"] }), "ready");

  const up = tray.fromUploaderItem(cases[8][0]);
  assert.equal(up.id, "mu:i");
  assert.equal(up.retryable, false, "engel yeniden denenemez");
  assert.equal(up.errorCode, "ext_not_allowed");
  assert.deepEqual(up.errorParams, { ext: ".svg" });
  // Tek-istek yüklemede yüzde bilinmez → dönen çark, uydurma yüzde değil.
  assert.equal(tray.fromUploaderItem(item("k", "uploading")).progressKnown, false);
  assert.ok(tray.isUploaderRow("mu:x") && !tray.isUploaderRow("up-1"));
  assert.equal(tray.uploaderItemId("mu:u12"), "u12");
});

test("sayım ve genel yüzde iki kaynağı birlikte sayar", () => {
  const rows = tray.mergeTrayUploads(
    [{ id: "up-1", name: "s.png", status: "uploading", progress: 50, progressKnown: true }],
    [
      item("u1", "uploading", { percent: 100, progressKnown: true }),
      item("u2", "failed", { error: "x" }),
    ]
  );
  assert.deepEqual(
    rows.map((r) => r.id),
    ["up-1", "mu:u1", "mu:u2"]
  );
  const phases = rows.map((r) => r.phase || status.uploadPhase(r, null));
  assert.deepEqual(tray.trayCounts(phases), { total: 3, active: 2, ready: 0, issues: 1 });
  // (0.7·50 + 0.7·100 + 100) / 3 = 68
  assert.equal(
    tray.overallPercent(rows.map((r, i) => ({ phase: phases[i], progress: r.progress }))),
    68
  );
});

// ── Tepsi: yükleyici satırları gerçek bileşende ───────────────────

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
const Queue = loadSfc(
  new URL("../MediaUploadQueue.vue", import.meta.url),
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

test("tepsi yükleyici satırlarını doğru faz, katman ve metinle çizer", async () => {
  setPhone(false);
  const uploads = tray.mergeTrayUploads(
    [{ id: "up-1", name: "s.png", kind: "image", status: "uploading", progress: 10 }],
    [
      item("u1", "uploading", { percent: 40, progressKnown: true }),
      item("u2", "checking"),
      item("u3", "blocked", {
        findings: [{ reason: "ext_not_allowed", severity: "block", params: { ext: ".svg" } }],
      }),
      item("u4", "duplicate"),
      item("u5", "failed", { error: "ağ koptu" }),
      item("u6", "aborted"),
    ]
  );
  const w = await mountComp(Queue, { uploads, floating: true, facts: {} });
  const expect = [
    ["uploading", "ring"],
    ["preparing", "stack"],
    ["blocked", "lock"],
    ["review", "warn"],
    ["uploadFailed", "error"],
    ["cancelled", "cancel"],
  ];
  for (const [phase, overlay] of expect) {
    const row = w.q(`li[data-phase="${phase}"] .utray-ov[data-overlay="${overlay}"]`);
    assert.ok(row, `${phase} → ${overlay}`);
  }
  // Engel metni ön kontrol sebebinden; kopya satırı karar yolunu söyler.
  assert.match(w.q('li[data-phase="blocked"]').textContent, /\.svg uzantısı bu slotta/);
  assert.match(w.q('li[data-phase="review"]').textContent, /Medya Yükle penceresinden/);
  // Başlık iki kaynağın süren satırlarını birlikte sayar (store 1 + yükleyici 2).
  assert.equal(w.q(".utray__title").textContent.trim(), "3 dosya işleniyor");
  // Dene yalnız başarısız aktarımda; engelde yok. Kopya satırı iptal edilebilir.
  const labels = w.qa("button").map((b) => b.getAttribute("aria-label") || "");
  assert.ok(labels.includes(t("mediaFlow.tray.retryLabel", { name: "u5.png" })), "hatada dene");
  assert.ok(
    !labels.includes(t("mediaFlow.tray.retryLabel", { name: "u3.png" })),
    "engelde dene yok"
  );
  assert.ok(labels.includes(t("mediaFlow.tray.cancelLabel", { name: "u4.png" })), "kopyada iptal");
  w.close();
});

// ── Kabuktaki sahip: eylem yönlendirmesi ve liste tazeleme ────────

test("tepsi eylemleri doğru kuyruğa gider; biten yükleme listeyi bir kez tazeler", async () => {
  const seen = {};
  const QueueSpy = Vue.defineComponent({
    props: { uploads: Array, floating: Boolean, ambient: Boolean },
    emits: ["retry", "cancel", "clear"],
    setup(props, { emit }) {
      seen.props = props;
      seen.emit = emit;
      return () => Vue.h("div");
    },
  });
  const storeCalls = { retry: [], cancel: [], clear: 0, load: [] };
  const fakeStore = {
    uploads: Vue.ref([{ id: "up-1", name: "s.png", status: "error" }]),
    showArchived: false,
    retryUpload: (id) => storeCalls.retry.push(id),
    cancelUpload: (id) => storeCalls.cancel.push(id),
    clearFinishedUploads: () => (storeCalls.clear += 1),
    loadReal: (o) => storeCalls.load.push(o),
  };
  const shared = fakeShared([
    item("u1", "uploading"),
    item("u2", "failed"),
    item("u3", "duplicate"),
    item("u4", "blocked"),
    item("u5", "aborted"),
  ]);
  const Host = loadSfc(
    new URL("../MediaUploadTrayHost.vue", import.meta.url),
    {
      pinia: { storeToRefs: (s) => ({ uploads: s.uploads }) },
      "@/stores/media": { useMediaStore: () => fakeStore },
      "@/composables/useMediaUpload.js": { useSharedMediaUpload: () => shared },
      "@/lib/media/uploadTray.js": tray,
      "./MediaUploadQueue.vue": QueueSpy,
    },
    Vue
  );
  const w = await mountComp(Host);
  assert.deepEqual(
    seen.props.uploads.map((u) => u.id),
    ["up-1", "mu:u1", "mu:u2", "mu:u3", "mu:u4", "mu:u5"]
  );
  assert.equal(seen.props.floating, true);
  assert.equal(seen.props.ambient, true);

  seen.emit("retry", "mu:u2");
  seen.emit("retry", "up-1");
  seen.emit("cancel", "mu:u1");
  seen.emit("cancel", "up-1");
  assert.deepEqual(shared.calls.retry, ["u2"]);
  assert.deepEqual(storeCalls.retry, ["up-1"]);
  assert.deepEqual(shared.calls.remove, ["u1"]);
  assert.deepEqual(storeCalls.cancel, ["up-1"]);

  // Temizle: store + yükleyicinin sonuçlanan satırları; kopya (karar bekliyor) kalır.
  seen.emit("clear");
  assert.equal(storeCalls.clear, 1);
  assert.deepEqual(shared.calls.remove, ["u1", "u2", "u4", "u5"]);
  assert.deepEqual(
    shared.items.value.map((i) => i.id),
    ["u3"]
  );

  // Modal kapalıyken biten iki yükleme → tek tazeleme (400 ms toplama).
  shared.items.value.push(item("u6", "done", { result: { name: "F6" } }));
  shared.items.value.push(item("u7", "done", { result: { name: "F7" } }));
  await settle(Vue);
  await new Promise((r) => setTimeout(r, 450));
  assert.deepEqual(storeCalls.load, [{ trashed: false }]);
  // Aynı satır ikinci kez sayılmaz.
  shared.items.value = [...shared.items.value];
  await settle(Vue);
  await new Promise((r) => setTimeout(r, 450));
  assert.equal(storeCalls.load.length, 1);
  w.close();
});

// ── MediaUploader: devir satırı, karar satırları, söküm ───────────

function loadUploader(shared, dropzone) {
  return loadSfc(
    new URL("../upload/MediaUploader.vue", import.meta.url),
    {
      "vue-i18n": { useI18n: () => ({ t, te }) },
      "./UploadDropzone.vue": Vue.defineComponent({
        emits: ["files"],
        setup(_, { emit }) {
          dropzone.drop = (files) => emit("files", files);
          return () => Vue.h("div", { class: "dz" });
        },
      }),
      "./UploadQueueRow.vue": Vue.defineComponent({
        props: { item: Object, slotPolicy: Object, facts: Object },
        setup: (props) => () =>
          Vue.h("li", { class: "uqr", "data-status": props.item.status }, props.item.name),
      }),
      "@/composables/useMediaStatus.js": {
        useMediaStatus: () => ({ facts: Vue.ref({}), unavailable: Vue.ref(false) }),
      },
      "@/lib/media/status.js": status,
      "@/composables/useMediaUpload.js": {
        ITEM_STATUS,
        useMediaUpload: () => {
          throw new Error("ortak kipte yerel kuyruk kurulmamalı");
        },
        useSharedMediaUpload: () => shared,
      },
      "@/lib/media/upload/preflight.js": { getSlotPolicy: () => null },
    },
    Vue
  );
}

const file = (name) => ({ name, size: 10, lastModified: 1, type: "image/png" });

test("yükleyici: kabulden sonra satır içi liste yerine 'tepside sürüyor' satırı ve Kapat", async () => {
  setPhone(false);
  const shared = fakeShared();
  const dz = {};
  const Uploader = loadUploader(shared, dz);
  const events = { close: 0, uploaded: [] };
  const w = await mountComp(
    Uploader,
    { slotKey: "product.image", showHeader: false },
    {
      onClose: () => (events.close += 1),
      onUploaded: (r) => events.uploaded.push(r),
    }
  );
  // Canlı bölge baştan DOM'da ve boş: ilk duyuru kaçmasın.
  const live = w.q('.up__handoff-text[role="status"][aria-live="polite"]');
  assert.ok(live);
  assert.equal(live.textContent.trim(), "");

  dz.drop([file("a.png"), file("b.png")]);
  await settle(Vue);
  assert.equal(shared.calls.add.length, 1);
  assert.equal(shared.calls.add[0].slotKey, "product.image");
  assert.match(shared.calls.add[0].session, /^uploader-/);

  // Sıradaki satır kabul edildi → devir satırı; eski özet/çubuk/liste yok.
  assert.equal(live.textContent.trim(), t("mediaFlow.tray.handoff"));
  assert.match(live.textContent, /sağ alttaki panelde/);
  assert.equal(w.q(".up__summary"), null);
  assert.equal(w.q(".up__bar"), null);
  assert.equal(w.qa(".uqr").length, 0, "süren satır modalda listelenmez");

  // Karar isteyen satırlar modalda kalır.
  shared.items.value[0].status = ITEM_STATUS.DUPLICATE;
  shared.items.value.push(item("x", ITEM_STATUS.BLOCKED));
  await settle(Vue);
  assert.deepEqual(
    w.qa(".uqr").map((li) => li.dataset.status),
    ["duplicate", "blocked"]
  );
  // b.png hâlâ kabul edilmiş → devir satırı sürüyor.
  assert.equal(live.textContent.trim(), t("mediaFlow.tray.handoff"));

  const closeBtn = w.qa(".up__handoff button")[0];
  assert.equal(closeBtn.textContent.trim(), t("mediaFlow.tray.handoffClose"));
  closeBtn.click();
  assert.equal(events.close, 1);

  // Biten satır bir kez bildirilir (kabuktaki sahip de claimDone ile yarışır).
  shared.items.value[1].status = ITEM_STATUS.DONE;
  shared.items.value[1].result = { name: "F-b" };
  await settle(Vue);
  assert.deepEqual(events.uploaded, [{ name: "F-b" }]);
  assert.equal(shared.claimDone(shared.items.value[1].id), false);

  // Söküm (modal kapandı): kuyruğa dokunulmaz — iptal/temizlik yok, satırlar duruyor.
  const before = shared.items.value.map((i) => i.id);
  w.close();
  await settle(Vue);
  assert.deepEqual(
    shared.items.value.map((i) => i.id),
    before
  );
  assert.equal(shared.calls.abortAll, 0);
  assert.equal(shared.calls.clearFinished, 0);
  assert.deepEqual(shared.calls.abort, []);
  assert.deepEqual(shared.calls.remove, []);
});

test("yükleyici telefonda 'alttaki panelde' der; başka açılışın satırını bildirmez", async () => {
  setPhone(true);
  const shared = fakeShared([
    item("eski", ITEM_STATUS.DONE, { result: { name: "F-eski" }, session: "baska" }),
  ]);
  const dz = {};
  const uploaded = [];
  const w = await mountComp(
    loadUploader(shared, dz),
    { showHeader: false },
    { onUploaded: (r) => uploaded.push(r) }
  );
  // Önceki açılışın satırı: devir satırı yok, `uploaded` yok.
  assert.equal(w.q(".up__handoff-text").textContent.trim(), "");
  assert.deepEqual(uploaded, []);
  dz.drop([file("c.png")]);
  await settle(Vue);
  assert.equal(w.q(".up__handoff-text").textContent.trim(), t("mediaFlow.tray.handoffPhone"));
  assert.match(w.q(".up__handoff-text").textContent, /alttaki panelde/);
  w.close();
  setPhone(false);
});
