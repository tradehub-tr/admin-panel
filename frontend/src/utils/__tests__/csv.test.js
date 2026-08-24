import assert from "node:assert/strict";
import test from "node:test";

import { buildCsv, csvEscape, csvNumber } from "../csv.js";

/**
 * CSV kaçış + formül-enjeksiyon koruması (17-FE denetimi, Security-major).
 *
 * Asıl sınanan şey: taşıyıcı adı gibi kullanıcı-etkili bir hücre Excel'de
 * FORMÜL olarak çalışamıyor ve virgül/tırnak/satırsonu kolonları kaydırmıyor.
 */

test("düz değerler olduğu gibi geçer (passthrough)", () => {
  assert.equal(csvEscape("Yurtiçi Kargo"), "Yurtiçi Kargo");
  assert.equal(csvEscape(42), "42");
  assert.equal(csvEscape(""), "");
  assert.equal(csvEscape(null), "");
  assert.equal(csvEscape(undefined), "");
});

test("formül önekleri `'` ile etkisizleştirilir", () => {
  assert.equal(csvEscape("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvEscape("+SUM(A1)"), "'+SUM(A1)");
  assert.equal(csvEscape("-2+3"), "'-2+3");
  assert.equal(csvEscape("@cmd"), "'@cmd");
  assert.equal(csvEscape("\tx"), "'\tx");
});

test("virgül/tırnak/satırsonu RFC 4180 tırnaklamasıyla sarılır", () => {
  assert.equal(csvEscape("a,b"), '"a,b"');
  assert.equal(csvEscape('de "mi"'), '"de ""mi"""');
  assert.equal(csvEscape("iki\nsatır"), '"iki\nsatır"');
});

test("formül öneki + virgül birlikte: önce önek, sonra tırnaklama", () => {
  // `=cmd|' /C calc'!A0,x` benzeri payload hem etkisiz hem tek hücrede kalır.
  assert.equal(csvEscape("=1,2"), '"\'=1,2"');
});

test("buildCsv başlıklar DAHİL her hücreyi kaçışlar, BOM eklemez", () => {
  const csv = buildCsv(["Taşıyıcı", "=Adet"], [["=Aras, Kargo", 5]]);
  assert.equal(csv, "Taşıyıcı,'=Adet\n\"'=Aras, Kargo\",5");
  assert.ok(!csv.startsWith("﻿"));
});

// ── csvNumber — Türkçe Excel ondalık tuzağı (QA denetimi 2026-08-24) ──

test("ondalık ayracı locale'den; BİNLİK ayracı hiç yok", () => {
  // Ham `46239.2` Türkçe Excel'de 462392 okunuyordu (10.000 kat şişme).
  assert.equal(csvNumber(46239.2), "46239,20");
  assert.equal(csvNumber("46239.2"), "46239,20");
  // Binlik ayracı basılsaydı "46.239,20" olur ve `.` yine tuzağa dönerdi.
  assert.ok(!csvNumber(46239.2).includes("."));
  assert.equal(csvNumber(1234.5, { locale: "en-US" }), "1234.50");
});

test("tüm tutarlar AYNI basamakta — kolonlar arası tutarsızlık yok", () => {
  assert.equal(csvNumber(7), "7,00");
  assert.equal(csvNumber(2.765), "2,77");
  assert.equal(csvNumber(0), "0,00");
  assert.equal(csvNumber(2.76, { digits: 1 }), "2,8");
});

test("sayı olmayan değer boş göstergeye düşer — '0,00' yazılmaz", () => {
  for (const bilinmeyen of [null, undefined, "", "  ", "abc", NaN, Infinity]) {
    assert.equal(csvNumber(bilinmeyen), "—", JSON.stringify(bilinmeyen));
  }
  assert.equal(csvNumber(null, { blank: "" }), "");
});

test("csvNumber çıktısı buildCsv'den geçince tırnaklanır — kolon kaymaz", () => {
  // Ondalık ayracı ',' ve CSV alan ayracı da ',': kaçış olmazsa tek sayı iki
  // kolona bölünürdü. RFC 4180 tırnaklaması bunu kapatıyor.
  assert.equal(buildCsv(["Maliyet"], [[csvNumber(46239.2)]]), 'Maliyet\n"46239,20"');
});
