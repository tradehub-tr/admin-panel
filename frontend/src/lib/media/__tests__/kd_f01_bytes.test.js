/**
 * KD-F01 — İstemci tarafı bayt sezgisi (`lib/media/upload/bytes.js`).
 *
 * Bu dosya sunucudaki `media/pipeline/core/probe.py` + `media/upload_policy.py`
 * sezgisinin TARAYICI İKİZİDİR. Denetimin asıl sorusu şu:
 *   "Aynı baytlar için istemci ile sunucu AYNI ŞEYİ mi söylüyor?"
 * Ayrıştıkları her nokta, kullanıcının panelde gördüğü sonuç ile yüklemenin
 * gerçek sonucunun farklı olması demektir.
 *
 * Koşum: npm test   (node --test "src/**\/*.test.js")
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isAnimated,
  isDangerous,
  readDimensions,
  readDpi,
  sniffSignature,
} from "../upload/bytes.js";

const bayt = (...parcalar) => {
  const liste = [];
  for (const p of parcalar) {
    if (typeof p === "string") for (const c of p) liste.push(c.charCodeAt(0));
    else if (Array.isArray(p) || ArrayBuffer.isView(p)) liste.push(...p);
    else liste.push(p);
  }
  return Uint8Array.from(liste);
};

const dolgu = (n, deger = 0) => Array.from({ length: n }, () => deger);

// Gerçek başlık kurguları — piksel gövdesi yok, sadece başlık.
const PNG = (w = 64, h = 48) =>
  bayt(
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    [0, 0, 0, 13],
    "IHDR",
    [(w >> 24) & 255, (w >> 16) & 255, (w >> 8) & 255, w & 255],
    [(h >> 24) & 255, (h >> 16) & 255, (h >> 8) & 255, h & 255],
    [8, 2, 0, 0, 0],
    dolgu(16)
  );

const GIF = (w = 37, h = 21, kareler = 1) => {
  const govde = [];
  for (let i = 0; i < kareler; i += 1) govde.push(0x21, 0xf9, 0x04, 0, 0, 0, 0, 0);
  return bayt("GIF89a", [w & 255, (w >> 8) & 255, h & 255, (h >> 8) & 255], [0, 0, 0], govde);
};

const JPEG = (w = 120, h = 80) =>
  bayt(
    [0xff, 0xd8, 0xff, 0xe0],
    [0x00, 0x10],
    "JFIF",
    [0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00],
    [0xff, 0xc0, 0x00, 0x11, 0x08],
    [(h >> 8) & 255, h & 255, (w >> 8) & 255, w & 255],
    dolgu(8),
    [0xff, 0xd9]
  );

const WEBP = (w = 77, h = 33) => {
  const bw = w - 1;
  const bh = h - 1;
  const bits = bw | (bh << 14);
  return bayt(
    "RIFF",
    [0, 0, 0, 0],
    "WEBP",
    "VP8L",
    [0, 0, 0, 0],
    [0x2f],
    [bits & 255, (bits >> 8) & 255, (bits >> 16) & 255, (bits >> 24) & 255],
    dolgu(8)
  );
};

describe("KD-F01/1 · sniffSignature", () => {
  it("bilinen imzaları tanır", () => {
    assert.equal(sniffSignature(JPEG()), "jpeg");
    assert.equal(sniffSignature(PNG()), "png");
    assert.equal(sniffSignature(GIF()), "gif");
    assert.equal(sniffSignature(WEBP()), "webp");
    assert.equal(sniffSignature(bayt("BM", dolgu(30))), "bmp");
    assert.equal(sniffSignature(bayt("%PDF-1.4", dolgu(20))), "pdf");
    assert.equal(sniffSignature(bayt([0x50, 0x4b, 0x03, 0x04], dolgu(20))), "zip");
    assert.equal(sniffSignature(bayt([0x1a, 0x45, 0xdf, 0xa3], dolgu(20))), "webm");
    assert.equal(sniffSignature(bayt(dolgu(4), "ftypisom", dolgu(8))), "mp4");
  });

  it("boş/kısa girdide patlamaz", () => {
    assert.equal(sniffSignature(null), "");
    assert.equal(sniffSignature(new Uint8Array(0)), "");
    for (let n = 1; n < 12; n += 1) {
      assert.equal(typeof sniffSignature(bayt(dolgu(n, 0xff))), "string");
    }
  });

  it("RIFF ama WEBP değilse (WAV) webp DEMEZ", () => {
    assert.equal(sniffSignature(bayt("RIFF", [0, 0, 0, 0], "WAVE", dolgu(16))), "");
  });

  it("%PDF+ftyp polyglotunda sunucu ile AYNI kararı veriyor (mp4)", () => {
    // `%PDF-` kalıbı beşinci baytta tire ister; polyglotta orada "f" var,
    // dolayısıyla iki taraf da `ftyp` kuralına düşüp "mp4" diyor. Parite VAR.
    assert.equal(sniffSignature(bayt("%PDF", "ftypisom", dolgu(40))), "mp4");
  });

  it("imza+ftyp çakışmasında SUNUCUYLA AYNI karar veriliyor", () => {
    // F-14 düzeltildi. Motor (`core/probe.sniff`) `content[4:8] == "ftyp"`
    // kontrolünü imza TABLOSUNDAN ÖNCE yapıyor; istemci de artık öyle.
    // Eskiden aynı baytlar panelde "BMP", sunucuda "video" görünüyordu.
    assert.equal(sniffSignature(bayt("BM", [0x00, 0x00], "ftypisom", dolgu(40))), "mp4");
    assert.equal(sniffSignature(bayt("PK", [0x03, 0x04], "ftypisom", dolgu(40))), "mp4");
    assert.equal(sniffSignature(bayt("II*", [0x00], "ftypisom", dolgu(40))), "mp4");
    // QuickTime markası ayrı tür — motor da öyle diyor.
    assert.equal(sniffSignature(bayt([0x00, 0x00, 0x00, 0x18], "ftypqt  ", dolgu(40))), "mov");
  });

  it("TEMİZ imzalar sıra değişikliğinden etkilenmiyor", () => {
    // Sıra düzeltmesi meşru dosyaları bozmamalı — asıl risk buydu.
    assert.equal(sniffSignature(bayt([0xff, 0xd8, 0xff], dolgu(40))), "jpeg");
    assert.equal(sniffSignature(bayt([0x89], "PNG\r\n", [0x1a, 0x0a], dolgu(40))), "png");
    assert.equal(sniffSignature(bayt("GIF89a", dolgu(40))), "gif");
    assert.equal(sniffSignature(bayt("BM", dolgu(40))), "bmp");
    assert.equal(sniffSignature(bayt("%PDF-", dolgu(40))), "pdf");
    assert.equal(sniffSignature(bayt("RIFF", dolgu(4), "WEBPVP8 ", dolgu(20))), "webp");
    assert.equal(sniffSignature(bayt([0x1a, 0x45, 0xdf, 0xa3], dolgu(40))), "webm");
  });

  it("çalıştırılabilir (MZ/ELF), data: URI ve SVG/XML ARTIK tanınıyor", () => {
    // F-15 düzeltildi. Motor bunlara "executable" / "data_uri" / "svg" diyor
    // ve kapıda REDDEDİYOR; istemci "bilinmiyor" dediği sürece ön kontrol
    // dosyayı tür olarak işaretleyemiyordu.
    assert.equal(sniffSignature(bayt("MZ", dolgu(64))), "executable");
    assert.equal(sniffSignature(bayt([0x7f], "ELF", dolgu(64))), "executable");
    assert.equal(sniffSignature(bayt("data:image/svg+xml;base64,AAAA")), "data_uri");
    assert.equal(sniffSignature(bayt("<svg xmlns='x'></svg>")), "svg");
    assert.equal(sniffSignature(bayt("<?xml version='1.0'?><rss></rss>")), "xml");
    // Kök `<?xml` olsa bile gövde SVG ise SVG — ayrım güvenlik kararını değiştirir.
    assert.equal(sniffSignature(bayt("<?xml version='1.0'?><svg xmlns='x'/>")), "svg");
  });

  it("çalıştırılabilir tanıma ftyp çakışmasında da KAZANIYOR", () => {
    // MZ + 4. bayttan `ftyp`: eskiden istemci "mp4" (zararsız video) diyordu.
    assert.equal(sniffSignature(bayt("MZ", [0x00, 0x00], "ftypisom", dolgu(40))), "executable");
  });
});

describe("KD-F01/2 · isDangerous", () => {
  it("tarayıcıda çalışabilir içerikleri yakalar", () => {
    for (const s of [
      "<!DOCTYPE html><html>",
      "<html><body>",
      "<svg xmlns='x'>",
      "<?xml version='1.0'?>",
      "<script>alert(1)</script>",
      "<% eval %>",
      "#!/bin/sh",
    ]) {
      assert.equal(isDangerous(bayt(s)), true, s);
    }
  });

  it("baştaki boşluk ve BOM ile atlatılamaz", () => {
    assert.equal(isDangerous(bayt("   \n\t<svg>")), true);
    assert.equal(isDangerous(bayt([0xef, 0xbb, 0xbf], "<script>x</script>")), true);
    assert.equal(isDangerous(bayt([0xef, 0xbb, 0xbf], "   ", "<html>")), true);
  });

  it("büyük/küçük harf duyarsız", () => {
    assert.equal(isDangerous(bayt("<SCRIPT>alert(1)</SCRIPT>")), true);
    assert.equal(isDangerous(bayt("<HtMl>")), true);
  });

  it("gerçek görselde yanlış pozitif üretmez", () => {
    assert.equal(isDangerous(JPEG()), false);
    assert.equal(isDangerous(PNG()), false);
    assert.equal(isDangerous(new Uint8Array(0)), false);
    assert.equal(isDangerous(null), false);
  });

  it("SINIR · işaretçi 512 baytın DIŞINDAYSA yakalanmaz (bilinen pencere)", () => {
    // Sözleşme: yalnız ilk 512 bayt taranıyor. Bu bir kaçış değil — sunucu
    // aynı dosyayı ayrıca denetliyor — ama pencerenin yeri sabitleniyor.
    const uzak = bayt(dolgu(600, 0x20), "<script>");
    assert.equal(isDangerous(uzak), false);
  });
});

describe("KD-F01/3 · isAnimated (üç durumlu)", () => {
  it("tek karelik GIF false, çok karelik true", () => {
    assert.equal(isAnimated(GIF(10, 10, 1)), false);
    assert.equal(isAnimated(GIF(10, 10, 3)), true);
  });

  it("APNG acTL IDAT'tan önceyse true", () => {
    const apng = bayt(
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      [0, 0, 0, 13],
      "IHDR",
      dolgu(13),
      dolgu(4),
      [0, 0, 0, 8],
      "acTL",
      dolgu(8),
      [0, 0, 0, 4],
      "IDAT",
      dolgu(8)
    );
    assert.equal(isAnimated(apng), true);
  });

  it("düz PNG false", () => {
    const p = bayt(PNG(), [0, 0, 0, 4], "IDAT", dolgu(8));
    assert.equal(isAnimated(p), false);
  });

  it("animasyonlu WebP (ANIM yığını) true", () => {
    assert.equal(
      isAnimated(bayt("RIFF", dolgu(4), "WEBP", "VP8X", dolgu(10), "ANIM", dolgu(8))),
      true
    );
  });

  it("ölçülemeyen tür null döner — false DEĞİL", () => {
    assert.equal(isAnimated(bayt(dolgu(4), "ftypavif", dolgu(16))), null);
    assert.equal(isAnimated(new Uint8Array(0)), null);
  });

  it("statik biçimlerde false", () => {
    assert.equal(isAnimated(JPEG()), false);
    assert.equal(isAnimated(bayt("BM", dolgu(30))), false);
  });
});

describe("KD-F01/4 · readDimensions", () => {
  it("PNG IHDR'den okur", () => {
    assert.deepEqual(readDimensions(PNG(1234, 567)), { width: 1234, height: 567 });
  });

  it("GIF mantıksal ekranından okur", () => {
    assert.deepEqual(readDimensions(GIF(37, 21)), { width: 37, height: 21 });
  });

  it("JPEG SOF0'dan okur", () => {
    assert.deepEqual(readDimensions(JPEG(320, 240)), { width: 320, height: 240 });
  });

  it("WebP lossless kanvasından okur", () => {
    assert.deepEqual(readDimensions(WEBP(77, 33)), { width: 77, height: 33 });
  });

  it("okunamayan biçimde null — 0 DEĞİL", () => {
    assert.equal(readDimensions(bayt("%PDF-1.4", dolgu(20))), null);
    assert.equal(readDimensions(new Uint8Array(0)), null);
  });

  it("bozuk/kısa başlıkta patlamaz", () => {
    for (const g of [bayt([0x89, 0x50]), bayt([0xff, 0xd8]), bayt("GIF89a"), bayt("RIFF")]) {
      const r = readDimensions(g);
      assert.ok(r === null || (typeof r.width === "number" && typeof r.height === "number"));
    }
  });

  it("BOMBA · 30000×30000 beyanı ÇÖZMEDEN okunur", () => {
    const bomba = PNG(30000, 30000);
    assert.deepEqual(readDimensions(bomba), { width: 30000, height: 30000 });
    assert.ok(bomba.length < 1000, "başlık okuması için gövde gerekmemeli");
  });
});

describe("KD-F01/5 · readDpi", () => {
  it("JFIF DPI'sını TEK SAYI olarak döner (x/y ayrımı yok)", () => {
    // Sözleşme farkı kayda geçiyor: sunucu `dpi=(x, y)` ikilisi tutuyor,
    // istemci tek bir sayı döndürüyor. Kare olmayan DPI istemcide temsil
    // edilemiyor — pratikte nadir ama sözleşme asimetrisi.
    assert.equal(readDpi(JPEG()), 72);
  });

  it("birim 0 (oransız) DPI anlamı taşımaz → null", () => {
    const oransiz = bayt(
      [0xff, 0xd8, 0xff, 0xe0],
      [0x00, 0x10],
      "JFIF",
      [0x00, 0x01, 0x01, 0x00, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00],
      dolgu(8)
    );
    assert.equal(readDpi(oransiz), null);
  });

  it("bilinmeyen biçimde null", () => {
    assert.equal(readDpi(bayt("%PDF-1.4", dolgu(20))), null);
    assert.equal(readDpi(new Uint8Array(0)), null);
  });
});
