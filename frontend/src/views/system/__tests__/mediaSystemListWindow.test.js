/**
 * MOGEM-638 §7-12 · media-optimize / media-audit liste modu pencereleme sözleşmesi.
 *
 * `mediaLibraryVirtualGrid.test.js` ile aynı desen: şablon metni üzerinden
 * kaynak-sözleşme testi. Pencereleme `useCardGridWindow` ile (yeni bağımlılık yok),
 * mutlak dizin `listOffset + i`, padding iç gövdede (`.card`'ın 20px'i korunur),
 * sabit satır yüksekliği `--windowed` sınıfıyla.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const oku = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");
const optimize = oku("../MediaOptimizeView.vue");
const audit = oku("../MediaAuditView.vue");

for (const [ad, src, ongek, items] of [
  ["MediaOptimizeView", optimize, "mo", "m.items.value"],
  ["MediaAuditView", audit, "ma", "a.items.value"],
]) {
  test(`${ad}: liste modu useCardGridWindow ile pencerelenir`, () => {
    assert.match(src, /import \{ useCardGridWindow \} from "@\/components\/media\/useCardGridWindow"/);
    assert.match(src, /useCardGridWindow\(listEl, \{\s*items: \(\) => [ma]\.items\.value,\s*enabled: \(\) => effectiveMode\.value === "list"/);
  });

  test(`${ad}: satırlar pencere dilimini gezer, dizin mutlak`, () => {
    // Liste bloğu kart ızgarasına kadar; ızgara/tablo tam diziyi gezmekte serbest.
    const liste = src.slice(src.indexOf("effectiveMode === 'list'"), src.indexOf("effectiveMode === 'grid'"));
    assert.match(liste, /v-for="\((item|r), i\) in listVisible"/);
    assert.match(liste, /:data-cell="listOffset \+ i"/);
    assert.match(liste, new RegExp(`:aria-setsize="${items.replace(/\./g, "\\.")}\\.length"`));
    assert.match(liste, /:aria-posinset="listOffset \+ i \+ 1"/);
    assert.doesNotMatch(liste, new RegExp(`v-for="\\(?(item|r)(, i)?\\)? in ${items.replace(/\./g, "\\.")}"`),
      "liste modu hâlâ tam diziyi geziyor");
  });

  test(`${ad}: padding iç gövdede, kart padding'i korunur`, () => {
    assert.match(src, new RegExp(`<div ref="listEl" class="${ongek}__list-body" :style="listPadStyle">`));
    assert.match(src, new RegExp(`'${ongek}__list--windowed': listWindowed`));
  });

  test(`${ad}: pencereli satır yüksekliği sabit`, () => {
    const stil = src.slice(src.indexOf(`.${ongek}__list--windowed .${ongek}__row {`));
    assert.match(stil, /height: (calc\(var\(--m-row-min-h, 3\.25rem\) \+ 0\.75rem\)|4rem);/);
    assert.match(stil, /overflow: hidden;/);
  });

  test(`${ad}: tablo modu pencerelenmedi (tbody padding taşımaz)`, () => {
    const tablo = src.slice(src.indexOf("effectiveMode === 'table'"), src.indexOf("</tbody>"));
    assert.doesNotMatch(tablo, /listVisible|listOffset|listPadStyle/);
  });
}

test("MediaAuditView: imleç mutlak dizinle çalışır ve reveal ile satırı getirir", () => {
  assert.match(audit, /'ma__row--cursor': cursor === listOffset \+ i/);
  assert.match(audit, /:data-row="listOffset \+ i"/);
  assert.match(audit, /const cell =\s*\(await revealRow\(cursor\.value\)\) \|\| document\.querySelector\(`\[data-row="\$\{cursor\.value\}"\]`\)/);
});
