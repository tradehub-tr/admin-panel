import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AUDIO_EXTENSIONS,
  MEDIA_KINDS,
  kindOfExtension,
  kindOfFile,
  kindOfMime,
} from "../mediaKind.js";

/**
 * Panelin dosya türü kuralı (MOGEM-620 §15).
 *
 * NE ÖLÇÜLDÜ VE NEDEN:
 *   Kural iki yerde kopyalanmıştı ve ikisi de ses gelince yanlış cevap
 *   veriyordu — `useSellerMedia` `.mp3`'ü "image", `stores/media` "document"
 *   sayıyordu. Aynı dosya kütüphanede kırık küçük resim, yükleme kuyruğunda
 *   yanlış rozet olarak görünüyordu. Bu dosya birleştirilmiş kuralı sabitler.
 *
 *   Yakalayıcı dalların BİLEREK farklı olduğu da burada sabitleniyor:
 *   uzantı yolunda "image" (dosya adı elimizde, bilinmeyen uzantı panelde
 *   kaybolmasın), MIME yolunda "document" (tarayıcı MIME'ı boş verebilir ve
 *   o dosyaya önizleme çizmeye çalışmak kırık resim üretir).
 */

test("ses uzantıları audio döner", () => {
  for (const ext of AUDIO_EXTENSIONS) {
    assert.equal(kindOfExtension(ext), "audio", ext);
  }
});

test("tam dosya adı da çözülür", () => {
  assert.equal(kindOfExtension("podcast-bolum-3.mp3"), "audio");
  assert.equal(kindOfExtension("/files/ab/9f2c.flac"), "audio");
});

test("büyük harf ve nokta önemsiz", () => {
  assert.equal(kindOfExtension(".MP3"), "audio");
  assert.equal(kindOfExtension("WAV"), "audio");
});

test("video ve belge doğru kalıyor — ses eklemesi onları bozmadı", () => {
  assert.equal(kindOfExtension("mp4"), "video");
  assert.equal(kindOfExtension("mov"), "video");
  assert.equal(kindOfExtension("pdf"), "document");
  assert.equal(kindOfExtension("xlsx"), "document");
  assert.equal(kindOfExtension("png"), "image");
  assert.equal(kindOfExtension("webp"), "image");
});

test("bilinmeyen uzantı image'e düşer — panelde kaybolmasın", () => {
  assert.equal(kindOfExtension("bilinmeyen"), "image");
  assert.equal(kindOfExtension(""), "image");
  assert.equal(kindOfExtension(null), "image");
});

test("MIME yolu ses tanır", () => {
  assert.equal(kindOfMime("audio/mpeg"), "audio");
  assert.equal(kindOfMime("audio/flac"), "audio");
  assert.equal(kindOfMime("image/png"), "image");
  assert.equal(kindOfMime("video/mp4"), "video");
});

test("MIME yakalayıcısı document — uzantı yakalayıcısından BİLEREK farklı", () => {
  assert.equal(kindOfMime(""), "document");
  assert.equal(kindOfMime("application/octet-stream"), "document");
  // Aynı belirsizlik uzantı yolunda image'e düşer; ikisi aynı olsaydı biri
  // yanlış olurdu.
  assert.notEqual(kindOfMime(""), kindOfExtension(""));
});

test("dosya nesnesi: MIME varsa ondan", () => {
  assert.equal(kindOfFile({ type: "audio/mpeg", name: "x.bin" }), "audio");
});

test("dosya nesnesi: MIME boşsa addan — .opus/.flac tarayıcıda boş gelebiliyor", () => {
  assert.equal(kindOfFile({ type: "", name: "kayit.opus" }), "audio");
  assert.equal(kindOfFile({ type: "", name: "kayit.flac" }), "audio");
  // Yalnız MIME'a bakan eski davranış bunları "document" yapardı:
  assert.notEqual(kindOfFile({ type: "", name: "kayit.opus" }), kindOfMime(""));
});

test("dosya nesnesi: boş/eksik girdi patlamaz", () => {
  assert.equal(kindOfFile(null), "image");
  assert.equal(kindOfFile({}), "image");
});

test("MEDIA_KINDS ses içeriyor ve filtre sırası kararlı", () => {
  assert.ok(MEDIA_KINDS.includes("audio"));
  assert.deepEqual([...MEDIA_KINDS], ["image", "video", "audio", "document"]);
});

test("hiçbir uzantı iki türe birden düşmez", () => {
  const gorulen = new Map();
  for (const ext of AUDIO_EXTENSIONS) {
    const tur = kindOfExtension(ext);
    assert.ok(!gorulen.has(ext), `${ext} yinelenmiş`);
    gorulen.set(ext, tur);
  }
  assert.equal(new Set(gorulen.values()).size, 1, "ses uzantılarının hepsi audio olmalı");
});
