import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import ar from "../../../i18n/locales/ar.js";
import en from "../../../i18n/locales/en.js";
import ru from "../../../i18n/locales/ru.js";
import tr from "../../../i18n/locales/tr.js";

const catalog = JSON.parse(
  readFileSync(new URL("../error-catalog.gen.json", import.meta.url), "utf8")
);
const locales = { tr, en, ru, ar };

test("sunucunun tüm yükleme hata kodları dört dilde çevrilidir", () => {
  assert.equal(catalog.codes.length, 24);
  for (const [locale, messages] of Object.entries(locales)) {
    const translations = messages.media?.upload?.err || {};
    const missing = catalog.codes
      .map(({ code }) => code)
      .filter((code) => typeof translations[code] !== "string" || !translations[code].trim());
    assert.deepEqual(missing, [], `${locale}: eksik yükleme hata kodları`);
  }
});

test("yeniden deneme kararı üretilmiş sunucu kataloğundan gelir", () => {
  const retryable = catalog.codes.filter((item) => item.retryable).map((item) => item.code);
  assert.deepEqual(retryable, ["upload_chunk_order", "upload_chunk_missing"]);
});
