import { test } from "node:test";
import assert from "node:assert/strict";
import { mediaPhase, byteReduction, phaseTone } from "../status.js";

test("HTTP acceptance and missing scan data never imply readiness", () => {
  assert.equal(mediaPhase(null, "document"), "uploaded");
  assert.equal(mediaPhase({ video_status: "ready" }, "video"), "unverified");
  // Taranmamış dosyanın hazırlaması sürüyorsa hâlâ süren iş (kullanıcı için bitmedi).
  assert.equal(mediaPhase({ asset_states: ["processing"] }, "image"), "processing");
});
test("clean scan without confirmed derivatives is done for the user (2026-10-02)", () => {
  // Prod: türev kuyruğu yokken tepsi %75'te kalıyordu; temiz tarama = kullanıcı için bitti.
  assert.equal(mediaPhase({ scan_status: "clean" }, "image"), "readyBackground");
  assert.equal(mediaPhase({ scan_status: "clean", asset_states: [] }, "image"), "readyBackground");
  assert.equal(
    mediaPhase({ scan_status: "clean", video_status: "processing" }, "video"),
    "readyBackground"
  );
  assert.equal(phaseTone("readyBackground"), "success");
  // Gerçek sorunlar öne çıkmaya devam eder.
  assert.equal(mediaPhase({ scan_status: "pending" }, "image"), "scanning");
  assert.equal(mediaPhase({ scan_status: "infected" }, "image"), "blocked");
  assert.equal(mediaPhase({ scan_status: "failed" }, "image"), "scanFailed");
  assert.equal(
    mediaPhase({ scan_status: "clean", asset_states: ["failed"] }, "image"),
    "processingFailed"
  );
});
test("security outranks completed derivatives and separates malware from scanner errors", () => {
  for (const [scan, phase] of [
    ["pending", "scanning"],
    ["infected", "blocked"],
    ["failed", "scanFailed"],
  ])
    assert.equal(
      mediaPhase({ scan_status: scan, asset_states: ["ready"], video_status: "ready" }),
      phase
    );
});
test("documents need no derivative stage; images require all current assets ready", () => {
  assert.equal(mediaPhase({ scan_status: "clean" }, "document"), "ready");
  assert.equal(
    mediaPhase({ scan_status: "clean", asset_states: ["ready", "processing"] }),
    "readyBackground"
  );
  assert.equal(
    mediaPhase({ scan_status: "clean", asset_states: ["ready", "failed"] }),
    "processingFailed"
  );
  assert.equal(mediaPhase({ scan_status: "clean", asset_states: ["ready"] }), "ready");
  assert.equal(mediaPhase({ scan_status: "clean", asset_states: ["review"] }), "review");
});
test("passthrough or larger video has no invented saving", () => {
  assert.equal(byteReduction(1000, 1000), null);
  assert.equal(byteReduction(1000, 2000), null);
  assert.equal(byteReduction(1000, 0), null);
  assert.equal(byteReduction(1000, 250), 75);
});

import { importOutcome } from "../../../utils/importStatus.js";
test("bulk done cache with errors is partial or failed, never green success", () => {
  assert.equal(importOutcome({ state: "done", inserted: 2, error_count: 1 }), "partial");
  assert.equal(importOutcome({ state: "done", inserted: 0, error_count: 2 }), "failed");
  assert.equal(importOutcome({ state: "running", inserted: 0, error_count: 2 }), "running");
  assert.equal(importOutcome({ state: "completed", inserted: 2, error_count: 0 }), "completed");
});
