import shipments from "@/mocks/logistics/shipment.json";

import LegOperationScreen from "./LegOperationScreen.vue";

/**
 * **E1 · Bacak operasyon ekranı** (TUR-109).
 *
 * Detaydaki bacak SEKMESİNDEN farkı: burası düzenleme ekranı ve zincir
 * bütünlüğünü denetliyor. "Zincir kopuk" story'si bunu gösteriyor.
 */
export default {
  title: "Lojistik/KT2 · Bacak/Operasyon",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt2-leg-operations",
  component: LegOperationScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const DETAIL = shipments.detail.data;
const LEGS = DETAIL.legs;

export const Default = {
  name: "Sağlıklı zincir",
  args: { shipmentName: DETAIL.name, legs: LEGS, can: { read: true, write: true } },
};

/**
 * İkinci bacağın çıkış şubesi, birincinin varışıyla uyuşmuyor — paket
 * arada "kayboluyor". Uyarı en üstte.
 */
export const BrokenChain = {
  name: "Uyarı · zincir kopuk",
  args: {
    shipmentName: DETAIL.name,
    legs: LEGS.map((leg, index) =>
      index === 1 ? { ...leg, origin_branch: "MNG-35004" } : leg
    ),
    can: { read: true, write: true },
  },
};

/**
 * Devir noktası var ama kanıtı yok — TUR-109 "sorumluluk geçişi kayıt
 * altındadır" kriterindeki boşluk sarı gösteriliyor.
 */
export const HandoverWithoutProof = {
  name: "Devir kanıtı eksik",
  args: {
    shipmentName: DETAIL.name,
    legs: LEGS.map((leg, index) =>
      index === 1
        ? { ...leg, handover_point: "YK İkitelli Şube — Kabul Bankosu", handover_proof: null }
        : leg
    ),
    can: { read: true, write: true },
  },
};

/** İptal edilmiş bacak zinciri kırmıyor, atlanıyor — ve soluk gösteriliyor. */
export const WithCancelledLeg = {
  name: "İptal edilmiş bacak",
  args: {
    shipmentName: DETAIL.name,
    legs: [
      ...LEGS,
      {
        sequence: 4, leg_type: "Transfer", status: "Cancelled", carrier: "AK",
        origin_branch: "MNG-35004", destination_branch: "AK-06010",
        handover_point: null, handover_proof: null, vehicle_type: "TRUCK_S",
        started_at: null, completed_at: null, cost: 0,
      },
    ],
    can: { read: true, write: true },
  },
};

export const ReadOnlyRole = {
  name: "Rol · yalnız okuma",
  args: { ...Default.args, can: { read: true, write: false } },
};

export const Empty = {
  name: "Bacak yok",
  args: { shipmentName: DETAIL.name, legs: [], can: { read: true, write: true } },
};
