// Katalog kaydetme YÜKÜNÜ sözleşmeye göre süzer — saf mantık, import yok.
//
// NEDEN AYRI DOSYA:
//   `catalogMeta.js` üretilmiş sözleşmeyi `@/mocks/...` alias'ıyla import
//   ediyor; `node --test` alias çözemediği için o dosya testten görünmüyor.
//   Süzme kuralı buraya alındı: test GERÇEK kodu çağırıyor ve sözleşme
//   dosyasını kendisi okuyarak canlı şekle karşı doğruluyor. Sözleşme-yüzü
//   (`pickWritableValues(catalogKey, draft)`) `catalogMeta.js`'te duruyor.
//
// NEDEN VAR — ÖLÇÜLMÜŞ GERÇEK:
//   Form draft'ı `get_catalog_item` yanıtından doğuyor ve o yanıt kaydın
//   `name`'ini de İÇERİYOR. Draft aynen geri gönderilince backend
//   `417 + VALIDATION_ERROR: "… kataloğunda yazılamayan alan(lar): name"`
//   diyor ve HİÇBİR kayıt yapılamıyordu. `name` bir kimlik, alan değil:
//   ayrı bir parametre olarak zaten gidiyor.
//
// SÖZLEŞME (backend `logistics_catalog._apply_values` ile birebir):
//   yazılabilir = list_fields ∪ detail_fields ∪ child_tables.keys() − {"name"}
//   Alt tablo satırında yazılabilir = o tablonun kendi alan adları.
//   Bilinmeyen tek bir anahtar TÜM isteği reddettiriyor — bu yüzden süzgeç
//   beyaz liste, kara liste DEĞİL: yarın sözleşmeye eklenen bir teknik alan
//   (`owner`, `docstatus`, `idx`…) kaydetmeyi yeniden kırmasın.

/** Kimlik alanı — değer değil; `update_catalog_item`'a ayrı parametre gider. */
const IDENTITY_FIELD = "name";

/** Meta bloğundan alan adı kümesi çıkarır. */
function fieldNames(fields) {
  return (fields ?? []).map((field) => field?.name).filter((name) => typeof name === "string");
}

/**
 * Bir kataloğun yazılabilir ÜST SEVİYE alan adları.
 *
 * @param {object} meta `_catalog-meta.json` içindeki tek katalog bloğu.
 * @returns {Set<string>}
 */
export function writableFieldNames(meta) {
  const names = new Set([
    ...fieldNames(meta?.list_fields),
    ...fieldNames(meta?.detail_fields),
    ...Object.keys(meta?.child_tables ?? {}),
  ]);
  names.delete(IDENTITY_FIELD);
  return names;
}

/** Bir satır nesnesini verilen alan kümesine indirger. */
function pickRow(row, allowed) {
  const out = {};
  if (!row || typeof row !== "object") return out;
  for (const [key, value] of Object.entries(row)) {
    if (allowed.has(key)) out[key] = value;
  }
  return out;
}

/**
 * Draft'ı sözleşmenin yazılabilir alanlarına indirger.
 *
 * Değerlere DOKUNMAZ (tip çevirmez, boşları atmaz): boş string ile `null`
 * arasındaki fark backend'in kararı, süzgecin değil. Yalnız anahtar seçer.
 *
 * @param {object} meta Katalog meta bloğu.
 * @param {object} draft Form draft'ı.
 * @returns {object} Gönderilebilir `values` yükü.
 */
export function pickWritable(meta, draft) {
  const allowed = writableFieldNames(meta);
  const childTables = meta?.child_tables ?? {};
  const values = {};

  if (!draft || typeof draft !== "object") return values;

  for (const [key, value] of Object.entries(draft)) {
    if (!allowed.has(key)) continue;

    if (key in childTables) {
      // Alt tablo satırları backend'den temiz geliyor ama `ChildTable`
      // bileşeni ya da ileride bir kopyala/yapıştır akışı `name`/`parent`/
      // `parentfield` gibi Frappe teknik alanlarını taşıyabilir.
      const rowFields = new Set(fieldNames(childTables[key]));
      values[key] = Array.isArray(value) ? value.map((row) => pickRow(row, rowFields)) : [];
      continue;
    }

    values[key] = value;
  }

  return values;
}
