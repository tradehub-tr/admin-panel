import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { createServer } from "vite";

/**
 * Retro-rename composable (MOGEM-582): plan → start → poll → terminal;
 * rollback görünürlüğü history'ye bağlı. Uçlar uydurulmadı:
 * `tradehub_core.api.media_admin.{retro_rename_plan,start_retro_rename,
 * get_retro_rename_status,stop_retro_rename,rollback_retro_rename,retro_rename_history,
 * retro_rename_count}`.
 *
 * `count` ayrı bir uçtur (Controller notes): `retro_rename_plan` ~20 sn sürebilir,
 * kart açılışında yalnız sayı gösterilmeli — `loadCount()` `plan` ucuna DOKUNMAZ.
 */

/**
 * Koşul gerçekleşene kadar bekle — F-17.
 *
 * Testler `pollMs: 1` ile koşup sabit bir duvar-saati uykusuyla (30-40 ms)
 * sonucu bekliyordu. Yüklü makinede dört poll o pencereye sığmıyor ve test
 * ölçtüğü davranıştan bağımsız olarak kırmızı yanıyordu — kararsız test,
 * olmayan bir hatayı bildirdiği için gerçek hatayı da gizler.
 *
 * Beklenen DURUMA bekleniyor, süreye değil. Zaman sınırı yalnız emniyet
 * kemeri; dolduğunda test yine düşer ama sebebi "koşul hiç gerçekleşmedi"
 * olur, "yeterince beklemedik" değil.
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
let useMediaRetroRename;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: { alias: [{ find: "@", replacement: `${frontendRoot}/src` }] },
    server: { middlewareMode: true },
    appType: "custom",
  });
  ({ useMediaRetroRename } = await server.ssrLoadModule("/src/composables/useMediaRetroRename.js"));
});
after(async () => {
  await server?.close();
});

function sahte({ statuses = [] } = {}) {
  const calls = [];
  let i = 0;
  return {
    calls,
    fetchers: {
      plan: async () => (calls.push("plan"), { total: 3, renamable: 3, orphans: 1, disk_missing: 0, collisions: 0, refs_exact: 5, refs_embedded: 0, refs_readonly: 2, file_rows: 4, items: [] }),
      start: async (args) => (calls.push(["start", args]), { job_key: "J1", total: 3, dry_run: args.dry_run }),
      status: async () => (calls.push("status"), statuses[Math.min(i++, statuses.length - 1)]),
      stop: async () => (calls.push("stop"), { ok: true }),
      rollback: async (args) => (calls.push(["rollback", args]), { job_key: "RB1" }),
      history: async () => (calls.push("history"), { jobs: [{ job_key: "J1", count: 3, expires_at: "2026-11-19 00:00:00" }] }),
      count: async () => (calls.push("count"), { total: 7, disk_missing: 2, renamable: 5 }),
    },
  };
}

test("plan yüklenmeden total null; yüklenince sayılar gelir", async () => {
  const s = sahte();
  const r = useMediaRetroRename(s.fetchers, { pollMs: 1 });
  assert.equal(r.plan.value, null);
  await r.loadPlan();
  assert.equal(r.plan.value.total, 3);
  assert.equal(r.plan.value.orphans, 1);
});

test("start → running → completed; polling durur; history yenilenir", async () => {
  const s = sahte({
    statuses: [
      { state: "running", total: 3, processed: 1, renamed: 1, skipped: 0, errors: 0, skip_reasons: {} },
      { state: "completed", total: 3, processed: 3, renamed: 3, skipped: 0, errors: 0, skip_reasons: {}, expires_at: "2026-11-19 00:00:00" },
    ],
  });
  const r = useMediaRetroRename(s.fetchers, { pollMs: 1 });
  await r.start({ dryRun: false });
  assert.equal(r.job.key, "J1");
  assert.equal(r.running.value, true);
  await bekle(() => r.job.state === "completed");
  assert.equal(r.job.state, "completed");
  assert.equal(r.running.value, false);
  assert.equal(r.job.expires_at, "2026-11-19 00:00:00");
  assert.ok(s.calls.includes("history"), "iş bitince history yenilenmeli");
  const statusCalls = s.calls.filter((c) => c === "status").length;
  await new Promise((res) => setTimeout(res, 10));
  assert.equal(s.calls.filter((c) => c === "status").length, statusCalls, "terminal sonrası polling sürdü");
});

test("dry-run bayrağı uca 1 olarak gider", async () => {
  const s = sahte({ statuses: [{ state: "completed", total: 0, processed: 0, renamed: 0, skipped: 0, errors: 0, skip_reasons: {} }] });
  const r = useMediaRetroRename(s.fetchers, { pollMs: 1 });
  await r.start({ dryRun: true });
  const startCall = s.calls.find((c) => Array.isArray(c) && c[0] === "start");
  assert.equal(startCall[1].dry_run, 1);
});

test("rollback yalnız history'de iş varsa mümkün; rollback yeni job_key ile izlenir", async () => {
  const s = sahte({ statuses: [{ state: "completed", total: 3, processed: 3, renamed: 3, skipped: 0, errors: 0, skip_reasons: {} }] });
  const r = useMediaRetroRename(s.fetchers, { pollMs: 1 });
  assert.equal(r.canRollback.value, false);
  await r.loadHistory();
  assert.equal(r.canRollback.value, true);
  await r.rollback("J1");
  assert.equal(r.job.key, "RB1");
  assert.equal(r.job.mode, "rollback");
});

test("başlatma hatası job'u kirletmez", async () => {
  const s = sahte();
  s.fetchers.start = async () => {
    throw new Error("Zaten çalışan bir iş var.");
  };
  const r = useMediaRetroRename(s.fetchers, { pollMs: 1 });
  const out = await r.start({});
  assert.equal(out, null);
  assert.equal(r.job.key, null);
  assert.equal(r.lastError.value, "Zaten çalışan bir iş var.");
});

test("loadCount total'ı doldurur; plan çağrılmaz", async () => {
  const s = sahte();
  const r = useMediaRetroRename(s.fetchers, { pollMs: 1 });
  assert.equal(r.pendingCount.value, null);
  await r.loadCount();
  assert.equal(r.pendingCount.value, 7);
  assert.ok(s.calls.includes("count"));
  assert.ok(!s.calls.includes("plan"), "loadCount plan ucunu çağırmamalı — plan ~20 sn sürebilir");
});

test("loadCount bayat satırları ayırır: disk_missing / renamable", async () => {
  const s = sahte();
  const r = useMediaRetroRename(s.fetchers, { pollMs: 1 });
  await r.loadCount();
  assert.equal(r.diskMissingCount.value, 2);
  assert.equal(r.renamableCount.value, 5);
});

test("kırılım göndermeyen ucta renamable = total (geriye uyum)", async () => {
  const s = sahte();
  s.fetchers.count = async () => ({ total: 9 });
  const r = useMediaRetroRename(s.fetchers, { pollMs: 1 });
  await r.loadCount();
  assert.equal(r.pendingCount.value, 9);
  assert.equal(r.diskMissingCount.value, 0);
  assert.equal(r.renamableCount.value, 9);
});

test("ilerleme yükündeki refs_updated / refs_skipped job'a taşınır", async () => {
  const s = sahte({
    statuses: [
      {
        state: "completed",
        total: 3,
        processed: 3,
        renamed: 3,
        skipped: 0,
        errors: 0,
        refs_updated: 11,
        refs_skipped: 4,
        skip_reasons: {},
      },
    ],
  });
  const r = useMediaRetroRename(s.fetchers, { pollMs: 1 });
  assert.equal(r.job.refs_updated, 0);
  await r.start({ dryRun: false });
  await bekle(() => r.job.refs_updated === 11);
  assert.equal(r.job.refs_updated, 11);
  assert.equal(r.job.refs_skipped, 4);
});

test("iş terminale ulaşınca loadCount de çağrılır (history ile birlikte)", async () => {
  const s = sahte({
    statuses: [{ state: "completed", total: 3, processed: 3, renamed: 3, skipped: 0, errors: 0, skip_reasons: {} }],
  });
  const r = useMediaRetroRename(s.fetchers, { pollMs: 1 });
  await r.start({ dryRun: false });
  await bekle(() => r.job.state === "completed" && s.calls.includes("count"));
  assert.equal(r.job.state, "completed");
  assert.ok(s.calls.includes("count"), "terminal sonrası pendingCount tazelenmeli");
  assert.equal(r.pendingCount.value, 7);
});

test("ilk poll(ler)de not_found terminal SAYILMAZ — sonra running/completed gelirse iş normal biter", async () => {
  const s = sahte({
    statuses: [
      { state: "not_found" },
      { state: "not_found" },
      { state: "running", total: 3, processed: 1, renamed: 1, skipped: 0, errors: 0, skip_reasons: {} },
      { state: "completed", total: 3, processed: 3, renamed: 3, skipped: 0, errors: 0, skip_reasons: {} },
    ],
  });
  const r = useMediaRetroRename(s.fetchers, { pollMs: 1 });
  await r.start({ dryRun: false });
  await bekle(() => r.job.state === "completed");
  assert.equal(r.job.state, "completed");
  assert.equal(r.running.value, false);
});

test("6× art arda not_found — 5. tikten sonra terminal not_found; polling durur", async () => {
  const s = sahte({
    statuses: [
      { state: "not_found" },
      { state: "not_found" },
      { state: "not_found" },
      { state: "not_found" },
      { state: "not_found" },
      { state: "not_found" },
    ],
  });
  const r = useMediaRetroRename(s.fetchers, { pollMs: 1 });
  await r.start({ dryRun: false });
  await bekle(() => r.running.value === false);
  assert.equal(r.job.state, "not_found");
  assert.equal(r.running.value, false);
  assert.ok(r.job.message.length > 0);
  const statusCalls = s.calls.filter((c) => c === "status").length;
  assert.equal(statusCalls, 5, "5. tikten sonra durmalıydı");
  await new Promise((res) => setTimeout(res, 10));
  assert.equal(s.calls.filter((c) => c === "status").length, statusCalls, "terminal sonrası polling sürdü");
});

test("rollback: çalışan iş varken reddedilir, mevcut job dokunulmadan kalır, rollback ucu çağrılmaz", async () => {
  const s = sahte({
    statuses: [{ state: "running", total: 3, processed: 1, renamed: 1, skipped: 0, errors: 0, skip_reasons: {} }],
  });
  const r = useMediaRetroRename(s.fetchers, { pollMs: 1 });
  await r.start({ dryRun: false });
  await bekle(() => r.running.value === true);
  assert.equal(r.running.value, true);

  const out = await r.rollback("J1");
  assert.equal(out, null);
  assert.equal(r.job.key, "J1");
  assert.equal(r.job.mode, "rename");
  assert.equal(r.lastError.value, "Çalışan bir iş varken geri alma başlatılamaz.");
  assert.ok(!s.calls.some((c) => Array.isArray(c) && c[0] === "rollback"), "rollback ucu çağrılmamalıydı");

  r.resetJob();
  assert.equal(r.running.value, false);
});

test("eski polling yanıtı yeni işin durumunu ezemez", async () => {
  let starts = 0;
  let statuses = 0;
  const fetchers = {
    start: async () => ({ job_key: `J${++starts}`, total: 1 }),
    status: async ({ job_key }) => {
      statuses += 1;
      if (statuses === 1) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        return { state: "completed", total: 1, processed: 1, renamed: 1 };
      }
      return { state: "running", total: 1, processed: 0, renamed: 0, message: job_key };
    },
    history: async () => ({ jobs: [] }),
    count: async () => ({ total: 0 }),
  };
  const r = useMediaRetroRename(fetchers, { pollMs: 1 });
  await r.start();
  await new Promise((resolve) => setTimeout(resolve, 4));
  r.resetJob();
  await r.start();
  await new Promise((resolve) => setTimeout(resolve, 35));
  assert.equal(r.job.key, "J2");
  assert.equal(r.job.state, "running");
  assert.equal(r.job.message, "J2");
  r.resetJob();
});

test("start ve stop çoklu tıklamada tek POST gönderir", async () => {
  let startCalls = 0;
  let stopCalls = 0;
  const fetchers = {
    start: async () => {
      startCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { job_key: "J1", total: 1 };
    },
    stop: async () => {
      stopCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { ok: true };
    },
    status: async () => ({ state: "running", total: 1, processed: 0 }),
  };
  const r = useMediaRetroRename(fetchers, { pollMs: 20 });
  await Promise.all([r.start(), r.start()]);
  assert.equal(startCalls, 1);
  await Promise.all([r.stop(), r.stop()]);
  assert.equal(stopCalls, 1);
  r.resetJob();
});

test("count/history hatasında loading kapanır ve hata görünür state'e yazılır", async () => {
  const r = useMediaRetroRename({
    count: async () => { throw new Error("count down"); },
    history: async () => { throw new Error("history down"); },
  });
  await Promise.all([r.loadCount(), r.loadHistory()]);
  assert.equal(r.countLoading.value, false);
  assert.equal(r.historyLoading.value, false);
  assert.equal(r.countError.value, "count down");
  assert.equal(r.historyError.value, "history down");
});
