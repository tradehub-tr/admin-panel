import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { createServer } from "vite";

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));

async function withLoader(fn) {
  const server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });
  try {
    return await fn(await server.ssrLoadModule("/src/i18n/localeLoader.js"));
  } finally {
    await server.close();
  }
}

test("açılış sözlüğü YALNIZ aktif dili taşır (MOGEM-638 §3.3: en fallback peşinen inmez)", async () => {
  await withLoader(async ({ loadStartupMessages }) => {
    const messages = await loadStartupMessages("tr");
    assert.deepEqual(Object.keys(messages), ["tr"]);
    assert.ok(Object.keys(messages.tr).length > 100, "tr sözlüğü boş görünüyor");
  });
});

test("fallback sözlüğü ihtiyaç anında bir kez yüklenir", async () => {
  await withLoader(async ({ loadFallbackMessages, FALLBACK_LANG }) => {
    assert.equal(FALLBACK_LANG, "en");
    const [a, b] = await Promise.all([loadFallbackMessages(), loadFallbackMessages()]);
    assert.strictEqual(a, b, "iki çağrı aynı sözlük nesnesini paylaşmalı");
    assert.ok(Object.keys(a).length > 100);
  });
});
