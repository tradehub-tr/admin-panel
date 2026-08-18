// Lojistik ekran manifesti — 44 ekranın TEK kaynağı.
//
// NEDEN BU DOSYA VAR:
//   Ekranların tamamı Faz D'de sunum katmanı olarak yazıldı, ama çoğu henüz
//   gerçek bir API ucuna bağlanamıyor (Faz F). "Hangileri kaldı, ne zaman
//   açılacak?" sorusunun cevabı bir belgede tutulursa bayatlar — bugün
//   YOL-HARITASI'nın bayatladığını gördük. Bu yüzden liste, menüyü KURAN
//   dosyanın içinde duruyor: her PR'da görünür, silinmeden kaybolmaz.
//
// SÖZLEŞME:
//   * `viewPath` HER girişte var — container view'ın alias yolu. Ekranın
//     SAHİBİ bu yoldan türetiliyor (`_contract/ownership.js`), ayrı bir
//     `owner` alanı YOK: iki kaynak olsaydı biri bayatlardı.
//   * `ready: true`  → `component` canlı bir lazy import'tur; route + menü
//     kaydı üretilir, ekran panelde görünür. Import metni `viewPath` ile
//     birebir aynı olmalı (testte doğrulanıyor).
//   * `ready: false` → yalnız `viewPath` var (henüz açılmamış dosyanın
//     planlanan yolu). Vite `import()` çağrılarını statik çözdüğü için var
//     olmayan dosyaya lazy import koymak build'i kırar — ayrıca olmayan bir
//     modülü "yüklenebilir" gibi göstermek yanlış olurdu. `blockedBy` neyin
//     beklendiğini söyler.
//   `src/router/__tests__/logisticsScreens.test.js` her girişin ya hazır ya
//   gerekçeli olmasını zorunlu kılar — "unutuldu" durumu testte kırmızı olur.
//
// ORTAK DOSYA UYARISI (16-FE-0):
//   Bu dosyaya Bora da Ali de yazar. Kural `hooks.py` deseniyle aynı: herkes
//   YALNIZ kendi ekranının kaydına dokunur. "Kendi" ölçüsü `viewPath`in hangi
//   dizine düştüğü — `_contract/ownership.js` haritası karar veriyor ve test
//   uyumsuzluğu merge'de değil, `npm test`te gösteriyor.
//
// BİR EKRAN NASIL AÇILIR:
//   1. Ucu yaz (tradehub_core/api/v1/logistics*.py)
//   2. Container view'ı KENDİ dizininde aç (`viewPath`in gösterdiği yer)
//   3. Buradaki satıra `component: () => import("<viewPath>")` ekle,
//      `ready: true`, `blockedBy: null` yap
//   Menü ve route kendiliğinden oluşur; başka dosyaya dokunmak gerekmez.

// NOT: bu import BİLEREK göreli ve `.js` uzantılı. Manifest saf veri —
// `node --test` onu Vite olmadan, doğrudan yüklüyor; `@/` alias'ı orada
// çözülmez. Uzantılı göreli yol hem Node hem Vite tarafından anlaşılır.
//
// Sekme KAYIT DEFTERİ bilerek import EDİLMİYOR: bu dosyayı `router/index.js`
// eager yüklüyor, yani defter + sözleşme + altı kaydın doğrulaması lojistiğe
// hiç girmeyen kullanıcının açılış chunk'ına düşerdi. Sekme envanteri
// defterin kendi işi; sayımı yapan test onu doğrudan import ediyor.
import { ownerOfViewPath } from "../views/logistics/_contract/ownership.js";

/**
 * Menüde hangi bölüm altında görünecekler (navigation.js rail id'si).
 *
 * `commerce` altında değil KENDİ rayında: 44 ekranın 20'si menüye girecek
 * ve tek bir grup içinde RFQ/sipariş/sepet kalemlerinin arasında kaybolurdu.
 */
export const LOGISTICS_SECTION = "logistics";

/**
 * Ekranların tamamı. `key` Faz D ekran envanteriyle aynı
 * (docs/PLAN-lojistik-ekran-envanteri.md).
 */
