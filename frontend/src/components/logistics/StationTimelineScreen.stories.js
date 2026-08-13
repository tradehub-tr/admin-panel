import shipments from "@/mocks/logistics/shipment.json";

import StationTimelineScreen from "./StationTimelineScreen.vue";

/**
 * **H1 · İstasyon zaman çizelgesi** (TUR-115).
 *
 * Olay akışından farkı: aynı istasyondaki ardışık olaylar tek satırda
 * toplanıyor ve orada geçen süre hesaplanıyor. "Üç kez Ostim" listesi
 * değil, "Ostim'de 41 saat" bilgisi.
 */
export default {
  title: "Lojistik/KT2 · Teslim kanıtı/İstasyon çizelgesi",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt2-station-timeline",
  component: StationTimelineScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const DETAIL = shipments.detail.data;
const EVENTS = DETAIL.events;
const NOW = "2026-08-12 12:00:00";

export const Default = {
  name: "Normal akış",
  args: { shipmentName: DETAIL.name, events: EVENTS, now: NOW },
};

/**
 * Son istasyonda 24 saati aşan bekleme: "şu an" ileri alındığı için
 * takılma sarı işaretleniyor.
 */
export const StuckAtStation = {
  name: "Takılmış gönderi",
  args: { shipmentName: DETAIL.name, events: EVENTS, now: "2026-08-15 12:00:00" },
};

/**
 * Manuel girilmiş konum: kaynak rozeti sarı. İhtilafta taşıyıcı API'sinden
 * gelen konumla operatörün elle girdiği konum aynı ağırlıkta değil.
 */
export const ManualLocation = {
  name: "Manuel konum girişi",
  args: {
    shipmentName: DETAIL.name,
    events: EVENTS.map((event, index) =>
      index === EVENTS.length - 1
        ? { ...event, source: "manual", actor: "operasyon@istoc.com", reason: "Şubeden telefonla teyit" }
        : event
    ),
    now: NOW,
  },
};

/** Konum bilgisi olan olay yok — çizelge kurulamıyor, sebebi yazılı. */
export const NoLocationData = {
  name: "Konum verisi yok",
  args: {
    shipmentName: DETAIL.name,
    events: EVENTS.map((event) => ({ ...event, location: null })),
    now: NOW,
  },
};

export const Empty = {
  name: "Olay yok",
  args: { shipmentName: DETAIL.name, events: [], now: NOW },
};
