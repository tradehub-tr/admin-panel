import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import en from "../../../../i18n/locales/en.js";
import tr from "../../../../i18n/locales/tr.js";

/**
 * Katalog ekranı guard'ları — KAYNAK KİLİDİ (denetim 2026-09-04, M1/M2).
 *
 * Bu üç guard'ın ortak kaderi "sessizce kaybolmak": biri silinse ekran yine
 * çalışır GÖRÜNÜR, hata ancak canlıda çıkar (çift kayıt, boşa 4xx, kullanıcıya
 * geliştirici mesajı). `node --test` altında container'lar router/store ile
 * ayağa kaldırılamadığı için davranış yerine onu GARANTİ EDEN kaynak deseni
 * kilitlenir — dataTableRowLink.test.js'in "tıklama sözleşmesi" emsali.
 */

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

const formView = read("../CatalogFormView.vue");
const listView = read("../CatalogListView.vue");
const formScreen = read("../../../../components/logistics/CatalogFormScreen.vue");
const listScreen = read("../../../../components/logistics/CatalogListScreen.vue");

// ── Madde 1: çift tıklama = çift katalog kaydı ──────────────────────────

test("CatalogFormView.save yeniden-giriş kilidi taşır (çift tıklama çift kayıt açmasın)", () => {
  // `saving` disabled'ı DOM'a bir kare geç iniyor; kilit olmadan aynı karede
  // gelen ikinci tıklama canlı uçta İKİNCİ kaydı açıyordu.
  // ManualShipmentView.save ile aynı desen.
  assert.match(
    formView,
    /async function save\(values\) \{[^}]*?if \(store\.saving\) return;/s,
    "save() `if (store.saving) return;` ile başlamalı"
  );
});

// ── Madde 3b: bilinmeyen katalog anahtarında boşa istek ─────────────────

test("CatalogFormView.load bilinmeyen anahtarda uca istek atmaz (CatalogListView emsali)", () => {
  const guard =
    /function load\(\) \{[\s\S]*?try \{\s*getCatalogMeta\([\s\S]*?\} catch \{\s*return;\s*\}/;
  assert.match(formView, guard, "load() fetch'ten önce getCatalogMeta guard'ı taşımalı");
  // Emsal guard (f78b972) yerinde durmalı — iki view aynı deseni paylaşır.
  assert.match(listView, guard, "CatalogListView.load guard'ı korunmalı");
});

// ── Madde 3c: geliştirici mesajı kullanıcı ekranına sızmasın ────────────

test("metaError kullanıcıya i18n metni basar, teknik mesaj console'a gider", () => {
  for (const [name, source] of [
    ["CatalogFormScreen", formScreen],
    ["CatalogListScreen", listScreen],
  ]) {
    // `catalogMeta.js` hatası geçerli anahtar LİSTESİ içeriyor — arayüz
    // metni değil. Ekran genel i18n metnini, console teknik olanı alır.
    assert.ok(
      source.includes('message: t("logistics.error.catalogNotFound")'),
      `${name}: metaError.message i18n'den gelmeli`
    );
    assert.ok(
      !/metaError = \{[^}]*message: e\.message/.test(source),
      `${name}: e.message kullanıcıya basılmamalı`
    );
    // warn, error değil: yakalanmış/ekranda gösterilen durum — E2E'nin
    // konsol-HATASI-sıfır iddiası temiz kalsın (2026-09-04).
    assert.ok(source.includes("console.warn(e)"), `${name}: teknik mesaj console'da kalmalı`);
  }
});

test("logistics.error.catalogNotFound anahtarı tr ve en sözlüklerinde tanımlı", () => {
  // Anahtar sözlükten düşerse vue-i18n ekrana HAM anahtarı basar — sessiz
  // kayıp yerine kırmızı test (catalogI18nCoverage deseni; ar/ru kapsam
  // dışı, fallbackLocale: "en" devrede).
  assert.equal(typeof tr.logistics.error.catalogNotFound, "string");
  assert.equal(typeof en.logistics.error.catalogNotFound, "string");
  assert.ok(tr.logistics.error.catalogNotFound.length > 0);
  assert.ok(en.logistics.error.catalogNotFound.length > 0);
});
