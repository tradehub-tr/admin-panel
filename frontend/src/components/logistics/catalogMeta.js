// Katalog alan meta'sı → DataTable alan tanımı dönüşümü.
//
// Kaynak `src/mocks/logistics/_catalog-meta.json` ÜRETİLMİŞ bir dosyadır
// (tradehub_core/scripts/gen_logistics_types.py). Sütun listesi burada elle
// tutulmaz — sözleşme değişince ekran kendiliğinden uyar.

import catalogMeta from "@/mocks/logistics/_catalog-meta.json";

import { pickWritable } from "./catalogWritableFields";

/** Sütun başlığı olarak gösterilmeyecek teknik alanlar. */
const HIDDEN_COLUMNS = new Set(["name"]);

/** Varsayılan olarak gizli — kullanıcı "Sütunlar" panelinden açabilir. */
const DEFAULT_HIDDEN = new Set(["modified", "creation"]);

/** Sayısal `<input type="number">` isteyen sözleşme tipleri. */
const NUMERIC_TYPES = new Set(["Int", "Float", "Currency"]);

export function getCatalogMeta(catalogKey) {
  const meta = catalogMeta.catalogs[catalogKey];
  if (!meta) {
    // Sessizce boş tablo göstermek yerine görünür hata — yanlış anahtar
    // yazıldığında "kayıt yok" sanılmasın.
    throw new Error(
      `Bilinmeyen katalog: ${catalogKey}. Geçerli: ${Object.keys(catalogMeta.catalogs).join(", ")}`
    );
  }
  return meta;
}

/**
 * Katalog sayfa başlığı — `doctypeNames.<DocType>` üzerinden.
 *
 * Anahtar DocType adına bağlı (katalog anahtarına değil): `doctypeNames`
 * bloğu panelin genelinde DocType adıyla anahtarlanıyor
 * (`DocTypeListView.vue`), lojistik katalogları için ayrı bir sözlük
 * açmak aynı ismi iki yerde tutardı.
 *
 * @param {string} catalogKey `shipping_channel` gibi katalog anahtarı.
 * @param {(key: string) => string} [t] vue-i18n `t`.
 * @param {(key: string) => boolean} [te] vue-i18n `te`.
 * @returns {string} Çeviri yoksa `humanize(catalogKey)`.
 */
export function catalogTitle(catalogKey, t, te) {
  const meta = getCatalogMeta(catalogKey);
  const key = `doctypeNames.${meta.doctype}`;
  if (t && te && te(key)) return t(key);
  return humanize(catalogKey);
}

/**
 * Alan etiketi — üç kademeli çözümleme.
 *
 * 1. `logistics.catalog.<catalogKey>.field.<fieldName>` — aynı alan adının
 *    bir katalogda başka anlama geldiği İSTİSNA durumlar için.
 * 2. `logistics.field.<fieldName>` — paylaşılan sözlük (normal yol).
 * 3. `humanize(fieldName)` — çeviri hiç yoksa. Sözleşme dosyası üretilmiş
 *    olduğu için yarın eklenen bir alan çeviri gelene kadar en azından
 *    okunabilir kalır; `catalogI18nCoverage.test.js` eksiği CI'da yakalar.
 *
 * @param {string} catalogKey Katalog anahtarı.
 * @param {string} fieldName DocType alan adı.
 * @param {(key: string) => string} [t] vue-i18n `t`.
 * @param {(key: string) => boolean} [te] vue-i18n `te`.
 * @returns {string}
 */
export function fieldLabel(catalogKey, fieldName, t, te) {
  if (t && te) {
    const specific = `logistics.catalog.${catalogKey}.field.${fieldName}`;
    if (te(specific)) return t(specific);
    const shared = `logistics.field.${fieldName}`;
    if (te(shared)) return t(shared);
  }
  return humanize(fieldName);
}

/**
 * Sözleşme alanlarını `useDataTable` alan tanımına çevirir.
 *
 * - Select alanları filtre kontrolü kazanır (seçenekler sözleşmeden)
 * - Aranabilir alanlar sıralanabilir işaretlenir
 * - `is_active` sütun olarak kalır ama rozet slotuyla render edilir
 *
 * `t`/`te` geçilmezse etiketler `humanize()`'a düşer — çağıranlar i18n'e
 * ayrı ayrı taşınabilsin diye imza geriye dönük uyumlu bırakıldı.
 *
 * @param {string} catalogKey Katalog anahtarı.
 * @param {(key: string) => string} [t] vue-i18n `t`.
 * @param {(key: string) => boolean} [te] vue-i18n `te`.
 */
