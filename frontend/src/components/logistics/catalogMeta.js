// Katalog alan meta'sı → DataTable alan tanımı dönüşümü.
//
// Kaynak `src/mocks/logistics/_catalog-meta.json` ÜRETİLMİŞ bir dosyadır
// (tradehub_core/scripts/gen_logistics_types.py). Sütun listesi burada elle
// tutulmaz — sözleşme değişince ekran kendiliğinden uyar.

import catalogMeta from "@/mocks/logistics/_catalog-meta.json";

/** Sütun başlığı olarak gösterilmeyecek teknik alanlar. */
const HIDDEN_COLUMNS = new Set(["name"]);

/** Varsayılan olarak gizli — kullanıcı "Sütunlar" panelinden açabilir. */
const DEFAULT_HIDDEN = new Set(["modified", "creation"]);

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
 * Sözleşme alanlarını `useDataTable` alan tanımına çevirir.
 *
 * - Select alanları filtre kontrolü kazanır (seçenekler sözleşmeden)
 * - Aranabilir alanlar sıralanabilir işaretlenir
 * - `is_active` sütun olarak kalır ama rozet slotuyla render edilir
 */
export function catalogFieldsToTableFields(catalogKey) {
  const meta = getCatalogMeta(catalogKey);
  const filterable = new Set(meta.filters);

  return meta.list_fields
    .filter((field) => !HIDDEN_COLUMNS.has(field.name))
    .map((field) => ({
      key: field.name,
      label: humanize(field.name),
      sortable: meta.searchable.includes(field.name) || field.type === "Data",
      defaultHidden: DEFAULT_HIDDEN.has(field.name),
      ...(filterable.has(field.name) ? { filter: buildFilter(field) } : {}),
    }));
}

function buildFilter(field) {
  if (field.choices?.length) {
    return {
      type: "select",
      options: field.choices.map((value) => ({ value, label: value })),
    };
  }
  return { type: "text" };
}

/**
 * `provider_name` → `Provider name`.
 *
 * Geçici çözüm: gerçek etiketler i18n'e taşınmalı. Şimdilik alan adından
 * türetiliyor ki 10 katalog × ~8 sütun = 80 çeviri anahtarı Faz D'yi
 * bloklamasın. Faz E'de `logistics.field.<name>` anahtarlarına geçilecek.
 */
export function humanize(fieldName) {
  const text = fieldName.replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
