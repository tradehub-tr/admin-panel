// `:href` şema beyaz listesinin değişmezleri.
//
// Bu koruma boş yere eklenmedi: lojistik sekmelerindeki üç bağlantı
// (`doc.url`, `pkg.label_url`, `leg.handover_proof`) backend'de serbest metin
// (`Data`) ve hiçbir şema doğrulaması yok. `javascript:` yazan bir kayıt,
// bağlantıyı açan yöneticinin oturumunda kod çalıştırırdı — çok kiracılı
// panelde ayrıcalık yükseltmeye giden bir stored-XSS yolu.
//
// NOT: `sanitize.js`'in diğer dışa açılanı (`sanitizeHtml`) DOMPurify'a
// bağlı ve tarayıcı DOM'u istiyor; bu test yalnız saf olan `safeExternalUrl`
// fonksiyonunu içe aktarmıyor — modülün tamamı yükleniyor, ama DOMPurify
// import'u Node'da yan etkisiz olduğu için sorun çıkmıyor.

import assert from "node:assert/strict";
import test from "node:test";

import { safeExternalUrl } from "../sanitize.js";

test("güvenli şemalar olduğu gibi geçiyor", () => {
  for (const url of [
    "https://cdn.istoc.com/etiket.pdf",
    "http://192.168.1.10/pod.jpg",
    "/files/irsaliye.pdf",
    "/private/files/imza.png",
    "mailto:destek@istoc.com",
    "tel:+902121234567",
    "HTTPS://BUYUK.HARF/x.pdf",
  ]) {
    assert.equal(safeExternalUrl(url), url, `${url} engellendi`);
  }
});

test("kod çalıştıran şemalar REDDEDİLİYOR", () => {
  for (const url of [
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "  javascript:alert(1)  ", // baştaki boşlukla atlatma
    "java\tscript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
  ]) {
    assert.equal(safeExternalUrl(url), null, `${url} GEÇTİ — XSS açığı`);
  }
});

test("protokol-göreli URL ve TERS BÖLÜ varyantları reddediliyor", () => {
  // WHATWG URL ayrıştırıcısı ters bölüyü eğik çizgiye normalize ediyor:
  // `new URL("/\\evil.com", "https://panel.istoc.com/x/y").href` → "https://evil.com/".
  // Yalnız `//` elenirse bu iki biçim kök-göreli sanılıp geçer ve açık
  // yönlendirme olur — operatör iç belge sandığı bağlantıyla dış siteye gider.
  for (const url of [
    "//evil.com/x.pdf",
    "//evil.com",
    "/\\evil.com",
    "/\\\\evil.com",
    "\\\\evil.com",
    "\\/evil.com",
    "  //evil.com  ",
    // GÖMÜLÜ KONTROL KARAKTERİ: WHATWG ayrıştırıcısı tab/LF/CR'yi dizenin
    // her yerinden ayrıştırmadan ÖNCE siliyor. `.trim()` yalnız uçları alır,
    // araya gömülen kalırdı ve `/<TAB>/evil.com` kök-göreli dalından geçip
    // tarayıcıda `https://evil.com/` olurdu.
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r/evil.com",
    "/\t\\evil.com",
    "/\t\t//evil.com",
  ]) {
    assert.equal(safeExternalUrl(url), null, `${JSON.stringify(url)} GEÇTİ — açık yönlendirme`);
  }
});

test("gömülü kontrol karakteri ŞEMA gizlemeye de yaramıyor", () => {
  for (const url of [
    "java\tscript:alert(1)",
    "java\nscript:alert(1)",
    "\u0000javascript:alert(1)",
  ]) {
    assert.equal(safeExternalUrl(url), null, `${JSON.stringify(url)} GEÇTİ — XSS`);
  }
});

test("temizlenmiş dize döndürülüyor — doğrulanan ile bağlanan AYNI", () => {
  // Denetim bir dizeyi onaylayıp `href`e başkası giderse koruma delinir.
  assert.equal(safeExternalUrl("https://istoc.com/a\tb.pdf"), "https://istoc.com/ab.pdf");
  assert.equal(safeExternalUrl("\t/files/a.pdf\n"), "/files/a.pdf");
});

test("tek eğik çizgili kök-göreli yollar hâlâ geçiyor", () => {
  // Ters bölü koruması meşru yolları elememeli.
  for (const url of ["/files/a.pdf", "/a", "/"]) {
    assert.equal(safeExternalUrl(url), url, `${url} yanlışlıkla engellendi`);
  }
});

test("boş ve tip dışı değerler null", () => {
  for (const bad of ["", "   ", null, undefined, 42, {}, [], true]) {
    assert.equal(safeExternalUrl(bad), null, `${JSON.stringify(bad)} null dönmedi`);
  }
});

test("baştaki/sondaki boşluk kırpılıyor ama şema korunuyor", () => {
  assert.equal(safeExternalUrl("  https://istoc.com/a.pdf  "), "https://istoc.com/a.pdf");
});
