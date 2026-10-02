import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { installDom, loadSfc, settle } from "../preview/__tests__/mountSfc.js";

/**
 * "Kullanıcı için bitti" kuralı (2026-10-02): yüklendi + temiz tarama = hazır.
 *
 * Prod'da türev kuyruğu yokken `Media Asset` hiç oluşmuyordu ve tepsi
 * "Yüklendi · Hazır olduğu henüz doğrulanmadı · %75"te sonsuza dek kalıyordu.
 * Artık satır hazır sayılır (%100, onay rozeti, başlık "işleniyor" değil);
 * türevler yalnız nötr bir ikinci satırda ("arka planda") anılır. Gerçek
 * sorunlar (engellendi, tarama/hazırlama/yükleme hatası) öne çıkmaya devam eder.
 */

installDom();
const Vue = await import("vue");
const { createI18n } = await import("vue-i18n");
const { default: tr } = await import("../../../i18n/locales/tr.js");
const { default: flow } = await import("../../../i18n/mediaFlow.js");
const status = await import("../../../lib/media/status.js");
const tray = await import("../../../lib/media/uploadTray.js");
const focusTrap = await import("../../common/focusTrap.js");

const i18n = createI18n({ legacy: false, locale: "tr", fallbackLocale: "tr", messages: { tr } });
const { t, te } = i18n.global;
const NOTE = "Görünüm kopyaları arka planda hazırlanıyor";

const formatting = { formatBytes: (n) => `${n} B`, iconForKind: () => "file" };
const PhaseThumb = loadSfc(
  new URL("../MediaPhaseThumb.vue", import.meta.url),
  {
    "@/components/common/AppIcon.vue": Vue.defineComponent({ render: () => Vue.h("svg") }),
    "@/lib/media/uploadTray.js": tray,
    "@/utils/mediaFormat": formatting,
  },
  Vue
);

/** `useMediaStatus` sahtesi: her çağrının anahtar getter'ı, aralığı ve facts ref'i. */
let pollers = [];
const fakeStatus = {
  useMediaStatus: (keys, opts = {}) => {
    const poller = { keys, interval: opts.interval, facts: Vue.ref({}) };
    pollers.push(poller);
    return { facts: poller.facts, unavailable: Vue.ref(false) };
  },
};
const Queue = loadSfc(
  new URL("../MediaUploadQueue.vue", import.meta.url),
  {
    "vue-i18n": { useI18n: () => ({ t, te }) },
    "@/composables/useMediaStatus.js": fakeStatus,
    "@/composables/useScrollLock.js": { useScrollLock: () => ({ set() {} }) },
    "@/components/common/focusTrap": focusTrap,
    "@/lib/media/status.js": status,
    "@/lib/media/uploadTray.js": tray,
    "@/utils/mediaFormat": formatting,
    "./MediaPhaseThumb.vue": PhaseThumb,
  },
  Vue
);
const TransferRow = loadSfc(
  new URL("../MediaTransferRow.vue", import.meta.url),
  {
    "vue-i18n": { useI18n: () => ({ t }) },
    "./MediaPhaseThumb.vue": PhaseThumb,
    "@/utils/mediaFormat": formatting,
    "@/lib/media/status.js": status,
    "@/lib/media/uploadTray.js": tray,
  },
  Vue
);
const AttentionList = loadSfc(
  new URL("../MediaAttentionList.vue", import.meta.url),
  {
    "vue-i18n": { useI18n: () => ({ t }) },
    "./MediaTransferRow.vue": TransferRow,
    "@/lib/media/status.js": status,
  },
  Vue
);

const mounted = new Set();
afterEach(() => {
  for (const close of [...mounted]) close();
  pollers = [];
});

async function mount(Comp, props) {
  const host = document.createElement("div");
  document.body.append(host);
  const state = Vue.reactive({ ...props });
  const app = Vue.createApp({ render: () => Vue.h(Comp, state) });
  app.mount(host);
  await settle(Vue);
  const close = () => {
    if (!mounted.delete(close)) return;
    app.unmount();
    host.remove();
  };
  mounted.add(close);
  return { state, host, close, q: (s) => host.ownerDocument.body.querySelector(s) };
}

const done = (id, name = `${id}.png`, kind = "image") => ({
  id,
  name,
  kind,
  status: "done",
  bytes: 2000,
  progress: 100,
  result: { name: `F-${id}` },
});
const CLEAN = { scan_status: "clean" };

// ── Saf kurallar ────────────────────────────────────────────────────

