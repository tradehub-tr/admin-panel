// SEKME BAŞLIĞI DEĞİŞMEZLERİ (WCAG 2.4.2 — Page Titled).
//
// NEDEN BU TEST VAR:
//   Başlık kuralı üç sessiz yoldan bozulabiliyor:
//     1. Marka adı/ayraç değişir, ekran adı başlıktan düşer → sekme tekrar
//        40 ekranda aynı görünür ve kimse fark etmez (build yeşil).
//     2. Lojistik rotasına `titleKey` konur ama çeviri eksiktir → başlık
//        ham anahtar ("nav.item.x") olarak basılır.
//     3. Adı olmayan rotada (login, yönlendirme) başlık "· iStoc B2B"
//        gibi yarım kalır.
//   Hesap `pageTitle.js`te saf tutuluyor; burada doğrudan çağrılıyor —
//   router/index.js `@/` alias'ı ve `.vue` import'ları yüzünden
//   `node --test` altında yüklenemez.

import assert from "node:assert/strict";
import test from "node:test";

import { BRAND, logisticsTitleMeta, pageNameFor, pageTitleFor } from "../pageTitle.js";

/** Sözlük taklidi — çevirisi olmayan anahtarda null döner (te/t deseni). */
const dictionary = {
  "nav.item.logisticsReports": "Raporlar",
  "nav.item.logisticsCatalogs": "Lojistik Kataloglar",
};
const translate = (key) => dictionary[key] ?? null;

test("i18n anahtarı olan rota çeviriyi kullanır", () => {
  const meta = { title: "Lojistik", titleKey: "nav.item.logisticsReports" };
  assert.equal(pageTitleFor(meta, translate), `Raporlar · ${BRAND}`);
});

test("çeviri eksikse sabit başlığa düşer — ham anahtar basılmaz", () => {
  const meta = { title: "Lojistik", titleKey: "nav.item.bilinmeyen" };
  assert.equal(pageTitleFor(meta, translate), `Lojistik · ${BRAND}`);
});

test("titleKey yoksa meta.title kullanılır (panelin eski rotaları)", () => {
  assert.equal(pageTitleFor({ title: "Dashboard" }, translate), `Dashboard · ${BRAND}`);
});

test("adı olmayan rotada yalnız marka döner — başta boş ayraç kalmaz", () => {
  assert.equal(pageTitleFor({ guest: true }, translate), BRAND);
  assert.equal(pageTitleFor(null, translate), BRAND);
  assert.equal(pageTitleFor({ title: "   " }, translate), BRAND);
});

test("çevirmen verilmese de sabit başlık çalışır (i18n bootstrap öncesi)", () => {
  assert.equal(pageTitleFor({ title: "Abonelik", titleKey: "nav.item.x" }), `Abonelik · ${BRAND}`);
});

test("pageNameFor canlı bölge için markasız adı döner", () => {
  const meta = { title: "Lojistik", titleKey: "nav.item.logisticsCatalogs" };
  assert.equal(pageNameFor(meta, translate), "Lojistik Kataloglar");
  assert.equal(pageNameFor({}, translate), "");
});

test("her hazır lojistik rotası bir başlık taşır", async () => {
  const { readyScreens } = await import("../logisticsScreens.js");
  for (const screen of readyScreens()) {
    const title = pageTitleFor(logisticsTitleMeta(screen), (key) =>
      key === screen.labelKey ? "Ekran" : null
    );
    assert.notEqual(title, BRAND, `${screen.key}: başlıksız rota`);
    assert.ok(title.endsWith(BRAND), `${screen.key}: marka eki yok`);
  }
});

test("hazır lojistik rotalarının başlıkları BİRBİRİNDEN FARKLI", async () => {
  // ÖLÇÜLDÜ (WCAG turu 2026-08-24): sekiz parametreli ekran (M2, B2, C2, G1,
  // G2, G3, H1, H2) sabit "Lojistik" başlığına düşüyordu — sekmede,
  // geçmişte ve yer imlerinde ayırt edilemiyorlardı (WCAG 2.4.2 Page Titled).
  // Eski test yalnız "başlık marka değil ve markayla bitiyor" diyordu;
  // sekiz ekranın AYNI başlığı taşıması o denetimden geçiyordu.
  //
  // Çevirmen GERÇEK tr sözlüğü: menü ekranları `labelKey` çevirisini alır,
  // parametreli ekranlar (anahtarları henüz sözlükte yok) `title` sabitine
  // düşer. Yani test hem bugünkü hâli hem çeviriler eklendikten sonrasını
  // kapsıyor; ar/ru senaryosu da bu (orada `nav.item.logistics*` yok,
  // vue-i18n en'e fallback eder — çeviri hiç bulunamazsa yine `title`).
  const { readyScreens } = await import("../logisticsScreens.js");
  const tr = (await import("../../i18n/locales/tr.js")).default;
  const read = (key) => key.split(".").reduce((node, part) => node?.[part], tr);
  const translate = (key) => (typeof read(key) === "string" ? read(key) : null);

  const seen = new Map();
  for (const screen of readyScreens()) {
    const title = pageTitleFor(logisticsTitleMeta(screen), translate);
    const clash = seen.get(title);
    assert.equal(
      clash,
      undefined,
      `${screen.key} ile ${clash} aynı sekme başlığını taşıyor: "${title}" — ` +
        `manifeste ayırt edici bir "title" (ve tercihen "titleKey") ekle`
    );
    seen.set(title, screen.key);
  }
});

test("logisticsTitleMeta düşüş sırası: titleKey → labelKey → sabit", () => {
  // Menü ekranı: sekme adı MENÜ ETİKETİYLE aynı kaynaktan.
  assert.deepEqual(logisticsTitleMeta({ labelKey: "nav.item.logisticsReports" }), {
    title: "Lojistik",
    titleKey: "nav.item.logisticsReports",
  });
  // Parametreli detay ekranı: kendi başlık anahtarı + TR sabiti.
  assert.deepEqual(
    logisticsTitleMeta({ titleKey: "nav.item.logisticsShipmentDetail", title: "Sevkiyat Detayı" }),
    { title: "Sevkiyat Detayı", titleKey: "nav.item.logisticsShipmentDetail" }
  );
  // İkisi birden varsa `titleKey` kazanır — menü etiketi sekmeyi ezmez.
  assert.equal(
    logisticsTitleMeta({ titleKey: "a.b", labelKey: "c.d" }).titleKey,
    "a.b",
    "titleKey labelKey'i geçmeli"
  );
  assert.deepEqual(logisticsTitleMeta(null), { title: "Lojistik" });
});
