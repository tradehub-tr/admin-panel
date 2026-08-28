import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * ListingFormView "Dokümanlar" bölümü (Task 5).
 *
 * Bu dosya, satır ekle/kaldır MANTIĞINI değil (bkz. `src/utils/__tests__/
 * listingDocuments.test.js` — o saf JS, gerçek testin çoğu orada), yalnız
 * ListingFormView.vue'nun bu mantığı GERÇEKTEN kablolarına doğru bağladığını
 * doğruluyor: `childData.documents` var mı, `loadDoc`/save akışına katılmış
 * mı, `MediaPickButton kind="document"` var mı. `ListingFormView.
 * onDemandSections.test.js` ile AYNI desen (kaynak string üstünde regex) —
 * proje `@vue/test-utils` kullanmıyor ve bu dosya 5000+ satır, tam mount
 * pratik değil (bkz. `.claude/rules/workflow.md` §1.2).
 */

const source = readFileSync(
  new URL("../ListingFormView.vue", import.meta.url),
  "utf8"
);

test("childData.documents child tablosu tanımlı", () => {
  assert.match(source, /const childData = reactive\(\{[\s\S]{0,200}documents: \[\],/);
});

test("loadDoc — Listing.documents child'ından childData.documents'e dolduruluyor", () => {
  assert.match(source, /childData\.documents = \(data\.documents \|\| \[\]\)\.map\(clean\);/);
});

test("REQUIRED_KEYS — Listing Document satırı file olmadan kaydedilmez", () => {
  assert.match(source, /"Listing Document":\s*\["file"\]/);
});

test("save — payload.documents prepareChildRows ile Listing Document olarak hazırlanıyor", () => {
  assert.match(
    source,
    /payload\.documents = prepareChildRows\(childData\.documents, "Listing Document"\);/
  );
});

test("addDocumentRows — api.uploadFile ile doğrudan yükleme (görsel sıkıştırma yolu DEĞİL)", () => {
  assert.match(source, /async function addDocumentRows\(event\)/);
  assert.match(
    source,
    /async function addDocumentRows[\s\S]{0,600}api\.uploadFile\(file\)/,
    "doküman yüklemesi doUpload (görsel→WebP dönüşümü) yerine doğrudan api.uploadFile kullanmalı"
  );
  assert.match(
    source,
    /async function addDocumentRows[\s\S]{0,700}appendDocumentRows\(childData\.documents/
  );
});

test("documentsFromLibrary — MediaPickButton seçimini childData.documents'e ekliyor", () => {
  assert.match(source, /function documentsFromLibrary\(urls\)/);
  assert.match(
    source,
    /function documentsFromLibrary[\s\S]{0,300}appendDocumentRows\(childData\.documents/
  );
});

test("removeDocRow — removeDocumentRow yardımcısını çağırıyor", () => {
  assert.match(
    source,
    /function removeDocRow\(idx\) \{\s*removeDocumentRow\(childData\.documents, idx\);/
  );
});

test("MediaPickButton kind=\"document\" — brief'in doküman desteği talimatı", () => {
  assert.match(source, /<MediaPickButton\s+kind="document"/);
});

test("direkt yükleme input'u .pptx dahil doküman uzantılarını kabul ediyor (koordinatör kararı)", () => {
  assert.match(source, /accept="\.pdf,\.doc,\.docx,\.xls,\.xlsx,\.pptx"/);
});

test("i18n — listingForm.documents* anahtarları template'te kullanılıyor", () => {
  for (const key of [
    "documentsTitle",
    "documentsHint",
    "documentsAddOrDrag",
    "documentsTitleLabel",
    "documentsType",
    "documentsLanguage",
    "documentsOpen",
    "documentsUploading",
    "documentsUploadFailed",
  ]) {
    assert.match(source, new RegExp(`listingForm\\.${key}`), `${key} template'te kullanılmıyor`);
  }
});

test("DOC_TYPE_OPTIONS / LANGUAGE_OPTIONS — @/utils/listingDocuments.js'ten içe aktarılıyor", () => {
  assert.match(
    source,
    /import \{\s*DOC_TYPE_OPTIONS,\s*LANGUAGE_OPTIONS,\s*appendDocumentRows,\s*removeDocumentRow,\s*\} from "@\/utils\/listingDocuments\.js";/
  );
});
