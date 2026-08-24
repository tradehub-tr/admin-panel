// Lojistik EKRAN story'leri için ortak koşum takımı.
//
// ─────────────────────────────────────────────────────────────────────────
// NEDEN "STORE MOCK'U" DEĞİL:
//   `KALAN-ISLER.md` §A9 story'lerin store sahtelenerek yazılmasını
//   öneriyordu ve hemen ardından kendi uyarısını koyuyordu: store'un iç
//   yapısı değişirse story SESSİZCE yalan söyler.
//
//   Gerek kalmadı. Bu dokuz ekranın veri katmanı zaten mock ve tam bir
//   kontrol yüzeyi sunuyor (`podMock`, `packagingMock`, `pricingMock`:
//   `resetMockData()` · `setFault()` · `clearFault()`). Story GERÇEK store'u
//   ve GERÇEK mock zincirini koşturuyor; sahtelenen tek şey mock'un
//   BAŞLANGIÇ DURUMU. Sonuç: store'un iç yapısı değişirse story kırılır,
//   yalan söylemez — ve "hata" varyantları uydurma yükle değil sözleşmedeki
//   GERÇEK hata kodlarıyla üretiliyor.
//
// ─────────────────────────────────────────────────────────────────────────
// STORY İZOLASYONU — neden her story sıfırlanıyor:
//   Mock kalıcı (`localStorage`), yani bir story'de paketlenen koli bir
//   sonrakinde de paketlenmiş görünür. Bu FE mock disiplininin bilinçli
//   sonucu (`docs/lojistik/FE-MOCK-DISIPLINI.md` — "yenileyince iş durur"),
//   ama story'ler arasında sızıntı demek. Her story kendi durumunu baştan
//   kurar; Pinia örneği Storybook'ta TEK olduğu için store yüzeyleri de
//   elle sıfırlanıyor.

import { ref } from "vue";

import {
  resetMockData as resetPackagingMock,
  setFault as setPackagingFault,
} from "../../src/api/packagingMock.js";
import { resetMockData as resetPodMock, setFault as setPodFault } from "../../src/api/podMock.js";
import {
  resetMockData as resetPricingMock,
  setFault as setPricingFault,
} from "../../src/api/pricingMock.js";
import { SELLER_ME } from "../../src/api/podSeed.js";
import { useAuthStore } from "../../src/stores/auth.js";
import { useLogisticsStore } from "../../src/stores/logistics.js";
import { usePackagingStore } from "../../src/stores/packaging.js";
import { usePodStore } from "../../src/stores/pod.js";
import { usePricingStore } from "../../src/stores/pricing.js";
import { setStoryCapabilities } from "../mocks/api.js";
import { storyRouter } from "./router.js";

// ── roller ───────────────────────────────────────────────────────────
//
// Rol iki yerde birden etkili: `auth` store'u ekranın kendi dallanmasını
// besliyor (`auth.isAdmin` → DEMO paneli), capability kümesi ise
// `logisticsStore.can` üzerinden düğmeleri açıp kapatıyor. İkisi ayrı ayrı
// ayarlanmazsa story "admin görünüp satıcı gibi davranan" bir melez olur.

/** Tam yetkili lojistik yöneticisi. */
const ADMIN_CAPS = [
  "shipment.create",
  "shipment.write",
  "shipment.cancel",
  "shipment.split",
  "view.logistics_cost",
  "view.tracking",
  "carrier_credential.manage",
  "view.carrier_secret",
  // 13/14/20-BE'de eklenecek köprü adları — `can` computed'ı bunlara bakıyor
  // ve tanımlıysa köprüye düşmüyor.
  "shipment.label.generate",
  "shipment.label.reprint",
  "shipment.label.void",
  "pod.amend",
  "view.pod_media",
  "pricing_rule.write",
];

/**
 * Satıcı: kendi sevkiyatını paketler, etiketini basar, teslimatını yapar.
 * Taşıyıcı kimlik bilgisi ve maliyet görünürlüğü YOK; POD düzeltmesi de yok
 * (`stores/pod.js` — satıcı kendi beyanını sessizce değiştiremez).
 */
