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
//   * `sellerVisible: true` → ekran SATICI menüsünde de görünür. Panel hem
//     satıcıya hem admin'e hizmet ediyor ve iki menü ayrı yapılardan
//     besleniyor (`data/navigation.js`). Katalog/ayar gibi platform
//     ekranları bilinçli olarak işaretsizdir.
//   * `sellerRoute: true` → menüde görünmeyen (hidden) detay ekranına satıcı
//     URL/yönlendirme ile GİREBİLİR (örn. kendi sevkiyatının detayı).
//   * İkisi de yoksa ekran PLATFORM ekranıdır: route guard satıcıyı
//     dashboard'a atar (G0 rol matrisi, 2026-08-19). Önceden "menüde yok ama
//     URL çalışır" idi; matris kararıyla route da kapatıldı. Veri sınırı yine
//     backend'de — bu kapı yalnız ekran VARLIĞININ sızmasını önler.
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
    component: () => import("@/views/logistics/dashboard/DashboardView.vue"),
    ready: true,
    // Uç yok; `api/dashboardMetrics.js` mock adaptörüyle çalışıyor (13-FE
    // deseni) — logistics_ops.get_dashboard_metrics sözleşmesi o dosyada
    // (admin-only modül; guest v1.logistics'e bilinçli eklenmedi). KPI
    // tanımları A2/A3 sayaçlarıyla AYNI sorgudan gelmek zorunda (sözleşme
    // notu).
    blockedBy: null,
  },
  {
    key: "A2",
    path: "lojistik/bekleyen-isler",
    name: "LogisticsPendingQueue",
    labelKey: "nav.item.logisticsPendingQueue",
    icon: "list-todo",
    viewPath: "@/views/logistics/dashboard/PendingQueueView.vue",
    component: () => import("@/views/logistics/dashboard/PendingQueueView.vue"),
    ready: true,
    // Uç yok; `api/pendingWork.js` mock adaptörüyle çalışıyor (13-FE
    // paketleme deseni) — logistics_ops.list_pending_work sözleşmesi o
    // dosyada (admin-only modül), 16-BE yazılınca MOCK satırı kapanır, bu
    // kayıt değişmez.
    blockedBy: null,
  },
  {
    key: "A3",
    path: "lojistik/istisnalar",
    name: "LogisticsExceptionQueue",
    labelKey: "nav.item.logisticsExceptionQueue",
    icon: "triangle-alert",
    viewPath: "@/views/logistics/exceptions/ExceptionQueueView.vue",
    component: () => import("@/views/logistics/exceptions/ExceptionQueueView.vue"),
    ready: true,
    // Uç yok; `api/exceptions.js` mock adaptörüyle çalışıyor (13-FE deseni) —
    // logistics_ops.list_shipment_exceptions / resolve_shipment_exception
    // sözleşmesi o dosyada (admin-only modül), 16-BE yazılınca MOCK satırları
    // kapanır. K3: retry/atama aksiyonları da 16-BE sözleşmesiyle gelecek.
    blockedBy: null,
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
    // G0 matrisi: satıcı KENDİ sevkiyatlarını listeler (Amazon/Trendyol
    // "Siparişlerim" deseni). Tenant filtresi backend'de
    // (shipment_query_conditions.seller_profile) — menü yalnız kapıyı açar.
    sellerVisible: true,
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
    // Satıcı B1 listesinden kendi sevkiyatının detayına iner.
    sellerRoute: true,
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
    blockedBy: "api.v1.shipment.list_order_shipments",
  },

  // ── C · Manuel ve offline ───────────────────────────────────────────
  {
    key: "C1",
    path: "lojistik/sevkiyatlar/yeni",
    name: "LogisticsManualShipment",
    labelKey: "nav.item.logisticsManualShipment",
    icon: "file-plus",
    viewPath: "@/views/logistics/shipments/create/ManualShipmentView.vue",
    component: () => import("@/views/logistics/shipments/create/ManualShipmentView.vue"),
    // G0/K4: satıcı kendi siparişine manuel/offline sevkiyat açabilir.
    sellerVisible: true,
    ready: true,
    // Uç yok; `api/shipmentCreate.js` mock adaptörüyle çalışıyor (13-FE
    // paketleme deseni). Eski blockedBy ölçümü (create_shipment formun 9
    // alanını almıyor) artık o dosyadaki 06-BE SÖZLEŞMESİNİN gerekçesi —
    // uç yazılınca MOCK satırı kapanır, bu kayıt değişmez. Kanal listesi
    // GERÇEK katalogtan geliyor (satıcı READ izni G0'da açıldı).
    blockedBy: null,
  },
  {
    key: "C2",
    path: "lojistik/sevkiyatlar/:name/durum",
    name: "LogisticsStatusUpdate",
    hidden: true,
    // G0 matrisi C2: satıcı kendi sevkiyatında SINIRLI geçiş yapar ("kargoya
    // verildi" — backend SELLER_ALLOWED_TRANSITIONS dar yolu). Ekran satıcıya
    // açık; hangi hedef durumların sunulacağını view auth.isSeller'la kısar.
    sellerRoute: true,
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
    component: () => import("@/views/logistics/delivery-locations/SellerDeliveryView.vue"),
    // G0 matrisi: kendi aracıyla teslim satıcının fiziksel işi (D5 deseni —
    // satıcı-lojistiği modu). Kendi kayıtları, backend tenant filtreli.
    sellerVisible: true,
    ready: true,
    // TUR-108 alanları `Shipment`'ta YOK — 14-FE veri sözleşmesi §1.3 ile
    // sipariş edildi ve 06-BE ile ORTAK işaretlendi. Ekran mock'la çalışıyor.
    blockedBy: null,
  },
  {
    key: "D2",
    path: "lojistik/alici-teslim-alma",
    name: "LogisticsBuyerPickup",
    labelKey: "nav.item.logisticsBuyerPickup",
    icon: "package-check",
    viewPath: "@/views/logistics/delivery-locations/BuyerPickupView.vue",
    component: () => import("@/views/logistics/delivery-locations/BuyerPickupView.vue"),
    // G0 matrisi: alıcının teslim alacağı paketi hazır eden satıcıdır;
    // pickup kodu doğrulama satıcı tarafında da çalışır.
    sellerVisible: true,
    ready: true,
    // TUR-108 alanları `Shipment`'ta YOK — 14-FE veri sözleşmesi §1.3 ile
    // sipariş edildi ve 06-BE ile ORTAK işaretlendi. Ekran mock'la çalışıyor.
    blockedBy: null,
  },

  // ── E · Bacak ───────────────────────────────────────────────────────
  {
    key: "E1",
    path: "lojistik/sevkiyatlar/:name/bacaklar",
    name: "LogisticsLegOperations",
    hidden: true,
    viewPath: "@/views/logistics/shipments/LegOperationView.vue",
    ready: false,
    blockedBy: "api.v1.shipment.list_shipment_legs",
  },
  {
    key: "E2",
    path: "lojistik/sevkiyatlar/:name/bacak-cizelgesi",
    name: "LogisticsLegTimeline",
    hidden: true,
    viewPath: "@/views/logistics/shipments/LegTimelineView.vue",
    ready: false,
    blockedBy: "api.v1.shipment.list_shipment_legs",
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
    viewPath: "@/views/logistics/packages/PackingQueueView.vue",
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
    // G0 kuyruğu satıcıya açık (sellerVisible) — çalışma alanı da öyle.
    sellerRoute: true,
    viewPath: "@/views/logistics/packages/PackingWorkspaceView.vue",
    component: () => import("@/views/logistics/packages/PackingWorkspaceView.vue"),
    ready: true,
    blockedBy: null,
  },
  {
    key: "G2",
    path: "lojistik/etiketler/:name",
    name: "LogisticsLabels",
    hidden: true,
    // Etiket basımı FBM/Trendyol'da satıcının işi (ortak barkod deseni).
    sellerRoute: true,
    viewPath: "@/views/logistics/labels/LabelPrintView.vue",
    component: () => import("@/views/logistics/labels/LabelPrintView.vue"),
    ready: true,
    blockedBy: null,
  },
  {
    key: "G3",
    path: "lojistik/paketleme/:name/palet",
    name: "LogisticsPalletPlan",
    hidden: true,
    sellerRoute: true,
    viewPath: "@/views/logistics/packages/PalletPlanView.vue",
    component: () => import("@/views/logistics/packages/PalletPlanView.vue"),
    ready: true,
    // Uç ve Pallet DocType 19-BE'de yazılacak; ekran o güne kadar
    // `api/packaging.js` mock adaptörüyle sözleşmeyi tüketiyor.
    blockedBy: null,
  },

  // ── H · Teslim kanıtı ───────────────────────────────────────────────
  // 14-FE (Ali). H0 kuyruğu manifestte HİÇ YOKTU: POD'a ancak bir sevkiyatın
  // adını bilerek ulaşılıyordu. 13-FE'de aynı boşluk vardı ve G0 paketleme
  // kuyruğu eklenerek kapatılmıştı — aynı desen.
  {
    key: "H0",
    path: "lojistik/teslim-kaniti",
    name: "LogisticsPodQueue",
    labelKey: "nav.item.logisticsPod",
    icon: "clipboard-check",
    viewPath: "@/views/logistics/pod/PodQueueView.vue",
    component: () => import("@/views/logistics/pod/PodQueueView.vue"),
    ready: true,
    // Satıcı kendi teslimatının kanıtını kaydedebiliyor (K-B); kuyruk onun
    // giriş kapısı. Tenant izolasyonu backend'de (sözleşme §6.1) — menüde
    // göstermek veri sınırını değiştirmiyor, yalnız kapıyı açıyor.
    sellerVisible: true,
    // Uç yok; `api/pod.js` mock adaptörüyle çalışıyor (USE_MOCK). `blockedBy`
    // null çünkü EKRAN hazır — bekleyen uç `api/pod.js` MOCK haritasında.
    blockedBy: null,
  },
  {
    key: "H1",
    path: "lojistik/sevkiyatlar/:name/istasyonlar",
    name: "LogisticsStationTimeline",
    hidden: true,
    // Kendi sevkiyatının nerede olduğunu görmek satıcının hakkı (D1 katmanı).
    sellerRoute: true,
    viewPath: "@/views/logistics/pod/StationTimelineView.vue",
    component: () => import("@/views/logistics/pod/StationTimelineView.vue"),
    ready: true,
    // Uç 11-BE'de (Bora) ve `Shipment Event.location` alanı DocType'ta YOK
    // (14-FE veri sözleşmesi §1.2 ile sipariş edildi). Ekran mock'la çalışıyor;
    // alan gelmezse "bu bilgi henüz taşınmıyor" der, boş çizelge çizmez.
    blockedBy: null,
  },
  {
    key: "H2",
    path: "lojistik/sevkiyatlar/:name/teslim-kaniti",
    name: "LogisticsProofOfDelivery",
    hidden: true,
    sellerRoute: true,
    viewPath: "@/views/logistics/pod/ProofOfDeliveryView.vue",
    component: () => import("@/views/logistics/pod/ProofOfDeliveryView.vue"),
    ready: true,
    // Uç yok; `api/pod.js` mock adaptörüyle çalışıyor (USE_MOCK).
    blockedBy: null,
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
    // G0 matrisi: satıcı KENDİ iadelerini görür ve karar verir (Trendyol
    // deseni: satıcı onay/red, platform hakem). I3 kontrol + I4 kapanış
    // platform depo operasyonu — satıcıya kapalı.
    sellerVisible: true,
    ready: false,
    blockedBy: "api.v1.logistics.list_return_requests",
  },
  {
    key: "I2",
    path: "lojistik/iadeler/:name/karar",
    name: "LogisticsReturnDecision",
    hidden: true,
    sellerRoute: true,
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
    icon: "coins",
    viewPath: "@/views/logistics/pricing/ShippingRateView.vue",
    component: () => import("@/views/logistics/pricing/ShippingRateView.vue"),
    // G0 matrisi + 20-FE K2: satıcı KENDİ tarifelerini ve kendisine uygulanan
    // platform tarifelerini görür; platformun ALIŞ maliyetini görmez (maskeleme
    // backend'de, sözleşme §7.2).
    sellerVisible: true,
    ready: true,
    // Uç yok; `api/logisticsPricing.js` uç bazında mock haritasıyla çalışıyor
    // (20-FE sözleşmesi §11). 20-BE açtıkça tek satır `false` yapılır.
    blockedBy: null,
  },
  {
    key: "K2",
    path: "lojistik/fiyat-kurallari",
    name: "LogisticsPricingRules",
    labelKey: "nav.item.logisticsPricingRules",
    icon: "list-ordered",
    viewPath: "@/views/logistics/pricing/PricingRuleView.vue",
    component: () => import("@/views/logistics/pricing/PricingRuleView.vue"),
    // Satıcı KENDİ kurallarını yazar; platform kuralları salt-okunur (K1 kararı).
    sellerVisible: true,
    ready: true,
    blockedBy: null,
  },
  {
    key: "K4",
    path: "lojistik/fiyat-kurallari/:name",
    name: "LogisticsPricingRuleForm",
    // Parametreli detay rotası menüde görünmez — listeden açılır.
    hidden: true,
    sellerRoute: true,
    viewPath: "@/views/logistics/pricing/PricingRuleFormView.vue",
    component: () => import("@/views/logistics/pricing/PricingRuleFormView.vue"),
    ready: true,
    blockedBy: null,
  },
  {
    key: "K3",
    path: "lojistik/fiyat-simulasyonu",
    name: "LogisticsPriceSimulation",
    labelKey: "nav.item.logisticsPriceSimulation",
    icon: "calculator",
    viewPath: "@/views/logistics/pricing/PriceSimulationView.vue",
    component: () => import("@/views/logistics/pricing/PriceSimulationView.vue"),
    // Satıcı kendi yükü için hesaplatır — "kargom neden 360 ₺" sorusunu
    // destek hattına düşmeden kendi cevaplayabilsin.
    sellerVisible: true,
    ready: true,
    blockedBy: null,
  },

  // ── L · Raporlar ────────────────────────────────────────────────────
  {
    key: "L1",
    path: "lojistik/raporlar",
    name: "LogisticsReportCenter",
    labelKey: "nav.item.logisticsReports",
    // "chart-column" iconRegistry'de kayıtlı değildi (sessizce boş kalırdı) —
    // kayıtlı "bar-chart-2" kullanılıyor.
    icon: "bar-chart-2",
    viewPath: "@/views/logistics/reports/ReportCenterView.vue",
    component: () => import("@/views/logistics/reports/ReportCenterView.vue"),
    ready: true,
    // Uç yok; `api/reports.js` mock adaptörüyle çalışıyor (13-FE deseni) —
    // reports.get_operations_report / get_performance_report / get_cost_report
    // sözleşmesi o dosyada (17-BE, Ali — split kuralı gereği kendi modülü
    // v1.reports; eski blockedBy guest v1.logistics'i adresliyordu, admin ucu
    // guest modülüne eklenmez). L2/L3 panelleri bu kabuğun içinde
    // (REPORT_PANELS). sellerVisible BİLEREK yok: platform raporu (G0).
    blockedBy: null,
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
export const isScreenReady = (key) => Boolean(LOGISTICS_SCREENS.find((s) => s.key === key)?.ready);
