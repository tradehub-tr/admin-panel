// Dizin sahipliği haritasının DEĞİŞMEZLERİ.
//
// Bu testin işi dosyaları doğrulamak değil — haritanın gerçekle aynı şeyi
// söylemesini zorlamak. Harita bayatlarsa çakışma garantisi kâğıt üstünde
// kalır: sekme sözleşmesi de, ekran manifesti de sahip kararını buradan
// alıyor.

import assert from "node:assert/strict";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  OWNERS,
  SCREEN_COMPONENT_OWNERS,
  SHARED_APPEND_ONLY_FILES,
  SHARED_LOGISTICS_COMPONENTS,
  VIEW_DIR_OWNERS,
  dirsOwnedBy,
  ownerOfLogisticsComponent,
  ownerOfViewPath,
} from "../ownership.js";

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const LOGISTICS_VIEWS_DIR = join(SRC_DIR, "views/logistics");
const LOGISTICS_COMPONENTS_DIR = join(SRC_DIR, "components/logistics");

/**
 * LOGISTICS-TASK-SPLIT.md §3'ün birebir kopyası.
 *
 * Belge ile kod arasındaki bağ burada: split doc PM onaylı ve dizin sınırı
 * onun kararı. Harita değişirse bu test kırılır ve değişiklik "belgeyi de
 * güncelle" konuşmasını zorunlu kılar.
 */
const SPLIT_DOC_ALI_DIRS = [
  "packages",
  "labels",
  "pod",
  "delivery-locations",
  "returns",
  "pricing",
];
const SPLIT_DOC_BORA_DIRS = ["dashboard", "shipments", "catalog", "exceptions", "reports"];

test("haritadaki her dizin diskte GERÇEKTEN var", () => {
  for (const dir of Object.keys(VIEW_DIR_OWNERS)) {
    const full = join(LOGISTICS_VIEWS_DIR, dir);
    assert.ok(existsSync(full), `${dir} haritada var ama diskte yok`);
    assert.ok(statSync(full).isDirectory(), `${dir} bir dizin değil`);
  }
});

test("diskteki her dizinin bir sahibi var", () => {
  // Sahipsiz dizin = kimin dokunacağı belirsiz alan. Yeni dizin açan kişi
  // haritayı da güncellemek zorunda kalsın.
  const onDisk = readdirSync(LOGISTICS_VIEWS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const dir of onDisk) {
    assert.ok(VIEW_DIR_OWNERS[dir], `${dir}/ dizininin sahibi ownership.js'te yazılı değil`);
  }
});

test("sahip etiketleri geçerli", () => {
  for (const [dir, owner] of Object.entries(VIEW_DIR_OWNERS)) {
    assert.ok(OWNERS.includes(owner), `${dir} → "${owner}" tanınmayan sahip`);
  }
});

test("split doc'un verdiği dizinler doğru kişide", () => {
  for (const dir of SPLIT_DOC_ALI_DIRS) {
    assert.equal(VIEW_DIR_OWNERS[dir], "ali", `${dir} split doc'a göre Ali'nin`);
  }
  for (const dir of SPLIT_DOC_BORA_DIRS) {
    assert.equal(VIEW_DIR_OWNERS[dir], "bora", `${dir} split doc'a göre Bora'nın`);
  }
});

test("sözleşme katmanı kimsenin tek başına malı değil", () => {
  // `_contract` iki tarafı da bağlıyor: sekme sözleşmesi ve sahiplik haritası
  // orada. Tek kişiye yazılsaydı diğerinin PR'sız değiştirmesi normalleşirdi.
  assert.equal(VIEW_DIR_OWNERS._contract, "shared");
});

test("ownerOfViewPath yolu doğru çözüyor", () => {
  assert.equal(ownerOfViewPath("@/views/logistics/shipments/ShipmentListView.vue"), "bora");
  assert.equal(ownerOfViewPath("@/views/logistics/pricing/tabs/PricingTab.vue"), "ali");
  assert.equal(ownerOfViewPath("@/views/logistics/_contract/ownership.js"), "shared");
});

test("ownerOfViewPath tanımadığı yola SAHİP UYDURMUYOR", () => {
  // Sessizce bir sahip döndürseydi yanlış dizindeki dosya doğrulamayı geçerdi.
  for (const bad of [
    "@/views/logistics/yok-boyle-dizin/X.vue", // haritada olmayan dizin
    "@/views/orders/OrderListView.vue", // lojistik dışı
    "src/views/logistics/shipments/X.vue", // alias'sız yol
    "@/views/logistics/X.vue", // dizinsiz, doğrudan kökte
    "",
    null,
    undefined,
    42,
  ]) {
    assert.equal(ownerOfViewPath(bad), null, `${String(bad)} için sahip uyduruldu`);
  }
});

