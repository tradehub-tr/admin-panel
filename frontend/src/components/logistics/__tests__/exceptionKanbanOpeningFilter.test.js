import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * A3 pano açılış filtresi (denetim 2026-09-04).
 *
 * `viewMode` localStorage'dan geliyor: pano modunda dönen kullanıcı
 * `?severity=Critical` linkiyle gelirse süzgeç açılışta temizlenmeli —
 * `immediate: true` olmadan watch yalnız geçişte tetikleniyor ve pano iki
 * boş sütunla "iş yok" yalanı söylüyordu. Kaynak-metin testi: bayrak
 * düşerse burası söyler.
 */
const source = readFileSync(new URL("../ExceptionQueueScreen.vue", import.meta.url), "utf8");

test("isKanban watch'ı immediate: true taşıyor", () => {
  assert.match(
    source,
    /watch\(\s*isKanban,\s*\(pano\) => \{\s*if \(pano && props\.severity\) emit\("filter-severity", ""\);\s*\},\s*\{ immediate: true \}\s*\);/
  );
});