const SELLER_CAPS = ["shipment.create", "shipment.write", "view.tracking"];

/** Salt-okunur operatör — hiçbir yazma düğmesi çizilmemeli. */
const READONLY_CAPS = ["view.tracking"];

const ROLLER = {
  admin: {
    caps: ADMIN_CAPS,
    roles: { is_logistics_manager: true },
    user: {
      name: "Administrator",
      email: "yonetici@istoc.com",
      full_name: "Yönetici (Storybook)",
      is_admin: 1,
      is_seller: 0,
      roles: ["System Manager", "Logistics Manager"],
      capabilities: [],
    },
  },
  seller: {
    caps: SELLER_CAPS,
    roles: { is_logistics_manager: false },
    user: {
      name: "kaya@istoc.com",
      email: "kaya@istoc.com",
      // Mock'un tenant süzgeci ADA bakıyor: tohum bu adla etiketlenmezse
      // satıcı BOŞ ekran görür (ölçülmüş hata — `api/podMock.js` seed notu).
      full_name: SELLER_ME,
      is_admin: 0,
      is_seller: 1,
      is_owner: 1,
      roles: ["Seller Owner"],
      capabilities: [],
    },
  },
  readonly: {
    caps: READONLY_CAPS,
    roles: { is_logistics_manager: false },
    user: {
      name: "operator@istoc.com",
      email: "operator@istoc.com",
      full_name: "Operatör (Storybook)",
      is_admin: 0,
      is_seller: 0,
      roles: ["Logistics Operator"],
      capabilities: [],
    },
  },
};

// ── mock durumu ──────────────────────────────────────────────────────

const DEPOLAR = {
  pod: "logistics.mock.pod.v1",
  packaging: "logistics.mock.packaging.v1",
  pricing: "logistics.mock.pricing.v1",
};

// ── "yükleniyor" durumu ──────────────────────────────────────────────
//
// Mock gecikmesi SABİT (180 ms) ve dışarıdan ayarlanamıyor, yani yükleniyor
// iskeleti göz açıp kapayana kadar geçiyor — tasarım incelemesinde
// görülemiyor. `hold` verilen store aksiyonu hiç ÇÖZÜLMEYEN bir söz
// döndürecek biçimde askıya alınır; ekran yükleme dalında kalır.
//
// Tek istisna budur: story'lerin geri kalanı store'a HİÇ dokunmuyor
// (bkz. dosya başlığı). Askıya alınan aksiyon her story başında geri
// yükleniyor, yoksa sızıntı bir sonraki story'yi sonsuz yüklemede bırakırdı.

const STORE_GETIRICILER = {
  pod: usePodStore,
  packaging: usePackagingStore,
  pricing: usePricingStore,
  logistics: useLogisticsStore,
};

/** Askıya alınan aksiyonların orijinalleri: "pod.fetchQueue" → fonksiyon. */
const orijinalAksiyonlar = new Map();

function askiyaAlmalariGeriYukle() {
  for (const [yol, fn] of orijinalAksiyonlar) {
    const [storeAdi, aksiyon] = yol.split(".");
    STORE_GETIRICILER[storeAdi]()[aksiyon] = fn;
  }
  orijinalAksiyonlar.clear();
}

/**
 * Yükleme bayrağını açar. Yol `{0}` yer tutucusu taşıyabilir — aksiyonun
 * o sıradaki argümanıyla doldurulur (`pod.fetchFlow` akış tipini alıyor).
 */
function bayragiAc(store, yol, args) {
  const parcalar = yol.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)])).split(".");
  let hedef = store;
  for (const p of parcalar.slice(0, -1)) hedef = hedef?.[p];
  if (!hedef) {
    console.error(`Yükleme bayrağı çözülemedi: ${yol}`);
    return;
  }
  hedef[parcalar.at(-1)] = true;
}

/**
 * Aksiyonu askıya alır.
 *
 * Girdi biçimi `"<store>.<aksiyon>[:<bayrak yolu>]"`. Bayrak yolu VERİLMEZSE
 * ekran yükleniyor DEĞİL, boş görünür: aksiyon hiç çalışmadığı için
 * `loading` false kalır ve ekran "hiç kayıt yok" dalına düşer (ölçüldü —
 * ilk denemede yükleniyor varyantı boş durumu gösteriyordu).
 */
