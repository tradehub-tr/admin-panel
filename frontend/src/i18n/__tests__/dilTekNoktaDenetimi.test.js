/**
 * DİL SEÇİMİ TEK NOKTADAN GEÇER — panel kaynak denetimi.
 *
 * Bu test davranışı değil MİMARİYİ korur: dil tercihi `setLanguage()` ve
 * `languageChoice.js` dışında hiçbir yerden yazılamaz.
 *
 * NEDEN test, neden kontrol listesi: MOGEM-642 Faz 1'de tercih artık iki yere
 * birden yazılıyor (localStorage + ortak çerez) ve panelde iki ayrı seçici var
 * (`LanguageSwitcher.vue`, `AppHeader.vue` ⋯ menüsü). Üçüncüsü eklendiğinde
 * kimse bu dosyayı hatırlamayacak — ama bu test kırmızı olacak. Kaçan tek bir
 * nokta, o yoldan seçen kullanıcının tercihini çereze yazmaz; storefront o
 * seçimi hiç görmez ve kullanıcı dili iki kez seçmek zorunda kalır.
 *
 * Storefront'taki eşi: tradehubfront/src/i18n/__tests__/dilSeciciDenetimi.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../..", import.meta.url));

/** Merkezi karar noktasının kendisi ve testleri denetim dışıdır. */
const MUAF = ["i18n/languageChoice.js", "i18n/index.js", "i18n/__tests__"];

/** Dil seçimi sunan ekranlar — merkezi fonksiyonu çağırmak ZORUNDALAR. */
const SECICI_DOSYALARI = [
  "components/navigation/LanguageSwitcher.vue",
  "components/layout/AppHeader.vue",
];

function kaynakDosyalari(dizin, biriken = []) {
  for (const ad of readdirSync(dizin)) {
    if (ad === "node_modules" || ad === "dist") continue;
    const tam = join(dizin, ad);
    if (statSync(tam).isDirectory()) kaynakDosyalari(tam, biriken);
    else if (/\.(js|vue)$/.test(ad) && !ad.endsWith(".test.js")) biriken.push(tam);
  }
  return biriken;
}

const dosyalar = kaynakDosyalari(SRC)
  .map((f) => relative(SRC, f))
  .filter((f) => !MUAF.some((m) => f.startsWith(m)));

test("denetlenecek dosya bulundu (tarama gerçekten çalışıyor)", () => {
  assert.ok(dosyalar.length > 100, `yalnız ${dosyalar.length} dosya tarandı`);
});

test("hiçbir dosya dil anahtarına DOĞRUDAN yazmıyor", () => {
  const ihlaller = [];
  for (const dosya of dosyalar) {
    readFileSync(join(SRC, dosya), "utf8")
      .split("\n")
      .forEach((satir, i) => {
        if (/localStorage\.setItem\(\s*["'`]th-lang/.test(satir))
          ihlaller.push(`${dosya}:${i + 1}`);
      });
  }
  assert.deepEqual(
    ihlaller,
    [],
    `Dil tercihi doğrudan yazılmış, setLanguage() kullan:\n${ihlaller.join("\n")}`
  );
});

test("hiçbir dosya dil ÇEREZİNE doğrudan yazmıyor", () => {
  // Çerez storefront ile ORTAK köprü. Doğrudan yazan bir seçici
  // `th-lang-source` işaretini atlar; storefront o tercihi "otomatik" sayar
  // ve ülke tespiti kullanıcının kendi seçimini ezer.
  const ihlaller = [];
  for (const dosya of dosyalar) {
    readFileSync(join(SRC, dosya), "utf8")
      .split("\n")
      .forEach((satir, i) => {
        if (/document\.cookie\s*=\s*[`"']?\s*th-lang/.test(satir))
          ihlaller.push(`${dosya}:${i + 1}`);
      });
  }
  assert.deepEqual(
    ihlaller,
    [],
    `Dil çerezi doğrudan yazılmış, setLanguage() kullan:\n${ihlaller.join("\n")}`
  );
});

test("dil seçiciler merkezi fonksiyonu ÇAĞIRIYOR", () => {
  for (const dosya of SECICI_DOSYALARI) {
    const icerik = readFileSync(join(SRC, dosya), "utf8");
    // import satırı değil gerçek çağrı aranıyor — import edip kullanmamak bu
    // testi boş yere yeşil yapardı.
    const cagri = (icerik.match(/setLanguage\(/g) || []).length;
    assert.ok(cagri > 0, `${dosya} setLanguage() çağırmıyor`);
  }
});
