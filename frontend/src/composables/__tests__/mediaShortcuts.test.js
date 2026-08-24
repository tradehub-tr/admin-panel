import assert from "node:assert/strict";
import test from "node:test";

import { shouldYieldToNativeMediaControl } from "../useMediaShortcuts.js";

function eventFor({ interactive = false, grid = false, key = "Enter" } = {}) {
  const control = { matches: () => grid };
  return {
    key,
    target: {
      closest: () => (interactive ? control : null),
    },
  };
}

test("başlık ve modal kontrollerinde global medya kısayolları native tuşu yutmaz", () => {
  assert.equal(shouldYieldToNativeMediaControl(eventFor({ interactive: true })), true);
  assert.equal(
    shouldYieldToNativeMediaControl(eventFor({ interactive: true, key: "Delete" })),
    true
  );
});

test("ızgara ana düğmesinde Enter/Space native, oklar roving gezinmeye aittir", () => {
  assert.equal(shouldYieldToNativeMediaControl(eventFor({ interactive: true, grid: true })), true);
  assert.equal(
    shouldYieldToNativeMediaControl(eventFor({ interactive: true, grid: true, key: " " })),
    true
  );
  assert.equal(
    shouldYieldToNativeMediaControl(eventFor({ interactive: true, grid: true, key: "ArrowRight" })),
    false
  );
});

test("etkileşimli olmayan sayfa zemini global kısayollara açıktır", () => {
  assert.equal(shouldYieldToNativeMediaControl(eventFor()), false);
});
