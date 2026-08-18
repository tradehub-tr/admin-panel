// Lojistik ekran manifesti — 45 ekranın TEK kaynağı.
//
// NEDEN BU DOSYA VAR:
//   Ekranların tamamı Faz D'de sunum katmanı olarak yazıldı, ama çoğu henüz
//   gerçek bir API ucuna bağlanamıyor (Faz F). "Hangileri kaldı, ne zaman
//   açılacak?" sorusunun cevabı bir belgede tutulursa bayatlar — bugün
//   YOL-HARITASI'nın bayatladığını gördük. Bu yüzden liste, menüyü KURAN
//   dosyanın içinde duruyor: her PR'da görünür, silinmeden kaybolmaz.
//
// SÖZLEŞME:
//   * `ready: true`  → `component` canlı bir lazy import'tur; route + menü
//     kaydı üretilir, ekran panelde görünür.
//   * `ready: false` → `componentPath` yalnız bir METİNDİR (henüz açılmamış
//     dosyanın planlanan yolu). Vite `import()` çağrılarını statik çözdüğü
//     için var olmayan dosyaya lazy import koymak build'i kırar — ayrıca
//     olmayan bir modülü "yüklenebilir" gibi göstermek yanlış olurdu.
//     `blockedBy` neyin beklendiğini söyler.
//   `src/router/__tests__/logisticsScreens.test.js` her girişin ya hazır ya
//   gerekçeli olmasını zorunlu kılar — "unutuldu" durumu testte kırmızı olur.
//
//   * `sellerVisible: true` → ekran SATICI menüsünde de görünür. Panel hem
//     satıcıya hem admin'e hizmet ediyor ve iki menü ayrı yapılardan
//     besleniyor (`data/navigation.js`). Bayrak konmazsa ekran yalnız
//     admin'de görünür; satıcı route'a URL ile ulaşsa bile menüde bulamaz.
//     Katalog/ayar gibi platform ekranları bilinçli olarak işaretsizdir.
//
// BİR EKRAN NASIL AÇILIR:
//   1. Ucu yaz (tradehub_core/api/v1/logistics*.py)
//   2. Container view aç (src/views/logistics/…View.vue)
//   3. Buradaki satırda `ready: true`, `blockedBy: null` yap
//   Menü ve route kendiliğinden oluşur; başka dosyaya dokunmak gerekmez.

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
    component: () => import("@/views/logistics/CatalogListView.vue"),
    ready: true,
    blockedBy: null,
  },
  {
    key: "M2",
    path: "lojistik/kataloglar/:catalogKey/:name?",
    name: "LogisticsCatalogForm",
    // Parametreli detay rotası menüde görünmez — listeden açılır.
    hidden: true,
    component: () => import("@/views/logistics/CatalogFormView.vue"),
    ready: true,
    blockedBy: null,
  },
  {
    key: "M3",
    path: "lojistik/ayarlar",
    name: "LogisticsSettings",
    labelKey: "nav.item.logisticsSettings",
    icon: "settings-2",
    component: () => import("@/views/logistics/SettingsView.vue"),
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
    component: () => import("@/views/logistics/CarrierAccountView.vue"),
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
    component: () => import("@/views/logistics/StatusMappingView.vue"),
    ready: true,
    blockedBy: null,
  },
  {
    key: "F2",
    path: "lojistik/baglanti-testi",
    name: "LogisticsConnectionTest",
    labelKey: "nav.item.logisticsConnectionTest",
    icon: "plug-zap",
    componentPath: "@/views/logistics/ConnectionTestView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.test_carrier_connection",
  },
  {
    key: "F3",
    path: "lojistik/entegrasyon-logu",
    name: "LogisticsIntegrationLog",
    labelKey: "nav.item.logisticsIntegrationLog",
    icon: "scroll-text",
    componentPath: "@/views/logistics/IntegrationLogView.vue",
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
    componentPath: "@/views/logistics/DashboardView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.get_dashboard_metrics",
  },
  {
    key: "A2",
    path: "lojistik/bekleyen-isler",
    name: "LogisticsPendingQueue",
    labelKey: "nav.item.logisticsPendingQueue",
    icon: "list-todo",
    componentPath: "@/views/logistics/PendingQueueView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_pending_work",
  },
  {
    key: "A3",
    path: "lojistik/istisnalar",
    name: "LogisticsExceptionQueue",
    labelKey: "nav.item.logisticsExceptionQueue",
    icon: "triangle-alert",
    componentPath: "@/views/logistics/ExceptionQueueView.vue",
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
    component: () => import("@/views/logistics/ShipmentListView.vue"),
    ready: true,
    blockedBy: null,
  },
  {
    key: "B2",
    path: "lojistik/sevkiyatlar/:name",
    name: "LogisticsShipmentDetail",
    hidden: true,
    component: () => import("@/views/logistics/ShipmentDetailView.vue"),
    ready: true,
    // B3–B8 sekmeleri bu container'ın içinde render ediliyor; ayrı rota yok.
    blockedBy: null,
  },
  {
    key: "B9",
    path: "lojistik/siparis/:order/bolunme",
    name: "LogisticsShipmentSplit",
    hidden: true,
    componentPath: "@/views/logistics/ShipmentSplitView.vue",
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
    componentPath: "@/views/logistics/ManualShipmentView.vue",
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
    component: () => import("@/views/logistics/StatusUpdateView.vue"),
    ready: true,
    blockedBy: null,
  },
  {
    key: "C3",
    path: "lojistik/toplu-aktarim",
    name: "LogisticsCsvImport",
    labelKey: "nav.item.logisticsCsvImport",
    icon: "upload",
    componentPath: "@/views/logistics/CsvImportView.vue",
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
    componentPath: "@/views/logistics/SellerDeliveryView.vue",
    ready: false,
    blockedBy: "Shipment.channel + TUR-108 alanları DocType'ta yok",
  },
  {
    key: "D2",
    path: "lojistik/alici-teslim-alma",
    name: "LogisticsBuyerPickup",
    labelKey: "nav.item.logisticsBuyerPickup",
    icon: "package-check",
    componentPath: "@/views/logistics/BuyerPickupView.vue",
    ready: false,
    blockedBy: "Shipment.channel + TUR-108 alanları DocType'ta yok",
  },

  // ── E · Bacak ───────────────────────────────────────────────────────
  {
    key: "E1",
    path: "lojistik/sevkiyatlar/:name/bacaklar",
    name: "LogisticsLegOperations",
    hidden: true,
    componentPath: "@/views/logistics/LegOperationView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_shipment_legs",
  },
  {
    key: "E2",
    path: "lojistik/sevkiyatlar/:name/bacak-cizelgesi",
    name: "LogisticsLegTimeline",
    hidden: true,
    componentPath: "@/views/logistics/LegTimelineView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_shipment_legs",
  },

  // ── G · Paketleme ve etiket ── SAHİP: Ali (13-FE) ───────────────────
  //
  // ÇAKIŞMA NOTU: Bu manifest iki geliştirici arasında paylaşılıyor
  // (LOGISTICS-TASK-SPLIT §3). Grup blokları ayrık tutuluyor ki aynı
  // satırlarda buluşmayalım — yeni ekran eklerken KENDİ grubunun içine yaz,
  // araya girme. Merge çakışması çıkarsa iki tarafın girdileri de korunur
  // (`.claude/rules/commit.md` — "iki taraf farklı özellik eklediyse ikisini
  // de tut").
  //
  // Yollar `lojistik/sevkiyatlar/…` ALTINDAN ÇIKARILDI (13-FE): o dal
  // sevkiyat ekranlarının sahibinde (16-FE) ve paketlemenin kendi giriş
  // kapısı olmadan ekranlara yalnız URL ezberleyen ulaşırdı.
  {
    key: "G0",
    path: "lojistik/paketleme",
    name: "LogisticsPackingQueue",
    labelKey: "nav.item.logisticsPacking",
    icon: "package",
    component: () => import("@/views/logistics/packages/PackingQueueView.vue"),
    ready: true,
    // Satıcı kendi sevkiyatını kendisi paketliyor — bu ekran onun günlük
    // işi. Tenant izolasyonu backend'de (sözleşme §6); menüde göstermek
    // veri sınırını değiştirmiyor, yalnız kapıyı açıyor.
    sellerVisible: true,
    // Uç yok; `api/packaging.js` mock adaptörüyle çalışıyor (USE_MOCK).
    // Ekran gerçek sözleşmeyi tüketiyor, uç yazılınca bayrak kapanacak.
    blockedBy: null,
  },
  {
    key: "G1",
    path: "lojistik/paketleme/:name",
    name: "LogisticsPacking",
    hidden: true,
    component: () => import("@/views/logistics/packages/PackingWorkspaceView.vue"),
    ready: true,
    blockedBy: null,
  },
  {
    key: "G2",
    path: "lojistik/etiketler/:name",
    name: "LogisticsLabels",
    hidden: true,
    component: () => import("@/views/logistics/labels/LabelPrintView.vue"),
    ready: true,
    blockedBy: null,
  },
  {
    key: "G3",
    path: "lojistik/paketleme/:name/palet",
    name: "LogisticsPalletPlan",
    hidden: true,
    component: () => import("@/views/logistics/packages/PalletPlanView.vue"),
    ready: true,
    // Uç ve Pallet DocType 19-BE'de yazılacak; ekran o güne kadar
    // `api/packaging.js` mock adaptörüyle sözleşmeyi tüketiyor.
    blockedBy: null,
  },

  // ── H · Teslim kanıtı ───────────────────────────────────────────────
  {
    key: "H1",
    path: "lojistik/sevkiyatlar/:name/istasyonlar",
    name: "LogisticsStationTimeline",
    hidden: true,
    componentPath: "@/views/logistics/StationTimelineView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.get_shipment (events)",
  },
  {
    key: "H2",
    path: "lojistik/sevkiyatlar/:name/teslim-kaniti",
    name: "LogisticsProofOfDelivery",
    hidden: true,
    componentPath: "@/views/logistics/ProofOfDeliveryView.vue",
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
    componentPath: "@/views/logistics/NotificationTemplateView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_notification_templates",
  },
  {
    key: "J2",
    path: "lojistik/bildirim-tercihleri",
    name: "LogisticsNotificationPreferences",
    labelKey: "nav.item.logisticsNotifyPreferences",
    icon: "bell-dot",
    componentPath: "@/views/logistics/NotificationPreferenceView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_notification_preferences",
  },
  {
    key: "J3",
    path: "lojistik/alarmlar",
    name: "LogisticsOperationAlerts",
    labelKey: "nav.item.logisticsAlerts",
    icon: "siren",
    componentPath: "@/views/logistics/OperationAlertView.vue",
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
    componentPath: "@/views/logistics/ReturnQueueView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_return_requests",
  },
  {
    key: "I2",
    path: "lojistik/iadeler/:name/karar",
    name: "LogisticsReturnDecision",
    hidden: true,
    componentPath: "@/views/logistics/ReturnDecisionView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.decide_return_request",
  },
  {
    key: "I3",
    path: "lojistik/iadeler/:name/kontrol",
    name: "LogisticsReturnInspection",
    hidden: true,
    componentPath: "@/views/logistics/ReturnInspectionView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.save_return_inspection",
  },
  {
    key: "I4",
    path: "lojistik/iadeler/:name/kapanis",
    name: "LogisticsReturnClosure",
    hidden: true,
    componentPath: "@/views/logistics/ReturnClosureView.vue",
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
    componentPath: "@/views/logistics/ShippingRateView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_pricing_rules",
  },
  {
    key: "K2",
    path: "lojistik/fiyat-kurallari",
    name: "LogisticsPricingRules",
    labelKey: "nav.item.logisticsPricingRules",
    icon: "list-ordered",
    componentPath: "@/views/logistics/PricingRuleView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.list_pricing_rules",
  },
  {
    key: "K3",
    path: "lojistik/fiyat-simulasyonu",
    name: "LogisticsPriceSimulation",
    labelKey: "nav.item.logisticsPriceSimulation",
    icon: "calculator",
    componentPath: "@/views/logistics/PriceSimulationView.vue",
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
    componentPath: "@/views/logistics/ReportCenterView.vue",
    ready: false,
    blockedBy: "api.v1.logistics.get_performance_report",
  },
];

