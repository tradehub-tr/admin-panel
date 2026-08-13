// Lojistik ekran manifestinin değişmezleri.
//
// Bu testin işi ekranları doğrulamak DEĞİL — manifestin dürüst kalmasını
// zorlamak. Bir ekran ne hazır ne de gerekçeli bırakılırsa (yani sessizce
// unutulursa) burası kırmızı olur.

import assert from "node:assert/strict";
import test from "node:test";

import {
  LOGISTICS_SCREENS,
  LOGISTICS_SECTION,
  REPORT_PANELS,
  SHIPMENT_DETAIL_TABS,
  menuScreens,
  pendingScreens,
  readyScreens,
} from "../logisticsScreens.js";

/** Faz D ekran envanteri: 44 admin kalemi (docs/PLAN-lojistik-ekran-envanteri.md). */
const INVENTORY_TOTAL = 44;

test("her ekran ya hazır ya gerekçeli — sessiz unutulma yok", () => {
  for (const screen of LOGISTICS_SCREENS) {
    if (screen.ready) {
      assert.equal(
        screen.blockedBy,
        null,
        `${screen.key} hazır ama blockedBy dolu — çelişki`
      );
    } else {
      assert.ok(
        typeof screen.blockedBy === "string" && screen.blockedBy.trim().length > 0,
        `${screen.key} hazır değil ve NEYİ beklediği yazılmamış`
      );
    }
  }
});

test("manifest ekran envanterinin tamamını kapsıyor", () => {
  // Route'u olan ekranlar + detay sekmeleri + rapor panelleri = envanter.
  const covered =
    LOGISTICS_SCREENS.length + SHIPMENT_DETAIL_TABS.length + REPORT_PANELS.length;
  assert.equal(
    covered,
    INVENTORY_TOTAL,
    `Manifest ${covered} kalem sayıyor, envanter ${INVENTORY_TOTAL} diyor — biri güncellenmemiş`
  );
});

test("ekran anahtarları ve route adları benzersiz", () => {
  for (const field of ["key", "name"]) {
    const values = LOGISTICS_SCREENS.map((s) => s[field]);
    assert.equal(new Set(values).size, values.length, `${field} alanında tekrar var`);
  }
});

test("route yolları benzersiz ve lojistik ön ekinde", () => {
  const paths = LOGISTICS_SCREENS.map((s) => s.path);
  assert.equal(new Set(paths).size, paths.length, "aynı path iki ekranda");
  for (const path of paths) {
    assert.ok(path.startsWith("lojistik/"), `${path} lojistik/ ile başlamıyor`);
    assert.ok(!path.startsWith("/"), `${path} baştaki / ile çocuk route'u kırar`);
  }
});

test("menüye girecek ekranın etiketi ve ikonu var", () => {
  for (const screen of menuScreens()) {
    assert.ok(screen.labelKey?.startsWith("nav."), `${screen.key} labelKey eksik/yanlış`);
    assert.ok(screen.icon, `${screen.key} ikonsuz menüye giremez`);
  }
});

test("menü etiketleri tr ve en'de ÇEVRİLİ", async () => {
  // Bu kontrol geriye dönük eklendi: anahtarlar bir kez yanlış ad alanına
  // (`logistics.item`) düşmüş ve menüde ham anahtar metni görünmüştü.
  // `logistics.*` denetim betiği yalnız kendi ad alanına baktığı için
  // yakalamamıştı — nav anahtarları buradan korunuyor.
  const [tr, en] = await Promise.all([
    import("../../i18n/locales/tr.js"),
    import("../../i18n/locales/en.js"),
  ]);
  const read = (dict, path) => path.split(".").reduce((a, k) => a?.[k], dict);

  for (const screen of menuScreens()) {
    for (const [locale, mod] of [["tr", tr], ["en", en]]) {
      assert.equal(
        typeof read(mod.default, screen.labelKey),
        "string",
        `${screen.key}: ${screen.labelKey} ${locale} içinde yok`
      );
    }
  }
});

test("menü ikonları AppIcon kayıt defterinde ÇÖZÜLÜYOR", async () => {
  // iconRegistry seçilmiş bir beyaz liste — lucide'da var olan bir ad
  // otomatik gelmiyor. Kayıtsız ad sessizce `null` döner, menüde ikon
  // yeri boş kalır. "library" ve "arrow-left-right" tam olarak böyle düştü.
  const { resolveAppIcon } = await import("../../components/common/iconRegistry.js");
  for (const screen of menuScreens()) {
    assert.ok(
      resolveAppIcon(screen.icon),
      `${screen.key}: "${screen.icon}" iconRegistry'de kayıtlı değil`
    );
  }
});

test("parametreli route menüde görünmez", () => {
  // ":name" içeren bir yol menüye konursa tıklandığında 404 verir.
  for (const screen of menuScreens()) {
    assert.ok(!screen.path.includes(":"), `${screen.key} parametreli ama menüde`);
  }
});

test("hazır ekran lazy import taşır, bekleyen ekran yalnız yol metni", () => {
  for (const screen of LOGISTICS_SCREENS) {
    if (screen.ready) {
      assert.equal(typeof screen.component, "function", `${screen.key} lazy import değil`);
      assert.equal(screen.componentPath, undefined, `${screen.key} hem canlı hem metin taşıyor`);
    } else {
      // Var olmayan dosyaya `import()` koymak Vite build'ini kırıyor
      // (statik çözümleme) — bekleyen ekran yalnız planlanan yolu tutar.
      assert.equal(screen.component, undefined, `${screen.key} hazır değil ama canlı import taşıyor`);
      assert.ok(
        typeof screen.componentPath === "string" && screen.componentPath.endsWith("View.vue"),
        `${screen.key} planlanan view yolu eksik`
      );
    }
  }
});

test("hazır + bekleyen = toplam", () => {
  assert.equal(readyScreens().length + pendingScreens().length, LOGISTICS_SCREENS.length);
});

test("kimlik bilgisi yöneten ekran süper admin şartı taşıyor", () => {
  // F1 taşıyıcı API anahtarlarını yönetiyor. Backend `carrier_credential.manage`
  // istiyor; arayüzün de aynı sınırı çizmesi bilinçli (derinlemesine savunma).
  const carrierAccounts = LOGISTICS_SCREENS.find((s) => s.key === "F1");
  assert.equal(carrierAccounts.superAdmin, true, "F1 süper admin şartını kaybetmiş");
});

test("lojistik kendi ray bölümünde ve menü oradan besleniyor", async () => {
  const nav = await import("../../data/navigation.js");

  const rail = nav.adminRailSections.find((r) => r.id === LOGISTICS_SECTION);
  assert.ok(rail, `${LOGISTICS_SECTION} ray bölümü tanımlı değil`);
  assert.ok(nav.adminSectionTitles[LOGISTICS_SECTION], "bölüm başlığı eksik");

  // Menü kalemleri manifestten üretiliyor — elle liste eklenirse sayı tutmaz.
  const items = nav.adminPanelSections[LOGISTICS_SECTION].flatMap((g) => g.items);
  assert.equal(
    items.length,
    menuScreens().length,
    "menü kalemleri manifestten üretilmiyor"
  );

  // Eski yerinde (commerce) kalıntı bırakılmamış olmalı.
  const inCommerce = nav.adminPanelSections.commerce.some(
    (g) => g.title === "nav.group.logistics"
  );
  assert.equal(inCommerce, false, "commerce altında lojistik kalıntısı var");
});
