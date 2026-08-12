import shipmentFixture from "@/mocks/logistics/shipment.json";

import EventTimeline from "./EventTimeline.vue";

/**
 * Sevkiyat olay akışı (TUR-112, TUR-115).
 *
 * Veri sözleşmeden üretilmiş mock'tan geliyor
 * (`src/mocks/logistics/shipment.json`) — elle uydurulmuş değil.
 */
export default {
  title: "Lojistik/Ortak/EventTimeline",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-common-event-timeline",
  component: EventTimeline,
  tags: ["autodocs"],
  argTypes: { newestFirst: { control: "boolean" } },
};

const EVENTS = shipmentFixture.detail.data.events;

export const Default = {
  name: "Varsayılan (en yeni üstte)",
  args: { events: EVENTS },
};

export const Chronological = {
  name: "Kronolojik",
  args: { events: EVENTS, newestFirst: false },
};

export const Empty = { name: "Boş", args: { events: [] } };

/**
 * Manuel müdahale — gerekçe zorunlu (TUR-107 audit kriteri) ve kaynak
 * rozeti "Manuel" gösteriyor.
 */
export const WithManualIntervention = {
  name: "Manuel müdahaleli",
  args: {
    events: [
      ...EVENTS,
      {
        event_time: "2026-08-12 10:05:00",
        status: "Failed",
        source: "manual",
        carrier_status_code: null,
        carrier_status_text: null,
        location: "Ostim",
        description: "Alıcı adreste bulunamadı, operasyon kaydı",
        exception_code: "RECIPIENT_ABSENT",
        actor: "operator@istoc.com",
        reason: "Alıcı telefonla ulaşılamadı, ertesi güne randevu verildi.",
        dedupe_key: null,
      },
    ],
  },
};

/** Aynı dedupe_key iki kez gelirse — TUR-112 duplicate koruması. */
export const DuplicateEvents = {
  name: "Yinelenen olay",
  args: { events: [...EVENTS, EVENTS[1]] },
};