export function catalogFieldsToTableFields(catalogKey, t, te) {
  const meta = getCatalogMeta(catalogKey);
  const filterable = new Set(meta.filters);

  return meta.list_fields
    .filter((field) => !HIDDEN_COLUMNS.has(field.name))
    .map((field) => ({
      key: field.name,
      label: fieldLabel(catalogKey, field.name, t, te),
      sortable: meta.searchable.includes(field.name) || field.type === "Data",
      defaultHidden: DEFAULT_HIDDEN.has(field.name),
      ...(filterable.has(field.name) ? { filter: buildFilter(field) } : {}),
    }));
}

/**
 * Sözleşme alanı → `useDataTable` filtre tanımı.
 *
 * Anahtar `variant` — `type` DEĞİL. `DtFilterControl` `field.filter.variant`
 * okuyor (`useDataTable` JSDoc'undaki sözleşme de öyle); burada `type`
 * üretildiği sürece kontrol hiçbir dala girmiyor ve boş çiziliyordu.
 */
function buildFilter(field) {
  if (field.choices?.length) {
    return {
      variant: "select",
      options: field.choices.map((value) => ({ value, label: value })),
    };
  }
  return { variant: "text" };
}

// ---------------------------------------------------------------------------
// Form ekranı — bölümler ve alt tablo sütunları
// ---------------------------------------------------------------------------

/**
 * Bölüm başlığı: `logistics.form.<suffix>` varsa çeviri, yoksa Türkçe metin.
 *
 * Fallback Türkçe: panelin varsayılan dili Türkçe ve bu iki anahtar
 * sözleşmeden değil elle geliyor — kaybolursa ekran boş başlık göstermesin.
 */
function sectionLabel(suffix, fallback, t, te) {
  const key = `logistics.form.${suffix}`;
  return t && te && te(key) ? t(key) : fallback;
}

/**
 * Sözleşme alanlarını form bölümlerine böler.
 *
 * NEDEN BURADA: bölümleme bir SUNUM kararı değil, sözleşme okuma kararı —
 * "liste alanları temel bilgi, detay alanları ayrı kart". Ekranın tek işi
 * render; liste yarısı (`catalogFieldsToTableFields`) zaten burada duruyordu,
 * form yarısı ekrandaydı ve aynı sözleşmeyi iki yerden okuyorduk.
 *
 * Her alanın etiketi ÖN-HESAPLANIR (`field.label`): ekran `v-for` içinde
 * `fieldLabel(...)` çağırırsa etiket her render'da yeniden çözülür
 * (vue-reactivity §2).
 *
 * Boş bölüm hiç döndürülmez — her katalogda detay alanı yok.
 *
 * @param {string} catalogKey Katalog anahtarı.
 * @param {(key: string, named?: object) => string} [t] vue-i18n `t`.
 * @param {(key: string) => boolean} [te] vue-i18n `te`.
 * @returns {Array<{id: string, label: string, fields: Array<object>}>}
 */
export function catalogFieldsToFormSections(catalogKey, t, te) {
  const meta = getCatalogMeta(catalogKey);
  const decorate = (fields) =>
    fields.map((field) => ({
      ...field,
      label: fieldLabel(catalogKey, field.name, t, te),
      // Seçenek listesi ve `<input type>` de ön-hesaplanır: ikisi de
      // template'te üretilseydi her render'da yeni dizi/karşılaştırma
      // doğardı ve `AppSelect` prop'u sürekli "değişmiş" görünürdü.
      choiceOptions: field.choices?.length
        ? field.choices.map((choice) => ({ value: choice, label: choice }))
        : null,
      inputType: NUMERIC_TYPES.has(field.type) ? "number" : "text",
    }));

  return [
    {
      id: "basic",
      label: sectionLabel("sectionBasic", "Temel Bilgiler", t, te),
      // `name` formda alan değil kimlik — başlıkta zaten görünüyor.
      fields: decorate(meta.list_fields.filter((field) => !HIDDEN_COLUMNS.has(field.name))),
    },
    {
      id: "details",
      label: sectionLabel("sectionDetails", "Detaylar", t, te),
      fields: decorate(meta.detail_fields ?? []),
    },
  ].filter((section) => section.fields.length > 0);
}

