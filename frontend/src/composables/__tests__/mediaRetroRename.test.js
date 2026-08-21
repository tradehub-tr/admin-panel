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
      count: async () => (calls.push("count"), { total: 7 }),
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
  await new Promise((res) => setTimeout(res, 30));
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

test("iş terminale ulaşınca loadCount de çağrılır (history ile birlikte)", async () => {
  const s = sahte({
    statuses: [{ state: "completed", total: 3, processed: 3, renamed: 3, skipped: 0, errors: 0, skip_reasons: {} }],
  });
  const r = useMediaRetroRename(s.fetchers, { pollMs: 1 });
  await r.start({ dryRun: false });
  await new Promise((res) => setTimeout(res, 20));
  assert.equal(r.job.state, "completed");
  assert.ok(s.calls.includes("count"), "terminal sonrası pendingCount tazelenmeli");
  assert.equal(r.pendingCount.value, 7);
});
