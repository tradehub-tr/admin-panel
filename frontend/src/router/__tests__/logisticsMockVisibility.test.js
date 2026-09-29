// Mock'a bağlı ekran/sekme görünürlüğü — MOGEM-685 F-03.
//
// Ürün kararı: PROD'da sahte veri yok. Ucu yazılmamış (`MOCK` satırı true)
// bir api modülüne ulaşan ekran orada boş/hatalı açılacağı için gizleniyor.
// Karar manifestin `mockApi` alanına bakıyor; bu dosya iki şeyi zorluyor:
//   1. `mockApi` ELLE BAYATLAMAZ — içe aktarım ağacından yeniden hesaplanıp
//      karşılaştırılıyor. Yeni bir ekran mock'lu bir store'a bağlanırsa ya da
//      bir bağ koparsa burada kırmızı olur.
//   2. Mock kapalıyken (PROD) gizlenen / görünen ekranlar ve sekmeler.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { SHIPMENT_TABS } from "../../views/logistics/shipmentTabRegistry.js";
import { resolveShipmentTabs } from "../../views/logistics/_contract/shipmentTabContract.js";
import {
  LOGISTICS_SCREENS,
  isScreenReady,
  kapaliEkranHedefi,
  menuScreens,
  mockHiddenScreens,
  readyScreens,
  sellerMenuScreens,
} from "../logisticsScreens.js";

const SRC = normalize(fileURLToPath(new URL("../..", import.meta.url)));
const API = join(SRC, "api");

/** `export const MOCK = {` taşıyan api modülleri — kapının yönettikleri. */
const MOCKLU = new Set(
  readdirSync(API)
    .filter((ad) => ad.endsWith(".js"))
    .filter((ad) => readFileSync(join(API, ad), "utf8").includes("export const MOCK = {"))
    .map((ad) => ad.replace(/\.js$/, ""))
);

