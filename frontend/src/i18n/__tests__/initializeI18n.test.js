import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { createServer } from "vite";

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));

function replaceGlobal(name, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, value });
  return () => {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  };
}

test("eşzamanlı i18n başlatmaları aynı örneği döndürür", async () => {
  const restoreLocalStorage = replaceGlobal("localStorage", {
    getItem: () => "tr",
    setItem: () => {},
  });
  const restoreNavigator = replaceGlobal("navigator", { language: "tr-TR" });
  const restoreDocument = replaceGlobal("document", {
    documentElement: {},
    createElement: () => ({}),
  });
  const server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { initializeI18n } = await server.ssrLoadModule("/src/i18n/index.js");
    const [first, second] = await Promise.all([initializeI18n(), initializeI18n()]);

    assert.strictEqual(first, second);
  } finally {
    await server.close();
    restoreDocument();
    restoreNavigator();
    restoreLocalStorage();
  }
});