test("dirsOwnedBy sahip başına dizinleri veriyor", () => {
  const ali = dirsOwnedBy("ali");
  const bora = dirsOwnedBy("bora");

  for (const dir of SPLIT_DOC_ALI_DIRS) assert.ok(ali.includes(dir), `${dir} Ali listesinde yok`);
  for (const dir of SPLIT_DOC_BORA_DIRS)
    assert.ok(bora.includes(dir), `${dir} Bora listesinde yok`);

  // Bir dizin iki kişiye birden ait olamaz.
  assert.equal(
    ali.some((dir) => bora.includes(dir)),
    false,
    "dizin iki sahipte birden"
  );
});

// ───────────────────────────────────────────────────────────────────────
// components/logistics/ — sunum katmanının sahipliği
// ───────────────────────────────────────────────────────────────────────

test("components/logistics altındaki HER dosyanın sahibi var", () => {
  // Bu dizin uzun süre "tamamen Bora'nın" sayıldı. Oysa Ali'nin 14 bekleyen
  // ekranının sunum bileşeni burada duruyor (ProofOfDeliveryScreen,
  // PackingWorkspaceScreen, ReturnQueueScreen…) — 13/14/15/20-FE'de Ali
  // onlara dokunacak. Sınır makine okumadığı sürece "sıfır çakışma" sözü
  // tam da ana iş yükünde geçersizdi.
  const files = readdirSync(LOGISTICS_COMPONENTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(vue|js)$/.test(entry.name))
    .map((entry) => entry.name)
    .filter((name) => !name.endsWith(".stories.js"));

  for (const file of files) {
    assert.ok(
      ownerOfLogisticsComponent(file),
      `${file}: sahibi yok — SHARED_LOGISTICS_COMPONENTS ya da SCREEN_COMPONENT_OWNERS'a ekle`
    );
  }
});

test("bileşen sahipliği haritaları diskle tutarlı", () => {
  const onDisk = new Set(
    readdirSync(LOGISTICS_COMPONENTS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
  );

  for (const file of SHARED_LOGISTICS_COMPONENTS) {
    assert.ok(onDisk.has(file), `ortak bileşen listesinde olmayan dosya: ${file}`);
  }
  for (const base of Object.keys(SCREEN_COMPONENT_OWNERS)) {
    assert.ok(onDisk.has(`${base}.vue`), `sahiplik haritasında olmayan ekran: ${base}.vue`);
  }
});

test("bileşen sahipleri geçerli ve ortak bileşenler shared", () => {
  for (const [base, owner] of Object.entries(SCREEN_COMPONENT_OWNERS)) {
    assert.ok(["bora", "ali"].includes(owner), `${base} → "${owner}" geçersiz sahip`);
  }
  for (const file of SHARED_LOGISTICS_COMPONENTS) {
    assert.equal(ownerOfLogisticsComponent(file), "shared", `${file} shared sayılmıyor`);
  }
  // Tanınmayan dosyaya sahip UYDURULMUYOR.
  assert.equal(ownerOfLogisticsComponent("YokBoyleBirSey.vue"), null);
  assert.equal(ownerOfLogisticsComponent(""), null);
  assert.equal(ownerOfLogisticsComponent(null), null);
});

test("Ali'nin ekran bileşenleri gerçekten Ali'de", () => {
  // G1/G2/G3 sunum ekranları 13-FE'de views/logistics/{packages,labels}
  // altına taşındı; components/ kopyaları silindi ve listeden düşürüldü.
  // Aynısı 14-FE'de POD/teslimat için yapıldı (K-D): ProofOfDeliveryScreen,
  // StationTimelineScreen, SellerDeliveryScreen ve BuyerPickupScreen silinip
  // views/logistics/{pod,delivery-locations} altında yeniden yazıldı.
  // Split doc §3'ün dizin sınırının sunum katmanındaki karşılığı.
  const aliScreens = ["ReturnQueueScreen", "PricingRuleScreen"];
  for (const base of aliScreens) {
    assert.equal(SCREEN_COMPONENT_OWNERS[base], "ali", `${base} Ali'de olmalı`);
  }
});

test("ortak-yazılan dosyaların yolları GERÇEK", () => {
  // Liste belgeye referans veriliyor; yol değişirse sessizce bayatlamasın.
  for (const rel of SHARED_APPEND_ONLY_FILES) {
    assert.ok(existsSync(join(SRC_DIR, "..", rel)), `${rel} diskte yok`);
  }
});
