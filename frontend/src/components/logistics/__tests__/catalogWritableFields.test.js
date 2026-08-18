// Kaydetme yükü süzgeci — REGRESYON testi.
//
// NEDEN VAR (curl ile ölçülmüş hata):
//   `update_catalog_item` `values` içinde `name` OLMADAN çağrıldığında
//   `{ok:true}` dönüyor. Ama form draft'ı `get_catalog_item` yanıtından
//   doğuyor ve o yanıt `name`'i İÇERİYOR; draft aynen geri gönderilince
//   backend `417 + {ok:false, error:{code:"VALIDATION_ERROR",
//   message:"Logistics Provider kataloğunda yazılamayan alan(lar): name"}}`
//   diyor. Sonuç: katalog formundan HİÇBİR kayıt yapılamıyordu.
//
// Süzgeç sözleşmenin CANLI şekline karşı doğrulanıyor: meta dosyası
// okunuyor, kural elle kopyalanmıyor. Sözleşme değişirse test onunla birlikte
// hareket eder; kural değişirse (ör. backend yeni bir teknik alanı reddeder)
// buradaki vakalar kırmızı olur.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { pickWritable, writableFieldNames } from "../catalogWritableFields.js";

const HERE = dirname(fileURLToPath(import.meta.url));

// JSON import attribute'u yerine okuma — `catalogI18nCoverage.test.js` ile
// aynı gerekçe (deneysel uyarı test çıktısını kirletiyor).
const CONTRACT = JSON.parse(
  readFileSync(join(HERE, "../../../mocks/logistics/_catalog-meta.json"), "utf8")
);

const PROVIDER = CONTRACT.catalogs.logistics_provider;

test("sözleşme fixture'ı beklenen şekilde — testler boş kümede gezinmesin", () => {
  assert.ok(PROVIDER, "logistics_provider kataloğu sözleşmede yok");
  assert.ok(
    PROVIDER.list_fields.some((f) => f.name === "name"),
    "`name` list_fields'ta yok"
  );
  assert.ok(PROVIDER.child_tables.operating_channels, "operating_channels alt tablosu yok");
});

test("`name` yükten DÜŞER — canlı 417 hatasının tam senaryosu", () => {
  // `get_catalog_item` yanıtından birebir alınmış draft.
  const draft = {
    name: "LP-0001",
    provider_name: "Aras Kargo",
    provider_code: "ARAS",
    provider_type: "Kargo",
    integration_type: "API",
    country: "Turkey",
    is_active: 1,
    logo: null,
    website: "https://araskargo.com.tr",
    support_phone: "444 25 52",
    support_email: "destek@araskargo.com.tr",
    operating_channels: [{ shipping_channel: "SC-001", channel_name: "Yurt İçi" }],
  };

  const values = pickWritable(PROVIDER, draft);

  assert.equal("name" in values, false, "`name` hâlâ gönderiliyor — 417 geri gelir");
  assert.equal(values.provider_name, "Aras Kargo");
  assert.equal(values.provider_code, "ARAS");
  assert.equal(values.website, "https://araskargo.com.tr");
});

test("veri alanları AYNEN geçer — tip çevrilmez, boş atılmaz", () => {
  // Boş string ile null arasındaki fark backend'in kararı, süzgecin değil.
  const values = pickWritable(PROVIDER, {
    provider_name: "",
    logo: null,
    is_active: 0,
    support_phone: undefined,
  });

  assert.deepEqual(values, {
    provider_name: "",
    logo: null,
    is_active: 0,
    support_phone: undefined,
  });
});

test("sözleşmede olmayan üst seviye anahtarlar düşer", () => {
  // Frappe `as_dict()` bunları taşıyabiliyor; bilinmeyen TEK anahtar tüm
  // isteği reddettiriyor (`_apply_values`).
  const values = pickWritable(PROVIDER, {
    provider_name: "Yurtiçi",
    owner: "Administrator",
    creation: "2026-08-17 10:00:00",
    modified: "2026-08-17 10:00:00",
    modified_by: "Administrator",
    docstatus: 0,
    idx: 3,
    doctype: "Logistics Provider",
    __islocal: 0,
  });

  assert.deepEqual(Object.keys(values), ["provider_name"]);
});