// Statik içe aktarım (`import … from`, `export … from`, yan etki `import "…"`).
// Dinamik `import()` BİLEREK sayılmıyor: tembel yüklenen bir parça ekranı açarken
// değil, bir etkileşimde gelir (ör. mock geliştirici paneli yalnız anahtar açıkken).
const IMPORT =
  /(?:^\s*import\s[^'"]*?from\s*|^\s*import\s*|^\s*export\s[^'"]*?from\s*)['"]([^'"]+)['"]/gm;

function coz(kimden, hedef) {
  let yol;
  if (hedef.startsWith("@/")) yol = join(SRC, hedef.slice(2));
  else if (hedef.startsWith(".")) yol = normalize(join(dirname(kimden), hedef));
  else return null;
  const dosyaMi = (a) => existsSync(a) && statSync(a).isFile();
  return [yol, `${yol}.js`, `${yol}.vue`, join(yol, "index.js")].find(dosyaMi) ?? null;
}

/** Dosyadan statik olarak ulaşılan MOCK'lu api modülleri. */
function ulasilanMockApi(giris) {
  const gorulen = new Set();
  const bulunan = new Set();
  const yigin = [giris];
  while (yigin.length) {
    const dosya = yigin.pop();
    if (!dosya || gorulen.has(dosya)) continue;
    gorulen.add(dosya);
    const ad = dosya.slice(dosya.lastIndexOf("/") + 1).replace(/\.js$/, "");
    if (dosya.startsWith(`${API}/`) && MOCKLU.has(ad)) bulunan.add(ad);
    for (const [, hedef] of readFileSync(dosya, "utf8").matchAll(IMPORT)) {
      const yol = coz(dosya, hedef);
      // Router dizini geri dönüş: manifest ↔ router döngüsü her ekranı her şeye bağlardı.
      if (
        yol &&
        !yol.includes("__tests__") &&
        !yol.includes(".stories.") &&
        !yol.startsWith(join(SRC, "router"))
      )
        yigin.push(yol);
    }
  }
  return [...bulunan].sort();
}

const aliasYolu = (p) => join(SRC, p.replace(/^@\//, ""));

test("MOCK'lu api modülü taraması boş değil", () => {
  // Boş küme aşağıdaki karşılaştırmayı "hiçbir ekran mock'a bağlı değil" diye yeşil bırakırdı.
  assert.ok(MOCKLU.size >= 10, [...MOCKLU].join(","));
});

test("manifestteki `mockApi` içe aktarım ağacıyla birebir aynı (her hazır ekran)", () => {
  const farklar = [];
  for (const ekran of LOGISTICS_SCREENS.filter((s) => s.ready)) {
    const beklenen = ulasilanMockApi(aliasYolu(ekran.viewPath));
    const yazili = [...(ekran.mockApi ?? [])].sort();
    if (JSON.stringify(beklenen) !== JSON.stringify(yazili)) {
      farklar.push(`${ekran.key}: yazılı [${yazili}] · hesaplanan [${beklenen}]`);
    }
  }
  assert.deepEqual(
    farklar,
    [],
    "Manifest `mockApi` bayat — ekran PROD'da yanlış gizlenir/gösterilir. " +
      "Hesaplanan listeyi ekranın kaydına yaz (bkz. logisticsScreens.js başlığı)."
  );
});

test("sekme defterindeki `mockApi` içe aktarım ağacıyla birebir aynı", () => {
  const farklar = [];
  for (const sekme of SHIPMENT_TABS) {
    const beklenen = ulasilanMockApi(aliasYolu(sekme.componentPath));
    const yazili = [...(sekme.mockApi ?? [])].sort();
    if (JSON.stringify(beklenen) !== JSON.stringify(yazili)) {
      farklar.push(`${sekme.key}: yazılı [${yazili}] · hesaplanan [${beklenen}]`);
    }
  }
  assert.deepEqual(farklar, []);
});

/** PROD derlemesinin bakışı: anahtar kapalı, bekleyen modüller verili. */
function mockKapaliyken(bekleyen, fn) {
  const eski = [globalThis.__LOJISTIK_MOCK__, globalThis.__LOJISTIK_MOCK_BEKLEYEN__];
  globalThis.__LOJISTIK_MOCK__ = false;
  globalThis.__LOJISTIK_MOCK_BEKLEYEN__ = bekleyen;
  try {
    return fn();
  } finally {
    [globalThis.__LOJISTIK_MOCK__, globalThis.__LOJISTIK_MOCK_BEKLEYEN__] = eski;
  }
}

const anahtarlar = (liste) => liste.map((s) => s.key).sort();

test("mock AÇIK (önizleme): hazır ekranların hepsi route'ta, hiçbiri gizli değil", () => {
  assert.deepEqual(
    anahtarlar(readyScreens()),
    anahtarlar(LOGISTICS_SCREENS.filter((s) => s.ready))
  );
  assert.deepEqual(mockHiddenScreens(), []);
});

test("mock KAPALI (PROD): mock bekleyen ekranlar route'tan, menüden, isScreenReady'den düşer", () => {
  const bekleyen = [...MOCKLU].sort();
  mockKapaliyken(bekleyen, () => {
    const gizli = LOGISTICS_SCREENS.filter((s) => s.ready && s.mockApi?.length);
    assert.ok(gizli.length > 0);
    const route = new Set(anahtarlar(readyScreens()));
    const menu = new Set(anahtarlar(menuScreens()));
    const satici = new Set(anahtarlar(sellerMenuScreens()));
    for (const s of gizli) {
      assert.ok(!route.has(s.key), `${s.key} route'ta kaldı`);
      assert.ok(!menu.has(s.key), `${s.key} menüde kaldı`);
      assert.ok(!satici.has(s.key), `${s.key} satıcı menüsünde kaldı`);
      assert.equal(isScreenReady(s.key), false, `${s.key} isScreenReady true — ölü buton`);
    }
    assert.deepEqual(anahtarlar(mockHiddenScreens()), anahtarlar(gizli));
  });
});

test("mock KAPALI (PROD): uçları yazılmış ekranlar GÖRÜNÜR kalır", () => {
  // Gerçek uca bağlı ekranlar (katalog, ayarlar, taşıyıcı hesapları, sevkiyat
  // listesi/detayı/durum) kapıdan etkilenmemeli.
  mockKapaliyken([...MOCKLU], () => {
    const gercek = LOGISTICS_SCREENS.filter((s) => s.ready && !s.mockApi?.length);
    assert.ok(gercek.length > 0);
    for (const s of gercek) assert.equal(isScreenReady(s.key), true, s.key);
    for (const key of ["M1", "M3", "F1", "F4", "B1", "B2", "C2"]) {
      assert.ok(anahtarlar(readyScreens()).includes(key), `${key} route'tan düştü`);
    }
  });
});

test("uç yazılınca (modül bekleyen listeden çıkınca) ekran KENDİLİĞİNDEN görünür", () => {
  const ekran = LOGISTICS_SCREENS.find((s) => s.key === "I1");
  assert.deepEqual(ekran.mockApi, ["returns"]);
  mockKapaliyken(["returns"], () => assert.equal(isScreenReady("I1"), false));
  mockKapaliyken([], () => assert.equal(isScreenReady("I1"), true));
});

test("mock KAPALI (PROD): sevkiyat detayında mock bekleyen sekmeler düşer, diğerleri kalır", () => {
  const ctx = { shipment: {}, documents: [], can: {} };
  const acik = resolveShipmentTabs(SHIPMENT_TABS, ctx).map((t) => t.key);
  const kapali = mockKapaliyken([...MOCKLU], () =>
    resolveShipmentTabs(SHIPMENT_TABS, ctx).map((t) => t.key)
  );
  for (const sekme of SHIPMENT_TABS) {
    const bekliyor = Boolean(sekme.mockApi?.length);
    assert.ok(acik.includes(sekme.key), `${sekme.key} önizlemede görünmüyor`);
    assert.equal(kapali.includes(sekme.key), !bekliyor, sekme.key);
  }
  assert.ok(kapali.length > 0, "tüm sekmeler düştü");
});

// MOGEM-685 bulgu 18 — gizli ekranın adresi komşu parametreli rotaya düşmemeli.
// Ölçüldü (L3, PROD eşdeğeri): `/lojistik/sevkiyatlar/yeni` → `sevkiyatlar/:name` →
// "Kayıt bulunamadı: yeni". Artık her gizli ekranın yolu açık bir ekrana yönlenir.
test("mock KAPALI (PROD): her gizli ekranın yolu açık, parametresiz bir ekrana yönlenir", () => {
  mockKapaliyken(globalThis.__LOJISTIK_MOCK_BEKLEYEN__, () => {
    const gizli = mockHiddenScreens();
    assert.ok(gizli.length > 0, "karşı kanıt: PROD'da gizli ekran yoksa test boş geçer");
    const acik = new Set(readyScreens().map((s) => `/${s.path}`));
    for (const ekran of gizli) {
      const hedef = kapaliEkranHedefi(ekran);
      assert.ok(!hedef.includes(":"), `${ekran.key}: hedef parametreli (${hedef})`);
      assert.ok(hedef === "/" || acik.has(hedef), `${ekran.key}: hedef açık değil (${hedef})`);
    }
    const c1 = LOGISTICS_SCREENS.find((s) => s.key === "C1");
    assert.equal(kapaliEkranHedefi(c1), "/lojistik/sevkiyatlar");
  });
});

test("router gizli ekran yollarını yönlendirme olarak kaydediyor", () => {
  const kaynak = readFileSync(join(SRC, "router", "index.js"), "utf8");
  assert.match(kaynak, /\.\.\.logisticsRoutes\(\),\s*\.\.\.kapaliLogisticsRoutes\(\),/);
  assert.match(kaynak, /mockHiddenScreens\(\)\.map\(/);
  assert.match(kaynak, /logistics\.screenNotOpenHere/);
});
