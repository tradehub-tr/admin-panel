// SEVKİYAT DETAYI SEKME SÖZLEŞMESİ — 16-FE-0.
//
// NEDEN BU DOSYA VAR:
//   Sevkiyat detayı (B2) altı sekmeyle başladı ama en az yedi tane daha
//   gelecek: koli/paketleme (13-FE), etiket (13-FE), POD (14-FE), iade
//   (15-FE), takip timeline (11-FE), bacak (08). Bunların yarısı Ali'nin,
//   yarısı Bora'nın. Sekmeler bugünkü gibi `ShipmentDetailScreen.vue` içinde
//   `v-else-if` zinciri olarak dursaydı iki geliştirici de AYNI dosyanın
//   AYNI bloğunu düzenlerdi — split doc'un sıfır-çakışma sözü ilk günde
//   düşerdi.
//
//   Bu yüzden sekme artık bir KAYIT: bileşen sahibinin kendi dizininde
//   yaşar, kaydı ortak `shipmentTabRegistry.js` dosyasından yapılır, kabuk
//   (`ShipmentDetailScreen.vue`) kaydı okur. **Ali, Bora'nın
//   ShipmentDetailView/Screen dosyalarına hiç dokunmaz.**
//
// SÖZLEŞMENİN ZORLADIKLARI (hepsi modül YÜKLENİRKEN, yani build/test anında):
//   * Sekmenin bileşeni SAHİBİNİN dizininde olmalı (`ownership.js`).
//   * Anahtar, sıra ve envanter kodu benzersiz olmalı.
//   * Beslenmeyen sekme sebebini (`blockedBy`) yazmalı — boş sekme çizip
//     "kayıt yok" izlenimi vermek yasak (bkz. `logistics.tab.unavailable`).
//   * Etiket i18n anahtarı `logistics.tab.` ad alanında olmalı.
//
// DİNAMİK BİLEŞEN GÜVENLİĞİ:
//   Kabuk `<component :is>` kullanıyor. `api-security.md` §3 bunu yalnız
//   "izin verilen map'ten seç" koşuluyla serbest bırakıyor — burada map
//   KAYIT DEFTERİNİN KENDİSİ: derleme anında sabit, kullanıcı girdisi
//   hiçbir noktada bileşen seçimine karışmıyor.

import { OWNERS, VIEW_ROOT, ownerOfViewPath } from "./ownership.js";

/** Sekme anahtarı: kararlı, URL/analitik dostu. */
const KEY_PATTERN = /^[a-z][a-z0-9-]*$/;

/**
 * Faz D ekran envanteri kodu (B3, H3, K4 …).
 *
 * DİKKAT — kod ekranlarla ORTAK bir numara alanından geliyor: `B1`, `B2`,
 * `B9` ekran; `B3`–`B8` sekme. Bir kodu hem ekran hem sekme olarak
 * kullanmak envanteri çift sayar, bu yüzden yasak. Yeni sekme, bölümün
 * (`H`, `G`, `I`, `K` …) SERİSİNDE KULLANILMAYAN bir sonraki numarayı alır:
 * POD bölümünde H1 ve H2 ekransa, POD sekmesi `H3`tür.
 *
 * Çakışma denetimi burada YAPILMIYOR: sözleşme genel bir mekanizma ve
 * ekran manifestini tanımamalı — tanısaydı `_contract` → `router` yönünde
 * bir bağımlılık doğar, katman sırası tersine dönerdi. Denetim
 * `__tests__/shipmentTabRegistry.test.js` içinde ("sekme kodları EKRAN
 * kodlarıyla çakışmıyor") ve mesajı bu kuralı yazıyor.
 */
const SCREEN_KEY_PATTERN = /^[A-Z]\d{1,2}$/;

/** Sekme etiketlerinin ad alanı — nav anahtarlarıyla karışmasın. */
const LABEL_PREFIX = "logistics.tab.";

/** Sekme sahibi olabilecek kişiler — `shared` bir sekmeye sahip olamaz. */
const TAB_OWNERS = OWNERS.filter((o) => o !== "shared");

function fail(key, message) {
  throw new Error(`[shipmentTab:${key ?? "?"}] ${message}`);
}

function assertOptionalFn(spec, field) {
  if (spec[field] !== undefined && typeof spec[field] !== "function") {
    fail(spec.key, `${field} verilecekse fonksiyon olmalı (ctx alır)`);
  }
}

/**
 * @typedef {Object} ShipmentTabContext
 * @property {Object} shipment `get_shipment_detail` yükü (asla null değil).
 * @property {Array}  documents Sevkiyatın belge child tablosu.
 * @property {Object} can       Oturumun yetki bayrakları (`store.can`).
 *
 * Bağlam BU ÜÇÜYLE SINIRLI. Bir sekmenin başka veriye ihtiyacı varsa onu
 * kendi store'undan/ucundan çeker — bağlamı büyütmek kabuğu her sekmenin
 * ihtiyacını bilmeye zorlar ve sahiplik sınırını geri deler.
 */