test("alt tablo satırlarındaki sözleşme dışı anahtarlar düşer", () => {
  const values = pickWritable(PROVIDER, {
    operating_channels: [
      {
        name: "abc123",
        parent: "LP-0001",
        parentfield: "operating_channels",
        parenttype: "Logistics Provider",
        idx: 1,
        doctype: "Provider Operating Channel",
        shipping_channel: "SC-001",
        channel_name: "Yurt İçi",
      },
    ],
  });

  assert.deepEqual(values.operating_channels, [
    { shipping_channel: "SC-001", channel_name: "Yurt İçi" },
  ]);
});

test("alt tablo dizi değilse boş diziye indirgenir", () => {
  // `ChildTable` v-model'i bir kez `null` bırakırsa backend'e `null` gitmesin.
  assert.deepEqual(pickWritable(PROVIDER, { operating_channels: null }).operating_channels, []);
  assert.deepEqual(pickWritable(PROVIDER, { operating_channels: {} }).operating_channels, []);
});

test("alt tablo satırı nesne değilse boş satıra indirgenir", () => {
  assert.deepEqual(pickWritable(PROVIDER, { operating_channels: [null, "x", 5] }), {
    operating_channels: [{}, {}, {}],
  });
});

test("boş/bozuk draft FIRLATMAZ, boş yük döner", () => {
  for (const bad of [null, undefined, 0, "", "provider_name", true, 42]) {
    let values;
    assert.doesNotThrow(
      () => {
        values = pickWritable(PROVIDER, bad);
      },
      `${String(bad)} fırlattı`
    );
    assert.deepEqual(values, {}, `${String(bad)} yük üretti`);
  }
});

test("yeni kayıt (create) yükü de aynı süzgeçten geçer", () => {
  // Yeni kayıtta draft `{}`'ten doğuyor ama `resetCurrentItem` sonrası ekranda
  // yalnız alan girdileri oluşuyor; süzgeç yine de kimlik/teknik alanları
  // kesmeli — bir kez kaydedilip formda kalınan durumda draft'ta `name` var.
  const values = pickWritable(PROVIDER, { name: "LP-0002", provider_name: "MNG" });

  assert.deepEqual(values, { provider_name: "MNG" });
});

test("her katalog için beyaz liste backend kuralıyla birebir", () => {
  // Backend: list_fields ∪ detail_fields ∪ child_tables.keys() − {"name"}
  // (`logistics_catalog._apply_values`). Sapma burada görünsün.
  for (const [key, meta] of Object.entries(CONTRACT.catalogs)) {
    const expected = new Set([
      ...meta.list_fields.map((f) => f.name),
      ...(meta.detail_fields ?? []).map((f) => f.name),
      ...Object.keys(meta.child_tables ?? {}),
    ]);
    expected.delete("name");

    assert.deepEqual(
      [...writableFieldNames(meta)].sort(),
      [...expected].sort(),
      `${key} beyaz listesi sözleşmeden sapıyor`
    );
    assert.equal(
      writableFieldNames(meta).has("name"),
      false,
      `${key}: \`name\` yazılabilir sayıldı`
    );
  }
});

test("her katalogda `name` taşıyan draft süzülünce `name` kalmaz", () => {
  // Hata bir katalogda kapanıp diğerinde açık kalmasın.
  for (const [key, meta] of Object.entries(CONTRACT.catalogs)) {
    const values = pickWritable(meta, { name: "X-1", modified: "2026-01-01" });
    assert.deepEqual(values, {}, `${key}: kimlik/teknik alan sızdı`);
  }
});
