import { SHIPMENT_STATUS_TONE, LEG_STATUS_TONE, SEVERITY_TONE } from "./constants";
import StatusBadge from "./StatusBadge.vue";

/**
 * Durum rozeti. Renk seçimi `constants.js`'ten gelir — ekranlar kendi renk
 * kararını vermez, böylece liste/detay/zaman çizelgesi aynı durumu aynı
 * renkle gösterir.
 */
export default {
  title: "Lojistik/Ortak/StatusBadge",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-common-status-badge",
  component: StatusBadge,
  tags: ["autodocs"],
  argTypes: {
    kind: { control: "select", options: ["shipment", "leg", "severity"] },
    showDot: { control: "boolean" },
  },
};

export const Default = { args: { status: "In Transit" } };

/** Sevkiyat durum makinesinin 11 durumu — renk ayrımı burada değerlendirilir. */
export const AllShipmentStatuses = {
  name: "Tüm sevkiyat durumları (11)",
  render: () => ({
    components: { StatusBadge },
    setup: () => ({ statuses: Object.keys(SHIPMENT_STATUS_TONE) }),
    template: `
      <div class="flex flex-wrap gap-2">
        <StatusBadge v-for="s in statuses" :key="s" :status="s" />
      </div>
    `,
  }),
};

export const LegStatuses = {
  name: "Bacak durumları",
  render: () => ({
    components: { StatusBadge },
    setup: () => ({ statuses: Object.keys(LEG_STATUS_TONE) }),
    template: `
      <div class="flex flex-wrap gap-2">
        <StatusBadge v-for="s in statuses" :key="s" :status="s" kind="leg" />
      </div>
    `,
  }),
};

export const Severities = {
  name: "İstisna önem dereceleri",
  render: () => ({
    components: { StatusBadge },
    setup: () => ({ statuses: Object.keys(SEVERITY_TONE) }),
    template: `
      <div class="flex flex-wrap gap-2">
        <StatusBadge v-for="s in statuses" :key="s" :status="s" kind="severity" />
      </div>
    `,
  }),
};

/** Bilinmeyen durum sessizce kaybolmamalı — nötr tonla ham değer gösterilir. */
export const UnknownStatus = {
  name: "Bilinmeyen durum",
  args: { status: "Teleported" },
};
