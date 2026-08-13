import assert from "node:assert/strict";
import test from "node:test";

// Zarf açma sözleşmesi.
//
// `src/api/logistics.js` doğrudan import EDİLEMİYOR: `@/utils/api` zincirinde
// tarayıcı API'leri (localStorage, fetch) var ve node:test ortamında yok.
// Bu yüzden zarf mantığı burada birebir yeniden kuruluyor ve SÖZLEŞME
// kilitleniyor — kaynak değişip bu test kırılmıyorsa iki taraf sürüklenmiş
// demektir.

function unwrapContract(response) {
  const envelope = response?.message ?? response;
  if (!envelope || typeof envelope !== "object" || !("ok" in envelope)) {
    const err = new Error("Beklenmeyen yanıt biçimi (sözleşme zarfı yok).");
    err.code = "INTERNAL_ERROR";
    throw err;
  }
  if (!envelope.ok) {
    const err = new Error(envelope.error?.message || envelope.error?.code);
    err.code = envelope.error?.code;
    err.details = envelope.error?.details ?? null;
    throw err;
  }
  return envelope.data;
}

test("Frappe sarmalı açılır", () => {
  assert.deepEqual(unwrapContract({ message: { ok: true, data: { x: 1 } } }), { x: 1 });
});

test("sarmasız yanıt da açılır", () => {
  assert.deepEqual(unwrapContract({ ok: true, data: [1, 2] }), [1, 2]);
});

test("hata zarfı kod taşıyan hata fırlatır", () => {
  assert.throws(
    () =>
      unwrapContract({
        message: { ok: false, error: { code: "FEATURE_DISABLED", message: "kapalı" } },
      }),
    (e) => e.code === "FEATURE_DISABLED" && e.message === "kapalı"
  );
});

test("details korunur", () => {
  assert.throws(
    () =>
      unwrapContract({
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "x", details: { field: "city" } },
      }),
    (e) => e.details.field === "city"
  );
});

test("sözleşme dışı yanıt sessizce geçmez", () => {
  assert.throws(
    () => unwrapContract({ some: "thing" }),
    (e) => e.code === "INTERNAL_ERROR"
  );
  assert.throws(
    () => unwrapContract(null),
    (e) => e.code === "INTERNAL_ERROR"
  );
});

test("data null olabilir, ok true ise hata değildir", () => {
  assert.equal(unwrapContract({ ok: true, data: null }), null);
});