function askiyaAl(girdiler) {
  for (const girdi of girdiler) {
    const [yol, bayrak] = girdi.split(":");
    const [storeAdi, aksiyon] = yol.split(".");
    const store = STORE_GETIRICILER[storeAdi]?.();
    if (!store || typeof store[aksiyon] !== "function") {
      console.error(`Askıya alınacak aksiyon bulunamadı: ${yol}`);
      continue;
    }
    orijinalAksiyonlar.set(yol, store[aksiyon]);
    // Hiç çözülmeyen söz: `finally` dalı çalışmaz, yükleme göstergesi kalır.
    store[aksiyon] = (...args) => {
      if (bayrak) bayragiAc(store, bayrak, args);
      return new Promise(() => {});
    };
  }
}

/**
 * Bir mock deposunun sevkiyat sözlüğünü boşaltır — "hiç kayıt yok" varyantı.
 *
 * Tohumu silmek yerine sevkiyatları boşaltıyoruz: `seller` alanı yerinde
 * kalmalı, yoksa `loadState` oturum değişti sanıp depoyu YENİDEN TOHUMLAR ve
 * ekran yine dolu gelir. (Ölçüldü: anahtarı `removeItem` ile silmek de aynı
 * sonucu veriyor.)
 */
function bosalt(depo) {
  try {
    const raw = localStorage.getItem(DEPOLAR[depo]);
    if (!raw) return;
    const state = JSON.parse(raw);
    if (state && typeof state === "object") {
      if (state.shipments) state.shipments = {};
      if (state.pods) state.pods = {};
      if (state.rules) state.rules = [];
      localStorage.setItem(DEPOLAR[depo], JSON.stringify(state));
    }
  } catch {
    // Erişilemez depolama — story yine açılır, yalnız boş varyant dolu gelir.
  }
}

/**
 * Story'nin başlangıç durumunu kurar. SENKRON — ekran mount olmadan biter.
 *
 * @param {object} o
 * @param {"admin"|"seller"|"readonly"} o.role
 * @param {string[]} [o.capabilities] Rol varsayılanını ezer.
 * @param {boolean|string[]} [o.empty] `true` → hepsi boş; dizi → yalnız o depolar.
 * @param {{pod?:string, packaging?:string, pricing?:string}} [o.fault]
 * @param {(depolar: typeof DEPOLAR) => void} [o.seed] Depoları elle düzenleme kancası.
 * @param {string[]} [o.hold] Askıya alınacak aksiyonlar — "pod.fetchQueue:queue.loading".
 * @param {Record<string, string>} [o.storage] Story öncesi yazılacak `localStorage` çiftleri.
 */
function durumuKur({
  role = "admin",
  capabilities,
  empty = false,
  fault = {},
  seed,
  hold = [],
  storage = {},
} = {}) {
  // Önceki story'nin askıya aldığı aksiyonlar geri gelmezse bu story sonsuz
  // yüklemede kalırdı.
  askiyaAlmalariGeriYukle();

  const rol = ROLLER[role] ?? ROLLER.admin;

  // 1) Kimlik — mock tohumu satıcı adına göre etiketlendiği için mock'tan ÖNCE.
  const auth = useAuthStore();
  auth.user = { ...rol.user };

  // 2) Yetki — `get_logistics_permissions` yanıtını story'ye göre ayarla.
  setStoryCapabilities(capabilities ?? rol.caps, rol.roles);

  // 3) Mock verisi. Satıcı adı POD ve fiyat mock'larının tenant süzgecine
  //    giriyor; admin rolünde tohum varsayılan satıcıyla kurulur.
  const sellerName = rol.user.is_seller ? rol.user.full_name : SELLER_ME;
  resetPodMock(sellerName);
  // Paketleme tohumu da satıcı adına etiketleniyor (§A12): sabit adla
  // tohumlanırsa satıcı rolündeki story BOŞ kuyruk gösterir.
  resetPackagingMock(sellerName);
  resetPricingMock(sellerName);

  const bosDepolar = empty === true ? Object.keys(DEPOLAR) : Array.isArray(empty) ? empty : [];
  bosDepolar.forEach(bosalt);

  // 4) Tetiklenebilir hatalar — sözleşmedeki gerçek kodlar.
  setPodFault(fault.pod ?? null);
  setPackagingFault(fault.packaging ?? null);
  setPricingFault(fault.pricing ?? null);

  seed?.(DEPOLAR);

  // 5) Store yüzeyleri — Pinia örneği story'ler arasında paylaşıldığı için
  //    önceki story'nin satırları/hataları burada temizleniyor.
  usePodStore().$resetSurfaces();
  usePackagingStore().reset();

  // 6) Ekranın kendi tercihleri (görünüm modu gibi) — store'da değil diskte.
  for (const [anahtar, deger] of Object.entries(storage)) {
    try {
      localStorage.setItem(anahtar, deger);
    } catch {
      // Erişilemez depolama — varyant varsayılan moduyla açılır.
    }
  }

  if (hold.length) askiyaAl(hold);
}