/**
 * Kaydetme yükünü sözleşmeye göre süzer.
 *
 * Form draft'ı `get_catalog_item` yanıtından doğuyor ve o yanıt kaydın
 * `name`'ini de içeriyor; draft aynen gönderilince backend
 * `VALIDATION_ERROR: "… yazılamayan alan(lar): name"` diyip TÜM isteği
 * reddediyordu. Kural ve gerekçe `catalogWritableFields.js`'te (saf modül —
 * bu dosya alias'lı JSON import ettiği için node:test'ten görünmüyor).
 *
 * @param {string} catalogKey Katalog anahtarı.
 * @param {object} draft Form draft'ı.
 * @returns {object} `create_catalog_item` / `update_catalog_item` `values` yükü.
 */
export function pickWritableValues(catalogKey, draft) {
  return pickWritable(getCatalogMeta(catalogKey), draft);
}

/** Alt tablo başlığı: kendi ad alanı → paylaşılan alan sözlüğü → humanize. */
export function childTableLabel(catalogKey, table, t, te) {
  const key = `logistics.childTable.${table}`;
  if (t && te && te(key)) return t(key);
  return fieldLabel(catalogKey, table, t, te);
}

/**
 * Sözleşme alanı → `ChildTable` sütunu.
 *
 * `ChildTable` `key`/`type` bekliyor (`fieldname`/`fieldtype` DEĞİL); eski
 * eşleme yüzünden hücreler `row[undefined]`'a bağlanıyor ve girilen değer
 * hiçbir alana yazılmıyordu.
 *
 * @param {string} catalogKey Katalog anahtarı.
 * @param {string} table Alt tablo alan adı (`carrier_services` gibi).
 * @param {(key: string) => string} [t] vue-i18n `t`.
 * @param {(key: string) => boolean} [te] vue-i18n `te`.
 * @returns {Array<{key: string, label: string, type: string, doctype: string, reqd: boolean}>}
 */
export function catalogChildTableColumns(catalogKey, table, t, te) {
  const fields = getCatalogMeta(catalogKey).child_tables?.[table] ?? [];

  return fields.map((field) => ({
    key: field.name,
    label: fieldLabel(catalogKey, field.name, t, te),
    type: childColumnType(field),
    doctype: field.link || "",
    reqd: Boolean(field.required),
  }));
}

/**
 * Alt tablo hücre tipi. `ChildTable` yalnız `link` / `number` / metin biliyor.
 *
 * `Check` → `number`: sözleşmede gerçekten Check alan var
 * (`shipping_method.carrier_services.is_preferred`) ve Frappe bunu 0/1
 * TAMSAYI taşıyor. `text` bırakıldığında kullanıcı "evet" yazıp kaydedebiliyor
 * ve backend validasyonuna takılıyordu. `ChildTable`'a checkbox tipi
 * eklendiğinde bu satır ona geçirilecek — ortak bileşen bu turda kapsam dışı.
 */
function childColumnType(field) {
  if (field.type === "Link") return "link";
  return ["Check", "Int", "Float", "Currency"].includes(field.type) ? "number" : "text";
}

/**
 * Backend enum değeri → görünen etiket.
 *
 * NEDEN ORTAK YARDIMCI: `t(\`${ns}.${value}\`)` yazan her çağrı backend'den
 * gelen ham değeri i18n anahtarına GÖMER. Değer beklenmedik bir şey olursa
 * (yeni enum üyesi, bozuk kayıt) vue-i18n eksik anahtarı ekrana ham basar —
 * yani sunucu verisi doğrudan arayüz metnine dönüşür. Burada `te()` kapısı
 * var: anahtar tanımlı değilse `humanize()` fallback'i devreye girer, ham
 * değer hiçbir zaman "çeviri" gibi görünmez.
 *
 * @param {string} ns Anahtar ad alanı, ör. `logistics.severity`.
 * @param {string} value Backend enum değeri.
 * @param {(key: string) => string} [t] vue-i18n `t`.
 * @param {(key: string) => boolean} [te] vue-i18n `te`.
 * @returns {string} Çeviri yoksa `humanize(value)`; değer boşsa boş string.
 */
export function enumLabel(ns, value, t, te) {
  if (!value) return "";
  const key = `${ns}.${value}`;
  if (t && te && te(key)) return t(key);
  return humanize(String(value));
}

/**
 * `provider_name` → `Provider name`.
 *
 * SON ÇARE FALLBACK — normal yol `fieldLabel()` / `catalogTitle()`.
 * Çeviri bulunamadığında ekranın boş kalmaması için duruyor.
 */
export function humanize(fieldName) {
  const text = fieldName.replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
