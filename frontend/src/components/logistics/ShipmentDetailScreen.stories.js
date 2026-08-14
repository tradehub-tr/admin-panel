import shipments from "@/mocks/logistics/shipment.json";
import pod from "@/mocks/logistics/proof_of_delivery.json";

import ShipmentDetailScreen from "./ShipmentDetailScreen.vue";

/**
 * **B2 · Sevkiyat detayı** — altı sekmeyi (B3–B8) taşıyan kabuk.
 *
 * Sekmelere Storybook araç çubuğundan değil, ekranın kendi sekme çubuğundan
 * geçiliyor; incelemede gerçek gezinme denenebilsin diye. Aşağıdaki
 * story'ler sekmelerin dikkat çeken DURUMLARINI ayrı ayrı kuruyor.
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

const MANAGER = { read: true, write: true, cancel: true, viewCost: true };
const OPERATOR = { read: true, write: false, cancel: false, viewCost: false };

export const Default = {
  name: "Yolda · yönetici",
  args: { shipment: SHIPMENT, documents: DOCUMENTS, can: MANAGER },
};

/**
 * Operatör: iptal ve durum güncelleme butonları yok, maliyet sekmesi
 * "yetki yok" diyor. Backend zaten maliyet alanlarını `null` döndürüyor —
 * story de o hâli taklit ediyor.
 */
export const OperatorRole = {
  name: "Rol · operatör (maliyet maskeli)",
  args: {
    shipment: { ...SHIPMENT, carrier_cost: null, customer_charge: null },
    documents: DOCUMENTS,
    can: OPERATOR,
  },
};

/** Etiketsiz koli var → Koliler sekmesinde dikkat noktası beliriyor. */
export const UnlabeledPackages = {
  name: "Etiketsiz koli uyarısı",
  args: {
    shipment: {
      ...SHIPMENT,
      packages: SHIPMENT.packages.map((pkg, index) =>
        index === 0 ? { ...pkg, label_url: null, label_printed_at: null } : pkg
      ),
    },
    documents: DOCUMENTS,
    can: MANAGER,
  },
};

/** Gecikmiş sevkiyat: durum "Yolda" ama gecikme ayrı rozet olarak görünüyor. */
export const Delayed = {
  name: "Gecikmiş",
  args: {
    shipment: { ...SHIPMENT, is_delayed: 1 },
    documents: DOCUMENTS,
    can: MANAGER,
  },
};

/** Henüz hiçbir yan kayıt yok — her sekmenin boş hâli tek story'de görünür. */
export const EmptyTabs = {
  name: "Boş sekmeler",
  args: {
    shipment: { ...SHIPMENT, items: [], packages: [], legs: [], events: [] },
    documents: [],
    can: MANAGER,
  },
};

export const Loading = {
  name: "Yükleniyor",
  args: { shipment: null, loading: true },
};

export const NotFound = {
  name: "Hata · kayıt yok",
  args: {
    shipment: null,
    error: { code: "NOT_FOUND", message: "Sevkiyat bulunamadı: SHP-2026-99999" },
  },
};

/**
 * **Bugün üretimde görünen hâl.**
 *
 * `Shipment Leg` ve `Shipment Event` child tablo değil, ayrı DocType'lar —
 * `get_shipment_detail` (`doc.as_dict()`) onları taşımıyor ve listeleyen bir
 * uç da yok. Diğer story'ler sözleşmenin HEDEF hâlini gösteriyor; bu story
 * bugünkü gerçeği gösteriyor ki tasarım incelemesi ikisini karıştırmasın.
 *
 * Boş sekme yerine sebep yazılıyor: boş liste "bu sevkiyatın bacağı yok"
 * diye okunurdu, oysa bilgi taşınmıyor.
 */
export const UnavailableTabs = {
  name: "Beslenmeyen sekmeler (bugünkü gerçek)",
  args: {
    shipment: { ...SHIPMENT, legs: undefined, events: undefined },
    documents: DOCUMENTS,
    can: MANAGER,
    unavailableTabs: ["legs", "tracking"],
  },
};
