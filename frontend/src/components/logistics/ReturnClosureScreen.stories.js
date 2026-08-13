import returns from "@/mocks/logistics/return_request.json";

import ReturnClosureScreen from "./ReturnClosureScreen.vue";

/**
 * **I4 · İade kapanışı** (TUR-116).
 *
 * Kapanış GERİ ALINAMAZ. Story'ler üç aşamayı gösteriyor: ön koşullar
 * eksik (kapatılamaz), hazır (onay kutusu bekliyor) ve kapanmış (aksiyon
 * yok, geçmiş var).
 */
export default {
  title: "Lojistik/KT3 · İade/Kapanış",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt3-return-closure",
  component: ReturnClosureScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const DETAIL = returns.detail.data;

/** Tüm ön koşullar sağlanmış: karar verilmiş, kontrol bitmiş, tutar hazır. */
const READY = { ...DETAIL, is_closed: 0 };

export const Default = {
  name: "Kapanışa hazır",
  args: { request: READY },
};

/** Karar verilmemiş ve kontrol yarım — iki ön koşul sarı. */
export const Blocked = {
  name: "Ön koşullar eksik",
  args: {
    request: {
      ...READY,
      decided_at: null,
      refund_amount: null,
      items: DETAIL.items.map((item) => ({ ...item, inspection_result: null })),
    },
  },
};

/** Kalem hiç yok — kontrol adımı sağlanamaz. */
export const NoItems = {
  name: "Kalem yok",
  args: { request: { ...READY, items: [] } },
};

/** Kapanmış: aksiyon yok, özet ve kilit notu var. */
export const Closed = {
  name: "Kapanmış",
  args: {
    request: {
      ...DETAIL,
      is_closed: 1,
      closed_at: "2026-08-12 11:30:00",
      closed_by: "operasyon@istoc.com",
      refund_triggered_at: "2026-08-12 11:30:05",
    },
  },
};

/**
 * Kapanmış ama para iadesi tetiklenmemiş — muhasebe takibi gereken hâl,
 * sarı gösteriliyor.
 */
export const ClosedWithoutRefund = {
  name: "Kapanmış · iade tetiklenmemiş",
  args: {
    request: {
      ...DETAIL,
      is_closed: 1,
      closed_at: "2026-08-12 11:30:00",
      closed_by: "operasyon@istoc.com",
      refund_triggered_at: null,
    },
  },
};

export const Saving = {
  name: "Kaydediliyor",
  args: { request: READY, saving: true },
};
