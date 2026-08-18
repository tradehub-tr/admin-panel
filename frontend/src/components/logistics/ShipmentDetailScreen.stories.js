import shipments from "@/mocks/logistics/shipment.json";
import pod from "@/mocks/logistics/proof_of_delivery.json";
import {
  defineShipmentTab,
  resolveShipmentTabs,
} from "@/views/logistics/_contract/shipmentTabContract";
import { SHIPMENT_TABS } from "@/views/logistics/shipmentTabRegistry";

import ShipmentDetailScreen from "./ShipmentDetailScreen.vue";

/**
 * **B2 · Sevkiyat detayı** — sekmeleri kayıt defterinden alan kabuk.
 *
 * Sekmelere Storybook araç çubuğundan değil, ekranın kendi sekme çubuğundan
 * geçiliyor; incelemede gerçek gezinme denenebilsin diye. Aşağıdaki
 * story'ler sekmelerin dikkat çeken DURUMLARINI ayrı ayrı kuruyor.
 *
 * Sekme listesi story'de elle yazılmıyor: GERÇEK kayıt defteri
 * (`views/logistics/shipmentTabRegistry.js`) çözülüyor. Yani Ali bir sekme
 * eklediğinde tasarım incelemesi onu ertesi gün burada görür — story'nin
 * ayrıca güncellenmesi gerekmez.
 *
 * Başlık DocTypeFormView deseninde: geri oku + 15px başlık + gri alt satır.
 * Geri oku bir HEDEF BİLMİYOR, `back` yayıyor; listeye dönüşü container
 * (`ShipmentDetailView`) bağlıyor. Story'de düğme bu yüzden yalnız action
 * üretir — Storybook'ta rota yok, ekranın kendi hedefi olsaydı burada da
 * ölü buton olurdu.
 */
export default {
  title: "Lojistik/KT1 · Sevkiyat/Detay",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt1-shipment-detail",
  component: ShipmentDetailScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const SHIPMENT = shipments.detail.data;

// Belgeler için ayrı bir katalog fixture'ı yok; teslim belgesi sözleşmeden
// geliyor, sekmenin beklediği görünüm nesnesine burada çevriliyor.
const POD = pod.default.data.items[0];
const DOCUMENTS = [
  { label: "İmza", type: "POD", uploaded_at: POD.delivered_at, url: POD.signature_url },
  { label: "Teslim fotoğrafı", type: "POD", uploaded_at: POD.delivered_at, url: POD.photo_url },
];

// `updateStatus` = `write` yetkisi VE C2 ekranının kayıtlı olması. Kabuk
// başlık butonunu buna bakarak çiziyor; `write` sekmelerin işi.
const MANAGER = { read: true, write: true, cancel: true, viewCost: true, updateStatus: true };
const OPERATOR = {
  read: true,
  write: false,
  cancel: false,
  viewCost: false,
  updateStatus: false,
};

/** Kayıt defterini verilen bağlamla çözer — container'ın yaptığı işin aynısı. */
const tabsFor = (shipment, documents = DOCUMENTS, can = MANAGER, registry = SHIPMENT_TABS) =>
  resolveShipmentTabs(registry, { shipment, documents, can });

/**
 * Hedef hâli göstermek için kaydın `blockedBy` alanları temizlenmiş kopyası.
 *
 * Bugün üretimde `tracking` ve `legs` beslenmiyor (uçları 11-BE/08-BE'de).
 * Diğer story'ler o gerçeği gösteriyor; bu kopya tasarımın sekmeler
 * dolduğunda nasıl görüneceğini gösteriyor. `defineShipmentTab`'den tekrar
 * geçiyor ki story de sözleşmeye uysun.
 */
const UNBLOCKED_TABS = SHIPMENT_TABS.map((tab) => defineShipmentTab({ ...tab, blockedBy: null }));

export const Default = {
  name: "Yolda · yönetici",
  args: { shipment: SHIPMENT, documents: DOCUMENTS, can: MANAGER, tabs: tabsFor(SHIPMENT) },
};

/**
 * Operatör: iptal ve durum güncelleme butonları yok, maliyet sekmesi
 * "yetki yok" diyor. Backend zaten maliyet alanlarını `null` döndürüyor —
 * story de o hâli taklit ediyor.
 */
export const OperatorRole = (() => {
  const shipment = { ...SHIPMENT, carrier_cost: null, customer_charge: null };
  return {
    name: "Rol · operatör (maliyet maskeli)",
    args: {
      shipment,
      documents: DOCUMENTS,
      can: OPERATOR,
      tabs: tabsFor(shipment, DOCUMENTS, OPERATOR),
    },
  };
})();

/** Etiketsiz koli var → Koliler sekmesinde dikkat noktası beliriyor. */
export const UnlabeledPackages = (() => {
  const shipment = {
    ...SHIPMENT,
    packages: SHIPMENT.packages.map((pkg, index) =>
      index === 0 ? { ...pkg, label_url: null, label_printed_at: null } : pkg
    ),
  };
  return {
    name: "Etiketsiz koli uyarısı",
    args: { shipment, documents: DOCUMENTS, can: MANAGER, tabs: tabsFor(shipment) },
  };
})();

/** Gecikmiş sevkiyat: durum "Yolda" ama gecikme ayrı rozet olarak görünüyor. */
export const Delayed = (() => {
  const shipment = { ...SHIPMENT, is_delayed: 1 };
  return {
    name: "Gecikmiş",
    args: { shipment, documents: DOCUMENTS, can: MANAGER, tabs: tabsFor(shipment) },
  };
})();

/** Henüz hiçbir yan kayıt yok — her sekmenin boş hâli tek story'de görünür. */
export const EmptyTabs = (() => {
  const shipment = { ...SHIPMENT, items: [], packages: [], legs: [], events: [] };
  return {
    name: "Boş sekmeler",
    args: {
      shipment,
      documents: [],
      can: MANAGER,
      // Boş hâli görebilmek için besleme engeli kaldırılıyor; aksi hâlde
      // takip/bacak sekmeleri "bilgi taşınmıyor" panelini gösterirdi.
      tabs: tabsFor(shipment, [], MANAGER, UNBLOCKED_TABS),
    },
  };
})();

export const Loading = {
  name: "Yükleniyor",
  args: { shipment: null, loading: true, tabs: [] },
};

export const NotFound = {
  name: "Hata · kayıt yok",
  args: {
    shipment: null,
    tabs: [],
    error: { code: "NOT_FOUND", message: "Sevkiyat bulunamadı: SHP-2026-99999" },
  },
};

/**
 * **Sözleşmenin HEDEF hâli.**
 *
 * `Shipment Leg` ve `Shipment Event` child tablo değil, ayrı DocType'lar —
 * `get_shipment_detail` (`doc.as_dict()`) onları taşımıyor ve listeleyen bir
 * uç da yok. Diğer story'ler bugünkü gerçeği gösteriyor (takip ve bacak
 * sekmeleri sebep yazıyor); bu story uçlar geldiğinde ortaya çıkacak hâli
 * gösteriyor ki tasarım incelemesi ikisini karıştırmasın.
 */
export const AllTabsFed = {
  name: "Tüm sekmeler beslendiğinde (hedef)",
  args: {
    shipment: SHIPMENT,
    documents: DOCUMENTS,
    can: MANAGER,
    tabs: tabsFor(SHIPMENT, DOCUMENTS, MANAGER, UNBLOCKED_TABS),
  },
};