/**
 * B3–B8 sevkiyat detayının SEKMELERİ — ayrı route değiller, `B2` altında
 * render ediliyorlar. Envanterde ayrı iş birimi sayıldıkları için burada
 * kayıtlılar; `ready` durumları B2'ye bağlı.
 */
export const SHIPMENT_DETAIL_TABS = ["B3", "B4", "B5", "B6", "B7", "B8"];

/** L2/L3 rapor içerikleri L1 kabuğunun içinde render ediliyor. */
export const REPORT_PANELS = ["L2", "L3"];

/** Router'a kaydedilecek olanlar. */
export const readyScreens = () => LOGISTICS_SCREENS.filter((s) => s.ready);

/** Admin menüsünde görünecekler — hazır VE parametresiz olanlar. */
export const menuScreens = () =>
  LOGISTICS_SCREENS.filter((s) => s.ready && !s.hidden && s.labelKey);

/**
 * Satıcı menüsünde görünecekler.
 *
 * Admin listesinin ALT KÜMESİ: satıcı katalog yönetmiyor, taşıyıcı kimlik
 * bilgisi görmüyor. Ayrı bir liste tutulmuyor — aynı manifest, ek bayrak.
 */
export const sellerMenuScreens = () => menuScreens().filter((s) => s.sellerVisible);

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
export const isScreenReady = (key) =>
  Boolean(LOGISTICS_SCREENS.find((s) => s.key === key)?.ready);
