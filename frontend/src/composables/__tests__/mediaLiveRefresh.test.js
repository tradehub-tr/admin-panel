import assert from "node:assert/strict";
import { test } from "node:test";

import { createMediaLiveController, isMediaRealtimeEvent } from "../useMediaLiveRefresh.js";

function clock() {
  const intervals = new Map();
  const timeouts = new Map();
  let id = 0;
  return {
    intervals,
    timeouts,
    setInterval: (fn) => (intervals.set(++id, fn), id),
    clearInterval: (key) => intervals.delete(key),
    setTimeout: (fn) => (timeouts.set(++id, fn), id),
    clearTimeout: (key) => timeouts.delete(key),
    tickInterval: async () => {
      for (const fn of [...intervals.values()]) await fn();
    },
    tickTimeout: async () => {
      const fns = [...timeouts.values()];
      timeouts.clear();
      for (const fn of fns) await fn();
    },
  };
}

function fakeRealtime(connected = false) {
  const handlers = new Map();
  return {
    connected,
    handlers,
    on: (event, fn) => handlers.set(event, fn),
    off: (event, fn) => handlers.get(event) === fn && handlers.delete(event),
    emit: (event, payload) => handlers.get(event)?.(payload),
  };
}

test("realtime yoksa polling başlar ve kapanışta timer bırakmaz", async () => {
  const c = clock();
  let refreshes = 0;
  const modes = [];
  const ctl = createMediaLiveController({
    realtime: null,
    refresh: async () => (refreshes += 1),
    setIntervalFn: c.setInterval,
    clearIntervalFn: c.clearInterval,
    setTimeoutFn: c.setTimeout,
    clearTimeoutFn: c.clearTimeout,
    onMode: (m) => modes.push(m),
  });
  ctl.start();
  assert.equal(c.intervals.size, 1);
  await c.tickInterval();
  assert.equal(refreshes, 1);
  ctl.stop();
  assert.equal(c.intervals.size, 0);
  assert.deepEqual(modes, ["polling", "off"]);
});

test("bağlanınca polling durur; medya olayı tek debounce yenilemesi üretir", async () => {
  const c = clock();
  const socket = fakeRealtime(false);
  let refreshes = 0;
  const ctl = createMediaLiveController({
    realtime: socket,
    refresh: async () => (refreshes += 1),
    setIntervalFn: c.setInterval,
    clearIntervalFn: c.clearInterval,
    setTimeoutFn: c.setTimeout,
    clearTimeoutFn: c.clearTimeout,
  });
  ctl.start();
  assert.equal(ctl.getMode(), "polling");
  socket.emit("realtime_connect");
  assert.equal(ctl.getMode(), "realtime");
  assert.equal(c.intervals.size, 0);
  socket.emit("doc_update", { doctype: "Listing" });
  socket.emit("doc_update", { doctype: "Media Rendition" });
  socket.emit("doc_update", { doctype: "Media Processing Job" });
  await c.tickTimeout();
  assert.equal(refreshes, 1);
  socket.emit("realtime_disconnect");
  assert.equal(ctl.getMode(), "polling");
  ctl.stop();
  assert.equal(socket.handlers.size, 0);
});

test("olay süzgeci yalnız medya DocType'larını kabul eder", () => {
  assert.equal(isMediaRealtimeEvent("media_processing_status", {}), true);
  assert.equal(isMediaRealtimeEvent("doc_update", { doc: { doctype: "Media Asset" } }), true);
  assert.equal(isMediaRealtimeEvent("doc_update", { doctype: "Listing" }), false);
});
