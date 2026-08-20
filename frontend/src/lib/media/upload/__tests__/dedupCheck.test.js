import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  DEDUP_MAX_BYTES,
  DEDUP_METHOD,
  REASON_DUPLICATE,
  duplicateFinding,
  findDuplicateInLibrary,
  sha256Hex,
} from "../dedupCheck.js";
import { SEVERITY, hasBlocker } from "../preflight.js";

/**
 * Tekilleştirme ön kontrolü (T-042).
 *
 *   ÖLÇÜLÜR  — hash'in Node'un referans SHA-256'sıyla birebir aynı olduğu
 *              (sunucu bu hex'ten dosya adresi türetiyor; tek bit sapma
 *              eşleşmeyi sessizce öldürür), ucun doğru adla ve doğru
 *              parametreyle çağrıldığı, `{message: …}` sargısının açıldığı,
 *              HER başarısızlık yolunun fail-open olduğu (uyarı yardımcısı
 *              yüklemeyi asla durdurmaz) ve bulgunun `hasBlocker`'a göre
 *              ENGEL SAYILMADIĞI.
 *   ÖLÇÜLMEZ — gerçek sunucu (uç sahte; kiracı izolasyonu backend'de
 *              `tests/test_media_dedup_endpoint.py` ile ölçülüyor) ve
 *              kuyruk/ekran entegrasyonu (useMediaUpload → UploadQueueRow).
 */

const ICERIK = "istoc-dedup-t042 içerik — ölçüm baytları";

function nodeSha256(text) {
  return createHash("sha256").update(text, "utf-8").digest("hex");
}

test("sha256Hex Node'un referans SHA-256'sı ile birebir aynı", async () => {
  const hex = await sha256Hex(new Blob([ICERIK]));
  assert.equal(hex, nodeSha256(ICERIK));
  assert.match(hex, /^[0-9a-f]{64}$/);
});

test("sha256Hex boş içerikte de doğru (bilinen vektör)", async () => {
  // sha256("") — sabit, ezbere değil hesapla:
  assert.equal(await sha256Hex(new Blob([])), nodeSha256(""));
});

test("sha256Hex WebCrypto yoksa null döner (fail-open)", async () => {
  assert.equal(await sha256Hex(new Blob([ICERIK]), { subtle: null }), null);
});

test("eşleşme: uç doğru adla/parametreyle çağrılır, {message} sargısı açılır", async () => {
  const beklenenSha = nodeSha256(ICERIK);
  const cagrilar = [];
  const eslesme = {
    file_url: "/files/ab/abc123.jpg",
    file_name: "urun-gorseli.jpg",
    uploaded_at: "2026-08-01 10:00:00",
  };
  const sonuc = await findDuplicateInLibrary(new Blob([ICERIK]), {
    call: async (method, args) => {
      cagrilar.push([method, args]);
      return { message: { found: true, file: eslesme } };
    },
  });
  assert.equal(cagrilar.length, 1);
  assert.equal(cagrilar[0][0], DEDUP_METHOD);
  assert.deepEqual(cagrilar[0][1], { sha256: beklenenSha });
  assert.deepEqual(sonuc, { sha256: beklenenSha, ...eslesme });
});

test("sargısız gövde de kabul edilir (test/stub yolu)", async () => {
  const sonuc = await findDuplicateInLibrary(new Blob([ICERIK]), {
    call: async () => ({ found: true, file: { file_url: "/files/x", file_name: "x" } }),
  });
  assert.equal(sonuc?.file_url, "/files/x");
});

test("eşleşme yoksa null", async () => {
  const sonuc = await findDuplicateInLibrary(new Blob([ICERIK]), {
    call: async () => ({ message: { found: false, file: null } }),
  });
  assert.equal(sonuc, null);
});

test("fail-open: uç hata fırlatırsa null, istisna SIZMAZ", async () => {
  const sonuc = await findDuplicateInLibrary(new Blob([ICERIK]), {
    call: async () => {
      throw new Error("ağ düştü");
    },
  });
  assert.equal(sonuc, null);
});

test("fail-open: `call` verilmemişse null", async () => {
  assert.equal(await findDuplicateInLibrary(new Blob([ICERIK]), {}), null);
});

test("tavan üstü dosyada kontrol ATLANIR — ne hash ne istek", async () => {
  let cagrildi = 0;
  const dev = {
    size: DEDUP_MAX_BYTES + 1,
    arrayBuffer() {
      throw new Error("tavan üstü dosya BELLEĞE ALINMAMALI");
    },
  };
  const sonuc = await findDuplicateInLibrary(dev, {
    call: async () => {
      cagrildi += 1;
      return { found: true, file: {} };
    },
  });
  assert.equal(sonuc, null);
  assert.equal(cagrildi, 0);
});

test("boş dosyada kontrol atlanır", async () => {
  assert.equal(
    await findDuplicateInLibrary(new Blob([]), { call: async () => ({ found: true, file: {} }) }),
    null
  );
});

test("bulgu UYARIDIR, ENGEL DEĞİL — gerçek `hasBlocker` kapısına göre", () => {
  const bulgu = duplicateFinding({ file_name: "urun.jpg", file_url: "/files/ab/x.jpg" });
  assert.equal(bulgu.reason, REASON_DUPLICATE);
  assert.equal(bulgu.severity, SEVERITY.WARN);
  assert.notEqual(bulgu.severity, SEVERITY.BLOCK);
  // Kuyruğun engel kararını veren GERÇEK fonksiyon bu bulguyla "engel yok" demeli.
  assert.equal(hasBlocker([bulgu]), false);
});

test("bulgu adı: file_name öncelikli, yoksa file_url", () => {
  assert.equal(duplicateFinding({ file_name: "a.jpg", file_url: "/f/u" }).params.name, "a.jpg");
  assert.equal(duplicateFinding({ file_url: "/f/u" }).params.name, "/f/u");
  assert.equal(duplicateFinding(null).params.name, "");
});
