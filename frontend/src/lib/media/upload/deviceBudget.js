/**
 * T-015 — cihaz sınıfı × işlem için güvenli istemci piksel bütçesi.
 *
 * Sabitler donanım ölçümüymüş gibi sunulmaz: bunlar çökme riskini azaltan
 * muhafazakâr ürün politikasıdır (`source: "policy_default"`). Tarayıcıda
 * gerçek canvas tavanı ölçülürse daha DAR olan değer kazanır ve kaynak
 * `runtime_canvas_probe` olur. Bütçe aşılırsa dosya reddedilmez; orijinal
 * sunucu motoruna gider ve kullanıcıya görünür bir `info` bulgusu eklenir.
 */

export const DEVICE_CLASS = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  UNKNOWN: "unknown",
});

export const CLIENT_ACTION = Object.freeze({
  PROCESS: "process_on_client",
  SERVER: "server_fallback",
  PASSTHROUGH: "passthrough",
});

export const OPERATION = Object.freeze({
  DECODE: "decode",
  RESIZE: "resize",
  ENCODE: "encode",
  PIPELINE: "pipeline",
});

// MP — ürün politikası, gerçek cihaz laboratuvarı sonucu DEĞİL.
export const SAFE_MEGAPIXELS = Object.freeze({
  [DEVICE_CLASS.LOW]: Object.freeze({ decode: 12, resize: 8, encode: 6 }),
  [DEVICE_CLASS.MEDIUM]: Object.freeze({ decode: 24, resize: 16, encode: 12 }),
  [DEVICE_CLASS.HIGH]: Object.freeze({ decode: 48, resize: 32, encode: 24 }),
  [DEVICE_CLASS.UNKNOWN]: Object.freeze({ decode: 12, resize: 8, encode: 6 }),
});

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function detectBrowser({ userAgent = "", platform = "", maxTouchPoints = 0 } = {}) {
  const ua = String(userAgent);
  const p = String(platform);
  const ios = /iPad|iPhone|iPod/i.test(ua) || (/Mac/i.test(p) && Number(maxTouchPoints) > 1);
  const safari = /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|FxiOS/i.test(ua);
  return Object.freeze({
    ios,
    safari,
    chromium: /Chrome|Chromium|CriOS|Edg/i.test(ua),
    firefox: /Firefox|FxiOS/i.test(ua),
  });
}

/** Saf sınıflandırma; testte `navigator` gerekmez. */
export function classifyDevice(capabilities = {}) {
  const memoryGb = numberOrNull(capabilities.deviceMemory);
  const cores = numberOrNull(capabilities.hardwareConcurrency);
  const benchmarkMs = numberOrNull(capabilities.benchmarkMs);
  const browser = capabilities.browser || detectBrowser(capabilities);

  let deviceClass = DEVICE_CLASS.UNKNOWN;
  const reasons = [];
  if (browser.ios || (memoryGb && memoryGb <= 2) || (cores && cores <= 2) || (benchmarkMs && benchmarkMs > 50)) {
    deviceClass = DEVICE_CLASS.LOW;
    if (browser.ios) reasons.push("ios_conservative_cap");
    if (memoryGb && memoryGb <= 2) reasons.push("memory_lte_2gb");
    if (cores && cores <= 2) reasons.push("cores_lte_2");
    if (benchmarkMs && benchmarkMs > 50) reasons.push("slow_microbenchmark");
  } else if (memoryGb && memoryGb >= 8 && cores && cores >= 8 && (!benchmarkMs || benchmarkMs <= 20)) {
    deviceClass = DEVICE_CLASS.HIGH;
    reasons.push("memory_gte_8gb", "cores_gte_8");
  } else if ((memoryGb && memoryGb >= 4) || (cores && cores >= 4)) {
    deviceClass = DEVICE_CLASS.MEDIUM;
    reasons.push(memoryGb && memoryGb >= 4 ? "memory_gte_4gb" : "cores_gte_4");
  } else {
    reasons.push("hardware_signals_unavailable");
  }

  return Object.freeze({
    deviceClass,
    memoryGb,
    cores,
    benchmarkMs,
    canvasMaxMegapixels: numberOrNull(capabilities.canvasMaxMegapixels),
    browser,
    reasons: Object.freeze(reasons),
  });
}

