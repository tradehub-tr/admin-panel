// Katalog i18n kapsamı — üretilmiş sözleşmenin çeviriyi geçmesini engeller.
//
// NEDEN BU TEST VAR:
//   `src/mocks/logistics/_catalog-meta.json` ÜRETİLMİŞ bir dosya
//   (`tradehub_core/scripts/gen_logistics_types.py --sync`). Generator yarın
//   yeni bir alan eklediğinde katalog ekranları o alanı kendiliğinden sütun
//   olarak gösterir; çevirisi yoksa `catalogMeta.fieldLabel()` sessizce
//   `humanize()` fallback'ine düşer ve tamamen Türkçe bir panelde
//   "Handover point" yazar. Sessiz kayıp yerine kırmızı test.
//
// KAPSAM: her katalog için başlık (`doctypeNames`) + tekil ad
// (`logistics.catalogEntity`), her benzersiz alan için
// `logistics.field.<name>` — İKİ dilde de. `ar.js`/`ru.js` kapsam dışı:
// o dosyalarda `logistics` ad alanı hiç yok, `fallbackLocale: "en"` devrede.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import en from "../../../i18n/locales/en.js";
import tr from "../../../i18n/locales/tr.js";

const HERE = dirname(fileURLToPath(import.meta.url));

// JSON `import ... with { type: "json" }` yerine okuma: import attribute'u
// Node sürümleri arasında deneysel uyarı üretiyor, test çıktısını kirletiyor.
const catalogMeta = JSON.parse(
  readFileSync(join(HERE, "../../../mocks/logistics/_catalog-meta.json"), "utf8")
);

const CATALOGS = Object.entries(catalogMeta.catalogs);
const LOCALES = [
  ["tr", tr],
  ["en", en],
];

/** Sütun başlığı olmayan teknik alan — `catalogMeta.js` HIDDEN_COLUMNS ile aynı. */
const UNTRANSLATED_FIELDS = new Set(["name"]);

/**
 * Sözleşmedeki TÜM alan adları: liste + detay + alt tablolar.
 *
 * Yalnız `list_fields` bakmak yetmez — form ekranı `detail_fields`'i, grid
 * ise `child_tables`'ı da etiketliyor; eksik çeviri orada da sızar.
 */
function collectFieldNames() {
  const names = new Set();
  const add = (fields) => {
    for (const field of fields ?? []) {
      if (field?.name && !UNTRANSLATED_FIELDS.has(field.name)) names.add(field.name);
    }
  };

  for (const [, meta] of CATALOGS) {
    add(meta.list_fields);
    add(meta.detail_fields);
    for (const rows of Object.values(meta.child_tables ?? {})) add(rows);
  }
  return [...names].sort();
}

const FIELD_NAMES = collectFieldNames();

test("sözleşmeden alan adı çıkarılabiliyor", () => {
  // Şekil değişirse (generator `list_fields`'i yeniden adlandırırsa) aşağıdaki
  // kapsam testleri BOŞ kümede gezinip yeşil kalırdı — o yalanı burada kes.
  assert.ok(CATALOGS.length >= 10, `katalog sayısı beklenmedik: ${CATALOGS.length}`);
  assert.ok(FIELD_NAMES.length >= 60, `alan sayısı beklenmedik: ${FIELD_NAMES.length}`);
});

for (const [code, messages] of LOCALES) {
  test(`${code}: her katalogun DocType başlığı var`, () => {
    for (const [catalogKey, meta] of CATALOGS) {
      const label = messages.doctypeNames?.[meta.doctype];
      assert.ok(
        typeof label === "string" && label.length > 0,
        `${code}.doctypeNames["${meta.doctype}"] eksik (katalog: ${catalogKey})`
      );
    }
  });

  test(`${code}: her katalogun tekil adı var`, () => {
    for (const [catalogKey] of CATALOGS) {
      const label = messages.logistics?.catalogEntity?.[catalogKey];
      assert.ok(
        typeof label === "string" && label.length > 0,
        `${code}.logistics.catalogEntity.${catalogKey} eksik`
      );
    }
  });

  test(`${code}: her sözleşme alanının etiketi var`, () => {
    const missing = FIELD_NAMES.filter((name) => {
      const label = messages.logistics?.field?.[name];
      return typeof label !== "string" || label.length === 0;
    });
    assert.deepEqual(missing, [], `${code}.logistics.field.* eksik: ${missing.join(", ")}`);
  });
}

test("tr ve en alan sözlükleri aynı anahtar kümesine sahip", () => {
  // Tek dile eklenen anahtar diğerinde fallback'e düşer ve karışık dilli
  // ekran üretir — iki sözlük birlikte büyümeli.
  const trKeys = Object.keys(tr.logistics?.field ?? {}).sort();
  const enKeys = Object.keys(en.logistics?.field ?? {}).sort();
  assert.deepEqual(trKeys, enKeys);
});