export const LOGISTICS_SCREENS = [
  // ── M · Katalog ve ayarlar — uçları HAZIR ────────────────────────────
  {
    key: "M1",
    path: "lojistik/kataloglar",
    name: "LogisticsCatalogList",
    labelKey: "nav.item.logisticsCatalogs",
    icon: "layers",
    viewPath: "@/views/logistics/catalog/CatalogListView.vue",
    component: () => import("@/views/logistics/catalog/CatalogListView.vue"),
    ready: true,
    blockedBy: null,
  },
  {
    key: "M2",
    path: "lojistik/kataloglar/:catalogKey/:name?",
    name: "LogisticsCatalogForm",
    // Parametreli detay rotası menüde görünmez — listeden açılır.
    hidden: true,
    viewPath: "@/views/logistics/catalog/CatalogFormView.vue",
    component: () => import("@/views/logistics/catalog/CatalogFormView.vue"),
    ready: true,
    blockedBy: null,
  },
  {
    key: "M3",
    path: "lojistik/ayarlar",
    name: "LogisticsSettings",
    labelKey: "nav.item.logisticsSettings",
    icon: "settings-2",
    viewPath: "@/views/logistics/settings/SettingsView.vue",
    component: () => import("@/views/logistics/settings/SettingsView.vue"),
    ready: true,
    blockedBy: null,
  },

  // ── F · Taşıyıcı entegrasyonu ───────────────────────────────────────
  {
    key: "F1",
    path: "lojistik/tasiyici-hesaplari",
    name: "LogisticsCarrierAccounts",
    labelKey: "nav.item.logisticsCarrierAccounts",
    icon: "key-round",
    viewPath: "@/views/logistics/carriers/CarrierAccountView.vue",
    component: () => import("@/views/logistics/carriers/CarrierAccountView.vue"),
    // Taşıyıcı API kimlik bilgilerini yönetiyor. Backend zaten
    // `carrier_credential.manage` istiyor; arayüz de aynı sınırı çiziyor —
    // yetkisi olmayan admin'in menüde görmesi bile gereksiz.
    superAdmin: true,
    ready: true,
    blockedBy: null,
  },
  {
    key: "F4",
    path: "lojistik/durum-eslemesi",
    name: "LogisticsStatusMapping",
    labelKey: "nav.item.logisticsStatusMapping",
    icon: "repeat",
    viewPath: "@/views/logistics/carriers/StatusMappingView.vue",
    component: () => import("@/views/logistics/carriers/StatusMappingView.vue"),
    ready: true,
    blockedBy: null,
  },
  {
    key: "F2",
    path: "lojistik/baglanti-testi",
    name: "LogisticsConnectionTest",
    labelKey: "nav.item.logisticsConnectionTest",
    icon: "plug-zap",
    viewPath: "@/views/logistics/carriers/ConnectionTestView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.test_carrier_connection",
  },
  {
    key: "F3",
    path: "lojistik/entegrasyon-logu",
    name: "LogisticsIntegrationLog",
    labelKey: "nav.item.logisticsIntegrationLog",
    icon: "scroll-text",
    viewPath: "@/views/logistics/carriers/IntegrationLogView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_integration_logs",
  },

  // ── A · Pano ve kuyruklar ───────────────────────────────────────────
  {
    key: "A1",
    path: "lojistik/pano",
    name: "LogisticsDashboard",
    labelKey: "nav.item.logisticsDashboard",
    icon: "gauge",
    viewPath: "@/views/logistics/dashboard/DashboardView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.get_dashboard_metrics",
  },
  {
    key: "A2",
    path: "lojistik/bekleyen-isler",
    name: "LogisticsPendingQueue",
    labelKey: "nav.item.logisticsPendingQueue",
    icon: "list-todo",
    viewPath: "@/views/logistics/dashboard/PendingQueueView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_pending_work",
  },
  {
    key: "A3",
    path: "lojistik/istisnalar",
    name: "LogisticsExceptionQueue",
    labelKey: "nav.item.logisticsExceptionQueue",
    icon: "triangle-alert",
    viewPath: "@/views/logistics/exceptions/ExceptionQueueView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_shipment_exceptions",
  },

  // ── B · Sevkiyat ────────────────────────────────────────────────────
  // Tek uç (list_shipments + get_shipment) B1–B5, B7, B8'i birden açar.
  {
    key: "B1",
    path: "lojistik/sevkiyatlar",
    name: "LogisticsShipmentList",
    labelKey: "nav.item.logisticsShipments",
    icon: "truck",
    viewPath: "@/views/logistics/shipments/ShipmentListView.vue",
    component: () => import("@/views/logistics/shipments/ShipmentListView.vue"),
    ready: true,
    blockedBy: null,
  },
  {
    key: "B2",
    path: "lojistik/sevkiyatlar/:name",
    name: "LogisticsShipmentDetail",
    hidden: true,
    viewPath: "@/views/logistics/shipments/ShipmentDetailView.vue",
    component: () => import("@/views/logistics/shipments/ShipmentDetailView.vue"),
    ready: true,
    // B3–B8 sekmeleri bu container'ın içinde render ediliyor; ayrı rota yok.
    blockedBy: null,
  },
  {
    key: "B9",
    path: "lojistik/siparis/:order/bolunme",
    name: "LogisticsShipmentSplit",
    hidden: true,
    viewPath: "@/views/logistics/shipments/ShipmentSplitView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_order_shipments",
  },

  // ── C · Manuel ve offline ───────────────────────────────────────────
  {
    key: "C1",
    path: "lojistik/sevkiyatlar/yeni",
    name: "LogisticsManualShipment",
    labelKey: "nav.item.logisticsManualShipment",
    icon: "file-plus",
    viewPath: "@/views/logistics/shipments/create/ManualShipmentView.vue",
    ready: false,
    // ÖLÇÜLDÜ (2026-08-13), önceki gerekçe eksikti: sorun yalnız "kanal/sürücü
    // alanları yok" değil. `create_shipment(order, items, idempotency_key)`
    // BAŞKA HİÇBİR ŞEY almıyor — order'dan Draft üretiyor. Formun topladığı
    // channel, carrier, tracking_number, cost_paid_by, ship_date,
    // estimated_delivery, carrier_cost, customer_charge, plaka/sürücü
    // alanlarının 9'u karşılıksız. Bağlanırsa kullanıcı formu doldurur,
    // kaydeder ve hiçbiri yazılmaz. Shipment'ı güncelleyen genel bir uç da
    // yok (yalnız update_shipment_status ve cancel_shipment var).
    blockedBy:
      "api.v1.shipment.create_shipment yalnız order/items/idempotency_key alıyor — formun 9 alanı karşılıksız; alan taşıyan uç ya da genel update_shipment gerekiyor",
  },
  {
    key: "C2",
    path: "lojistik/sevkiyatlar/:name/durum",
    name: "LogisticsStatusUpdate",
    hidden: true,
    viewPath: "@/views/logistics/shipments/StatusUpdateView.vue",
    component: () => import("@/views/logistics/shipments/StatusUpdateView.vue"),
    ready: true,
    blockedBy: null,
  },
  {
    key: "C3",
    path: "lojistik/toplu-aktarim",
    name: "LogisticsCsvImport",
    labelKey: "nav.item.logisticsCsvImport",
    icon: "upload",
    viewPath: "@/views/logistics/shipments/CsvImportView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.create_import_job",
  },

  // ── D · Teslimat akışları ───────────────────────────────────────────
  {
    key: "D1",
    path: "lojistik/satici-teslimati",
    name: "LogisticsSellerDelivery",
    labelKey: "nav.item.logisticsSellerDelivery",
    icon: "car",
    viewPath: "@/views/logistics/delivery-locations/SellerDeliveryView.vue",
    ready: false,
    blockedBy: "Shipment.channel + TUR-108 alanları DocType'ta yok",
  },
  {
    key: "D2",
    path: "lojistik/alici-teslim-alma",
    name: "LogisticsBuyerPickup",
    labelKey: "nav.item.logisticsBuyerPickup",
    icon: "package-check",
    viewPath: "@/views/logistics/delivery-locations/BuyerPickupView.vue",
    ready: false,
    blockedBy: "Shipment.channel + TUR-108 alanları DocType'ta yok",
  },

  // ── E · Bacak ───────────────────────────────────────────────────────
  {
    key: "E1",
    path: "lojistik/sevkiyatlar/:name/bacaklar",
    name: "LogisticsLegOperations",
    hidden: true,
    viewPath: "@/views/logistics/shipments/LegOperationView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_shipment_legs",
  },
  {
    key: "E2",
    path: "lojistik/sevkiyatlar/:name/bacak-cizelgesi",
    name: "LogisticsLegTimeline",
    hidden: true,
    viewPath: "@/views/logistics/shipments/LegTimelineView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_shipment_legs",
  },

  // ── G · Paketleme ve etiket ─────────────────────────────────────────
  {
    key: "G1",
    path: "lojistik/sevkiyatlar/:name/paketleme",
    name: "LogisticsPacking",
    hidden: true,
    viewPath: "@/views/logistics/packages/PackingView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.save_shipment_packages",
  },
  {
    key: "G2",
    path: "lojistik/sevkiyatlar/:name/etiketler",
    name: "LogisticsLabels",
    hidden: true,
    viewPath: "@/views/logistics/labels/LabelPrintView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.generate_shipment_labels",
  },
  {
    key: "G3",
    path: "lojistik/sevkiyatlar/:name/palet",
    name: "LogisticsPalletPlan",
    hidden: true,
    viewPath: "@/views/logistics/packages/PalletPlanView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.save_pallet_plan",
  },

  // ── H · Teslim kanıtı ───────────────────────────────────────────────
  {
    key: "H1",
    path: "lojistik/sevkiyatlar/:name/istasyonlar",
    name: "LogisticsStationTimeline",
    hidden: true,
    viewPath: "@/views/logistics/pod/StationTimelineView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.get_shipment (events)",
  },
  {
    key: "H2",
    path: "lojistik/sevkiyatlar/:name/teslim-kaniti",
    name: "LogisticsProofOfDelivery",
    hidden: true,
    viewPath: "@/views/logistics/pod/ProofOfDeliveryView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.get_proof_of_delivery",
  },

  // ── J · Bildirim ────────────────────────────────────────────────────
  {
    key: "J1",
    path: "lojistik/bildirim-sablonlari",
    name: "LogisticsNotificationTemplates",
    labelKey: "nav.item.logisticsNotifyTemplates",
    icon: "mail",
    viewPath: "@/views/logistics/notifications/NotificationTemplateView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_notification_templates",
  },
  {
    key: "J2",
    path: "lojistik/bildirim-tercihleri",
    name: "LogisticsNotificationPreferences",
    labelKey: "nav.item.logisticsNotifyPreferences",
    icon: "bell-dot",
    viewPath: "@/views/logistics/notifications/NotificationPreferenceView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_notification_preferences",
  },
  {
    key: "J3",
    path: "lojistik/alarmlar",
    name: "LogisticsOperationAlerts",
    labelKey: "nav.item.logisticsAlerts",
    icon: "siren",
    viewPath: "@/views/logistics/notifications/OperationAlertView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_operation_alerts",
  },

  // ── I · İade ────────────────────────────────────────────────────────
  {
    key: "I1",
    path: "lojistik/iadeler",
    name: "LogisticsReturnQueue",
    labelKey: "nav.item.logisticsReturns",
    icon: "undo-2",
    viewPath: "@/views/logistics/returns/ReturnQueueView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_return_requests",
  },
  {
    key: "I2",
    path: "lojistik/iadeler/:name/karar",
    name: "LogisticsReturnDecision",
    hidden: true,
    viewPath: "@/views/logistics/returns/ReturnDecisionView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.decide_return_request",
  },
  {
    key: "I3",
    path: "lojistik/iadeler/:name/kontrol",
    name: "LogisticsReturnInspection",
    hidden: true,
    viewPath: "@/views/logistics/returns/ReturnInspectionView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.save_return_inspection",
  },
  {
    key: "I4",
    path: "lojistik/iadeler/:name/kapanis",
    name: "LogisticsReturnClosure",
    hidden: true,
    viewPath: "@/views/logistics/returns/ReturnClosureView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.close_return_request",
  },

  // ── K · Fiyatlandırma ───────────────────────────────────────────────
  {
    key: "K1",
    path: "lojistik/tarifeler",
    name: "LogisticsShippingRates",
    labelKey: "nav.item.logisticsRates",
    icon: "receipt-turkish-lira",
    viewPath: "@/views/logistics/pricing/ShippingRateView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_pricing_rules",
  },
  {
    key: "K2",
    path: "lojistik/fiyat-kurallari",
    name: "LogisticsPricingRules",
    labelKey: "nav.item.logisticsPricingRules",
    icon: "list-ordered",
    viewPath: "@/views/logistics/pricing/PricingRuleView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_pricing_rules",
  },
  {
    key: "K3",
    path: "lojistik/fiyat-simulasyonu",
    name: "LogisticsPriceSimulation",
    labelKey: "nav.item.logisticsPriceSimulation",
    icon: "calculator",
    viewPath: "@/views/logistics/pricing/PriceSimulationView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.simulate_price",
  },

  // ── L · Raporlar ────────────────────────────────────────────────────
  {
    key: "L1",
    path: "lojistik/raporlar",
    name: "LogisticsReportCenter",
    labelKey: "nav.item.logisticsReports",
    icon: "chart-column",
    viewPath: "@/views/logistics/reports/ReportCenterView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.get_performance_report",
  },
];

