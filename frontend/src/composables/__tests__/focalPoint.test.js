import assert from "node:assert/strict";
import { test } from "node:test";

import { useFocalPoint } from "../useFocalPoint.js";

function fakeDeps({ intent = null, suggestion = null, suggestError = null, saveErrors = [] } = {}) {
  const calls = { get: 0, suggest: 0, save: [] };
  return {
    calls,
    deps: {
      async getIntent() {
        calls.get += 1;
        return { etag: '"e1"', exists: !!intent, intent: intent || { focal_x: null, focal_y: null } };
      },
      async suggest() {
        calls.suggest += 1;
        if (suggestError) throw suggestError;
        return { suggestion: suggestion || { focal_x: 0.7, focal_y: 0.3, grid: 32, measured: true } };
      },
      async saveFocal(payload) {
        calls.save.push(payload);
        const err = saveErrors.shift();
        if (err) throw err;
        return { etag: '"e2"', exists: true };
      },
    },
  };
}

test("kayıtlı odak okunur; öneri istenmez; değişiklik yok", async () => {
  const { deps, calls } = fakeDeps({ intent: { focal_x: 0.78, focal_y: 0.45 } });
  const fp = useFocalPoint({ asset: "A1", deps });
  await fp.load();
  assert.deepEqual(fp.focal.value, { x: 0.78, y: 0.45 });
  assert.equal(calls.suggest, 0);
  assert.equal(fp.dirty.value, false);
});

test("odak yoksa otomatik öneri uygulanır ve bildirilir", async () => {
  const { deps } = fakeDeps();
  const fp = useFocalPoint({ asset: "A1", deps });
  await fp.load();
  assert.deepEqual(fp.focal.value, { x: 0.7, y: 0.3 });
  assert.equal(fp.announce.value.key, "imagePlacement.status.suggested");
});

test("öneri başarısız (429 dahil) → ortadan başlar, bildirim yok", async () => {
  const err = Object.assign(new Error("Too many"), { status: 429 });
  const { deps } = fakeDeps({ suggestError: err });
  const fp = useFocalPoint({ asset: "A1", deps });
  await fp.load();
  assert.deepEqual(fp.focal.value, { x: 0.5, y: 0.5 });
  assert.equal(fp.announce.value, null);
});

test("ok tuşu adımı %1, Shift %10; sınırda kalır", () => {
  const fp = useFocalPoint({ asset: "A1", deps: fakeDeps().deps });
  fp.nudge(1, 0);
  assert.equal(fp.percent.value.x, 51);
  fp.nudge(1, 0, true);
  assert.equal(fp.percent.value.x, 61);
  fp.setFocal(0.99, 0.5);
  fp.nudge(1, 0, true);
  assert.equal(fp.focal.value.x, 1);
  assert.equal(fp.announce.value.key, "imagePlacement.status.moved");
  assert.deepEqual(fp.announce.value.params, { x: 100, y: 50 });
});

test("sayı kutusuna sayı olmayan değer → %50", () => {
  const fp = useFocalPoint({ asset: "A1", deps: fakeDeps().deps });
  fp.setPercent("x", "abc");
  assert.equal(fp.focal.value.x, 0.5);
  fp.setPercent("y", "78");
  assert.equal(fp.focal.value.y, 0.78);
});

test("Kaydet yalnız odak + ETag + önizleme kanıtı gönderir", async () => {
  const { deps, calls } = fakeDeps({ intent: { focal_x: 0.5, focal_y: 0.5 } });
  const fp = useFocalPoint({ asset: "A1", deps });
  await fp.load();
  fp.markViewed("store_hero", "mobile");
  fp.setFocal(0.78, 0.45);
  const r = await fp.save();
  assert.deepEqual(r, { ok: true });
  const p = calls.save[0];
  assert.equal(p.asset, "A1");
  assert.equal(p.focalX, 0.78);
  assert.equal(p.focalY, 0.45);
  assert.equal(p.ifMatch, '"e1"');
  assert.equal(p.method, "manual");
  assert.deepEqual(p.previewed, [{ place: "store_hero", device: "mobile" }]);
  assert.equal("safe_area" in p, false);
  assert.equal(fp.dirty.value, false);
});

test("412 → çakışma; değişiklik kaybolmaz", async () => {
  const conflict = Object.assign(new Error("changed"), { status: 412 });
  const { deps } = fakeDeps({ saveErrors: [conflict] });
  const fp = useFocalPoint({ asset: "A1", deps });
  fp.setFocal(0.78, 0.45);
  const r = await fp.save();
  assert.deepEqual(r, { ok: false, reason: "conflict" });
  assert.equal(fp.conflict.value, true);
  assert.deepEqual(fp.focal.value, { x: 0.78, y: 0.45 });
  assert.equal(fp.announce.value.key, "imagePlacement.status.conflict");
});

test("ağ hatası → tekrar denenebilir, ikinci deneme başarılı", async () => {
  const { deps, calls } = fakeDeps({ saveErrors: [new Error("offline")] });
  const fp = useFocalPoint({ asset: "A1", deps });
  fp.setFocal(0.2, 0.2);
  assert.deepEqual(await fp.save(), { ok: false, reason: "error" });
  assert.equal(fp.failed.value, true);
  assert.deepEqual(await fp.save(), { ok: true });
  assert.equal(calls.save.length, 2);
});

test("varlık yoksa API çağrılmaz, kaydetme reddedilir", async () => {
  const { deps, calls } = fakeDeps();
  const fp = useFocalPoint({ asset: "", initialFocal: { x: 0.6, y: 0.4 }, deps });
  await fp.load();
  assert.equal(calls.get, 0);
  assert.deepEqual(fp.focal.value, { x: 0.6, y: 0.4 });
  assert.deepEqual(await fp.save(), { ok: false, reason: "no-asset" });
});
