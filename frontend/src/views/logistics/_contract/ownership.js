// Lojistik frontend DİZİN SAHİPLİĞİ — 16-FE-0 iskelet sözleşmesi.
//
// NEDEN BU DOSYA VAR:
//   `docs/LOGISTICS-TASK-SPLIT.md` §3 iki geliştiriciye ayrı dizinler verdi
//   ("Bora → dashboard/, shipments/… · Ali → packages/, labels/…"). Sınır
//   yalnız belgede dursaydı ilk acelede aşılırdı ve çakışma PR'da değil,
//   merge'de görünürdü. Burada MAKİNE OKUR biçimde duruyor; testler
//   (`__tests__/ownership.test.js`, `shipmentTabRegistry.test.js`,
//   `router/__tests__/logisticsScreens.test.js`) her ekranın ve her sekmenin
//   sahibinin dizininde yaşadığını doğruluyor.
//
// SINIRIN ANLAMI:
//   Sahibi olmayan bir dizine dosya koymak yasak değil — SESSİZCE koymak
//   yasak. Sahip değişecekse bu harita değişir, testler değişikliği görünür
//   kılar ve iki taraf da PR'da haberdar olur.
//
// BU DOSYA DA ORTAK YAZILIR:
//   `_contract/` genel olarak Bora'nın ve PR'sız değişmez, ama `ownership.js`
//   bir İSTİSNA: yeni bir dizin ya da `components/logistics/<X>Screen.vue`
//   ekleyen herkes buraya da kendi satırını EKLEMEK ZORUNDA (yoksa testler
//   "sahibi yok" der). Kural diğer ortak dosyalarla aynı: yalnız KENDİ
//   satırını ekle, başkasınınkini düzenleme (`SHARED_APPEND_ONLY_FILES`).
//   Fonksiyonlar ve yapı yine PR'sız değişmez — değişen yalnız veri.

/** Geçerli sahip etiketleri. `shared` = sözleşme katmanı, PR'sız değişmez. */
export const OWNERS = Object.freeze(["bora", "ali", "shared"]);

/**
 * `src/views/logistics/<dizin>` → sahip.
 *
 * Kaynak: LOGISTICS-TASK-SPLIT.md §3 (admin-panel dizin sınırı) + FE faz
 * tablosundaki kapsam sütunu. Tabloda adı geçmeyen dizinler Bora'ya yazıldı:
 * split doc "Router/api-client/shared component'lerin tek sahibi Bora" diyor
 * ve bu dizinlerin ekranları 16-FE/17-FE kapsamında sayıldı.
 */
export const VIEW_DIR_OWNERS = Object.freeze({
  // ── sözleşme katmanı ─────────────────────────────────────────────────
  // Bora yazdı, Ali OKUR. Değişikliği iki tarafı da bağladığı için PR'sız
  // dokunulmaz (split doc §7 ile aynı kural).
  _contract: "shared",

  // ── Bora ─────────────────────────────────────────────────────────────
  dashboard: "bora", // A1, A2 — 16-FE
  shipments: "bora", // B1, B2, B9, C1–C3, E1, E2 — 16-FE / 06-FE / 11-FE
  catalog: "bora", // M1, M2 — 16-FE
  exceptions: "bora", // A3 — 16-FE
  reports: "bora", // L1 — 17-FE
  carriers: "bora", // F1–F4 — Faz 3 kalıtı, 16-FE sahipliğinde
  settings: "bora", // M3 — Faz 3 kalıtı
  notifications: "bora", // J1–J3 — admin tarafı; 12-FE'nin storefront ekranı Ali'de

  // ── Ali ──────────────────────────────────────────────────────────────
  // (G1/G2/G3 sunum ekranları 13-FE'de views/logistics/{packages,labels}
  //  altına taşındı ve buradaki kopyaları silindi — haritadan düşüldü.)
  packages: "ali", // G1, G3 — 13-FE / 19
  labels: "ali", // G2 — 13-FE
  pod: "ali", // H1, H2 — 14-FE
  "delivery-locations": "ali", // D1, D2 — 14-FE
  returns: "ali", // I1–I4 — 15-FE
  pricing: "ali", // K1–K3 — 20-FE
});

/** Sekme/ekran yollarının başlaması gereken ön ek. */
export const VIEW_ROOT = "@/views/logistics/";