export function captureCapabilities(scope = globalThis) {
  const nav = scope?.navigator || {};
  return {
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
    userAgent: nav.userAgent || "",
    platform: nav.platform || "",
    maxTouchPoints: nav.maxTouchPoints || 0,
    createImageBitmap: typeof scope?.createImageBitmap === "function",
    worker: typeof scope?.Worker === "function",
    offscreenCanvas: typeof scope?.OffscreenCanvas === "function",
  };
}

export function budgetFor(device, operation = OPERATION.PIPELINE) {
  const row = SAFE_MEGAPIXELS[device?.deviceClass] || SAFE_MEGAPIXELS[DEVICE_CLASS.UNKNOWN];
  const policy =
    operation === OPERATION.PIPELINE
      ? Math.min(row.decode, row.resize, row.encode)
      : row[operation] || Math.min(row.decode, row.resize, row.encode);
  const runtime = numberOrNull(device?.canvasMaxMegapixels);
  return Object.freeze({
    maxSafeMegapixels: runtime ? Math.min(policy, runtime) : policy,
    policyMegapixels: policy,
    runtimeCanvasMegapixels: runtime,
    source: runtime && runtime < policy ? "runtime_canvas_probe" : "policy_default",
  });
}

/**
 * Ölçülmüş dosya için istemci/sunucu kararı. Güvenlik kararı değildir;
 * sunucudaki probe/guard her iki yolda da zorunludur.
 */
export function decideClientProcessing(measure, capabilities = captureCapabilities()) {
  const mime = String(measure?.mime || "");
  const ext = String(measure?.ext || "").toLowerCase();
  const image = mime.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic", ".tif", ".tiff"].includes(ext);
  if (!image) {
    return Object.freeze({ action: CLIENT_ACTION.PASSTHROUGH, reason: "not_an_image" });
  }

  const device = classifyDevice(capabilities);
  const budget = budgetFor(device, OPERATION.PIPELINE);
  const megapixels = numberOrNull(measure?.megapixels) ||
    (numberOrNull(measure?.width) && numberOrNull(measure?.height)
      ? (Number(measure.width) * Number(measure.height)) / 1_000_000
      : null);

  const base = {
    deviceClass: device.deviceClass,
    megapixels,
    maxSafeMegapixels: budget.maxSafeMegapixels,
    budgetSource: budget.source,
    browser: device.browser,
    signals: device.reasons,
  };
  if (!megapixels) {
    return Object.freeze({ ...base, action: CLIENT_ACTION.SERVER, reason: "dimensions_unknown" });
  }
  if (capabilities.createImageBitmap === false) {
    return Object.freeze({ ...base, action: CLIENT_ACTION.SERVER, reason: "image_bitmap_unavailable" });
  }
  if (capabilities.worker === false) {
    return Object.freeze({ ...base, action: CLIENT_ACTION.SERVER, reason: "worker_unavailable" });
  }
  if (megapixels > budget.maxSafeMegapixels) {
    return Object.freeze({ ...base, action: CLIENT_ACTION.SERVER, reason: "pixel_budget_exceeded" });
  }
  return Object.freeze({ ...base, action: CLIENT_ACTION.PROCESS, reason: "within_budget" });
}

/**
 * İsteğe bağlı ölçüm harness'i. Otomatik çağrılmaz: büyük canvas tahsisi bir
 * yükleme ekranını kendi başına düşürmemeli. `makeCanvas` enjekte edilerek
 * gerçek cihaz laboratuvarında ve testte aynı kod kullanılır.
 */
export async function probeCanvasCeiling({ makeCanvas, steps = [4, 8, 12, 16, 24] } = {}) {
  if (typeof makeCanvas !== "function") return { maxMegapixels: null, attempts: [] };
  const attempts = [];
  let maxMegapixels = null;
  for (const mp of steps) {
    const edge = Math.max(1, Math.floor(Math.sqrt(Number(mp) * 1_000_000)));
    const started = typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const canvas = await makeCanvas(edge, edge);
      const context = canvas?.getContext?.("2d");
      if (!context) throw new Error("2d_context_unavailable");
      context.fillRect(0, 0, Math.min(edge, 64), Math.min(edge, 64));
      canvas.width = 1;
      canvas.height = 1;
      maxMegapixels = Number(mp);
      attempts.push({ megapixels: Number(mp), ok: true, elapsedMs: Math.max(0, (typeof performance !== "undefined" ? performance.now() : Date.now()) - started) });
    } catch (error) {
      attempts.push({ megapixels: Number(mp), ok: false, reason: String(error?.message || error) });
      break;
    }
  }
  return { maxMegapixels, attempts };
}
