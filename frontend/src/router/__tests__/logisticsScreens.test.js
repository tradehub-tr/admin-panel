// Lojistik ekran manifestinin değişmezleri.
//
// Bu testin işi ekranları doğrulamak DEĞİL — manifestin dürüst kalmasını
// zorlamak. Bir ekran ne hazır ne de gerekçeli bırakılırsa (yani sessizce
// unutulursa) burası kırmızı olur.

import assert from "node:assert/strict";
import test from "node:test";

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  LOGISTICS_SCREENS,
  LOGISTICS_SECTION,
  REPORT_PANELS,
  SHIPMENT_DETAIL_TABS,
  isScreenReady,
  menuScreens,
  sellerMenuScreens,
  pendingScreens,
  readyScreens,
} from "../logisticsScreens.js";

/**
 * Ekran envanteri toplamı.
 *
 * Faz D'de 44'tü. 13-FE paketleme kuyruğunu (`G0`) ekledi: paketleme
 * ekranlarına o güne kadar yalnız sevkiyat detayından girilebiliyordu ve
 * o dal başka bir sahiplikte — operatörün kendi giriş kapısı yoktu
 * (docs/lojistik/13-FE-paketleme-etiket-ANALIZ.md §1.2).
 *
 * Bu sayıyı büyütmek KAPSAM KARARIDIR: yeni bir ekran birimi eklemeden
 * artırılmamalı, aksi hâlde testin "biri güncellenmemiş" uyarısı anlamını
 * kaybeder.
 */
const INVENTORY_TOTAL = 45;

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

test("gizli ama HAZIR her ekrana bir yerden gidiliyor", () => {
  // ULAŞILMAZ EKRAN YASAĞI — ölü butonun aynadaki hâli.
  //
  // `hidden: true` ekranlar menüde görünmez çünkü parametreli (`:name`).
  // Tek giriş yolları başka bir ekrandaki buton. O buton yazılmazsa ekran
  // ÇALIŞIR ama kimse ulaşamaz: yalnız URL'yi elle yazan görür.
  //
  // ÖLÇÜLDÜ (2026-08-18): 13-FE'de palet ekranı (G3) tam bu duruma düştü —
  // yazıldı, route'u açıldı, hiçbir ekrandan linklenmedi. Kuralı belgeye
  // yazmak yetmiyor; ilk acelede yine unutulur.
  const viewsDir = join(dirname(fileURLToPath(import.meta.url)), "../../views/logistics");
  const vueFiles = (dir, prefix = "") =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? vueFiles(join(dir, entry.name), `${prefix}${entry.name}/`)
        : entry.name.endsWith(".vue")
          ? [`${prefix}${entry.name}`]
          : []
    );
  const allSource = vueFiles(viewsDir)
    .map((f) => readFileSync(join(viewsDir, f), "utf8"))
    .join("\n");

  for (const screen of LOGISTICS_SCREENS.filter((s) => s.ready && s.hidden)) {
    assert.ok(
      allSource.includes(`"${screen.name}"`),
      `${screen.key} (${screen.name}) hazır ve gizli ama hiçbir ekrandan linklenmiyor — ulaşılmaz`
    );
  }
});

test("SATICI menüsü de manifestten üretiliyor", async () => {
  // Panel hem satıcıya hem admin'e hizmet ediyor ve iki menü AYRI
  // yapılardan besleniyor (`sellerPanelSections` / `adminPanelSections`).
  // 13-FE'de paketleme yalnız admin menüsüne eklenmişti: satıcı ekranı
  // görmüyordu, oysa kendi sevkiyatını kendisi paketliyor.
  const nav = await import("../../data/navigation.js");

  const rail = nav.sellerRailSections.find((r) => r.id === LOGISTICS_SECTION);
  assert.ok(rail, "satıcı rayında lojistik yok");
  assert.ok(nav.sellerSectionTitles[LOGISTICS_SECTION], "satıcı bölüm başlığı eksik");

  const items = nav.sellerPanelSections[LOGISTICS_SECTION].flatMap((g) => g.items);
  assert.equal(items.length, sellerMenuScreens().length, "satıcı kalemleri manifestten üretilmiyor");
  assert.ok(items.length > 0, "satıcıya hiç lojistik ekranı açılmamış");
});

