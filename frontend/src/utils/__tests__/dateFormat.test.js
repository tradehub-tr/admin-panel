import assert from "node:assert/strict";
import test from "node:test";

import {
  formatAgo,
  formatClock,
  formatDateTime,
  formatDay,
  parseServerDate,
  toTimestamp,
} from "../dateFormat.js";

/**
 * Tarih/saat standardı (TUR-124).
 *
 * Asıl sınanan şey: sunucudan gelen tarih, kullanıcı hangi saat diliminde
 * olursa olsun DOĞRU ANI gösteriyor mu. Öncesinde sunucu saat dilimi işareti
 * göndermiyordu ve tarayıcı tarihi kendi saati sanıyordu — İstanbul dışındaki
 * her kullanıcı saatleri kaymış görüyordu.
 */

const ISO = "2026-08-14T09:39:06+03:00"; // standart çıktı
const ISARETSIZ = "2026-08-14T09:39:06"; // eski uçlar
const FRAPPE = "2026-08-14 09:39:06.911581"; // ham veritabanı biçimi

test("[NFR-052] üç giriş biçimi de AYNI ana çözülüyor", () => {
  const a = parseServerDate(ISO).getTime();
  const b = parseServerDate(ISARETSIZ).getTime();
  const c = parseServerDate(FRAPPE).getTime();
  assert.equal(a, b);
  assert.equal(b, c);
});

test("[NFR-052] saat dilimi işareti olmayan tarih sunucu saati sayılıyor", () => {
  // 09:39 İstanbul = 06:39 UTC
  assert.equal(parseServerDate(ISARETSIZ).toISOString(), "2026-08-14T06:39:06.000Z");
  assert.equal(parseServerDate(FRAPPE).toISOString(), "2026-08-14T06:39:06.000Z");
});

test("boş ve bozuk değerler çökmüyor", () => {
  for (const v of [null, undefined, "", "  ", "abc", {}, []]) {
    assert.equal(parseServerDate(v), null);
  }
  assert.equal(formatDay(null), "—");
  assert.equal(formatDateTime(""), "—");
  assert.equal(formatClock("abc"), "—");
  assert.equal(formatAgo(null), "—");
});

test("Date nesnesi doğrudan kabul ediliyor", () => {
  const d = new Date("2026-08-14T06:39:06Z");
  assert.equal(parseServerDate(d).getTime(), d.getTime());
  assert.equal(parseServerDate(new Date("gecersiz")), null);
});

test("gün biçimi kullanıcının diline uyuyor", () => {
  const tr = formatDay(ISO, "tr");
  const en = formatDay(ISO, "en");
  assert.match(tr, /2026/);
  assert.match(en, /2026/);
  assert.notEqual(tr, en); // ay adı dile göre değişmeli
});

test("tarih-saat biçimi saat içeriyor, gün biçimi içermiyor", () => {
  assert.match(formatDateTime(ISO, "tr"), /\d{2}:\d{2}/);
  assert.doesNotMatch(formatDay(ISO, "tr"), /\d{2}:\d{2}/);
});

test("mikro saniye gösterime sızmıyor", () => {
  assert.doesNotMatch(formatDateTime(FRAPPE, "tr"), /911581|\.\d{3,}/);
});

test("göreli zaman eşikleri doğru", () => {
  const simdi = Date.now();
  const yap = (saniye) => new Date(simdi - saniye * 1000).toISOString();
  assert.equal(formatAgo(yap(10), { now: "az önce" }), "az önce");
  assert.equal(formatAgo(yap(300), { min: (n) => `${n} dk` }), "5 dk");
  assert.equal(formatAgo(yap(7200), { hour: (n) => `${n} sa` }), "2 sa");
  assert.equal(formatAgo(yap(172800), { day: (n) => `${n} gün` }), "2 gün");
});

test("bir aydan eski olay göreli değil tam tarih gösteriyor", () => {
  const eski = new Date(Date.now() - 60 * 86400 * 1000).toISOString();
  assert.equal(formatAgo(eski, { fallback: () => "TAM_TARIH" }), "TAM_TARIH");
});

test("gelecekteki tarih negatife düşmüyor", () => {
  const gelecek = new Date(Date.now() + 60000).toISOString();
  assert.equal(formatAgo(gelecek, { now: "az önce" }), "az önce");
});

test("sıralama için karşılaştırılabilir sayı üretiliyor", () => {
  const erken = toTimestamp("2026-08-14T09:00:00+03:00");
  const gec = toTimestamp("2026-08-14T10:00:00+03:00");
  assert.ok(erken < gec);
  assert.equal(toTimestamp(null), 0);
});

test("karışık biçimler birlikte sıralandığında doğru sıra çıkıyor", () => {
  // Metin karşılaştırması burada yanlış sonuç verirdi: işaretli ve işaretsiz
  // biçimler alfabetik olarak yan yana gelmiyor.
  const kayitlar = [
    { t: "2026-08-14 11:00:00.123456" },
    { t: "2026-08-14T09:00:00+03:00" },
    { t: "2026-08-14T10:00:00" },
  ];
  const sirali = [...kayitlar].sort((a, b) => toTimestamp(a.t) - toTimestamp(b.t));
  assert.deepEqual(
    sirali.map((x) => x.t),
    ["2026-08-14T09:00:00+03:00", "2026-08-14T10:00:00", "2026-08-14 11:00:00.123456"]
  );
});
