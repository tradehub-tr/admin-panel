// Sevkiyat detayı sekme sözleşmesinin DEĞİŞMEZLERİ.
//
// Kayıt defteri iki geliştiricinin ortak dosyası. Bu testler sözleşmenin
// sessizce eğilmesini engelliyor: yanlış dizindeki bileşen, sebebi
// yazılmamış boş sekme, çevrilmemiş etiket, `componentPath` ile gerçek
// import'un ayrışması — hepsi merge'de değil, burada kırmızı olur.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ownerOfViewPath } from "../ownership.js";
import {
  createShipmentTabRegistry,
  defineShipmentTab,
  resolveShipmentTabs,
} from "../shipmentTabContract.js";
import { SHIPMENT_TABS } from "../../shipmentTabRegistry.js";

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

/** `@/x/y.vue` → mutlak dosya yolu. */
const toFsPath = (aliasPath) => join(SRC_DIR, aliasPath.replace(/^@\//, ""));

/** Sözleşmeye uyan, testlerde temel alınan geçerli kayıt. */
const validSpec = () => ({
  key: "demo",
  screenKey: "Z9",
  owner: "ali",
  labelKey: "logistics.tab.demo",
  order: 999,
  componentPath: "@/views/logistics/pricing/tabs/DemoTab.vue",
  component: () => import("@/views/logistics/pricing/tabs/DemoTab.vue"),
  props: ({ shipment }) => ({ shipment }),
  blockedBy: null,
});

// ───────────────────────────────────────────────────────────────────────
// Kayıt defterinin kendisi
// ───────────────────────────────────────────────────────────────────────

test("kayıt defteri boş değil ve `order`a göre sıralı", () => {
  assert.ok(SHIPMENT_TABS.length > 0, "hiç sekme kayıtlı değil");

  const orders = SHIPMENT_TABS.map((tab) => tab.order);
  assert.deepEqual(
    orders,
    [...orders].sort((a, b) => a - b),
    "sekmeler sıralanmamış"
  );
});

test("kayıtlar dondurulmuş — çalışma anında değiştirilemez", () => {
  assert.ok(Object.isFrozen(SHIPMENT_TABS), "defter donmamış");
  for (const tab of SHIPMENT_TABS) {
    assert.ok(Object.isFrozen(tab), `${tab.key} donmamış`);
  }
});

test("her sekmenin bileşeni SAHİBİNİN dizininde", () => {
  // Çakışma garantisinin kalbi: kaydı Ali yaptıysa dosya da Ali'nin
  // dizininde olmalı. `defineShipmentTab` bunu yükleme anında zorluyor;
  // burada tekrar doğrulanıyor ki kural sessizce gevşetilmesin.
  for (const tab of SHIPMENT_TABS) {
    assert.equal(
      ownerOfViewPath(tab.componentPath),
      tab.owner,
      `${tab.key}: kayıt "${tab.owner}" diyor, dizin başkasının`
    );
  }
});

test("bileşen dosyaları diskte GERÇEKTEN var", () => {
  // Ekran manifestinden farklı: sekmenin bekleyen hâli yok — kaydı varsa
  // bileşeni de vardır. Olmayan dosyaya lazy import Vite build'ini kırar.
  for (const tab of SHIPMENT_TABS) {
    assert.ok(existsSync(toFsPath(tab.componentPath)), `${tab.key}: ${tab.componentPath} yok`);
  }
});

test("lazy import ile componentPath AYRIŞMAMIŞ", () => {
  // İkisi ayrı yazıldığı için sürüklenebilirler: yol güncellenip import
  // unutulursa sekme başka bir dosyayı yükler ve kimse fark etmez.
  for (const tab of SHIPMENT_TABS) {
    assert.ok(
      String(tab.component).includes(`"${tab.componentPath}"`),
      `${tab.key}: import metni componentPath ile aynı değil`
    );
  }
});

test("beslenmeyen sekme NEYİ beklediğini söylüyor", () => {
  for (const tab of SHIPMENT_TABS) {
    if (tab.blockedBy === null) continue;
    assert.ok(
      typeof tab.blockedBy === "string" && tab.blockedBy.trim().length > 10,
      `${tab.key}: blockedBy gerekçe değil, etiket gibi duruyor`
    );
  }
});

test("sekme etiketleri tr ve en'de ÇEVRİLİ", async () => {
  // Çevrilmemiş anahtar sekme çubuğunda ham metin olarak görünür
  // ("logistics.tab.pod"). Menü anahtarları için aynı koruma
  // `router/__tests__/logisticsScreens.test.js` içinde var.
  const [tr, en] = await Promise.all([
    import("../../../../i18n/locales/tr.js"),
    import("../../../../i18n/locales/en.js"),
  ]);
  const read = (dict, path) => path.split(".").reduce((acc, key) => acc?.[key], dict);

  for (const tab of SHIPMENT_TABS) {
    for (const [locale, mod] of [
      ["tr", tr],
      ["en", en],
    ]) {
      assert.equal(
        typeof read(mod.default, tab.labelKey),
        "string",
        `${tab.key}: ${tab.labelKey} ${locale} içinde yok`
      );
    }
  }
});

test("her sekmenin envanter kodu benzersiz", () => {
  const keys = SHIPMENT_TABS.map((tab) => tab.screenKey);
  assert.equal(new Set(keys).size, keys.length, "aynı envanter kodu iki sekmede");
});

test("sekme kodları EKRAN kodlarıyla çakışmıyor", async () => {
  // Envanter tek numara alanı: bir kalem ya ekran ya sekmedir, ikisi birden
  // olursa çift sayılır. Denetim sözleşmenin İÇİNDE değil çünkü sözleşme
  // genel bir mekanizma; ekran manifestini tanısaydı `_contract` → `router`
  // yönünde bir bağımlılık doğar, katman sırası tersine dönerdi. Test iki
  // modülü de import edebiliyor — doğru yer burası.
  //
  // Sekme eklerken bölümün serisinde BOŞTA olan ilk numarayı al: POD
  // bölümünde H1/H2 ekran olduğu için POD sekmesi "H3" olur.
  const { LOGISTICS_SCREENS } = await import("../../../../router/logisticsScreens.js");
  const screenKeys = new Set(LOGISTICS_SCREENS.map((screen) => screen.key));

  for (const tab of SHIPMENT_TABS) {
    assert.equal(
      screenKeys.has(tab.screenKey),
      false,
      `"${tab.key}" sekmesi ${tab.screenKey} kodunu kullanıyor ama o kod zaten bir EKRANIN. ` +
        `Bölüm serisinde boşta olan bir sonraki numarayı seç.`
    );
  }
});

test("bir sekmenin hatası TÜM çubuğu düşürmüyor", () => {
  // Kayıt defteri iki geliştiricinin ortak alanı: yanlış varsayım yapan bir
  // count()/alert() korumasız bırakılsaydı resolve komple çöker, kullanıcı
  // sekme çubuğunu HİÇ göremezdi.
  const patlayan = defineShipmentTab({
    ...validSpec(),
    count: () => {
      throw new Error("beklenmedik şekil");
    },
    alert: () => {
      throw new Error("beklenmedik şekil");
    },
  });
  const registry = createShipmentTabRegistry([patlayan]);

  const originalError = console.error;
  console.error = () => {};
  try {
    const [tab] = resolveShipmentTabs(registry, CTX);
    assert.equal(tab.count, undefined, "hatalı sayaç değere dönüşmüş");
    assert.equal(tab.alert, false, "hatalı uyarı değere dönüşmüş");
  } finally {
    console.error = originalError;
  }
});

// ───────────────────────────────────────────────────────────────────────
// defineShipmentTab — hatalı kaydı YÜKLEME ANINDA reddetmeli
// ───────────────────────────────────────────────────────────────────────

test("geçerli kayıt kabul ediliyor ve donuyor", () => {
  const tab = defineShipmentTab(validSpec());
  assert.equal(tab.key, "demo");
  assert.ok(Object.isFrozen(tab));
});

test("sahiplik çelişkisi reddediliyor", () => {
  // En kritik kural: Ali'nin kaydı Bora'nın dizinini gösteremez.
  assert.throws(
    () =>
      defineShipmentTab({
        ...validSpec(),
        componentPath: "@/views/logistics/shipments/tabs/SneakyTab.vue",
        component: () => import("@/views/logistics/shipments/tabs/SneakyTab.vue"),
      }),
    /sahiplik çelişkisi/
  );
});

test("tanınmayan dizin reddediliyor", () => {
  assert.throws(
    () =>
      defineShipmentTab({
        ...validSpec(),
        componentPath: "@/views/logistics/yok-boyle/DemoTab.vue",
      }),
    /tanınmayan dizin/
  );
});

test("eksik veya bozuk alanlar reddediliyor", () => {
  const cases = [
    [{ key: "Demo" }, /key küçük harf/, "büyük harfli anahtar"],
    [{ key: "" }, /key küçük harf/, "boş anahtar"],
    [{ screenKey: "b3" }, /screenKey/, "küçük harfli envanter kodu"],
    [{ owner: "veli" }, /owner/, "tanınmayan sahip"],
    [{ owner: "shared" }, /owner/, "shared sekme sahibi olamaz"],
    [{ labelKey: "nav.item.pod" }, /labelKey/, "yanlış i18n ad alanı"],
    [{ order: "10" }, /order/, "metin sıra"],
    [{ component: "yol" }, /component/, "lazy import değil"],
    [{ props: undefined }, /props/, "veri sözleşmesi ilan edilmemiş"],
    [{ count: 5 }, /count/, "count fonksiyon değil"],
    [{ blockedBy: undefined }, /blockedBy/, "besleme durumu belirsiz"],
    [{ blockedBy: "   " }, /blockedBy/, "gerekçesiz engel"],
  ];

  for (const [patch, pattern, label] of cases) {
    assert.throws(() => defineShipmentTab({ ...validSpec(), ...patch }), pattern, label);
  }
});

test("aynı anahtar/sıra/yol iki kez kaydedilemiyor", () => {
  const base = validSpec();
  for (const patch of [
    { key: base.key }, // aynı anahtar
    { order: base.order }, // aynı sıra
    { componentPath: base.componentPath, component: base.component }, // aynı dosya
    { screenKey: base.screenKey }, // aynı envanter kodu
  ]) {
    assert.throws(
      () =>
        createShipmentTabRegistry([
          defineShipmentTab(base),
          defineShipmentTab({
            ...base,
            key: "demo-2",
            screenKey: "Z8",
            order: 998,
            componentPath: "@/views/logistics/pricing/tabs/OtherTab.vue",
            component: () => import("@/views/logistics/pricing/tabs/OtherTab.vue"),
            ...patch,
          }),
        ]),
      /zaten/,
      JSON.stringify(patch)
    );
  }
});

// ───────────────────────────────────────────────────────────────────────
// resolveShipmentTabs — kabuğun gördüğü hâl
// ───────────────────────────────────────────────────────────────────────

const CTX = {
  shipment: { name: "SHP-1", items: [{ item: "A" }, { item: "B" }], packages: [], events: [] },
  documents: [{ label: "İrsaliye" }],
  can: { viewCost: true },
};

test("çözülmüş sekme kabuğun beklediği alanları taşıyor", () => {
  const items = resolveShipmentTabs(SHIPMENT_TABS, CTX).find((tab) => tab.key === "items");

  assert.equal(items.count, 2);
  assert.equal(items.blocked, false);
  assert.equal(items.alert, false);
  assert.equal(typeof items.component, "function");
  assert.deepEqual(items.props(), { items: CTX.shipment.items });
});

test("beslenmeyen sekme SAYAÇ BASMIYOR", () => {
  // `0` yazmak "kayıt yok" demek; oysa bilgi taşınmıyor. Ayrım bilinçli.
  for (const tab of resolveShipmentTabs(SHIPMENT_TABS, CTX)) {
    if (!tab.blocked) continue;
    assert.equal(tab.count, undefined, `${tab.key}: engelli ama sayaç basıyor`);
    assert.equal(tab.alert, false, `${tab.key}: engelli ama uyarı veriyor`);
    assert.deepEqual(tab.props(), {}, `${tab.key}: engelli ama prop hesaplıyor`);
  }
});

test("boş bağlam çökertmiyor", () => {
  // Sevkiyat gelmeden çözülürse (yükleniyor/hata) sekme çubuğu yine de
  // çizilebilmeli — container `null` gönderebiliyor.
  const tabs = resolveShipmentTabs(SHIPMENT_TABS, {});
  assert.equal(tabs.length, SHIPMENT_TABS.length);
  for (const tab of tabs) assert.doesNotThrow(() => tab.props());
});

test("visibleWhen sekmeyi tamamen gizliyor (G0 rol matrisi kancası)", () => {
  const registry = createShipmentTabRegistry([
    defineShipmentTab({ ...validSpec(), visibleWhen: ({ can }) => Boolean(can.viewCost) }),
  ]);

  assert.equal(resolveShipmentTabs(registry, { can: { viewCost: true } }).length, 1);
  assert.equal(resolveShipmentTabs(registry, { can: { viewCost: false } }).length, 0);
});

test("props tembel — çözerken DEĞİL, çağırınca hesaplanıyor", () => {
  let calls = 0;
  const registry = createShipmentTabRegistry([
    defineShipmentTab({
      ...validSpec(),
      props: () => {
        calls += 1;
        return {};
      },
    }),
  ]);

  const [tab] = resolveShipmentTabs(registry, CTX);
  assert.equal(calls, 0, "çözme sırasında prop hesaplandı");
  tab.props();
  assert.equal(calls, 1);
});