test("satıcı menüsü admin menüsünün ALT KÜMESİ", () => {
  // Satıcıya platform ekranı (katalog, taşıyıcı kimlik bilgileri, ayarlar)
  // açılmamalı. Bayrak yanlışlıkla konursa burada yakalanır.
  const adminKeys = new Set(menuScreens().map((s) => s.key));
  for (const screen of sellerMenuScreens()) {
    assert.ok(adminKeys.has(screen.key), `${screen.key} admin menüsünde yok`);
    assert.ok(screen.ready && !screen.hidden, `${screen.key} satıcıya açık ama hazır/görünür değil`);
  }
  const FORBIDDEN = ["M1", "M2", "M3", "F1", "F4"];
  for (const key of FORBIDDEN) {
    assert.ok(
      !sellerMenuScreens().some((s) => s.key === key),
      `${key} platform ekranı — satıcı menüsünde olmamalı`
    );
  }
});

test("isScreenReady manifestle aynı şeyi söylüyor", () => {
  for (const screen of LOGISTICS_SCREENS) {
    assert.equal(isScreenReady(screen.key), Boolean(screen.ready), `${screen.key} tutarsız`);
  }
  // Bilinmeyen anahtar "hazır" sayılmamalı — yanlış yazılmış bir anahtar
  // yüzünden ölü buton çizilmesin.
  assert.equal(isScreenReady("YOK-BOYLE-BIR-EKRAN"), false);
});

test("container hazır OLMAYAN ekrana koşulsuz buton çizmiyor", () => {
  // ÖLÜ BUTON YASAĞI: `router.push({ name })` hedefi kayıtlı değilse
  // vue-router eşleşmeyen adı sessizce yutar — kullanıcı tıklar, hiçbir şey
  // olmaz, hata da görmez. Bu yüzden hazır olmayan bir ekrana giden her
  // container, aynı dosyada `isScreenReady("<key>")` ile butonu gizlemek
  // ZORUNDA. Kural belgeye yazılsaydı ilk acelede unutulurdu.
  const viewsDir = join(dirname(fileURLToPath(import.meta.url)), "../../views/logistics");
  const byName = new Map(LOGISTICS_SCREENS.map((s) => [s.name, s]));

  // ALT DİZİNLER DE TARANIYOR: 13-FE ekranları `views/logistics/packages/` ve
  // `.../labels/` altında yaşıyor. Tarama yalnız üst düzeyde kalsaydı yeni
  // ekranların ölü butonları teste hiç görünmezdi — kuralın kendisi değil,
  // kapsamı sessizce daralırdı.
  const vueFiles = (dir, prefix = "") =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? vueFiles(join(dir, entry.name), `${prefix}${entry.name}/`)
        : entry.name.endsWith(".vue")
          ? [`${prefix}${entry.name}`]
          : []
    );

  let checked = 0;
  for (const file of vueFiles(viewsDir)) {
    const source = readFileSync(join(viewsDir, file), "utf8");
    for (const match of source.matchAll(/router\.push\(\{\s*name:\s*"([^"]+)"/g)) {
      const target = byName.get(match[1]);
      assert.ok(target, `${file}: "${match[1]}" manifestte yok`);
      checked++;
      if (target.ready) continue;
      assert.ok(
        source.includes(`isScreenReady("${target.key}")`),
        `${file}: ${target.key} hazır değil ama buton koşulsuz çiziliyor`
      );
    }
  }
  assert.ok(checked > 0, "hiç yönlendirme taranmadı — regex bozulmuş olabilir");
});
