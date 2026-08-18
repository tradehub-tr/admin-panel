// Lojistik ekran manifestinin değişmezleri.
//
// Bu testin işi ekranları doğrulamak DEĞİL — manifestin dürüst kalmasını
// zorlamak. Bir ekran ne hazır ne de gerekçeli bırakılırsa (yani sessizce
// unutulursa) burası kırmızı olur.
//
// 16-FE-0 ile ikinci bir iş eklendi: manifest artık ÇAKIŞMA SINIRINI da
// taşıyor. Her ekranın `viewPath`i bir sahibin dizinine düşmek zorunda;
// düşmezse iki geliştirici aynı dosyada buluşur.

import assert from "node:assert/strict";
import test from "node:test";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { SHIPMENT_TABS } from "../../views/logistics/shipmentTabRegistry.js";
import {
  LOGISTICS_SCREENS,
  LOGISTICS_SECTION,
  REPORT_PANELS,
  isScreenReady,
  menuScreens,
  ownerOfScreen,
  pendingScreens,
  readyScreens,
  screensOwnedBy,
} from "../logisticsScreens.js";

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), "../..");
const LOGISTICS_VIEWS_DIR = join(SRC_DIR, "views/logistics");

/** `@/x/y.vue` → mutlak dosya yolu. */
const toFsPath = (aliasPath) => join(SRC_DIR, aliasPath.replace(/^@\//, ""));

/** Bir dizindeki tüm `.vue` dosyaları — alt dizinler dahil. */
function vueFilesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return vueFilesUnder(full);
    return entry.name.endsWith(".vue") ? [full] : [];
  });
}

/**
 * Faz D ekran envanteri: 44 admin kalemi.
 *
 * TABAN değer, tavan değil: yeni sekme/ekran eklendikçe kapsanan kalem sayısı
 * ARTAR (16-FE-0'dan beri sekmeler kayıt defterinden geliyor). Azalması ise
 * bir şeyin sessizce düşürüldüğü anlamına gelir — test onu yakalıyor.
 */
const INVENTORY_TOTAL = 44;

