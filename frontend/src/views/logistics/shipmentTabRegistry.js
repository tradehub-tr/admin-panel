// SEVKİYAT DETAYI SEKME KAYIT DEFTERİ — iki geliştiricinin ortak dosyası.
//
// ═══════════════════════════════════════════════════════════════════════
//  YENİ SEKME NASIL EKLENİR (Ali de Bora da aynı üç adımı yapar)
// ═══════════════════════════════════════════════════════════════════════
//  1. Bileşeni KENDİ dizinine yaz:  views/logistics/<senin-dizinin>/tabs/…Tab.vue
//     (dizin sahipliği: `_contract/ownership.js`)
//  2. Etiketi tr + en sözlüklerine ekle:  logistics.tab.<anahtar>
//  3. Aşağıda KENDİ BLOĞUNA bir `defineShipmentTab({...})` EKLE.
//
//  Başka hiçbir dosyaya dokunma. `ShipmentDetailView.vue` ve
//  `ShipmentDetailScreen.vue` Bora'nındır ve bu kaydı okur — sekme
//  eklemek için onları AÇMAK GEREKMEZ.
//
//  KURAL (split doc §6 · hooks.py deseni): herkes yalnız KENDİ bloğuna
//  ekler; başkasının kaydını düzenlemez/silmez. Merge sorumlusu Bora.
//  Sahiplik ihlali merge'de değil, `npm test`te kırmızı olur
//  (`_contract/shipmentTabContract.js` yükleme anında doğruluyor).
//
//  VERİ SÖZLEŞMESİ: sekmene gelen bağlam `{ shipment, documents, can }` ile
//  SINIRLI. Fazlası gerekiyorsa kendi store'undan çek — bağlamı büyütmek
//  kabuğu her sekmenin ihtiyacını bilmeye zorlar.
//
//  BESLENMEYEN SEKME: verisi henüz gelmiyorsa `blockedBy` alanına SEBEBİ
//  yaz. Sekme o zaman "bu bilgi henüz taşınmıyor" panelini gösterir ve
//  sayaç basmaz. Boş liste çizmek operasyona "kayıt yok" der — yalan olur.

// Göreli + `.js` uzantılı: bu dosya saf veri ve `node --test` onu Vite
// olmadan yüklüyor (alias orada çözülmez). Aşağıdaki `component` lazy
// import'ları `@/` kullanabiliyor çünkü ÇAĞRILDIKLARINDA hep Vite içindeler.
import { createShipmentTabRegistry, defineShipmentTab } from "./_contract/shipmentTabContract.js";