/**
 * `src/components/logistics/` — GERÇEKTEN ortak sunum bileşenleri.
 *
 * Bu dizinde iki tür dosya var ve ikisi aynı sahiplik kuralına tabi olamaz:
 *   * Buradakiler — birden çok ekranda kullanılan yapı taşları. Tek sahip
 *     Bora (split doc §3: "shared component'lerin tek sahibi Bora"); Ali
 *     kullanır, PR'sız değiştirmez.
 *   * `<X>Screen.vue` — TEK bir ekranın sunum katmanı. Onun sahibi, karşılık
 *     geldiği manifest ekranının sahibidir (`SCREEN_COMPONENT_OWNERS`).
 *
 * Ayrım olmasaydı "components/logistics/ tamamen Bora'nın" derdik ve Ali
 * 13/14/15/20-FE'de sahibi olmadığı 14 dosyaya dokunmak zorunda kalırdı —
 * sıfır-çakışma sözü tam da ana iş yükünde çökerdi.
 */
export const SHARED_LOGISTICS_COMPONENTS = Object.freeze([
  "BulkActionBar.vue",
  "BulkResultSummary.vue",
  "DetailTabs.vue",
  "EmptyState.vue",
  "ErrorState.vue",
  "EventTimeline.vue",
  "StatusBadge.vue",
  "shipmentTabHost.js", // sekme async sarmalayıcı + yükleme/hata yer tutucuları
  "catalogMeta.js",
  "catalogWritableFields.js", // kaydetme yükü süzgeci — `catalogMeta.js`'in saf çekirdeği
  "constants.js",
  "shipmentTransitions.js",
]);

/**
 * `<X>Screen.vue` → sahip.
 *
 * Ad eşlemesi mekanik DEĞİL (`LogisticsDashboardScreen` ↔ `DashboardView`,
 * `SplitShipmentScreen` ↔ `ShipmentSplitView`, `PackingWorkspaceScreen` ↔
 * `PackingView` …), o yüzden yoldan türetilemiyor ve açıkça yazılıyor.
 * `__tests__/ownership.test.js` bu dizindeki HER dosyanın ya burada ya
 * `SHARED_LOGISTICS_COMPONENTS` içinde olmasını zorluyor — yeni bileşen
 * eklendiğinde sahipsiz kalamaz.
 */
export const SCREEN_COMPONENT_OWNERS = Object.freeze({
  // ── Bora ─────────────────────────────────────────────────────────────
  CarrierAccountScreen: "bora", // F1
  CatalogFormScreen: "bora", // M2
  CatalogListScreen: "bora", // M1
  ConnectionTestScreen: "bora", // F2
  CostReportScreen: "bora", // L3 (ReportCenter paneli)
  CsvImportScreen: "bora", // C3
  ExceptionQueueScreen: "bora", // A3
  IntegrationLogScreen: "bora", // F3
  LegOperationScreen: "bora", // E1
  LegTimelineScreen: "bora", // E2
  LogisticsDashboardScreen: "bora", // A1
  LogisticsSettingsScreen: "bora", // M3
  ManualShipmentFormScreen: "bora", // C1
  ManualStatusUpdateScreen: "bora", // C2
  NotificationPreferenceScreen: "bora", // J2
  NotificationTemplateScreen: "bora", // J1
  OperationAlertScreen: "bora", // J3
  PendingWorkQueueScreen: "bora", // A2
  PerformanceReportScreen: "bora", // L2 (ReportCenter paneli)
  ReportCenterScreen: "bora", // L1
  ShipmentDetailScreen: "bora", // B2 — sekme kabuğu
  ShipmentListScreen: "bora", // B1
  SplitShipmentScreen: "bora", // B9
  StatusMappingScreen: "bora", // F4

  // ── Ali ──────────────────────────────────────────────────────────────
  PriceSimulationScreen: "ali", // K3
  PricingRuleScreen: "ali", // K2
  ReturnClosureScreen: "ali", // I4
  ReturnDecisionScreen: "ali", // I2
  ReturnInspectionScreen: "ali", // I3
  ReturnQueueScreen: "ali", // I1
  ShippingRateScreen: "ali", // K1
});

/**
 * `components/logistics/` altındaki bir dosyanın sahibi.
 *
 * @param {string} fileName Dosya adı (`ProofOfDeliveryScreen.vue`).
 * @returns {"bora"|"ali"|"shared"|null} Tanınmıyorsa `null`.
 */
export function ownerOfLogisticsComponent(fileName) {
  if (typeof fileName !== "string" || !fileName) return null;
  if (SHARED_LOGISTICS_COMPONENTS.includes(fileName)) return "shared";
  const base = fileName.replace(/\.(vue|js)$/, "");
  return SCREEN_COMPONENT_OWNERS[base] ?? null;
}

