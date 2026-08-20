import assert from "node:assert/strict";
import test from "node:test";

import {
  extensionOf,
  isRetryable,
  needsChunking,
  precheck,
  setLimits,
  sniffDangerous,
} from "../uploadPolicy.js";

/**
 * İstemci ön kontrolü (TUR-123).
 *
 * Bu kontroller karar VERMEZ — sunucu her kuralı yeniden uyguluyor. Buradaki
 * testlerin işi, ön kontrolün sunucuyla AYNI cevabı verdiğini doğrulamak:
 * ayrışırlarsa kullanıcı ekranda kabul edilen dosyanın sunucuda reddedildiğini
 * görür.
 */

const SUNUCU_SINIRLARI = {
  extensions: [".jpg", ".png", ".pdf", ".zip", ".mp4"],
  media_extensions: [".jpg", ".png", ".pdf", ".mp4"],
  kinds: { ".jpg": "image", ".png": "image", ".pdf": "document", ".mp4": "video", ".zip": "other" },
  max_bytes: { image: 25 * 1048576, video: 25 * 1048576, document: 25 * 1048576, other: 25 * 1048576 },
  max_bytes_unknown: 25 * 1048576,
  single_shot_limit: 8 * 1048576,
  max_name: 140,
  denied_extensions: [".svg", ".html", ".js", ".xml"],
  retryable_codes: ["upload_chunk_order", "upload_chunk_missing"],
};

/** Tarayıcının `File` nesnesinin testte ihtiyaç duyulan kadarı. */
function sahteDosya(name, size, bas = "") {
  return {
    name,
    size,
    slice: () => ({ text: async () => bas }),
  };
}

test("uzantı ayıklama sunucunun kuralını birebir izliyor", () => {
  assert.equal(extensionOf("a.JPG"), ".jpg");
  assert.equal(extensionOf("arşiv.tar.GZ"), ".gz");
  assert.equal(extensionOf("uzantisiz"), "");
  assert.equal(extensionOf(""), "");
  // Baştaki nokta ad sayılır, uzantı ayıracı değil — sunucu da böyle yapıyor.
  assert.equal(extensionOf(".pdf"), "");
  assert.equal(extensionOf(" .pdf"), "");
  assert.equal(extensionOf("..pdf"), "");
  assert.equal(extensionOf(".gizli.pdf"), ".pdf");
});

test("sınırlar gelmeden ön kontrol karar vermiyor — sunucuya bırakıyor", async () => {
  setLimits(null);
  const r = await precheck(sahteDosya("a.exe", 999));
  assert.equal(r.ok, true);
  assert.equal(r.unchecked, true);
});

test("izin listesi dışındaki tür seçim anında reddediliyor", async () => {
  setLimits(SUNUCU_SINIRLARI);
  const r = await precheck(sahteDosya("virus.exe", 1000));
  assert.equal(r.ok, false);
  assert.equal(r.code, "upload_ext_not_allowed");
  assert.equal(r.params.ext, ".exe");
});

test("boyut sınırı türe göre uygulanıyor ve sebep parametreli dönüyor", async () => {
  setLimits(SUNUCU_SINIRLARI);
  const r = await precheck(sahteDosya("dev.jpg", 30 * 1048576));
  assert.equal(r.ok, false);
  assert.equal(r.code, "upload_too_large");
  assert.equal(r.params.limit, 25);
});

test("sınır değerinin tam üstü düşüyor, tam kendisi geçiyor", async () => {
  setLimits(SUNUCU_SINIRLARI);
  const tam = await precheck(sahteDosya("s.jpg", 25 * 1048576));
  const bir = await precheck(sahteDosya("s.jpg", 25 * 1048576 + 1));
  assert.equal(tam.ok, true);
  assert.equal(bir.ok, false);
});

