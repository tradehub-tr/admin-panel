import assert from "node:assert/strict";
import test from "node:test";

import { buildCsv, csvEscape } from "../csv.js";

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
  assert.equal(csvEscape("=1,2"), "\"'=1,2\"");
});

test("buildCsv başlıklar DAHİL her hücreyi kaçışlar, BOM eklemez", () => {
  const csv = buildCsv(["Taşıyıcı", "=Adet"], [["=Aras, Kargo", 5]]);
  assert.equal(csv, "Taşıyıcı,'=Adet\n\"'=Aras, Kargo\",5");
  assert.ok(!csv.startsWith("﻿"));
});
