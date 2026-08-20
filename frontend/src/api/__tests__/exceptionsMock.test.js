// İstisna kuyruğu mock davranışını KİLİTLER (tam denetim Tur-3, 2026-08-20).
//
// NEDEN VAR:
//   `resetMockData` dışa açıktı ama tüketicisi yoktu — bayat export mu, iş
//   mi göremiyor, kimse bilmiyordu. Bu test hem export'a tüketici kazandırır
//   hem üç sözü sabitler: çözülen kayıt listeden KAYBOLMAZ (soluklaşır),
//   reset tohuma DÖNDÜRÜR, boş çözüm notu VALIDATION_FAILED fırlatır
//   (TUR-113 AC). Desen: `packagingContract.test.js` — mock modülü saf
//   olduğu için gerçek kod çağrılıyor, kopya yok.

import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";

import { exceptionsMock, resetMockData } from "../exceptionsMock.js";

beforeEach(() => {
  resetMockData();
});

test("çözülen kayıt listeden kaybolmaz — resolved alanları dolar", () => {
  const sonuc = exceptionsMock.resolve("SHEX-00001", "  Kurye 2. denemeyi tamamladı.  ");
  assert.equal(sonuc.name, "SHEX-00001");
  assert.ok(sonuc.resolved_at, "resolve yanıtı resolved_at damgası taşımalı");

  const { items, severity_counts, total } = exceptionsMock.list();
  const kayit = items.find((i) => i.name === "SHEX-00001");
  assert.ok(kayit, "çözülen kayıt listede kalmalı (soluklaşır, silinmez)");
  assert.equal(kayit.resolved_at, sonuc.resolved_at);
  assert.equal(kayit.resolved_by, "siz (demo)");
  assert.equal(kayit.resolution_note, "Kurye 2. denemeyi tamamladı.", "not kırpılarak saklanmalı");
  // Sayaçlar listeyle aynı yanıttan ve çözümle DEĞİŞMEZ — kayıt kovasında kalır.
  assert.deepEqual(severity_counts, { Critical: 2, Warning: 1, Info: 1 });
  assert.equal(total, 4);
});

test("resetMockData tohum hâline döndürür — oturum mutasyonu sızmaz", () => {
  exceptionsMock.resolve("SHEX-00002", "Adres alıcıyla teyit edildi.");
  resetMockData();

  const { items } = exceptionsMock.list();
  const sifirlanan = items.find((i) => i.name === "SHEX-00002");
  assert.equal(sifirlanan.resolved_at, null, "reset sonrası çözüm izi kalmamalı");
  assert.equal(sifirlanan.resolution_note, null);
  // Tohumda ZATEN çözülü olan kayıt reset'te çözülü KALIR — reset "hepsini
  // aç" değil, "tohuma dön" demek.
  const tohumdanCozulu = items.find((i) => i.name === "SHEX-00004");
  assert.equal(tohumdanCozulu.resolved_at, "2026-08-18 11:00:00");
});

test("boş/boşluk çözüm notu VALIDATION_FAILED fırlatır (TUR-113)", () => {
  for (const bosNot of ["", "   ", null, undefined]) {
    assert.throws(
      () => exceptionsMock.resolve("SHEX-00001", bosNot),
      (e) => e.code === "VALIDATION_FAILED",
      `${JSON.stringify(bosNot)} notu kabul edildi`
    );
  }
  // Reddedilen deneme kayda iz BIRAKMAZ.
  const { items } = exceptionsMock.list();
  assert.equal(items.find((i) => i.name === "SHEX-00001").resolved_at, null);
});

test("tanınmayan kayıt NOT_FOUND, filtreli liste sayaçları tüm kümeden", () => {
  assert.throws(
    () => exceptionsMock.resolve("SHEX-99999", "not"),
    (e) => e.code === "NOT_FOUND"
  );
  // Sayaçlar filtreden BAĞIMSIZ (13-FE §2.1 kuralı) — pill'ler kaymasın.
  const filtreli = exceptionsMock.list("Warning");
  assert.equal(filtreli.total, 1);
  assert.deepEqual(filtreli.severity_counts, { Critical: 2, Warning: 1, Info: 1 });
});
