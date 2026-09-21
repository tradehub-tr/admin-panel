/**
 * DUYURU DİL DENETİMİ — panel dört dile veri girebiliyor mu?
 *
 * NEDEN VAR: Vitrinin kırma turunda bulundu — `Header Notice` de yalnız
 * `_tr`/`_en` taşıyordu ve duyuru şeridi sitenin HER sayfasında çiziliyor.
 * DocType kolonlarını açmak TEK BAŞINA yetmez: duyurular bu panelden
 * giriliyor. Ekran iki dilde kalsaydı admin Arapça/Rusça metni hiçbir yere
 * giremez, şerit o dillerde Türkçe görünmeye devam ederdi.
 *
 * Kabul ölçüsü "alan eklendi" değil "iş yapılabiliyor" (kök CLAUDE.md §4.13).
 *
 * Kardeşi: `vitrinDilDenetimi.test.js` (aynı desen, vitrin tarafı).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../../..", import.meta.url));
const oku = (p) => readFileSync(SRC + p, "utf8");

const DILLER = ["tr", "en", "ar", "ru"];
const KOKLER = ["message", "link_text"];

test("duyuru düzenleme ekranı dört dili de sunuyor", () => {
  const s = oku("components/system/NoticeEditModal.vue");
  for (const dil of DILLER) {
    assert.ok(
      new RegExp(`kod: "${dil}"`).test(s),
      `NoticeEditModal dil listesinde "${dil}" yok — admin o dilde metin giremez`
    );
  }
});

test("dil blokları KOPYALANMIYOR, listeden türüyor", () => {
  const s = oku("components/system/NoticeEditModal.vue");
  assert.ok(!/v-show="lang === '(tr|en|ar|ru)'"/.test(s), "dil bloğu hâlâ elle kopyalanmış");
  assert.ok(/v-for="d in DILLER"/.test(s), "dil blokları listeden türemiyor");
});

test("form durumu her kök × her dil alanını taşıyor", () => {
  const s = oku("components/system/NoticeEditModal.vue");
  assert.ok(/dilliAlanlar\(\)/.test(s), "form alanları dil listesinden türetilmiyor");
  for (const kok of KOKLER) {
    assert.ok(s.includes(`"${kok}"`), `çevrilebilir kök "${kok}" form üreticisinde yok`);
  }
});

test("yalnız kaynak dil zorunlu — diğerleri boş bırakılabilir", () => {
  // Dördü birden zorunlu olsaydı admin tek bir duyuruyu kaydedemez, özellik
  // kullanılmaz hâle gelirdi. Eksik dil ön yüzde TR'ye düşüyor.
  const s = oku("components/system/NoticeEditModal.vue");
  assert.ok(/KAYNAK_DIL = "tr"/.test(s), "kaynak dil tanımlı değil");
  assert.ok(/:required="d\.kod === KAYNAK_DIL"/.test(s), "zorunluluk tüm dillere uygulanmış olabilir");
});

test("panel her dilin alanını backend'den OKUYOR", () => {
  // Alan FIELDS listesinde yoksa panel onu hiç çekmez; admin doldurduğu metni
  // bir dahaki açılışta BOŞ görür ve kaydederken üzerine boş yazar.
  const s = oku("composables/useHeaderNotices.js");
  for (const kok of KOKLER) {
    for (const dil of DILLER) {
      assert.ok(s.includes(`"${kok}_${dil}"`), `FIELDS listesinde ${kok}_${dil} yok`);
    }
  }
});

test("yeni duyuru varsayılanları dört dili kapsıyor", () => {
  const s = oku("views/system/HeaderNoticesView.vue");
  for (const kok of KOKLER) {
    for (const dil of DILLER) {
      assert.ok(s.includes(`${kok}_${dil}:`), `yeni kayıt varsayılanında ${kok}_${dil} yok`);
    }
  }
});

test("Arapça alanlar RTL yönüyle çiziliyor", () => {
  const s = oku("components/system/NoticeEditModal.vue");
  assert.ok(/yon: "rtl"/.test(s), "Arapça için yön bilgisi yok — metin ters görünür");
  assert.ok(/:dir="d\.yon"/.test(s), "girdi alanları yön bilgisini kullanmıyor");
});