export const SHIPMENT_TABS = createShipmentTabRegistry([
  // ═════════════════════════════════════════════════════════════════════
  // --- Bora ---  (B3–B8 · 16-FE / 11-FE)
  // ═════════════════════════════════════════════════════════════════════
  defineShipmentTab({
    key: "items",
    screenKey: "B3",
    owner: "bora",
    labelKey: "logistics.tab.items",
    order: 10,
    componentPath: "@/views/logistics/shipments/tabs/ShipmentItemsTab.vue",
    component: () => import("@/views/logistics/shipments/tabs/ShipmentItemsTab.vue"),
    props: ({ shipment }) => ({ items: shipment.items ?? [] }),
    count: ({ shipment }) => (shipment.items ?? []).length,
    blockedBy: null,
  }),

  defineShipmentTab({
    key: "packages",
    screenKey: "B4",
    owner: "bora",
    labelKey: "logistics.tab.packages",
    order: 20,
    componentPath: "@/views/logistics/shipments/tabs/ShipmentPackagesTab.vue",
    component: () => import("@/views/logistics/shipments/tabs/ShipmentPackagesTab.vue"),
    props: ({ shipment }) => ({
      packages: shipment.packages ?? [],
      // ÖLÜ BUTON YASAĞI: "etiket oluştur" butonunun ucu yok (G2 manifestte
      // `ready: false`, üretim 13-BE'de) ve emit'i dinleyen kimse yok.
      // `can.write`e bırakılsaydı yetkili herkes tıklar, hiçbir şey olmazdı.
      // Uç geldiğinde burası `can.write` olur ve handler bağlanır.
      canGenerateLabel: false,
    }),
    count: ({ shipment }) => (shipment.packages ?? []).length,
    /**
     * Etiketi olmayan koli uyarısı — ama alan HİÇ taşınmıyorsa uyarı YOK.
     *
     * `label_url` sözleşmede var, gerçek `Shipment Package` şemasında yok.
     * Sadece `!p.label_url` saymak, alanı taşımayan her yanıtta uyarıyı
     * kalıcı olarak yakardı ve uyarı anlamını yitirirdi. Alanı taşıyan en
     * az bir koli varsa kıyas anlamlı; hiçbiri taşımıyorsa bilinmiyordur.
     */
    alert: ({ shipment }) => {
      const packages = shipment.packages ?? [];
      if (!packages.some((p) => "label_url" in p)) return false;
      return packages.some((p) => !p.label_url);
    },
    blockedBy: null,
  }),

  defineShipmentTab({
    key: "documents",
    screenKey: "B5",
    owner: "bora",
    labelKey: "logistics.tab.documents",
    order: 30,
    componentPath: "@/views/logistics/shipments/tabs/ShipmentDocumentsTab.vue",
    component: () => import("@/views/logistics/shipments/tabs/ShipmentDocumentsTab.vue"),
    props: ({ documents }) => ({
      documents,
      // Aynı gerekçe: belge yükleme ucu yok, `upload` emit'ini dinleyen yok.
      canUpload: false,
    }),
    count: ({ documents }) => documents.length,
    blockedBy: null,
  }),

  defineShipmentTab({
    key: "tracking",
    screenKey: "B6",
    owner: "bora",
    labelKey: "logistics.tab.tracking",
    order: 40,
    componentPath: "@/views/logistics/shipments/tabs/ShipmentTrackingTab.vue",
    component: () => import("@/views/logistics/shipments/tabs/ShipmentTrackingTab.vue"),
    props: ({ shipment }) => ({ events: shipment.events ?? [] }),
    count: ({ shipment }) => (shipment.events ?? []).length,
    // ÖLÇÜLDÜ: `Shipment Event` child tablo DEĞİL, ayrı DocType (`shipment`
    // link alanıyla bağlı). `get_shipment_detail` = `doc.as_dict()` olduğu
    // için yanıtta yok ve olayları listeleyen bir uç da yok.
    blockedBy:
      "api.v1.shipment.get_shipment_detail olay taşımıyor — 11-BE takip/durum otomasyonunu bekliyor",
  }),

  defineShipmentTab({
    key: "legs",
    screenKey: "B7",
    owner: "bora",
    labelKey: "logistics.tab.legs",
    order: 50,
    componentPath: "@/views/logistics/shipments/tabs/ShipmentLegsTab.vue",
    component: () => import("@/views/logistics/shipments/tabs/ShipmentLegsTab.vue"),
    props: ({ shipment }) => ({ legs: shipment.legs ?? [] }),
    count: ({ shipment }) => (shipment.legs ?? []).length,
    // `Shipment Leg` de ayrı DocType; `list_shipment_legs` ucu 08-BE'de.
    blockedBy:
      "api.v1.logistics.list_shipment_legs yok — 08-BE ambar/aktarma/devir görevini bekliyor",
  }),

  defineShipmentTab({
    key: "cost",
    screenKey: "B8",
    owner: "bora",
    labelKey: "logistics.tab.cost",
    order: 60,
    componentPath: "@/views/logistics/shipments/tabs/ShipmentCostTab.vue",
    component: () => import("@/views/logistics/shipments/tabs/ShipmentCostTab.vue"),
    props: ({ shipment, can }) => ({ shipment, can }),
    /**
     * Sekme GİZLENMİYOR, yalnız içerik maskeleniyor.
     *
     * `view.logistics_cost` yoksa backend maliyet alanlarını null'layıp
     * gönderiyor (`mask_shipment_cost_fields`) ve sekme "yetkiniz yok"
     * diyor. Sekmeyi tamamen gizlemek, yetkiyi isteyen kullanıcıya
     * maliyet diye bir şeyin var olduğunu bile söylemezdi.
     */
    blockedBy: null,
  }),

  // ═════════════════════════════════════════════════════════════════════
  // --- Ali ---  (13-FE koli/etiket · 14-FE POD · 15-FE iade · 19 palet)
  //
  // Buraya kendi kayıtlarını ekle. Örnek (kopyala, uyarla):
  //
  //   defineShipmentTab({
  //     key: "pod",
  //     screenKey: "H3",
  //     owner: "ali",
  //     labelKey: "logistics.tab.pod",
  //     order: 70,
  //     componentPath: "@/views/logistics/pod/tabs/ProofOfDeliveryTab.vue",
  //     component: () => import("@/views/logistics/pod/tabs/ProofOfDeliveryTab.vue"),
  //     props: ({ shipment }) => ({ shipment }),
  //     blockedBy: "api.v1.logistics.get_proof_of_delivery yok — 14-BE",
  //   }),
  //
  // `screenKey`: ekran kodlarıyla ÇAKIŞAMAZ — envanter tek numara alanı ve
  //   bir kalem ya ekran ya sekmedir. POD bölümünde H1/H2 zaten EKRAN, o
  //   yüzden POD sekmesi "H3". Bölüm serisinde boşta olan ilk numarayı al.
  //   Çakışırsan `_contract/__tests__/shipmentTabRegistry.test.js` uyarır.
  // `order`: Bora'nın blokları 10–60'ı kullanıyor. 70'ten başla, 10'ar artır.
  // ═════════════════════════════════════════════════════════════════════
]);

// Envanter kodları (`screenKey`) BURADA yaşıyor ve dışarı ayrı bir liste
// olarak açılmıyor: `router/logisticsScreens.js` bu dosyayı BİLEREK import
// etmiyor (açılış chunk'ına düşmesin — bkz. manifest başlığı). Sayımı ve
// çakışma denetimini `_contract/__tests__/shipmentTabRegistry.test.js`
// yapıyor ve kodları `SHIPMENT_TABS`'ten kendisi türetiyor.
