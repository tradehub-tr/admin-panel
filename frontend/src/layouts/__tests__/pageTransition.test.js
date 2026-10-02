import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * Sayfa geçişi (2026-10-01) — AppLayout ana <router-view>.
 *
 *   ÖLÇÜLÜR  — kaynak sözleşmesi: yalnız GİRİŞ animasyonlu (opacity + 6px,
 *              $d-page $ease-out), çıkış eşzamanlı `done()` ile anında (gezinme
 *              beklemez, iki sayfa üst üste binmez), `:key` yok (yalnız query/
 *              param değişen rotada bileşen yeniden kullanılır), KeepAlive yok,
 *              mode="out-in" yok, azaltılmış harekette kayma kapalı.
 *   ÖLÇÜLMEZ — gerçek animasyon karesi (SSR/Node'da tarayıcı yok).
 */

const src = readFileSync(new URL("../AppLayout.vue", import.meta.url), "utf8");
const tpl = src.slice(src.indexOf("<template>"), src.indexOf("<script"));
const view = tpl.slice(tpl.indexOf("<router-view"), tpl.indexOf("</router-view>"));
const css = src.slice(src.indexOf("<style")).replace(/\/\*[\s\S]*?\*\//g, "");
const vars = readFileSync(new URL("../../assets/scss/variables.scss", import.meta.url), "utf8");

test("router-view slot'u <Transition name=page appear> ile sarılı; :key / KeepAlive / out-in yok", () => {
  assert.match(view, /<router-view v-slot="\{ Component \}">/);
  assert.match(view, /<Transition name="page" appear @leave="onPageLeave">/);
  assert.match(view, /<component :is="Component" \/>/);
  assert.doesNotMatch(view, /:key=/, ":key query/param değişiminde sayfayı yeniden kurar");
  assert.doesNotMatch(tpl, /KeepAlive|keep-alive/i);
  assert.doesNotMatch(view, /mode=/, "out-in çıkışı bekletir");
});

test("çıkış anında: leave kancası done()'u eşzamanlı çağırır, leave CSS'i yok", () => {
  assert.match(src, /function onPageLeave\(_el, done\) \{\s*done\(\);\s*\}/);
  assert.doesNotMatch(css, /\.page-leave/);
});

test("giriş: opacity + translateY(6px), $d-page (180ms) $ease-out; yalnız transform/opacity", () => {
  assert.match(vars, /\$d-page: 180ms;/);
  assert.match(
    css,
    /\.page-enter-active \{\s*transition:\s*opacity \$d-page \$ease-out,\s*transform \$d-page \$ease-out;/
  );
  assert.match(css, /\.page-enter-from \{\s*opacity: 0;\s*transform: translateY\(6px\);/);
  assert.doesNotMatch(css, /transition:\s*all|ease-in[^-]/);
  const rm = css.slice(css.indexOf("prefers-reduced-motion"));
  assert.match(rm, /\.page-enter-from \{\s*transform: none;/);
});
