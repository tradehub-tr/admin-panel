// Ortak sayı biçimleyicilerin değişmezleri (QA denetimi, 2026-08-24).
//
// NEDEN VAR:
//   `utils/format.js` aynı turda çıkarıldı ama testsiz kaldı — oysa taşıdığı
//   iki karar sessizce bozulabiliyor:
//     1. B8 KARARI: bilinmeyen değer "—", GERÇEK SIFIR ise biçimli sıfır.
//        Kontrol yalnız null/undefined'a bakarsa `Number("") === 0` yüzünden
//        maskelenmiş alan "₺0,00" olur ve okuyan onu gerçek sıfır maliyet
//        sanır — para ekranında yanlış bilgi.
//     2. LOCALE PARAMETRE: biçim tarayıcıdan değil uygulamadan gelmeli;
//        `toLocaleString(undefined, …)`e geri dönülürse aynı ekran iki
//        kullanıcıda iki farklı sayı gösterir ve test bunu yakalamalı.
//
// Node'un ICU'su tam veri ile geliyor (`node --test`); tr-TR biçimi doğrudan
// sınanabiliyor.

import assert from "node:assert/strict";
import test from "node:test";

import { formatQty, formatRatioPercent, formatTry } from "../format.js";

/**
 * Intl bazı biçimlerde bölünemez boşluk (U+00A0 / U+202F) kullanıyor;
 * karşılaştırma o görünmez farka takılmasın diye düz boşluğa indiriliyor.
 */
const norm = (text) => text.replace(/[\u00a0\u202f]/g, " ");

test("bilinmeyen değer '—' — boş dize ve NaN dahil", () => {
  for (const bilinmeyen of [null, undefined, "", "   ", "abc", NaN, Infinity, -Infinity, []]) {
    assert.equal(formatTry(bilinmeyen), "—", `formatTry(${JSON.stringify(bilinmeyen)})`);
    assert.equal(
      formatRatioPercent(bilinmeyen),
      "—",
      `formatRatioPercent(${JSON.stringify(bilinmeyen)})`
    );
  }
});

test("GERÇEK sıfır '—' DEĞİL — maskelenmiş alandan ayrılıyor (B8)", () => {
  assert.equal(norm(formatTry(0)), "₺0,00");
  assert.equal(norm(formatTry("0")), "₺0,00");
  assert.equal(norm(formatRatioPercent(0)), "%0,0");
});

test("tr-TR para biçimi: binlik '.', ondalık ','", () => {
  assert.equal(norm(formatTry(46239.2)), "₺46.239,20");
  assert.equal(norm(formatTry("46239.2")), "₺46.239,20");
  assert.equal(norm(formatTry(-12.5)), "-₺12,50");
});

test("oran → yüzde: değer 100 ile çarpılıyor, ondalık tek basamak", () => {
  assert.equal(norm(formatRatioPercent(0.9012)), "%90,1");
  assert.equal(norm(formatRatioPercent(1)), "%100,0");
  assert.equal(norm(formatRatioPercent(0.005)), "%0,5");
});

// ── formatQty — miktar kolonu (QA denetimi 2026-08-28) ──

test("formatQty: bilinmeyen miktar '—' — boş dize, boşluk, dizi ve NaN dahil", () => {
  // Eski yerel `fmt()` bunların HEPSİNE "0" diyordu (`fmt("abc")` → "NaN").
  // "Veri yok" ile "sıfır adet" ayırt edilemiyordu.
  for (const bilinmeyen of [null, undefined, "", "   ", "abc", NaN, Infinity, [], {}]) {
    assert.equal(formatQty(bilinmeyen), "—", `formatQty(${JSON.stringify(bilinmeyen)})`);
  }
});

test("formatQty: GERÇEK sıfır '—' DEĞİL — aşırı düzeltme kontrolü", () => {
  assert.equal(formatQty(0), "0");
  assert.equal(formatQty("0"), "0");
  assert.equal(formatQty("0.0"), "0");
});

test("formatQty: tam sayı ve ondalık miktar tr-TR biçiminde", () => {
  assert.equal(norm(formatQty(2000)), "2.000");
  assert.equal(norm(formatQty(1234.5)), "1.234,5");
  assert.equal(norm(formatQty("48")), "48");
  assert.equal(norm(formatQty(0.3)), "0,3");
});

test("formatQty: locale PARAMETRE — tarayıcı ayarı değil", () => {
  // Argümansız `toLocaleString()` aynı miktarı "1,234.5" / "1.234,5" /
  // "١٬٢٣٤٫٥" gösterebiliyordu; biçim artık çağırandan geliyor.
  assert.equal(norm(formatQty(1234.5, "en-US")), "1,234.5");
  assert.equal(norm(formatQty(1234.5, "tr-TR")), "1.234,5");
});

test("locale PARAMETRE — tarayıcı ayarı değil", () => {
  // Aynı girdi, iki dil: biçim çağıranın verdiği locale'den geliyor.
  assert.equal(norm(formatTry(1234.5, "en-US")), "TRY 1,234.50");
  assert.equal(norm(formatRatioPercent(0.9012, "en-US")), "90.1%");
  // Yüzde işareti ELLE eklenmiyor: tr'de önde, en'de arkada duruyor.
  assert.ok(norm(formatRatioPercent(0.9012, "tr-TR")).startsWith("%"));
  assert.ok(norm(formatRatioPercent(0.9012, "en-US")).endsWith("%"));
});
