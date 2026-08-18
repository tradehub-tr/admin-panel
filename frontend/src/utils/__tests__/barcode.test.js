// Code 128-B kodlamasının DOĞRULUĞUNU kilitler.
//
// NEDEN BU KADAR SIKI:
//   "Barkod çiziliyor" ile "barkod okunuyor" farklı iddialar. Görsel test
//   birincisini ölçer, ikincisini ölçmez — yanlış kontrol basamağı ekranda
//   kusursuz görünür, depoda okumaz. Buradaki denetimler sembolü GERİ ÇÖZÜP
//   okuyucunun yapacağı işi yapıyor.

import assert from "node:assert/strict";
import test from "node:test";

import { barcodeDataUri, barcodeSvg, code128Modules, code128Values } from "../barcode.js";

const KOD = "SHP-2026-00042-02";

/** Desen dizisinden değerleri geri çözer — okuyucunun yaptığı iş. */
function decodeModules(modules) {
  const { C128 } = tabloYeniden();
  const out = [];
  for (let i = 0; i < modules.length; ) {
    const n = modules.length - i === 7 ? 7 : 6;
    const chunk = modules.slice(i, i + n);
    const idx = C128.indexOf(chunk);
    assert.ok(idx >= 0, `tabloda olmayan desen: ${chunk}`);
    out.push(idx);
    i += n;
  }
  return out;
}

/**
 * Tabloyu modülden değil, KODLAYICIDAN türet: tek tek karakterleri kodlayıp
 * desenlerini toplar. Tabloyu teste kopyalamak, aynı hatayı iki yere yazıp
 * "uyuşuyor" demek olurdu.
 */
function tabloYeniden() {
  const C128 = [];
  for (let v = 0; v <= 94; v++) {
    const mods = code128Modules(String.fromCharCode(v + 32));
    C128[v] = mods.slice(6, 12); // [start][veri][kontrol][stop] → veri deseni
  }
  // Başlangıç ve dur kodları her sembolde aynı yerde duruyor.
  const ornek = code128Modules("A");
  C128[104] = ornek.slice(0, 6);
  C128[106] = ornek.slice(-7);
  // Kontrol basamağı desenleri: 0-102 arası eksik kalanları kapat.
  for (let v = 95; v <= 102; v++) {
    // v değerini kontrol basamağı olarak üreten bir girdi ara.
    for (let c = 0; c <= 94; c++) {
      if ((104 + c) % 103 === v) {
        C128[v] = code128Modules(String.fromCharCode(c + 32)).slice(12, 18);
        break;
      }
    }
  }
  return { C128 };
}

test("değer dizisi: başlangıç + veri + kontrol basamağı + dur", () => {
  const v = code128Values(KOD);
  assert.equal(v[0], 104, "Start B");
  assert.equal(v.at(-1), 106, "Stop");
  assert.equal(v.length, KOD.length + 3);
});

test("kontrol basamağı — el hesabıyla ölçüldü", () => {
  // "AB": Start B(104) + A(33)*1 + B(34)*2 = 205 ; 205 % 103 = 102
  assert.deepEqual(code128Values("AB"), [104, 33, 34, 102, 106]);
});

test("kontrol basamağı ağırlıklı toplamla uyuşuyor", () => {
  const v = code128Values(KOD);
  let sum = v[0];
  for (let i = 1; i < v.length - 2; i++) sum += v[i] * i;
  assert.equal(v.at(-2), sum % 103);
});

test("sembol geri çözülünce aynı metni veriyor", () => {
  const cozulen = decodeModules(code128Modules(KOD));
  assert.deepEqual(cozulen, code128Values(KOD));
  assert.equal(
    cozulen.slice(1, -2).map((v) => String.fromCharCode(v + 32)).join(""),
    KOD
  );
});

test("desenler standart modül sayısını tutuyor — veri 11, dur 13", () => {
  const mods = code128Modules(KOD);
  const toplam = [...mods].reduce((s, d) => s + Number(d), 0);
  // start + veri + kontrol = (n + 2) sembol × 11 modül, artı 13 modüllük dur.
  assert.equal(toplam, 11 * (KOD.length + 2) + 13);
});

test("SVG geometrisi kodlamayla aynı şeyi söylüyor", () => {
  // Değer matematiği doğru olup ÇİZİM kayabilir. Bu test dikdörtgenleri
  // ölçüp koda geri dönüyor.
  const svg = barcodeSvg(KOD, { width: 264, height: 66 });
  const rects = [...svg.matchAll(/<rect x="([\d.]+)" y="0" width="([\d.]+)"/g)]
    .map((m) => ({ x: Number(m[1]), w: Number(m[2]) }));

  const runs = [];
  rects.forEach((r, i) => {
    runs.push(r.w);
    if (rects[i + 1]) runs.push(rects[i + 1].x - (r.x + r.w));
  });

  const unit = Math.min(...runs);
  const modules = runs.map((r) => Math.round(r / unit)).join("");
  assert.deepEqual(decodeModules(modules), code128Values(KOD));

  // Sessiz bölge: ilk çubuk tam 10 modül içeriden başlamalı.
  assert.ok(Math.abs(rects[0].x - 10 * unit) < 0.01, "sessiz bölge 10 modül");
});

test("ASCII dışı karakter sessizce DÜŞMÜYOR, '?' oluyor", () => {
  // Sessiz atlama kodu kısaltır ve yanlış koliyi doğrulatır.
  const v = code128Values("AÇB");
  assert.equal(v.length, 6, "üç karakter de yerini koruyor");
  assert.equal(v[2], "?".charCodeAt(0) - 32);
});

test("aynı kod hep aynı sembolü veriyor", () => {
  assert.equal(barcodeSvg(KOD), barcodeSvg(KOD));
});

test("data URI img src olarak kullanılabiliyor", () => {
  const uri = barcodeDataUri(KOD);
  assert.ok(uri.startsWith("data:image/svg+xml,"));
  assert.ok(decodeURIComponent(uri).includes("<svg"));
});

test("boş kod ekranı kırmıyor — yalnız başlangıç, kontrol ve dur", () => {
  assert.deepEqual(code128Values(""), [104, 104 % 103, 106]);
  assert.ok(barcodeSvg("").includes("<svg"));
});