test("boş dosya ve yol karakterli ad reddediliyor", async () => {
  setLimits(SUNUCU_SINIRLARI);
  assert.equal((await precheck(sahteDosya("a.jpg", 0))).code, "upload_content_empty");
  assert.equal((await precheck(sahteDosya("a/b.jpg", 10))).code, "upload_name_invalid");
  assert.equal((await precheck(sahteDosya("a\\b.jpg", 10))).code, "upload_name_invalid");
});

test("görsel adıyla gelen çalıştırılabilir içerik yakalanıyor", async () => {
  setLimits(SUNUCU_SINIRLARI);
  const svg = await precheck(sahteDosya("masum.jpg", 500, "<svg onload=alert(1)>"));
  assert.equal(svg.code, "upload_content_dangerous");
});

test("baştaki boşluk ve BOM ile tehlikeli içerik gizlenemiyor", async () => {
  assert.equal(await sniffDangerous({ slice: () => ({ text: async () => "   \n\t<svg/>" }) }), true);
  assert.equal(await sniffDangerous({ slice: () => ({ text: async () => "﻿<html>" }) }), true);
  assert.equal(await sniffDangerous({ slice: () => ({ text: async () => "<SCRIPT>" }) }), true);
  assert.equal(await sniffDangerous({ slice: () => ({ text: async () => "düz metin" }) }), false);
});

test("içerik okunamazsa ön kontrol karar vermiyor", async () => {
  const r = await sniffDangerous({
    slice: () => ({
      text: async () => {
        throw new Error("okunamadı");
      },
    }),
  });
  assert.equal(r, false);
});

test("tek parça eşiğinin üstündeki dosya parçalı gönderiliyor", () => {
  setLimits(SUNUCU_SINIRLARI);
  assert.equal(needsChunking({ size: 2 * 1048576 }), false);
  assert.equal(needsChunking({ size: 9 * 1048576 }), true);
});

test("sınırlar yokken parçalama denenmiyor", () => {
  setLimits(null);
  assert.equal(needsChunking({ size: 900 * 1048576 }), false);
});

test("[FR-060] politika reddi yeniden denenmiyor, geçici hata deneniyor", () => {
  setLimits(SUNUCU_SINIRLARI);
  assert.equal(isRetryable({ code: "upload_too_large", status: 417 }), false);
  assert.equal(isRetryable({ code: "upload_ext_not_allowed", status: 417 }), false);
  assert.equal(isRetryable({ code: "upload_chunk_missing", status: 417 }), true);
  assert.equal(isRetryable({ code: "", status: 500 }), true);
  assert.equal(isRetryable({ code: "", status: 429 }), true);
  assert.equal(isRetryable({ code: "", status: 403 }), false);
  assert.equal(isRetryable({}), true); // ağ kopması — durum kodu yok
});

test("yasak liste izin listesinden ÖNCE bakılıyor — sunucuyla aynı sebep", async () => {
  setLimits(SUNUCU_SINIRLARI);
  const svg = await precheck(sahteDosya("logo.svg", 1000));
  assert.equal(svg.code, "upload_ext_denied");
  const html = await precheck(sahteDosya("sayfa.html", 1000));
  assert.equal(html.code, "upload_ext_denied");
  // İzin listesinde de olmayan ama yasak da olmayan tür farklı kod alır.
  const exe = await precheck(sahteDosya("x.exe", 1000));
  assert.equal(exe.code, "upload_ext_not_allowed");
});

test("yalnız boşluktan oluşan ad sunucuyla aynı sebeple reddediliyor", async () => {
  setLimits(SUNUCU_SINIRLARI);
  assert.equal((await precheck(sahteDosya("   ", 500))).code, "upload_name_required");
  assert.equal((await precheck(sahteDosya(".", 500))).code, "upload_name_invalid");
  assert.equal((await precheck(sahteDosya("..", 500))).code, "upload_name_invalid");
  // Boşluk kırpıldıktan sonra geçerli olan ad kabul edilmeli.
  assert.equal((await precheck(sahteDosya("  urun.jpg  ", 500))).ok, true);
});