/**
 * @typedef {Object} ShipmentTabSpec
 * @property {string}   key           Kararlı anahtar (`items`, `pod`, …).
 * @property {string}   screenKey     Envanter kodu (`B3`, `H2`, …).
 * @property {"bora"|"ali"} owner     Sekmeyi kim yazdı/bakıyor.
 * @property {string}   labelKey      `logistics.tab.*` i18n anahtarı.
 * @property {number}   order         Sekme çubuğundaki sıra (10'ar artır).
 * @property {string}   componentPath Bileşenin alias yolu — sahiplik buradan doğrulanır.
 * @property {() => Promise<any>} component Lazy import (`() => import(componentPath)`).
 * @property {(ctx: ShipmentTabContext) => Object} props Bileşene geçilecek prop'lar.
 * @property {(ctx: ShipmentTabContext) => number} [count] Sekme rozetindeki sayı.
 * @property {(ctx: ShipmentTabContext) => boolean} [alert] Kırmızı dikkat noktası.
 * @property {(ctx: ShipmentTabContext) => boolean} [visibleWhen] Sekmeyi listeden düşürür (G0 rol
 *   matrisi). **GÜVENLİK SINIRI DEĞİLDİR** — yalnız gürültü azaltır. Veri
 *   `get_shipment_detail` yanıtında zaten geliyor ve DevTools'tan okunabiliyor.
 *   Hassas alan BACKEND'de maskelenmeli/yetkilendirilmelidir; kanonik örnek
 *   `mask_shipment_cost_fields` (maliyet sekmesi gizlenmiyor, içerik null'lanıyor).
 * @property {string|null} blockedBy  Veri henüz taşınmıyorsa SEBEP; taşınıyorsa `null`.
 */

/**
 * Bir sekme kaydını doğrular ve dondurur.
 *
 * Doğrulama yükleme anında yapılıyor: hatalı kayıt panelde "sekme görünmedi"
 * diye değil, `npm test`/`npm run build` çıktısında görünsün.
 *
 * @param {ShipmentTabSpec} spec
 * @returns {Readonly<ShipmentTabSpec>}
 */
export function defineShipmentTab(spec) {
  if (!spec || typeof spec !== "object") fail(null, "kayıt bir nesne olmalı");

  const { key } = spec;
  if (typeof key !== "string" || !KEY_PATTERN.test(key)) {
    fail(key, "key küçük harf/tire biçiminde olmalı (örn. 'pod', 'return-lines')");
  }
  if (typeof spec.screenKey !== "string" || !SCREEN_KEY_PATTERN.test(spec.screenKey)) {
    fail(key, "screenKey envanter kodu olmalı (örn. 'B3')");
  }
  if (!TAB_OWNERS.includes(spec.owner)) {
    fail(key, `owner ${TAB_OWNERS.join("|")} olmalı, "${spec.owner}" geldi`);
  }
  if (typeof spec.labelKey !== "string" || !spec.labelKey.startsWith(LABEL_PREFIX)) {
    fail(key, `labelKey "${LABEL_PREFIX}" ile başlamalı`);
  }
  if (!Number.isFinite(spec.order)) fail(key, "order sayı olmalı");

  // Sahiplik sınırı: sekme bileşeni sahibinin dizininde YAŞAMALI. Bu kural
  // olmasaydı "kaydı Ali yaptı ama bileşeni Bora'nın dizinine koydu" durumu
  // sessizce geçer ve çakışma garantisi anlamını yitirirdi.
  if (typeof spec.componentPath !== "string" || !spec.componentPath.endsWith(".vue")) {
    fail(key, `componentPath "${VIEW_ROOT}…/<Ad>Tab.vue" biçiminde olmalı`);
  }
  const pathOwner = ownerOfViewPath(spec.componentPath);
  if (pathOwner === null) {
    fail(key, `componentPath tanınmayan dizinde: ${spec.componentPath}`);
  }
  if (pathOwner !== spec.owner) {
    fail(
      key,
      `sahiplik çelişkisi — kayıt "${spec.owner}" diyor, dizin "${pathOwner}"a ait (${spec.componentPath})`
    );
  }

  if (typeof spec.component !== "function") {
    fail(key, "component lazy import fonksiyonu olmalı: () => import(componentPath)");
  }
  if (typeof spec.props !== "function") {
    fail(key, "props(ctx) fonksiyonu zorunlu — sekme neyi okuduğunu ilan etmeli");
  }
  assertOptionalFn(spec, "count");
  assertOptionalFn(spec, "alert");
  assertOptionalFn(spec, "visibleWhen");

  // "Ya besleniyor ya sebebi yazılı" — `logisticsScreens.js`'teki `blockedBy`
  // kuralının sekme karşılığı. Boş sekme çizmek operasyona "kayıt yok" der;
  // oysa bilgi taşınmıyordur.
  if (spec.blockedBy !== null && !(typeof spec.blockedBy === "string" && spec.blockedBy.trim())) {
    fail(key, "blockedBy ya null ya da NEYİ beklediğini söyleyen bir metin olmalı");
  }

  return Object.freeze({ ...spec });
}

