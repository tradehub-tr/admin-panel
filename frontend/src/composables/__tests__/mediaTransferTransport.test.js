import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { setImmediate } from "node:timers";
import { createServer } from "vite";
import { effectScope, nextTick, ref } from "vue";
let server, api;
const requests = [];
class Xhr {
  upload = {};
  open(method, url) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader() {}
  send(body) {
    this.body = body;
    requests.push(this);
  }
  respond(status, message) {
    this.status = status;
    this.responseText = JSON.stringify(message);
    this.onload();
    this.onloadend();
  }
  abort() {
    this.onabort();
    this.onloadend();
  }
}
before(async () => {
  const root = fileURLToPath(new URL("../../..", import.meta.url));
  server = await createServer({
    root,
    configFile: false,
    resolve: { alias: { "@": `${root}/src` } },
    server: { middlewareMode: true },
    logLevel: "silent",
  });
  api = (await server.ssrLoadModule("/src/utils/api.js")).default;
  api.setCsrfToken("test-only-token");
  globalThis.XMLHttpRequest = Xhr;
});
after(async () => {
  delete globalThis.XMLHttpRequest;
  await server.close();
});
const settle = () => new Promise((resolve) => setImmediate(resolve));
test("measured multipart preserves URL contract and only reports real progress", async () => {
  const progress = [];
  const pending = api.uploadFile(new File(["example"], "a.pdf"), "Home", {
    onProgress: (p) => progress.push(p),
  });
  await settle();
  const request = requests.at(-1);
  assert.deepEqual(progress, []);
  request.upload.onprogress({ lengthComputable: false });
  request.upload.onprogress({ lengthComputable: true, loaded: 61, total: 100 });
  assert.deepEqual(progress, [61]);
  assert.equal(request.method, "POST");
  assert.equal(request.body.get("is_private"), "0");
  request.respond(200, { message: { name: "f1", file_url: "/files/a.pdf" } });
  assert.equal(await pending, "/files/a.pdf");
});
test("detailed response, server rejection and abort stay distinct", async () => {
  const pending = api.uploadFile(new File(["example"], "a.pdf"), "Home", {
    details: true,
    onProgress() {},
  });
  await settle();
  requests.at(-1).respond(200, { message: { name: "f2", file_url: "/files/a.pdf" } });
  assert.equal((await pending).name, "f2");
  const failed = api.uploadFile(new File(["example"], "a.pdf"), "Home", { onProgress() {} });
  await settle();
  requests.at(-1).respond(417, { message: "Too large [upload_too_large]" });
  await assert.rejects(failed, { code: "upload_too_large", status: 417 });
  const controller = new AbortController();
  const cancelled = api.uploadFile(new File(["example"], "a.pdf"), "Home", {
    signal: controller.signal,
    onProgress() {},
  });
  await settle();
  controller.abort();
  await assert.rejects(cancelled, { name: "AbortError" });
});

test("status polling ignores stale file selection and stops applying results after disposal", async () => {
  const { useMediaStatus } = await server.ssrLoadModule("/src/composables/useMediaStatus.js");
  const original = api.callMethodGET;
  const pending = [];
  api.callMethodGET = (_, params) => new Promise((resolve) => pending.push({ params, resolve }));
  const scope = effectScope();
  try {
    const keys = ref(["first"]);
    const state = scope.run(() => useMediaStatus(keys));
    assert.equal(pending[0].params.files, '["first"]');
    keys.value = ["second"];
    await nextTick();
    pending[0].resolve({ message: { files: { first: { scan_status: "clean" } } } });
    await settle();
    assert.deepEqual(state.facts.value, {});
    assert.equal(pending[1].params.files, '["second"]');
    pending[1].resolve({ message: { files: { second: { scan_status: "pending" } } } });
    await settle();
    assert.equal(state.facts.value.second.scan_status, "pending");
    const refreshing = state.refresh();
    scope.stop();
    pending[2].resolve({ message: { files: { second: { scan_status: "clean" } } } });
    await refreshing;
    assert.equal(state.facts.value.second.scan_status, "pending");
  } finally {
    scope.stop();
    api.callMethodGET = original;
  }
});

test("form tray starts before preparation and cancelling prevents the HTTP upload", async () => {
  const { useTrackedMediaUpload } = await server.ssrLoadModule(
    "/src/composables/useTrackedMediaUpload.js"
  );
  const scope = effectScope();
  const state = scope.run(useTrackedMediaUpload);
  const count = requests.length;
  let prepared;
  const file = new File(["example"], "photo.png", { type: "image/png" });
  const pending = state.upload(file, {
    prepare: () =>
      new Promise((resolve) => {
        prepared = resolve;
      }),
  });
  const rejected = assert.rejects(pending, { name: "AbortError" });
  try {
    assert.equal(state.rows.value[0].status, "preparing");
    state.cancel(state.rows.value[0].id);
    prepared(file);
    await rejected;
    assert.equal(requests.length, count);
    assert.equal(state.rows.value[0].status, "cancelled");
  } finally {
    scope.stop();
  }
});

test("clear completed keeps a transferred file while its security scan is pending", async () => {
  const { useTrackedMediaUpload } = await server.ssrLoadModule(
    "/src/composables/useTrackedMediaUpload.js"
  );
  const scope = effectScope();
  const original = api.callMethodGET;
  api.callMethodGET = async () => ({
    message: { files: { trayFile: { scan_status: "pending" } } },
  });
  try {
    const state = scope.run(useTrackedMediaUpload);
    const pending = state.upload(new File(["example"], "report.pdf", { type: "application/pdf" }));
    await settle();
    requests.at(-1).respond(200, { message: { name: "trayFile", file_url: "/files/report.pdf" } });
    await pending;
    await settle();
    state.clear();
    assert.equal(state.rows.value.length, 1);
    state.facts.value = { trayFile: { scan_status: "clean" } };
    state.clear();
    assert.equal(state.rows.value.length, 0);
  } finally {
    scope.stop();
    api.callMethodGET = original;
  }
});
