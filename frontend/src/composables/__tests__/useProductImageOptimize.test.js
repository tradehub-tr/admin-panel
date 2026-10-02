import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, test } from "node:test";
import { createServer } from "vite";

/**
 * `useProductImageOptimize` (2026-09-30, tek düğme): gerçek composable Vite
 * `ssrLoadModule` ile yüklenir, sahte `fetchers` ile sürülür; localStorage ve
 * sessionStorage bellek-içi taklit. Yük şekli backend `durum_oku`nun döndürdüğü
 * `{run, last_real, rollback_available, kill_switch, live?}`.
 */

async function bekle(kosul, { sinirMs = 3000, aralikMs = 2 } = {}) {
  const bitis = Date.now() + sinirMs;
  while (Date.now() < bitis) {
    if (kosul()) return true;
    await new Promise((res) => setTimeout(res, aralikMs));
  }
  return kosul();
}

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));
let server;
let mod;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: { alias: [{ find: "@", replacement: `${frontendRoot}/src` }] },
    server: { middlewareMode: true },
    appType: "custom",
  });
  mod = await server.ssrLoadModule("/src/composables/useProductImageOptimize.js");
});

after(async () => {
  await server?.close();
});

function bellekDepo() {
  const depo = {};
  return {
    depo,
    getItem: (k) => (k in depo ? depo[k] : null),
    setItem: (k, v) => {
      depo[k] = String(v);
    },
    removeItem: (k) => {
      delete depo[k];
    },
  };
}

beforeEach(() => {
  globalThis.localStorage = bellekDepo();
  globalThis.sessionStorage = bellekDepo();
});

const ADIMLAR = ["on_kontrol", "kare", "magaza", "seo_ad", "meta", "turev", "magaza_turev"];
const kosu = (job_key, state, extra = {}) => ({
  job_key,
  mode: "optimize",
  dry_run: true,
  state,
  steps: ADIMLAR.map((key) => ({ key, state: "done", changed: 0, ok: 5, skipped: 0, failed: 0 })),
  ...extra,
});

function sahte({ statuses = [], startKey = "kare-opt-P1" } = {}) {
  const calls = [];
  let i = 0;
  return {
    calls,
    fetchers: {
      status: async (args) => (
        calls.push(["status", args]),
        statuses[Math.min(i++, statuses.length - 1)] || {}
      ),
      start: async (args) => (
        calls.push(["start", args]),
        { job_key: startKey, dry_run: !!args.dry_run }
      ),
      stop: async (args) => (calls.push(["stop", args]), { ok: true }),
      rollback: async (args) => (
        calls.push(["rollback", args]),
        { job_key: "opt-rb-1", source_job_key: args.job_key }
      ),
      avif: async () => ({ deletable_files: 7, deletable_bytes: 4000000 }),
    },
  };
}

test("Başlat, aynı oturumdaki Prova tamamlanmadan kapalı; prova anahtarı gerçek koşuya geçer", async () => {
  const s = sahte({
    statuses: [{ run: kosu("kare-opt-P1", "running") }, { run: kosu("kare-opt-P1", "completed") }],
  });
  const o = mod.useProductImageOptimize(s.fetchers, { pollMs: 2 });
  assert.equal(o.canStart.value, false);

  await o.prova();
  assert.deepEqual(s.calls[0], ["start", { dry_run: 1 }]);
  assert.equal(o.canStart.value, false, "prova bitmeden Başlat açılmaz");
  assert.equal(globalThis.sessionStorage.getItem(mod.PROVA_KEY), "kare-opt-P1");

  await bekle(() => o.run.value?.state === "completed");
  assert.equal(o.provaDone.value, true);
  assert.equal(o.canStart.value, true);

  await o.start();
  const gercek = s.calls.filter((c) => c[0] === "start")[1];
  assert.deepEqual(gercek, ["start", { dry_run: 0, prova_key: "kare-opt-P1" }]);
  // Prova tüketildi: bir sonraki gerçek koşu yeni prova ister.
  assert.equal(globalThis.sessionStorage.getItem(mod.PROVA_KEY), null);
  o.stopPolling();
});

