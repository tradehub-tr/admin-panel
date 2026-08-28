/**
 * ListingFormView "Dokümanlar" bölümü — satır ekleme/kaldırma yardımcıları.
 *
 * `ListingFormView.vue` tek başına 5000+ satır ve bu dosyada `@vue/test-utils`
 * yok (proje `node:test` kullanıyor, bkz. `.claude/rules/workflow.md` §1.2) —
 * component'i tam mount etmeden bu mantığı doğrulamak için satır ekle/kaldır
 * mantığı ayrı, salt-JS bir modülde tutuluyor. `listing_images`'in
 * `galeriyeEkle`/`removeImageRow` deseniyle aynı: dosya ZATEN yüklü,
 * yalnız satır ekleniyor/çıkarılıyor.
 *
 * `DOC_TYPE_OPTIONS`/`LANGUAGE_OPTIONS` TEK KAYNAK: `Listing Document`
 * child DocType'ının (`tradehub_core/tradehub_core/tradehub_core/doctype/
 * listing_document/listing_document.json`) `doc_type`/`language` Select
 * seçenekleriyle birebir — panel formu ayrı bir liste biriktirmiyor.
 */

export const DOC_TYPE_OPTIONS = ["Katalog", "Sertifika", "Kılavuz", "Teknik Föy", "Diğer"];

export const LANGUAGE_OPTIONS = ["tr", "en", "ar", "ru", "diğer"];

/** Dosya adından uzantısız gövde — başlık ön-doldurma (kullanıcı sonra değiştirebilir). */
export function titleFromFileName(fileNameOrUrl) {
  const ad = (fileNameOrUrl || "").split("/").pop() || "";
  const nokta = ad.lastIndexOf(".");
  return nokta > 0 ? ad.slice(0, nokta) : ad;
}

/** Yeni bir `Listing Document` satır taslağı. */
export function createDocumentRow(fileUrl, fileName = "") {
  return {
    file: fileUrl,
    title: titleFromFileName(fileName || fileUrl),
    doc_type: "",
    language: "tr",
  };
}

/**
 * Yüklenmiş/kütüphaneden seçilmiş dosyaları satır dizisine ekler (mutasyon).
 *
 * `files`: dizge (yalnız URL) veya `{url, name}` nesnelerinden oluşan dizi —
 * MediaPickButton `@select` çıktısı çıplak URL(ler) verir, doğrudan yükleme
 * yolu `{url, name}` verir (başlık ön-doldurma dosya adından gelsin diye).
 * Boş/URL'siz girdiler sessizce atlanır.
 */
export function appendDocumentRows(rows, files) {
  const eklenen = [];
  for (const dosya of files || []) {
    const url = typeof dosya === "string" ? dosya : dosya?.url;
    if (!url) continue;
    const ad = typeof dosya === "string" ? "" : dosya?.name || "";
    const satir = createDocumentRow(url, ad);
    rows.push(satir);
    eklenen.push(satir);
  }
  return eklenen;
}

/** Satırı kaldır — `removeImageRow` deseniyle aynı. */
export function removeDocumentRow(rows, idx) {
  rows.splice(idx, 1);
}
