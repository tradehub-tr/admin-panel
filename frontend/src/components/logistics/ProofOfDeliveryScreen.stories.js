import pod from "@/mocks/logistics/proof_of_delivery.json";

import ProofOfDeliveryScreen from "./ProofOfDeliveryScreen.vue";

/**
 * **H2 · Teslim kanıtı inceleme** (TUR-115).
 *
 * Veri minimizasyonu bu ekranın asıl tasarım kararı: imza ve teslim
 * fotoğrafı kişisel veri. Yetkisiz kullanıcıya bulanık bir önizleme
 * gösterilmiyor — dosya hiç istenmiyor. Metadata ise yetkisiz de görünür;
 * teslimatı doğrulamak için görsel gerekmiyor.
 */
export default {
  title: "Lojistik/KT2 · Teslim kanıtı/İnceleme",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt2-proof-of-delivery",
  component: ProofOfDeliveryScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const POD = pod.default.data.items[0];
const SHIPMENT = "SHP-2026-00041";

export const Default = {
  name: "Yetkili · görsel kanıt görünür",
  args: { shipmentName: SHIPMENT, pod: POD, can: { read: true, viewMedia: true } },
};

/**
 * Yetkisiz: metadata görünüyor, görseller HİÇ istenmiyor. Bulanık önizleme
 * göstermek veriyi yine de tarayıcıya indirirdi.
 */
export const NoMediaPermission = {
  name: "Yetkisiz · yalnız metadata",
  args: { shipmentName: SHIPMENT, pod: POD, can: { read: true, viewMedia: false } },
};

/** İmza alınmamış, yalnız fotoğraf var — eksik kanıt sessiz geçilmiyor. */
export const PartialMedia = {
  name: "Eksik kanıt",
  args: {
    shipmentName: SHIPMENT,
    pod: { ...POD, signature_url: null, delivery_code_used: 0 },
    can: { read: true, viewMedia: true },
  },
};

/** Konumu operatör elle girmiş — kaynak alanı bunu söylüyor. */
export const ManualLocationSource = {
  name: "Manuel konum kaynağı",
  args: {
    shipmentName: SHIPMENT,
    pod: { ...POD, location_source: "manual" },
    can: { read: true, viewMedia: true },
  },
};

export const Empty = {
  name: "Teslim kanıtı yok",
  args: { shipmentName: SHIPMENT, pod: null, can: { read: true, viewMedia: true } },
};

export const PermissionError = {
  name: "Hata · yetki yok",
  args: { shipmentName: SHIPMENT, pod: null, error: pod.error.error },
};