test("başka oturumdan kalan (sessionStorage'da olmayan) prova Başlat'ı açmaz", async () => {
  const s = sahte({ statuses: [{ run: kosu("kare-opt-ESKI", "completed") }] });
  const o = mod.useProductImageOptimize(s.fetchers, { pollMs: 2 });
  await o.load();
  assert.equal(o.run.value.job_key, "kare-opt-ESKI");
  assert.equal(o.canStart.value, false);
});

test("yükleme: kayıtlı anahtar ile durum istenir, çalışan koşu izlenmeye devam eder", async () => {
  globalThis.localStorage.setItem(mod.STORAGE_KEY, "kare-opt-R1");
  const s = sahte({
    statuses: [
      { run: kosu("kare-opt-R1", "running", { dry_run: false }) },
      { run: kosu("kare-opt-R1", "completed", { dry_run: false }), rollback_available: true },
    ],
  });
  const o = mod.useProductImageOptimize(s.fetchers, { pollMs: 2 });
  await o.load();
  assert.deepEqual(s.calls[0], ["status", { job_key: "kare-opt-R1" }]);
  assert.equal(o.running.value, true);
  await bekle(() => o.run.value?.state === "completed");
  assert.equal(o.rollbackAvailable.value, true);
});

test("Durdur çalışan koşunun anahtarını gönderir; Geri al son gerçek koşuyu hedefler", async () => {
  const s = sahte({
    statuses: [
      {
        run: kosu("kare-opt-R2", "completed", { dry_run: false }),
        last_real: { job_key: "kare-opt-R2", finished_at: "2026-09-30 12:00:00" },
        rollback_available: true,
      },
      { run: { job_key: "opt-rb-1", mode: "rollback", state: "completed", steps: [] } },
    ],
  });
  const o = mod.useProductImageOptimize(s.fetchers, { pollMs: 2 });
  await o.load();
  assert.equal(o.canRollback.value, true);
  await o.rollback();
  assert.deepEqual(
    s.calls.find((c) => c[0] === "rollback"),
    ["rollback", { job_key: "kare-opt-R2" }]
  );
  assert.equal(o.run.value.mode, "rollback");
  // Geri alma adımları koşacakları sırada: önce mağaza, sonra kare.
  assert.deepEqual(
    o.run.value.steps.map((x) => x.key),
    ["magaza", "kare"]
  );
  assert.equal(o.canRollback.value, false);
  await bekle(() => o.run.value?.state === "completed");

  // Durdur
  const s2 = sahte({ statuses: [{ run: kosu("kare-opt-R3", "running", { dry_run: false }) }] });
  const o2 = mod.useProductImageOptimize(s2.fetchers, { pollMs: 50 });
  await o2.load();
  await o2.stop();
  assert.deepEqual(
    s2.calls.find((c) => c[0] === "stop"),
    ["stop", { job_key: "kare-opt-R3" }]
  );
  o2.stopPolling();
});

test("başlatma hatası mesaja düşer, koşu açılmaz", async () => {
  const s = sahte();
  s.fetchers.start = async () => {
    throw new Error("Ön kontrol başarısız: profil kapalı");
  };
  const o = mod.useProductImageOptimize(s.fetchers, { pollMs: 2 });
  await o.prova();
  assert.equal(o.run.value, null);
  assert.match(o.lastError.value, /Ön kontrol/);
});

test("eski AVIF özeti ayrı yüklenir (Başlat'a dahil değil)", async () => {
  const s = sahte();
  const o = mod.useProductImageOptimize(s.fetchers, { pollMs: 2 });
  await o.loadAvif();
  assert.equal(o.avifSummary.value.deletable_files, 7);
  assert.equal(
    s.calls.some((c) => c[0] === "start"),
    false
  );
});
