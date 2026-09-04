import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * A3 çözüm akışı — YENİDEN-GİRİŞ KİLİDİ (denetim 2026-09-04, C1 emsali).
 *
 * `saving` disabled'ı DOM'a inmeden aynı karede gelen ikinci tıklama ikinci
 * çözüm isteğini başlatabiliyordu. Kaynak-metin testi (CategoryManagementView
 * deseni): kilit satırı silinirse burası söyler.
 */
const source = readFileSync(new URL("../ExceptionQueueView.vue", import.meta.url), "utf8");

test("confirmResolve yeniden-giriş kilidiyle başlar", () => {
  assert.match(
    source,
    /async function confirmResolve\(note\) \{[^}]*?if \(resolveSaving\.value\) return;/s
  );
});

test("kilit, kaydetme bayrağı açılmadan ÖNCE denetleniyor", () => {
  const guard = source.indexOf("if (resolveSaving.value) return;");
  const flagOn = source.indexOf("resolveSaving.value = true;");
  assert.ok(guard !== -1 && flagOn !== -1 && guard < flagOn);
});