// Sevkiyat detayının SEKMELERİ burada DEĞİL: `views/logistics/
// shipmentTabRegistry.js` içindeler ve envanter kodlarını (`screenKey`)
// kendileri taşıyor. Eskiden burada `["B3".."B8"]` sabiti vardı ve yeni
// sekme ekleyen kişinin bu dosyayı da güncellemesi gerekiyordu — yani
// Ali'nin sekme eklemesi Bora'nın router dosyasına dokunmasını isterdi.
// 16-FE-0 bu bağı kaldırdı; sekme kodları ekran kodlarıyla ÇAKIŞAMAZ,
// denetim `_contract/__tests__/shipmentTabRegistry.test.js` içinde.

/** L2/L3 rapor içerikleri L1 kabuğunun içinde render ediliyor. */
export const REPORT_PANELS = ["L2", "L3"];

/**
 * Ekranın sahibi — `viewPath`in düştüğü dizinden türetiliyor.
 *
 * Ayrı bir `owner` alanı bilerek YOK: iki kaynak tutulsaydı biri bayatlar
 * ve "kayıtta Bora yazıyor ama dosya Ali'nin dizininde" durumu sessizce
 * geçerdi. Tek kaynak yol, tek harita `_contract/ownership.js`.
 */
export const ownerOfScreen = (screen) => ownerOfViewPath(screen?.viewPath);