/**
 * Kayıtları benzersizlik için denetler, sıraya dizer ve dondurur.
 *
 * @param {ShipmentTabSpec[]} tabs
 * @returns {ReadonlyArray<Readonly<ShipmentTabSpec>>}
 */
export function createShipmentTabRegistry(tabs) {
  if (!Array.isArray(tabs)) throw new Error("[shipmentTabRegistry] dizi bekleniyordu");

  for (const field of ["key", "screenKey", "order", "componentPath"]) {
    const seen = new Map();
    for (const tab of tabs) {
      const value = tab[field];
      if (seen.has(value)) {
        fail(tab.key, `${field}="${value}" zaten "${seen.get(value)}" sekmesinde kullanılıyor`);
      }
      seen.set(value, tab.key);
    }
  }

  return Object.freeze([...tabs].sort((a, b) => a.order - b.order));
}

/**
 * Bir sekme geri çağrısını YALITARAK çalıştırır.
 *
 * TEK BİR SEKME TÜM ÇUBUĞU DÜŞÜREMEZ. Kayıt defteri iki geliştiricinin ortak
 * alanı: yanlış varsayım yapan bir `count()` (ör. backend `packages`'ı dizi
 * yerine nesne döndürdü → `.some` patlar) korumasız bırakılsaydı
 * `resolveShipmentTabs` komple çöker ve kullanıcı sekme çubuğunu HİÇ göremezdi
 * — hata, ilgisiz beş sekmeyi de götürürdü.
 *
 * Hata YUTULMUYOR ama BURADA DA LOGLANMIYOR: `resolveShipmentTabs` bir
 * `computed` içinden çağrılıyor ve projenin mutlak kuralı 7 computed'de yan
 * etkiyi (log dahil) yasaklıyor. Hata `issues` listesine yazılıyor; kabuk
 * onu render/watch aşamasında raporluyor. Sessiz `undefined` "sayaç yok"
 * gibi okunurdu, o yüzden görünürlük şart — ama doğru katmanda.
 */
function callIsolated(tab, field, ctx, fallback, issues) {
  try {
    return tab[field](ctx);
  } catch (error) {
    issues.push({ key: tab.key, field, error });
    return fallback;
  }
}

/**
 * Kaydı ekranın çizebileceği görünüm nesnelerine çevirir.
 *
 * `props` BİLEREK tembel (thunk): kabuk yalnız AKTİF sekmenin prop'larını
 * hesaplar. Böylece on iki sekmenin prop'unu her render'da kurmuyoruz.
 * Aktif sekmenin `props()` hatasını kabuk yakalıyor
 * (`ShipmentDetailScreen.activeRender`) ve yalnız o sekmenin gövdesini hata
 * paneline çeviriyor.
 *
 * @param {ReadonlyArray<Readonly<ShipmentTabSpec>>} registry
 * @param {ShipmentTabContext} ctx
 */
export function resolveShipmentTabs(registry, ctx) {
  /** Filtrelenip listeden düşen sekmelerin hataları — kaybolmasınlar. */
  const hiddenIssues = [];

  const safeCtx = {
    shipment: ctx?.shipment ?? {},
    documents: ctx?.documents ?? [],
    can: ctx?.can ?? {},
  };

  const resolved = registry
    .filter((tab) => {
      if (!tab.visibleWhen) return true;
      // Görünürlük hatasında sekme GİZLENİYOR (fail-closed): belirsizken
      // göstermek, rol matrisinin kapatmak istediği şeyi açık bırakabilir.
      const issues = [];
      const visible = callIsolated(tab, "visibleWhen", safeCtx, false, issues);
      hiddenIssues.push(...issues);
      return visible;
    })
    .map((tab) => {
      const blocked = Boolean(tab.blockedBy);
      const issues = [];
      return {
        key: tab.key,
        screenKey: tab.screenKey,
        owner: tab.owner,
        labelKey: tab.labelKey,
        component: tab.component,
        blocked,
        blockedBy: tab.blockedBy,
        // Beslenmeyen sekmede sayaç YOK: `0` yazmak "kayıt yok" demek,
        // oysa bilinmiyor.
        count:
          blocked || !tab.count
            ? undefined
            : callIsolated(tab, "count", safeCtx, undefined, issues),
        alert:
          blocked || !tab.alert
            ? false
            : Boolean(callIsolated(tab, "alert", safeCtx, false, issues)),
        props: () => (blocked ? {} : tab.props(safeCtx)),
        /**
         * Çözüm sırasında yakalanan hatalar — kabuk bunları watch aşamasında
         * loglar. Boş dizi normal durumdur.
         */
        issues,
      };
    });

  // Gizlenen sekmelerin hataları ilk görünür sekmeye iliştiriliyor: aksi
  // hâlde `visibleWhen` patladığında sekme sessizce kaybolur ve kimse
  // sebebini öğrenemezdi. Hiç görünür sekme kalmadıysa kaybolmaları
  // kaçınılmaz — o durumda zaten ekranda çizilecek bir şey yok.
  if (hiddenIssues.length && resolved.length) resolved[0].issues.push(...hiddenIssues);

  return resolved;
}
