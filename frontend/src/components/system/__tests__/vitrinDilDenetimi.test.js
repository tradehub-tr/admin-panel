/**
 * VİTRİN DİL DENETİMİ — panel dört dile veri girebiliyor mu?
 *
 * NEDEN VAR: Ölçüldü (17 Eyl 2026, alpha'da gerçek Suudi IP'siyle) — ana sayfa
 * vitrini Arapça ziyaretçiye Türkçe görünüyordu. Kök neden şemaydı: DocType
 * yalnız `_tr`/`_en` kolonu taşıyordu. 21 Eylül'de kolonlar açıldı, ama kolon
 * açmak TEK BAŞINA yetmez: kutular bu PANELDEN düzenleniyor ve ekran iki dilli
 * sekme + kopyalanmış alan bloğu taşıyordu. Ekran genişlemeseydi admin Arapça
 * metni hiçbir yere giremezdi — patch'in doldurduğu mevcut kutular çalışır,
 * yeni kutu ve her düzenleme yarım kalırdı.
 *
 * Kabul ölçüsü "alan eklendi" değil **"iş yapılabiliyor"** (kök CLAUDE.md §4.13).
 *
 * Kardeşleri: storefront `CategoryShowcase.dil.test.ts`,
 * backend `test_category_showcase_diller.py`.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../../..", import.meta.url));
const oku = (p) => readFileSync(SRC + p, "utf8");

const DILLER = ["tr", "en", "ar", "ru"];
const KOKLER = ["label", "hover_text", "promo_badge", "promo_title", "cta_text"];

// Modül `@/utils` takma adını içe aktardığı için `node --test` altında
// import EDİLEMEZ (Vite alias'ı node'da çözülmez) — bu yüzden denetim
// kaynak metni üzerinden yapılır; panelin diğer denetimleri de aynı desende.
test("bölüm başlığı dört dil taşıyor (backend DILLER ile birebir)", () => {
  const s = oku("composables/useCategoryShowcase.js");
  const m = s.match(/BASLIK_DILLERI = \[([^\]]*)\]/);
  assert.ok(m, "BASLIK_DILLERI listesi bulunamadı");
  const liste = [...m[1].matchAll(/"([a-z]{2})"/g)].map((x) => x[1]);
  assert.deepEqual(liste.sort(), [...DILLER].sort());
});

test("kutu düzenleme ekranı dört dili de sunuyor", () => {
  const s = oku("components/system/ShowcaseTileEditModal.vue");
  for (const dil of DILLER) {
    assert.ok(
      new RegExp(`kod: "${dil}"`).test(s),
      `ShowcaseTileEditModal dil listesinde "${dil}" yok — admin o dilde metin giremez`
    );
  }
});

test("dil sekmeleri ve alan blokları KOPYALANMIYOR, listeden türüyor", () => {
  // Eski hâli her dil için şablonu kopyalıyordu (`v-show="lang === 'tr'"` +
  // `v-show="lang === 'en'"`). Dört dilde bu dört kopya demekti; beşinci dil
  // eklendiğinde biri mutlaka unutulurdu.
  const s = oku("components/system/ShowcaseTileEditModal.vue");
  assert.ok(!/v-show="lang === '(tr|en|ar|ru)'"/.test(s), "dil bloğu hâlâ elle kopyalanmış");
  assert.ok(/v-for="d in DILLER"/.test(s), "dil blokları listeden türemiyor");
});

test("form durumu her kök × her dil alanını taşıyor", () => {
  const s = oku("components/system/ShowcaseTileEditModal.vue");
  assert.ok(/dilliAlanlar\(\)/.test(s), "form alanları dil listesinden türetilmiyor");
  for (const kok of KOKLER) {
    assert.ok(
      s.includes(`"${kok}"`),
      `çevrilebilir kök "${kok}" form üreticisinde yok — o alan hiçbir dilde kaydedilmez`
    );
  }
});

test("ayar ekranı başlığı dört dilde düzenletiyor", () => {
  const s = oku("views/system/CategoryShowcaseView.vue");
  assert.ok(/v-for="d in BASLIK_DILLERI"/.test(s), "başlık alanı tek dile sabitlenmiş");
  assert.ok(/section_title_\$\{d\}/.test(s), "başlık alanı dil kodundan türemiyor");
});

test("kaydetme ve kirli-alan denetimi dört dili birden kapsıyor", () => {
  const composable = oku("composables/useCategoryShowcase.js");
  assert.ok(
    /bosBasliklar\(draftSettings\.value\)/.test(composable),
    "kaydetme yalnız bazı dilleri gönderiyor — geri kalanı sessizce kaybolur"
  );
  const view = oku("views/system/CategoryShowcaseView.vue");
  assert.ok(
    /BASLIK_DILLERI\.some\(/.test(view),
    "kirli-alan denetimi tek tek dillere bakıyor; yeni dil eklendiğinde Kaydet düğmesi uyanmaz"
  );
});

test("Arapça alanlar RTL yönüyle çiziliyor", () => {
  const s = oku("components/system/ShowcaseTileEditModal.vue");
  assert.ok(/yon: "rtl"/.test(s), "Arapça için yön bilgisi yok — metin ters görünür");
  assert.ok(/:dir="d\.yon"/.test(s), "girdi alanları yön bilgisini kullanmıyor");
});