/** Bir kişinin sahip olduğu ekranlar — planlama/denetim çıktılarında. */
export const screensOwnedBy = (owner) =>
  LOGISTICS_SCREENS.filter((s) => ownerOfScreen(s) === owner);

/** Router'a kaydedilecek olanlar. */
export const readyScreens = () => LOGISTICS_SCREENS.filter((s) => s.ready);

/** Menüde görünecekler — hazır VE parametresiz olanlar. */
export const menuScreens = () =>
  LOGISTICS_SCREENS.filter((s) => s.ready && !s.hidden && s.labelKey);

/** Henüz açılmamış ekranlar — "ne kaldı" sorusunun tek cevabı. */
export const pendingScreens = () => LOGISTICS_SCREENS.filter((s) => !s.ready);

/**
 * Bir ekran açık mı?
 *
 * Container'lar başka bir ekrana GİDEN buton çizerken buna bakar. Hedef
 * ekran kayıtlı değilken buton çizmek ölü buton demek: kullanıcı tıklar,
 * router eşleşmeyen adı sessizce yutar, hiçbir şey olmaz.
 *
 * İkinci bir "hangileri açık" listesi tutulmuyor — hedef ekran `ready: true`
 * olduğu an buton kendiliğinden belirir.
 */
export const isScreenReady = (key) => Boolean(LOGISTICS_SCREENS.find((s) => s.key === key)?.ready);
