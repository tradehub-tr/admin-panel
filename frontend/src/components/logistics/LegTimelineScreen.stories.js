import shipments from "@/mocks/logistics/shipment.json";

import LegTimelineScreen from "./LegTimelineScreen.vue";

/**
 * **E2 · Bacak zaman çizelgesi** (TUR-109, TUR-115).
 *
 * Bacak süreleri ORANTILI: fixture'daki toplama 2,5 saat sürerken ana
 * taşıma 19 saat sürüyor ve şerit bunu gösteriyor. Eşit kutular "hangi
 * bacak zaman yiyor" sorusunu gizlerdi.
 */
export default {
  title: "Lojistik/KT2 · Bacak/Zaman çizelgesi",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt2-leg-timeline",
  component: LegTimelineScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const LEGS = shipments.detail.data.legs;

export const Default = {
  name: "Tamamlanmış bacaklar",
  args: { legs: LEGS },
};

/** Son bacak sürüyor: bitiş zamanı yok, "sürüyor" yazıyor. */
export const Ongoing = {
  name: "Devam eden bacak",
  args: {
    legs: LEGS.map((leg, index) =>
      index === LEGS.length - 1 ? { ...leg, completed_at: null, status: "In Progress" } : leg
    ),
  },
};

/** Devir noktası olan bacak yok — geçiş listesi sebebini söylüyor. */
export const NoHandovers = {
  name: "Devir noktası yok",
  args: { legs: LEGS.map((leg) => ({ ...leg, handover_point: null, handover_proof: null })) },
};

export const Empty = {
  name: "Bacak yok",
  args: { legs: [] },
};