/**
 * Bir view yolunun sahibini söyler.
 *
 * @param {string} path `@/views/logistics/<dizin>/…` biçiminde alias yolu.
 * @returns {"bora"|"ali"|"shared"|null} Yol tanınmıyorsa `null`.
 */
export function ownerOfViewPath(path) {
  if (typeof path !== "string" || !path.startsWith(VIEW_ROOT)) return null;
  const [dir] = path.slice(VIEW_ROOT.length).split("/");
  return VIEW_DIR_OWNERS[dir] ?? null;
}

/**
 * Sahip başına dizin listesi — belge/test çıktılarında kullanılıyor.
 * @param {"bora"|"ali"|"shared"} owner
 */
export const dirsOwnedBy = (owner) =>
  Object.keys(VIEW_DIR_OWNERS).filter((dir) => VIEW_DIR_OWNERS[dir] === owner);

/**
 * `src/api/` LOJİSTİK dosyaları → sahip (2026-08 tam denetimi ekledi).
 *
 * Dizin haritası yalnız `views/logistics/` görüyordu; API katmanının sınırı
 * belgede (split doc §3: "api-client çekirdeği Bora, packaging/pod modülleri
 * Ali") kalmıştı. Burada makine okur: `__tests__/ownership.test.js`
 * haritadaki her dosyanın diskte var olduğunu doğrular. Yalnız lojistik
 * dosyaları listelenir — `seo.js` gibi modül dışı dosyalar kapsam dışı.
 */
export const API_FILE_OWNERS = Object.freeze({
  // ── Bora — istemci çekirdeği + operasyon/sevkiyat uçları ─────────────
  "dashboardMetrics.js": "bora", // A1 pano (logistics_ops)
  "exceptions.js": "bora", // A3 istisna kuyruğu (logistics_ops)
  "exceptionsMock.js": "bora", // A3 mock — saf modül, node:test tüketiyor
  "logistics.js": "bora", // çekirdek: katalog, taşıyıcı hesabı, ayarlar, sevkiyat
  "logisticsCapabilities.js": "bora",
  "logisticsCatalogKeys.js": "bora",
  "logisticsClient.js": "bora", // tek geçit (logisticsGet/logisticsPost)
  "logisticsEnvelope.js": "bora", // zarf açıcı + tipli hata
  "pendingWork.js": "bora", // A2 bekleyen işler (logistics_ops)
  "reports.js": "bora", // L1–L3 raporlar (17-FE) — 17-BE sözleşmesi dosyada (v1.reports)
  "reportsMock.js": "bora", // L1–L3 mock — saf modül, node:test tüketiyor
  "shipmentCreate.js": "bora", // C1 manuel sevkiyat
  "shipmentEnvelope.js": "bora", // sayfalama köprüsü
  "shipmentEvents.js": "bora", // B6 olay akışı (v1.shipment)

  // ── Ali — paketleme + POD modülleri ──────────────────────────────────
  "packaging.js": "ali", // 13-FE
  "packagingMock.js": "ali",
  "pod.js": "ali", // 14-FE
  "podMock.js": "ali",
  "podSeed.js": "ali",
});

/** `src/stores/` lojistik store'ları → sahip (API haritasıyla aynı gerekçe). */
export const STORE_FILE_OWNERS = Object.freeze({
  "logistics.js": "bora", // 16-FE
  "packaging.js": "ali", // 13-FE
  "pod.js": "ali", // 14-FE
});

/**
 * İKİ TARAFIN DA YAZDIĞI DOSYALAR.
 *
 * Kural `hooks.py`/`patches.txt` ile aynı (split doc §6): herkes YALNIZ
 * kendi kaydını EKLER, başkasının kaydını düzenlemez/silmez. Kaydın sahibi
 * `owner` alanında yazılı ve testler `owner`'ın yolla tutarlı olmasını
 * zorluyor — yani "yanlışlıkla başkasının satırını değiştirdim" durumu
 * merge'de değil, testte görünür. Merge sorumlusu Bora.
 */
export const SHARED_APPEND_ONLY_FILES = Object.freeze([
  "src/views/logistics/shipmentTabRegistry.js", // sevkiyat detayı sekmeleri
  "src/views/logistics/_contract/ownership.js", // HARİTALARI (yapıyı değil)
  "src/router/logisticsScreens.js", // ekran manifesti (route + menü)
  "src/i18n/locales/tr.js", // logistics.* ad alanı
  "src/i18n/locales/en.js", // logistics.* ad alanı
]);
