import assert from "node:assert/strict";
import test from "node:test";

import {
  CLIENT_ACTION,
  DEVICE_CLASS,
  budgetFor,
  classifyDevice,
  decideClientProcessing,
  detectBrowser,
  probeCanvasCeiling,
} from "../deviceBudget.js";

const image = { mime: "image/jpeg", ext: ".jpg", width: 3000, height: 2000, megapixels: 6 };
const capable = { deviceMemory: 8, hardwareConcurrency: 8, createImageBitmap: true, worker: true };

test("yüksek/orta/düşük/bilinmeyen cihaz sınıfları deterministik", () => {
  assert.equal(
    classifyDevice({ deviceMemory: 8, hardwareConcurrency: 8 }).deviceClass,
    DEVICE_CLASS.HIGH
  );
  assert.equal(
    classifyDevice({ deviceMemory: 4, hardwareConcurrency: 4 }).deviceClass,
    DEVICE_CLASS.MEDIUM
  );
  assert.equal(
    classifyDevice({ deviceMemory: 2, hardwareConcurrency: 2 }).deviceClass,
    DEVICE_CLASS.LOW
  );
  assert.equal(classifyDevice({}).deviceClass, DEVICE_CLASS.UNKNOWN);
});

test("iPadOS masaüstü UA düşük sınıf muhafazakâr tavanına girer", () => {
  const browser = detectBrowser({
    userAgent: "Version/18.0 Safari/605.1.15",
    platform: "MacIntel",
    maxTouchPoints: 5,
  });
  assert.equal(browser.ios, true);
  assert.equal(
    classifyDevice({ deviceMemory: 8, hardwareConcurrency: 8, browser }).deviceClass,
    DEVICE_CLASS.LOW
  );
});

test("bütçe içindeki görsel istemcide işlenir", () => {
  const result = decideClientProcessing(image, capable);
  assert.equal(result.action, CLIENT_ACTION.PROCESS);
  assert.equal(result.deviceClass, DEVICE_CLASS.HIGH);
});

test("düşük cihazdaki büyük görsel görünür sunucu fallback kararı alır", () => {
  const result = decideClientProcessing(
    { ...image, width: 4000, height: 3000, megapixels: 12 },
    { deviceMemory: 2, hardwareConcurrency: 2, createImageBitmap: true, worker: true }
  );
  assert.equal(result.action, CLIENT_ACTION.SERVER);
  assert.equal(result.reason, "pixel_budget_exceeded");
  assert.equal(result.maxSafeMegapixels, 6);
});

test("runtime canvas tavanı politika tavanını yalnız daraltır", () => {
  const high = classifyDevice({ deviceMemory: 8, hardwareConcurrency: 8, canvasMaxMegapixels: 10 });
  const budget = budgetFor(high);
  assert.equal(budget.maxSafeMegapixels, 10);
  assert.equal(budget.source, "runtime_canvas_probe");
});

test("Worker/createImageBitmap yokluğu main-thread riskine değil sunucuya düşer", () => {
  assert.equal(
    decideClientProcessing(image, { ...capable, worker: false }).reason,
    "worker_unavailable"
  );
  assert.equal(
    decideClientProcessing(image, { ...capable, createImageBitmap: false }).reason,
    "image_bitmap_unavailable"
  );
});

test("canvas probe ilk hatada durur ve ölçülmeyeni uydurmaz", async () => {
  let count = 0;
  const result = await probeCanvasCeiling({
    steps: [4, 8, 12],
    makeCanvas: async () => {
      count += 1;
      if (count === 3) throw new Error("allocation_failed");
      return { width: 1, height: 1, getContext: () => ({ fillRect() {} }) };
    },
  });
  assert.equal(result.maxMegapixels, 8);
  assert.equal(result.attempts.length, 3);
  assert.equal(result.attempts[2].ok, false);
});
