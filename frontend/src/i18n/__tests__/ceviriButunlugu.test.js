/**
 * ÇEVİRİ BÜTÜNLÜĞÜ — panel sözlüğü dört dilde tutarlı mı?
 *
 * NEDEN: panelin i18n'i `fallbackLocale: "en"` taşıyor. Bir anahtar ru/ar'da
 * eksik olduğunda ekran BOZULMAZ, sessizce İngilizceye düşer — yani "çeviri
 * eksik" hatası hiçbir yerde görünmez, kullanıcı yalnız yanlış dil görür.
 *
 * Ölçüldü (16 Eyl 2026): ru.js ve ar.js'te tr'ye göre 1.618 anahtar eksikti.
 * Eksiklik yalnız kök seviyesinde değildi — `permissionConsole` kökü VARDI ama
 * içindeki `tabFeatureCatalog` yoktu, sekme etiketi İngilizce geliyordu. Bu
 * yüzden denetim kökleri değil, DÜZLEŞTİRİLMİŞ yolları karşılaştırır.
 *
 * İkinci denetim placeholder bütünlüğü: bir çeviri `{days}` gibi bir yer
 * tutucuyu düşürürse kullanıcı o bilgiyi HİÇ görmez ve kimse fark etmez.
 * Ölçüldü: `mediaRetroRename.confirmMessage` ru/ar'da iki cümle eksikti —
 * "eski adresler {days} gün yönlendirilir" uyarısı Rus/Arap yöneticiye hiç
 * ulaşmıyordu.
 */
import assert from "node:assert/strict";
import test from "node:test";

import ar from "../locales/ar.js";
import en from "../locales/en.js";
import ru from "../locales/ru.js";
import tr from "../locales/tr.js";

/** Tüm yolları `a.b.c` biçiminde düzleştirir. */
function duzles(dugum, onek = "", biriken = {}) {
  for (const [anahtar, deger] of Object.entries(dugum || {})) {
    const yol = onek ? `${onek}.${anahtar}` : anahtar;
    if (deger && typeof deger === "object" && !Array.isArray(deger)) {
      duzles(deger, yol, biriken);
    } else {
      biriken[yol] = deger;
    }
  }
  return biriken;
}

const TR = duzles(tr);
const DILLER = [
  ["en", duzles(en)],
  ["ru", duzles(ru)],
  ["ar", duzles(ar)],
];

/**
 * Çevrilmeden bırakılan ad alanları.
 *
 * 16 Eyl 2026: liste BOŞALDI — `logistics` (1.213 anahtar) da dahil olmak üzere
 * panelin tamamı dört dilde. Buraya bir önek eklemek "bu modülü çevirmiyoruz"
 * demektir ve o modül ru/ar'da sessizce İngilizce görünür; ekleyen kişi bunu
 * bilerek yapsın diye liste testle korunuyor.
 */
const CEVRILMEYEN_ONEKLER = [];

test("tr referans sözlüğü beklenen büyüklükte (tarama çalışıyor)", () => {
  assert.ok(Object.keys(TR).length > 9000, `tr sözlüğü ${Object.keys(TR).length} anahtar`);
});

for (const [ad, sozluk] of DILLER) {
  test(`${ad}: tr'de olup burada olmayan anahtar yok`, () => {
    const eksik = Object.keys(TR).filter(
      (yol) => !(yol in sozluk) && !CEVRILMEYEN_ONEKLER.some((o) => yol.startsWith(o))
    );
    assert.deepEqual(
      eksik.slice(0, 20),
      [],
      `${ad}.js'te ${eksik.length} çevrilmemiş anahtar var — ekranda sessizce İngilizce görünür.`
    );
  });

  test(`${ad}: yer tutucular tr ile birebir aynı`, () => {
    const yerTutucular = (metin) =>
      [...String(metin).matchAll(/\{(\w+)\}/g)]
        .map((m) => m[1])
        .sort()
        .join(",");

    const bozuk = [];
    for (const [yol, trDeger] of Object.entries(TR)) {
      if (!(yol in sozluk)) continue;
      if (yerTutucular(trDeger) !== yerTutucular(sozluk[yol])) {
        bozuk.push(`${yol} — tr:[${yerTutucular(trDeger)}] ${ad}:[${yerTutucular(sozluk[yol])}]`);
      }
    }
    assert.deepEqual(
      bozuk,
      [],
      `${ad}.js'te yer tutucu düşmüş. Düşen değer kullanıcıya HİÇ gösterilmez.`
    );
  });
}

test("çeviri borcu SIFIR — çevrilmeyen ad alanı yok", () => {
  assert.deepEqual(CEVRILMEYEN_ONEKLER, []);
});