/**
 * Ekran story'si üretir.
 *
 * Dönen nesne doğrudan story'ye yayılır:
 *   export const Dolu = { name: "Dolu", ...ekranStory({ role: "admin" }) };
 *
 * @param {Parameters<typeof durumuKur>[0] & {
 *   route?: {
 *     name: string,
 *     params?: Record<string, string>,
 *     // Bazı ekranların filtreleri URL SORGUSUNDA tutuluyor (paylaşılabilir
 *     // link — TUR-117). O ekranlarda varyant sorguyla kuruluyor.
 *     query?: Record<string, string>,
 *   }
 * }} [options]
 */
export function ekranStory(options = {}) {
  const { route, ...durum } = options;

  return {
    decorators: [
      (story) => ({
        components: { story },
        setup() {
          durumuKur(durum);

          const logistics = useLogisticsStore();
          const acik = ref(false);

          // Ekran MOUNT OLMADAN önce iki şey bitmeli:
          //   · rota — beş ekran `route.params.name` okuyor, parametre
          //     yerleşmeden mount olurlarsa boş adla uca giderler;
          //   · yetki — `stores/pod.js`'teki `ensurePermissions()` söz'ü
          //     MEMOIZE ediyor, yani ilk story'den sonra bir daha
          //     çalışmıyor. Rol değiştiren story kendi yetkisini alamazdı;
          //     burada her story için doğrudan tazeleniyor.
          const hedef = route
            ? { name: route.name, params: route.params ?? {}, query: route.query ?? {} }
            : { path: "/" };
          const bekle = Promise.all([
            storyRouter.replace(hedef).catch((e) => {
              // Manifestte olmayan bir ad → story'yi sessizce boş bırakmak
              // yerine görünür kıl.
              console.error("Story rotası çözülemedi:", hedef, e);
            }),
            logistics.fetchPermissions(),
          ]);

          bekle.then(() => {
            acik.value = true;
          });

          return { acik };
        },
        template: `<story v-if="acik" />`,
      }),
    ],
  };
}

/** Story'lerin ortak `parameters` bloğu — ekranlar tam genişlik ister. */
export const EKRAN_PARAMETRELERI = { layout: "fullscreen" };

/**
 * `play` içinde DOM'un belirmesini bekler.
 *
 * NEDEN GEREKLİ: decorator, rota ve yetki yerleşene kadar ekranı `v-if` ile
 * geciktiriyor. Storybook `play`'i render'dan hemen SONRA çağırıyor, yani
 * ekran henüz DOM'da değil — beklemeden yazılan `play` sessizce hiçbir şey
 * yapmaz (ölçüldü: "boş · filtre yüzünden" varyantı dolu liste gösteriyordu).
 *
 * @param {ParentNode} kok `canvasElement`.
 * @param {string} secici CSS seçici.
 * @param {number} [zamanAsimi] ms.
 * @returns {Promise<Element>}
 */
export async function elemaniBekle(kok, secici, zamanAsimi = 4000) {
  const bitis = performance.now() + zamanAsimi;
  for (;;) {
    const el = kok.querySelector(secici);
    if (el) return el;
    if (performance.now() > bitis) throw new Error(`Story elemanı bulunamadı: ${secici}`);
    await new Promise((r) => setTimeout(r, 40));
  }
}

