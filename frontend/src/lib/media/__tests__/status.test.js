import { test } from "node:test";
import assert from "node:assert/strict";
import { mediaPhase, byteReduction } from "../status.js";

test("HTTP acceptance and missing scan data never imply readiness", () => {
  assert.equal(mediaPhase(null, "document"), "uploaded");
  assert.equal(mediaPhase({ video_status: "ready" }, "video"), "unverified");
  assert.equal(mediaPhase({ scan_status: "clean" }, "image"), "uploaded");
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
    "processing"
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
