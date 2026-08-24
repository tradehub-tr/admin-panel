// Bayat-yanıt korumasının değişmezleri (SOLID/QA denetimi, 2026-08-24).
//
// Desen üç container'dan buraya toplandı; kopyalar silindiği için tek
// koruma artık bu test. Sınanan üç söz:
//   1. Geç dönen ESKİ isteğin sonucu UYGULANMAZ.
//   2. Eski istek, süren yeni isteğin `loading`ini KAPATMAZ.
//   3. Eski isteğin HATASI da yutulur — ekran çözülmüş bir hatayı göstermez.

import assert from "node:assert/strict";
import test from "node:test";

import { useLatestRequest } from "../useLatestRequest.js";

/** Elle çözülebilen söz — yarışı sıralamak için. */
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test("tek istek: sonuç uygulanır, loading kapanır", async () => {
  const { loading, error, run } = useLatestRequest();
  const applied = [];

  const done = run(() => Promise.resolve("veri"), { apply: (d) => applied.push(d) });
  assert.equal(loading.value, true, "istek sürerken loading açık olmalı");

  assert.equal(await done, true);
  assert.deepEqual(applied, ["veri"]);
  assert.equal(loading.value, false);
  assert.equal(error.value, null);
});

test("geç dönen ESKİ yanıt uygulanmaz — yeni olan kazanır", async () => {
  const { run } = useLatestRequest();
  const eski = deferred();
  const yeni = deferred();
  const applied = [];

  const ilk = run(() => eski.promise, { apply: (d) => applied.push(d) });
  const ikinci = run(() => yeni.promise, { apply: (d) => applied.push(d) });

  // Yeni önce, eski sonra döner (asıl yarış senaryosu).
  yeni.resolve("yeni");
  assert.equal(await ikinci, true);
  eski.resolve("eski");
  assert.equal(await ilk, false, "bayat istek sessizce düşmeli");

  assert.deepEqual(applied, ["yeni"], "ekranda yalnız son isteğin verisi kalmalı");
});

test("bayat istek süren yeni isteğin loading'ini KAPATMAZ", async () => {
  const { loading, run } = useLatestRequest();
  const eski = deferred();
  const yeni = deferred();

  const ilk = run(() => eski.promise);
  const ikinci = run(() => yeni.promise);

  eski.resolve("eski");
  await ilk;
  assert.equal(loading.value, true, "yeni istek sürerken iskelet sönmemeli");

  yeni.resolve("yeni");
  await ikinci;
  assert.equal(loading.value, false);
});

test("bayat HATA da yutulur; taze hata mapError'dan geçer", async () => {
  const { error, run } = useLatestRequest({
    mapError: (e) => ({ code: "MAPPED", raw: e.message }),
  });
  const eski = deferred();
  const yeni = deferred();
  const temizlik = [];

  const ilk = run(() => eski.promise, { onError: () => temizlik.push("eski") });
  const ikinci = run(() => yeni.promise, { onError: () => temizlik.push("yeni") });

  eski.reject(new Error("eski patladı"));
  assert.equal(await ilk, false);
  assert.equal(error.value, null, "bayat hata ekrana yazılmamalı");
  assert.deepEqual(temizlik, []);

  yeni.reject(new Error("yeni patladı"));
  assert.equal(await ikinci, true);
  assert.deepEqual(error.value, { code: "MAPPED", raw: "yeni patladı" });
  assert.deepEqual(temizlik, ["yeni"]);
});

test("her çağrı KENDİ sayacını tutar — iki liste birbirini bayatlatmaz", async () => {
  const a = useLatestRequest();
  const b = useLatestRequest();
  const applied = [];

  const ilk = a.run(() => Promise.resolve("a"), { apply: (d) => applied.push(d) });
  const ikinci = b.run(() => Promise.resolve("b"), { apply: (d) => applied.push(d) });

  assert.deepEqual(await Promise.all([ilk, ikinci]), [true, true]);
  assert.deepEqual(applied.sort(), ["a", "b"]);
});
