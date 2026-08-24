import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

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
  mod = await server.ssrLoadModule("/src/composables/useMediaHistory.js");
});

after(async () => server?.close());

test("sürüm, iş ve denetim kayıtları gerçek zamana göre tek çizgide sıralanır", () => {
  const rows = mod.mergeMediaHistory({
    versions: [{ name: "V1", created_at: "2026-08-20T10:00:00+03:00" }],
    jobs: [{ name: "J1", finished_at: "2026-08-20T09:30:00+03:00" }],
    audit: [{ name: "A1", timestamp: "2026-08-20T11:00:00+03:00" }],
  });
  assert.deepEqual(
    rows.map((row) => row.id),
    ["audit:A1", "version:V1", "job:J1"]
  );
});

test("composable satıcı geçmişi ucunu tek GET ile çağırır ve Frappe zarfını açar", async () => {
  const calls = [];
  const transport = {
    async callMethodGET(method, args) {
      calls.push({ method, args });
      return {
        message: {
          versions: [{ name: "V1", creation: "2026-08-20T10:00:00+03:00" }],
          jobs: [],
          audit: [],
          totals: { versions: 1 },
          truncated: { versions: false },
        },
      };
    },
  };
  const history = mod.useMediaHistory(transport);
  await history.load("/files/a.webp");

  assert.deepEqual(calls, [
    {
      method: "tradehub_core.api.seller_media.get_my_media_history",
      args: { file_url: "/files/a.webp" },
    },
  ]);
  assert.equal(history.timeline.value[0].id, "version:V1");
  assert.equal(history.data.value.totals.versions, 1);
  assert.equal(history.loading.value, false);
});

test("yetki reddi genel arıza metnine karışmaz", async () => {
  const denied = Object.assign(new Error("denied"), { status: 403 });
  const history = mod.useMediaHistory({
    async callMethodGET() {
      throw denied;
    },
  });
  await history.load("/files/foreign.webp");
  assert.equal(history.denied.value, true);
  assert.equal(history.error.value, "");
  assert.deepEqual(history.timeline.value, []);
});

test("boş dosya adresi ağ çağrısı yapmadan önceki kaydı temizler", async () => {
  let calls = 0;
  const history = mod.useMediaHistory({
    async callMethodGET() {
      calls += 1;
      return { message: { audit: [{ name: "A1", timestamp: "2026-08-20" }] } };
    },
  });
  await history.load("/files/a.webp");
  await history.load("");
  assert.equal(calls, 1);
  assert.deepEqual(history.timeline.value, []);
});