test("faz eşlemesi: temiz tarama + türev yok/sürüyor → readyBackground", () => {
  assert.equal(status.mediaPhase(CLEAN, "image"), "readyBackground");
  assert.equal(
    status.mediaPhase({ ...CLEAN, asset_states: ["processing"] }, "image"),
    "readyBackground"
  );
  assert.equal(status.mediaPhase({ ...CLEAN, asset_states: ["ready"] }, "image"), "ready");
  assert.equal(status.mediaPhase({ scan_status: "pending" }, "image"), "scanning");
  assert.equal(status.mediaPhase({ scan_status: "infected" }, "image"), "blocked");
  assert.equal(status.mediaPhase({ scan_status: "failed" }, "image"), "scanFailed");
  assert.equal(
    status.mediaPhase({ ...CLEAN, asset_states: ["failed"] }, "image"),
    "processingFailed"
  );
});

test("sayım ve yüzde: readyBackground hazır sayılır, %100, aktif değil, çizgi yok", () => {
  assert.deepEqual(tray.trayCounts(["readyBackground", "ready"]), {
    total: 2,
    active: 0,
    ready: 2,
    issues: 0,
  });
  assert.equal(tray.overallPercent([{ phase: "readyBackground", progress: 100 }]), 100);
  assert.equal(tray.hasShimmer("readyBackground", null), false);
  assert.equal(tray.overlayFor("readyBackground", null), "check");
  assert.equal(tray.rowTone("readyBackground"), "success");
  assert.ok(tray.CLEARABLE_PHASES.includes("readyBackground"));
  assert.equal(tray.backgroundNoteKey("readyBackground"), "mediaFlow.hint.readyBackground");
  assert.equal(tray.backgroundNoteKey("ready"), "");
});

test("i18n: dört dilde etiket, not ve 'arka planda' metni var", () => {
  for (const lang of ["tr", "en", "ru", "ar"]) {
    assert.ok(flow[lang].phase.readyBackground, `${lang}.phase.readyBackground`);
    assert.ok(flow[lang].hint.readyBackground, `${lang}.hint.readyBackground`);
    assert.ok(flow[lang].background, `${lang}.background`);
  }
  assert.equal(flow.tr.hint.readyBackground, NOTE);
  assert.equal(flow.tr.background, "Arka planda");
});

// ── Tepsi ───────────────────────────────────────────────────────────

test("tepsi: temiz taranmış, türevsiz dosya hazır görünür — %75'te takılmaz", async () => {
  const w = await mount(Queue, {
    floating: true,
    uploads: [done("a")],
    facts: { "F-a": CLEAN },
  });
  const row = w.q('li[data-phase="readyBackground"]');
  assert.ok(row, "satır readyBackground");
  assert.equal(row.dataset.tone, "success");
  assert.equal(row.querySelector(".utray-row__label").textContent, "Hazır");
  assert.ok(row.querySelector('.utray-ov[data-overlay="check"]'), "onay rozeti");
  assert.equal(row.querySelector(".utray-row__bar"), null, "kayan çizgi/çark yok");
  assert.equal(row.querySelector(".utray-row__note").textContent.trim(), NOTE);
  assert.doesNotMatch(row.querySelector(".utray-row__meta").textContent, /doğrulanmadı/);
  // Başlık "işleniyor" değil; çark değil onay; ilerleme %100.
  assert.equal(w.q(".utray__title").textContent, t("mediaFlow.title"));
  assert.equal(w.q(".utray__spin"), null);
  assert.ok(w.q(".utray__done"));
  assert.match(w.q(".utray__sub").textContent, /1 hazır · 0 sorunlu/);
  assert.equal(w.q(".utray__overall span").style.transform, "scaleX(1)");
  // Ayrıntıda Hazırlama düz sözle: "Arka planda".
  row.querySelector(".utray-row__info").click();
  await settle(Vue);
  const details = row.querySelector(".utray-row__details");
  assert.match(details.textContent, /HazırlamaArka planda/);
  assert.doesNotMatch(details.textContent, /Henüz doğrulanmadı/);
});