test("her ekran ya hazır ya gerekçeli — sessiz unutulma yok", () => {
  for (const screen of LOGISTICS_SCREENS) {
    if (screen.ready) {
      assert.equal(screen.blockedBy, null, `${screen.key} hazır ama blockedBy dolu — çelişki`);
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
  // Sekmeler manifestte DEĞİL, kayıt defterinde — sayım iki kaynağı birleştiriyor
  // (manifest artık defteri import etmiyor; bkz. logisticsScreens.js başlığı).
  const covered = LOGISTICS_SCREENS.length + SHIPMENT_TABS.length + REPORT_PANELS.length;
  assert.ok(
    covered >= INVENTORY_TOTAL,
    `Manifest ${covered} kalem sayıyor, envanter en az ${INVENTORY_TOTAL} diyor — kalem düşmüş`
  );
});

test("ekran anahtarları, route adları ve view yolları benzersiz", () => {
  for (const field of ["key", "name", "viewPath"]) {
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
    for (const [locale, mod] of [
      ["tr", tr],
      ["en", en],
    ]) {
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

// ───────────────────────────────────────────────────────────────────────
// 16-FE-0 · Sahiplik ve dosya yolu sözleşmesi
// ───────────────────────────────────────────────────────────────────────

test("her ekranın viewPath'i var ve bir SAHİBİN dizinine düşüyor", () => {
  // Sahipsiz dizindeki ekran = iki geliştiricinin aynı dosyada buluşacağı yer.
  for (const screen of LOGISTICS_SCREENS) {
    assert.ok(
      typeof screen.viewPath === "string" && screen.viewPath.endsWith("View.vue"),
      `${screen.key}: viewPath eksik ya da …View.vue ile bitmiyor`
    );
    assert.ok(
      ownerOfScreen(screen),
      `${screen.key}: ${screen.viewPath} hiçbir sahibin dizininde değil (ownership.js)`
    );
  }
});

test("her ekran tam olarak bir sahipte sayılıyor", () => {
  const total = ["bora", "ali", "shared"].reduce((sum, o) => sum + screensOwnedBy(o).length, 0);
  assert.equal(total, LOGISTICS_SCREENS.length, "sahibi çözülemeyen ekran var");

  // Sözleşme katmanı ekran barındırmaz — orası yalnız ortak kod.
  assert.equal(screensOwnedBy("shared").length, 0, "_contract altına ekran konmuş");
});

test("hazır ekran lazy import taşır, bekleyen ekran yalnız yol metni", () => {
  for (const screen of LOGISTICS_SCREENS) {
    if (screen.ready) {
      assert.equal(typeof screen.component, "function", `${screen.key} lazy import değil`);
    } else {
      // Var olmayan dosyaya `import()` koymak Vite build'ini kırıyor
      // (statik çözümleme) — bekleyen ekran yalnız planlanan yolu tutar.
      assert.equal(
        screen.component,
        undefined,
        `${screen.key} hazır değil ama canlı import taşıyor`
      );
    }
  }
});

test("hazır ekranın import metni viewPath ile AYNI ve dosya diskte var", () => {
  // İki alan ayrı yazıldığı için sürüklenebilirler: yol güncellenip import
  // unutulursa route başka bir dosyayı yükler ve kimse fark etmez.
  for (const screen of readyScreens()) {
    assert.ok(
      String(screen.component).includes(`"${screen.viewPath}"`),
      `${screen.key}: import metni viewPath ile aynı değil`
    );
    assert.ok(
      existsSync(toFsPath(screen.viewPath)),
      `${screen.key}: ${screen.viewPath} diskte yok`
    );
  }
});

test("views/logistics altındaki her container manifestte kayıtlı", () => {
  // Manifeste yazılmamış container = route'u olmayan, menüde görünmeyen,
  // kimsenin bakmadığı ölü dosya. Sekme bileşenleri (`…/tabs/`) ve sözleşme
  // katmanı hariç — onlar manifest kalemi değil.
  const registered = new Set(LOGISTICS_SCREENS.map((s) => s.viewPath));

  for (const file of vueFilesUnder(LOGISTICS_VIEWS_DIR)) {
    const rel = relative(SRC_DIR, file);
    if (rel.includes("/tabs/") || rel.includes("/_contract/")) continue;
    assert.ok(registered.has(`@/${rel}`), `@/${rel} manifestte kayıtlı değil`);
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
  assert.equal(items.length, menuScreens().length, "menü kalemleri manifestten üretilmiyor");

  // Eski yerinde (commerce) kalıntı bırakılmamış olmalı.
  const inCommerce = nav.adminPanelSections.commerce.some((g) => g.title === "nav.group.logistics");
  assert.equal(inCommerce, false, "commerce altında lojistik kalıntısı var");
});

test("isScreenReady manifestle aynı şeyi söylüyor", () => {
  for (const screen of LOGISTICS_SCREENS) {
    assert.equal(isScreenReady(screen.key), Boolean(screen.ready), `${screen.key} tutarsız`);
  }
  // Bilinmeyen anahtar "hazır" sayılmamalı — yanlış yazılmış bir anahtar
  // yüzünden ölü buton çizilmesin.
  assert.equal(isScreenReady("YOK-BOYLE-BIR-EKRAN"), false);
});

test("manifest sekme kayıt defterini İMPORT ETMİYOR", () => {
  // `router/index.js` bu dosyayı eager yüklüyor. Defter buradan import
  // edilseydi sözleşme + altı kayıt + doğrulaması, lojistiğe hiç girmeyen
  // kullanıcının açılış chunk'ına düşerdi. Sekme envanteri defterin işi.
  const source = readFileSync(join(SRC_DIR, "router/logisticsScreens.js"), "utf8");
  // Yorumda adı geçebilir; aranan gerçek bir `import ... from "...Registry"`.
  const imports = [...source.matchAll(/^\s*import\s[^;]*?from\s+"([^"]+)"/gm)].map((m) => m[1]);
  assert.equal(
    imports.some((path) => path.includes("shipmentTabRegistry")),
    false,
    `manifest kayıt defterine bağlanmış — router→views bağımlılığı geri geldi: ${imports.join(", ")}`
  );
});

test("süper admin ekranının MENÜ kalemi de rol şartı taşıyor", async () => {
  // Route guard'ı korumak yetmiyordu: menü filtresi `requires` taşımayan
  // kalemi herkese açık sayıyor ve F1 satıcının sidebar'ında görünüyordu.
  // Tıklayınca guard dashboard'a atıyordu, yani veri sızmıyordu — ama
  // ekranın VARLIĞI sızıyordu. İki kapı tek kaynaktan beslenmeli.
  const nav = await import("../../data/navigation.js");
  const items = nav.adminPanelSections[LOGISTICS_SECTION].flatMap((g) => g.items);
  const byRoute = new Map(items.map((item) => [item.route, item]));

  for (const screen of menuScreens()) {
    if (!screen.superAdmin) continue;
    const item = byRoute.get(`/${screen.path}`);
    assert.ok(item, `${screen.key} menüde yok`);
    assert.deepEqual(item.requires, ["admin"], `${screen.key} menü kaleminde rol şartı yok`);
  }
});

test("router.push HEDEF ROTANIN parametrelerini gönderiyor", () => {
  // BOZUK BUTON YASAĞI (ölü buton yasağının kardeşi): hedef rotanın yolu
  // `:param` içeriyorsa `router.push` `params` göndermek ZORUNDA. Göndermezse
  // vue-router `Missing required param "..."` fırlatır — buton çizilir,
  // tıklanır, konsola hata düşer ve hiçbir yere gidilmez. Kullanıcı için
  // ölü butondan farksız, ama `isScreenReady` denetimi bunu YAKALAMAZ:
  // hedef ekran gayet hazırdır.
  //
  // Gerçek vaka: `ShipmentDetailView` "Durum güncelle" butonu C2'ye
  // `query: { shipment }` ile gidiyordu, oysa C2'nin yolu
  // `lojistik/sevkiyatlar/:name/durum`. Üç denetim turu bunu kaçırdı;
  // manuel test senaryosu yazılırken çıktı.
  const byName = new Map(LOGISTICS_SCREENS.map((s) => [s.name, s]));

  let checked = 0;
  for (const file of vueFilesUnder(LOGISTICS_VIEWS_DIR)) {
    const source = readFileSync(file, "utf8");
    // `router.push({` ile başlayıp dengeleyen `})` gelene kadarki blok.
    for (const match of source.matchAll(/router\.push\(\{([\s\S]*?)\}\s*\);/g)) {
      const body = match[1];
      const target = /name:\s*"([^"]+)"/.exec(body);
      if (!target) continue;

      const screen = byName.get(target[1]);
      assert.ok(screen, `${relative(SRC_DIR, file)}: "${target[1]}" manifestte yok`);
      checked++;

      const requiredParams = [...screen.path.matchAll(/:([A-Za-z0-9_]+)(\??)/g)]
        .filter(([, , optional]) => optional !== "?")
        .map(([, param]) => param);
      if (!requiredParams.length) continue;

      assert.ok(
        /\bparams:\s*\{/.test(body),
        `${relative(SRC_DIR, file)}: ${screen.key} yolu (${screen.path}) ` +
          `${requiredParams.join(", ")} parametresini zorunlu kılıyor ama push \`params\` göndermiyor`
      );
      for (const param of requiredParams) {
        assert.ok(
          new RegExp(`\\b${param}\\s*:`).test(body),
          `${relative(SRC_DIR, file)}: ${screen.key} için "${param}" parametresi gönderilmiyor`
        );
      }
    }
  }
  assert.ok(checked > 0, "hiç yönlendirme taranmadı — regex bozulmuş olabilir");
});

test("container hazır OLMAYAN ekrana koşulsuz buton çizmiyor", () => {
  // ÖLÜ BUTON YASAĞI: `router.push({ name })` hedefi kayıtlı değilse
  // vue-router eşleşmeyen adı sessizce yutar — kullanıcı tıklar, hiçbir şey
  // olmaz, hata da görmez. Bu yüzden hazır olmayan bir ekrana giden her
  // container, aynı dosyada `isScreenReady("<key>")` ile butonu gizlemek
  // ZORUNDA. Kural belgeye yazılsaydı ilk acelede unutulurdu.
  const byName = new Map(LOGISTICS_SCREENS.map((s) => [s.name, s]));

  let checked = 0;
  for (const file of vueFilesUnder(LOGISTICS_VIEWS_DIR)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/router\.push\(\{\s*name:\s*"([^"]+)"/g)) {
      const target = byName.get(match[1]);
      assert.ok(target, `${relative(SRC_DIR, file)}: "${match[1]}" manifestte yok`);
      checked++;
      if (target.ready) continue;
      assert.ok(
        source.includes(`isScreenReady("${target.key}")`),
        `${relative(SRC_DIR, file)}: ${target.key} hazır değil ama buton koşulsuz çiziliyor`
      );
    }
  }
  assert.ok(checked > 0, "hiç yönlendirme taranmadı — regex bozulmuş olabilir");
});
