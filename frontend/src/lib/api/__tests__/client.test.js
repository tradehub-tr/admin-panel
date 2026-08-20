import assert from "node:assert/strict";
import { test } from "node:test";

import { createMediaApi } from "../client.ts";

/**
 * Tipli istemcinin ÖRNEK TÜKETİMİ + davranış sözleşmesi.
 *
 *   ÖLÇÜLÜR  — istemcinin `utils/api.js` taşımasına indirdiği (uç adı,
 *              GET/POST seçimi, parametreler) ve Frappe zarfını açtığı.
 *              Taşıma SAHTE: `utils/api.js` modül yüklenirken
 *              `import.meta.env` okuduğu için Node altında yüklenemez —
 *              istemcinin taşıma enjeksiyonu tam bu yüzden var.
 *   ÖLÇÜLMEZ — gerçek HTTP davranışı (CSRF, 401, zarf dışı hatalar).
 *              O `utils/api.js`in işi ve canlı ölçümü
 *              `contract.live.test.js`te.
 *
 * Sahte yanıt ŞEKİLLERİ uydurma değil: 2026-08-20 canlı ölçümlerinden
 * (openapi-http.yaml `x-measurement` alanları) alındı.
 */

function fakeTransport(log) {
  return {
    async callMethod(method, args) {
      log.push({ via: "POST", method, args });
      return log.next;
    },
    async callMethodGET(method, args) {
      log.push({ via: "GET", method, args });
      return log.next;
    },
  };
}

test("GET ucu: doğru uç adı + parametreler taşımaya iner, zarf açılır", async () => {
  const log = [];
  // Canlı ölçüm 2026-08-20: find_in_my_library → {found: false, file: null}
  log.next = { message: { found: false, file: null } };
  const api = createMediaApi(fakeTransport(log));

  const sonuc = await api.findInMyLibrary({ sha256: "a".repeat(64) });

  assert.equal(log.length, 1);
  assert.deepEqual({ ...log[0] }, {
    via: "GET",
    method: "tradehub_core.api.seller_media.find_in_my_library",
    args: { sha256: "a".repeat(64) },
  });
  // Zarf AÇILMIŞ olmalı — çağıran `message`i değil gövdeyi görür.
  assert.deepEqual(sonuc, { found: false, file: null });
});

test("POST ucu: yazma uçları callMethod'a (CSRF'li yol) iner", async () => {
  const log = [];
  // Canlı ölçüm 2026-08-20: create_folder → {name, folder_name, parent_folder}
  log.next = { message: { name: "qj5f5qmmtc", folder_name: "x", parent_folder: "" } };
  const api = createMediaApi(fakeTransport(log));

  const klasor = await api.createFolder({ folder_name: "x" });

  assert.equal(log[0].via, "POST");
  assert.equal(log[0].method, "tradehub_core.api.seller_media.create_folder");
  assert.equal(klasor.name, "qj5f5qmmtc");
});

test("dosya bazlı manifest_batch: null girdiler (erişilemeyen adres) tipte de gövdede de yaşar", async () => {
  const log = [];
  // Canlı ölçüm 2026-08-20: erişilemeyen adres null döner, hata DEĞİL.
  log.next = {
    message: {
      manifests: { "/files/var.webp": null },
      requested: 1,
      returned: 0,
      max_batch: 100,
    },
  };
  const api = createMediaApi(fakeTransport(log));

  const gov = await api.manifestBatch({ file_urls: JSON.stringify(["/files/var.webp"]) });

  assert.equal(gov.max_batch, 100);
  assert.equal(gov.manifests["/files/var.webp"], null);
});

test("parametresiz uç: taşımaya undefined gider, ekstra alan sızmaz", async () => {
  const log = [];
  // Canlı ölçüm 2026-08-20: list_folders → {folders: [], max_depth: 5}
  log.next = { message: { folders: [], max_depth: 5 } };
  const api = createMediaApi(fakeTransport(log));

  const gov = await api.listFolders();

  assert.equal(log[0].args, undefined);
  assert.equal(gov.max_depth, 5);
});
