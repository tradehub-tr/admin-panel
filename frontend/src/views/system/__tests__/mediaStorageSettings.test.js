import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

// T-051 (şartname) — Medya Depolama Ayarları ekranı.
//
// Ekran sır taşıyor (S3 secret, imgproxy anahtar/tuz). Bu testler üç şeyi
// sabitler: beş bölümün hepsi var, rol kapısı `Media Superadmin` üstüne
// kurulu, ve sır alanları asla sunucudan gelen değerle DOLDURULMUYOR.

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const read = (p) => readFileSync(new URL(p, `file://${frontendRoot}/`), "utf8");

const view = read("src/views/system/MediaStorageSettingsView.vue");
const router = read("src/router/index.js");
const nav = read("src/data/navigation.js");
const locales = {
  tr: read("src/i18n/locales/tr.js"),
  en: read("src/i18n/locales/en.js"),
  ar: read("src/i18n/locales/ar.js"),
  ru: read("src/i18n/locales/ru.js"),
};

test("beş bölümün hepsi ekranda", () => {
  for (const key of ["primary", "s3", "cdn", "imgproxy", "retention"]) {
    assert.match(view, new RegExp(`mediaStorage\\.section\\.${key}`), `${key} bölümü yok`);
  }
});

test("alan adları backend DocType'ı ile birebir aynı", () => {
  // Bunlar `StorageSettings.from_doctype` ve `RetentionPolicy.from_mapping`
  // tarafından okunan adlar; yeniden adlandırma ayarı sessizce etkisiz bırakır.
  const fields = [
    "backend",
    "s3_endpoint",
    "s3_region",
    "s3_bucket",
    "s3_access_key",
    "s3_secret_key",
    "cdn_base_url",
    "signed_url_ttl_seconds",
    "imgproxy_base_url",
    "imgproxy_key",
    "imgproxy_salt",
    "keep_originals",
    "original_local_days",
    "original_then_action",
    "derivative_unused_days",
    "derivative_action",
    "derivative_regenerate_on_demand",
    "trash_retention_days",
    "archive_retention_days",
    "backup_keep_sets",
  ];
  for (const field of fields) {
    assert.ok(view.includes(field), `${field} alanı ekranda yok`);
  }
});

test("sır alanları sunucudan gelen değerle DOLDURULMAZ", () => {
  // Backend Password fieldtype kullanıyor; REST yanıtı yıldız döndürür.
  // O yıldızları geri POST etmek gerçek sırrı yıldız dizesiyle ezerdi.
  assert.match(view, /for \(const key of SECRET_FIELDS\) secrets\[key\] = ""/);
  assert.match(view, /if \(secrets\[key\]\) payload\[key\] = secrets\[key\]/);
  assert.ok(!/secrets\[key\] = doc\[/.test(view), "sır alanı sunucu yanıtından dolduruluyor");
});

test("bağlantı testi ve durum uçları çağrılıyor", () => {
  assert.match(view, /media_storage_settings\.get_storage_status/);
  assert.match(view, /media_storage_settings\.test_connection/);
  for (const target of ["s3", "cdn", "imgproxy"]) {
    assert.match(view, new RegExp(`test\\('${target}'\\)`), `${target} testi düğmesi yok`);
  }
});

test("açık kapılar (S3 üretim engelleri) ekranda görünür", () => {
  assert.match(view, /blockers/);
  assert.match(view, /blocker_ack/);
  assert.match(locales.tr, /S3 kipleri bugün üretime alınamaz/);
});

test("route Media Superadmin rolüne kapılı", () => {
  assert.match(router, /media-storage-settings/);
  assert.match(router, /MediaStorageSettingsView/);
  // `requiresSuperAdmin` DEĞİL: o meta yalnız System Manager'ı geçirir ve
  // ekranın asıl sahibi olan Media Superadmin rolünü dışarıda bırakırdı.
  const block = router.slice(
    router.indexOf('path: "media-storage-settings"'),
    router.indexOf('path: "media-storage-settings"') + 500
  );
  assert.match(block, /roles: \["Media Superadmin"\]/);
  assert.ok(!/requiresSuperAdmin/.test(block), "route requiresSuperAdmin ile kapatılmış");
});

test("menü kalemi Media Superadmin dışına gizli", () => {
  assert.match(nav, /nav\.item\.mediaStorageSettings/);
  const block = nav.slice(
    nav.indexOf("nav.item.mediaStorageSettings"),
    nav.indexOf("nav.item.mediaStorageSettings") + 400
  );
  assert.match(block, /requires: \["Media Superadmin"\]/);
});

test("dört dilde de mediaStorage.* ve menü çevirisi var", () => {
  for (const [lang, src] of Object.entries(locales)) {
    assert.match(src, /\n {2}mediaStorage: \{/, `${lang}: mediaStorage bloğu yok`);
    assert.match(src, /mediaStorageSettings: "/, `${lang}: menü çevirisi yok`);
    for (const key of ["primary", "s3", "cdn", "imgproxy", "retention"]) {
      assert.ok(
        new RegExp(`${key}:`).test(src.slice(src.indexOf("mediaStorage: {"))),
        `${lang}: ${key} bölüm başlığı yok`
      );
    }
  }
});

test("yetkisiz kullanıcıya boş ekran değil gerekçe gösterilir", () => {
  assert.match(view, /denied/);
  assert.match(view, /mediaStorage\.denied/);
  assert.match(view, /isForbidden/);
});