/**
 * Bir metin kutusunu doldurup Enter'a basar — filtre/arama varyantları için.
 */
export async function araVeUygula(kok, secici, metin) {
  await yuklemeyiBekle(kok);
  const kutu = await elemaniBekle(kok, secici);
  kutu.value = metin;
  kutu.dispatchEvent(new Event("input", { bubbles: true }));
  kutu.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
  // Mock gecikmesi 180 ms; yeniden yükleme bitsin.
  await new Promise((r) => setTimeout(r, 400));
}

/**
 * Ekranın ilk yüklemesi bitene kadar bekler.
 *
 * NEDEN GEREKLİ (ölçüldü): ekranların ÜST ŞERİDİ veri gelmeden çiziliyor.
 * Palet planında `play`, "Palet ekle" düğmesini iskelet hâlâ ekrandayken
 * bulup tıklıyordu; hemen ardından dönen `load()` yanıtı `adopt()` ile
 * taslağı EZİYOR ve story hiçbir şey olmamış gibi görünüyordu. Tıklama
 * gerçekleşiyordu — sonucu siliniyordu.
 *
 * İskelet iki biçimde işaretleniyor: `aria-busy` ve Tailwind'in
 * `animate-pulse` sınıfı. İkisi de kaybolana kadar bekleniyor.
 */
export async function yuklemeyiBekle(kok, zamanAsimi = 5000) {
  // "Meşgul değil" bir kez görülmesi YETMEZ: ekranlar arka arkaya İKİ istek
  // atıyor (önce `fetchPermissions`, sonra veri) ve aralarında kısa bir
  // sakinlik oluyor. `play` o aralıkta tıklarsa, hemen ardından dönen yanıt
  // taslağı EZİYOR — tıklama gerçekleşiyor, sonucu siliniyor (ölçüldü:
  // palet planında eklenen palet kayboluyordu).
  //
  // Bu yüzden koşul "kesintisiz SESSIZLIK_MS boyunca meşgul değil".
  const SESSIZLIK_MS = 450;
  const bitis = performance.now() + zamanAsimi;
  let sessizBaslangic = null;

  for (;;) {
    const mesgul = kok.querySelector('[aria-busy="true"]') || kok.querySelector(".animate-pulse");
    if (mesgul) {
      sessizBaslangic = null;
    } else {
      sessizBaslangic ??= performance.now();
      if (performance.now() - sessizBaslangic >= SESSIZLIK_MS) return;
    }
    if (performance.now() > bitis) return; // beklemeyi uzatmak yerine devam et
    await new Promise((r) => setTimeout(r, 40));
  }
}

/**
 * Metnine göre bir düğmeyi bekler ve tıklar.
 *
 * NEDEN AYRI YARDIMCI: `elemaniBekle(kok, "button")` ilk düğme belirir
 * belirmez dönüyor — ekranın üst şeridi veri yüklenmeden çiziliyor, aranan
 * düğme ise listenin içinde ve SONRA geliyor. Ölçüldü: çalışma alanında
 * "Yeni koli" düğmesi bulunamadı hatası tam bu yüzden çıkıyordu.
 *
 * @param {ParentNode} kok `canvasElement`.
 * @param {RegExp} desen Düğme metniyle eşleşecek desen.
 * @param {number} [zamanAsimi] ms.
 */
export async function dugmeyeTikla(kok, desen, zamanAsimi = 4000) {
  await yuklemeyiBekle(kok);
  const bitis = performance.now() + zamanAsimi;
  for (;;) {
    const dugme = [...kok.querySelectorAll("button")].find((b) => desen.test(b.textContent ?? ""));
    if (dugme) {
      dugme.click();
      // Tıklamanın sonucu (çekmece, yeni satır, istek) yerleşsin.
      await new Promise((r) => setTimeout(r, 300));
      return dugme;
    }
    if (performance.now() > bitis) throw new Error(`Story düğmesi bulunamadı: ${desen}`);
    await new Promise((r) => setTimeout(r, 40));
  }
}
