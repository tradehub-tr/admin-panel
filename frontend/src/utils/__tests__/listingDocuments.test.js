import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DOC_TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
  appendDocumentRows,
  createDocumentRow,
  removeDocumentRow,
  titleFromFileName,
} from "../listingDocuments.js";

/**
 * ListingFormView "Dokümanlar" bölümü — satır ekleme/kaldırma (Task 5).
 *
 * NE ÖLÇÜLDÜ — doğrudan yükleme yolunun ({url, name}) ve MediaPickButton'ın
 *              çıplak-URL seçiminin (string) İKİSİ de aynı satır şekline
 *              indirgendiği; boş/eksik girdilerin sessizce atlandığı;
 *              kaldırmanın doğru indeksi sildiği.
 * NE ÖLÇÜLMEDİ — Vue component mount'u / gerçek DOM etkileşimi (bu proje
 *              @vue/test-utils kullanmıyor, bkz. `.claude/rules/workflow.md`
 *              §1.2) — o yüzden mantık ListingFormView.vue'dan ayrı bir
 *              modülde tutuldu, burada saf JS olarak koşuluyor.
 */

test("titleFromFileName — uzantıyı düşürür, uzantısız/gizli dosyada adı bozmaz", () => {
  assert.equal(titleFromFileName("katalog-2026.pdf"), "katalog-2026");
  assert.equal(titleFromFileName("/files/urunler/sunum.pptx"), "sunum");
  assert.equal(titleFromFileName("uzantisiz"), "uzantisiz");
  assert.equal(titleFromFileName(""), "");
  assert.equal(titleFromFileName(undefined), "");
});

test("createDocumentRow — doc_type boş, language varsayılan tr, title dosya adından", () => {
  const row = createDocumentRow("/files/katalog.pdf", "katalog.pdf");
  assert.deepEqual(row, {
    file: "/files/katalog.pdf",
    title: "katalog",
    doc_type: "",
    language: "tr",
  });
});

test("appendDocumentRows — {url, name} nesneleriyle doğrudan yükleme yolu", () => {
  const rows = [];
  const eklenen = appendDocumentRows(rows, [
    { url: "/files/katalog.pdf", name: "katalog.pdf" },
    { url: "/files/sunum.pptx", name: "sunum.pptx" },
  ]);

  assert.equal(rows.length, 2);
  assert.equal(eklenen.length, 2);
  assert.equal(rows[0].file, "/files/katalog.pdf");
  assert.equal(rows[0].title, "katalog");
  assert.equal(rows[1].file, "/files/sunum.pptx");
  assert.equal(rows[1].title, "sunum");
});

test("appendDocumentRows — MediaPickButton'ın çıplak URL dizisiyle de çalışır", () => {
  const rows = [
    { file: "/files/mevcut.pdf", title: "mevcut", doc_type: "Katalog", language: "tr" },
  ];
  appendDocumentRows(rows, ["/files/yeni.docx"]);

  assert.equal(rows.length, 2);
  assert.equal(rows[1].file, "/files/yeni.docx");
  assert.equal(rows[1].title, "yeni");
  // Mevcut satır dokunulmadan kalır — mutasyon yalnız EKLEME yapıyor.
  assert.equal(rows[0].doc_type, "Katalog");
});

test("appendDocumentRows — URL'siz/boş girdiler sessizce atlanır", () => {
  const rows = [];
  const eklenen = appendDocumentRows(rows, [
    "",
    null,
    undefined,
    { name: "adressiz.pdf" },
    "/files/tek.pdf",
  ]);

  assert.equal(rows.length, 1);
  assert.equal(eklenen.length, 1);
  assert.equal(rows[0].file, "/files/tek.pdf");
});

test("appendDocumentRows — files boş/undefined olduğunda hiçbir şey eklemez", () => {
  const rows = [{ file: "/files/var.pdf" }];
  const eklenen = appendDocumentRows(rows, undefined);

  assert.equal(rows.length, 1);
  assert.deepEqual(eklenen, []);
});

test("removeDocumentRow — doğru indeksi kaldırır, diğerlerini korur", () => {
  const rows = [{ file: "/files/bir.pdf" }, { file: "/files/iki.pdf" }, { file: "/files/uc.pdf" }];
  removeDocumentRow(rows, 1);

  assert.deepEqual(
    rows.map((r) => r.file),
    ["/files/bir.pdf", "/files/uc.pdf"]
  );
});

test("DOC_TYPE_OPTIONS / LANGUAGE_OPTIONS — Listing Document DocType'ıyla birebir", () => {
  // `tradehub_core/tradehub_core/tradehub_core/doctype/listing_document/
  // listing_document.json`'daki Select `options` alanlarının aynısı — panel
  // ve backend AYRI liste biriktirmesin diye burada sabitlendi.
  assert.deepEqual(DOC_TYPE_OPTIONS, ["Katalog", "Sertifika", "Kılavuz", "Teknik Föy", "Diğer"]);
  assert.deepEqual(LANGUAGE_OPTIONS, ["tr", "en", "ar", "ru", "diğer"]);
});
