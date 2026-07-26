import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { build } from "vite";

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));
const probeEntry = fileURLToPath(new URL("./fixtures/initialPayloadEntry.js", import.meta.url));

let buildPromise;

function buildProbe() {
  buildPromise ??= build({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    plugins: [vue()],
    build: {
      write: false,
      minify: true,
      rollupOptions: { input: probeEntry, preserveEntrySignatures: "strict" },
    },
  });
  return buildPromise;
}

async function javascriptChunks() {
  const result = await buildProbe();
  const outputs = Array.isArray(result) ? result.flatMap((item) => item.output) : result.output;
  return outputs.filter((item) => item.type === "chunk");
}

test("ortak başlangıç paketi tam Lucide kataloğunu taşımaz", async () => {
  const chunks = await javascriptChunks();
  const entry = chunks.find((chunk) => chunk.isEntry);

  assert.ok(entry, "başlangıç chunk'ı üretilmedi");
  assert.ok(
    gzipSync(entry.code).length < 220_000,
    `başlangıç chunk'ı ${gzipSync(entry.code).length} B gzip; bütçe 220000 B`
  );
});

test("dil mesajları başlangıç chunk'ı yerine ayrı lazy chunk'lara bölünür", async () => {
  const chunks = await javascriptChunks();
  const localeChunks = chunks.filter((chunk) =>
    Object.keys(chunk.modules).some((modulePath) => modulePath.includes("/i18n/locales/"))
  );

  assert.equal(localeChunks.length, 4);
  assert.ok(localeChunks.every((chunk) => !chunk.isEntry));
});