test("tepsi: gerçek sorunlar öne çıkar, tarama süren satır hâlâ 'Güvenlik kontrolü'", async () => {
  const w = await mount(Queue, {
    floating: true,
    uploads: [
      done("ok"),
      done("bad"),
      done("sf"),
      done("pf"),
      done("scan"),
      { id: "err", name: "err.png", kind: "image", status: "error", errorCode: "" },
    ],
    facts: {
      "F-ok": CLEAN,
      "F-bad": { scan_status: "infected" },
      "F-sf": { scan_status: "failed" },
      "F-pf": { ...CLEAN, asset_states: ["failed"] },
      "F-scan": { scan_status: "pending" },
    },
  });
  for (const phase of ["blocked", "scanFailed", "processingFailed", "uploadFailed"])
    assert.ok(w.q(`li[data-phase="${phase}"]`), `${phase} gösterilir`);
  assert.equal(w.q('li[data-phase="scanning"] .utray-row__label').textContent, "Güvenlik kontrolü");
  assert.ok(w.q('li[data-phase="scanning"] .utray-row__bar--indeterminate'));
  // Yalnız tarama süren satır aktif: başlık 1 dosya işleniyor; 4 sorun, 1 hazır.
  assert.equal(w.q(".utray__title").textContent, t("mediaFlow.tray.titleActive", { n: 1 }));
  assert.match(w.q(".utray__sub").textContent, /1 hazır · 4 sorunlu/);
  assert.equal(w.q(".utray-row__note").closest("li").dataset.phase, "readyBackground");
});

test("yoklama: hazır-arka planda dosya hızlı döngüden çıkar, 30 sn'lik kontrol türev gelince notu kaldırır", async () => {
  const w = await mount(Queue, { floating: true, uploads: [done("x")] });
  const fast = pollers.find((p) => p.interval === 3000);
  const slow = pollers.find((p) => p.interval === tray.BACKGROUND_POLL_MS);
  assert.ok(fast && slow, "iki yoklayıcı kuruldu");
  assert.equal(tray.BACKGROUND_POLL_MS, 30_000);
  assert.deepEqual(fast.keys(), ["F-x"]);
  assert.deepEqual(slow.keys(), []);

  fast.facts.value = { "F-x": CLEAN };
  await settle(Vue);
  assert.deepEqual(fast.keys(), [], "hızlı döngü bıraktı");
  assert.deepEqual(slow.keys(), ["F-x"], "yavaş kontrol sürüyor");
  assert.ok(w.q('li[data-phase="readyBackground"] .utray-row__note'));
  assert.equal(w.q(".utray__spin"), null, "başlık işleniyor değil");

  // Yavaş döngü ilk yanıtı aynı kalabilir; satır hazır-arka planda kalır.
  slow.facts.value = { "F-x": CLEAN };
  await settle(Vue);
  assert.ok(w.q('li[data-phase="readyBackground"]'));

  slow.facts.value = { "F-x": { ...CLEAN, asset_states: ["ready"] } };
  await settle(Vue);
  assert.ok(w.q('li[data-phase="ready"]'), "türev gelince tam hazır");
  assert.equal(w.q(".utray-row__note"), null, "not kalktı");
  assert.deepEqual(slow.keys(), [], "sonuçlanınca yoklama bitti");
  assert.deepEqual(fast.keys(), []);
});

// ── İlgi listesi ────────────────────────────────────────────────────

test("ilgi listesi: yalnız türevi bekleyen temiz dosya 'işlemi süren' sayılmaz", async () => {
  const quiet = await mount(AttentionList, {
    items: [
      { id: "a", fileName: "a.png", kind: "image", scan_status: "clean" },
      {
        id: "b",
        fileName: "b.png",
        kind: "image",
        scan_status: "clean",
        asset_states: ["processing"],
      },
    ],
  });
  assert.equal(quiet.q("section.media-attention"), null);
  quiet.close();

  const w = await mount(AttentionList, {
    items: [
      { id: "a", fileName: "a.png", kind: "image", scan_status: "clean" },
      { id: "s", fileName: "s.png", kind: "image", scan_status: "pending" },
      { id: "k", fileName: "k.png", kind: "image", scan_status: "infected" },
    ],
  });
  assert.equal(w.q("h2").textContent, "İlgilenmeniz gereken dosyalar (2)");
  assert.equal(w.q('li[data-phase="readyBackground"]'), null);
});

test("aktarım satırı: readyBackground notu ve 'Arka planda' hazırlama metni", async () => {
  const host = document.createElement("ul");
  document.body.append(host);
  const app = Vue.createApp({
    render: () =>
      Vue.h(TransferRow, { name: "a.png", kind: "image", phase: "readyBackground", facts: CLEAN }),
  });
  app.mount(host);
  await settle(Vue);
  assert.equal(host.querySelector(".utray-row__note").textContent.trim(), NOTE);
  assert.equal(host.querySelector(".utray-row__bar"), null);
  assert.match(host.querySelector(".utray-row__details").textContent, /Arka planda/);
  app.unmount();
  host.remove();
});
