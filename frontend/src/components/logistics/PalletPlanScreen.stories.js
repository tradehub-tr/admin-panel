import pallets from "@/mocks/logistics/pallet_plan.json";

import PalletPlanScreen from "./PalletPlanScreen.vue";

/**
 * **G3 · Palet planlama** (TUR-120).
 *
 * Sözleşmedeki örnek veri bilinçli olarak iki farklı durumu içeriyor:
 * ilk palet normal, ikincisi KATMAN kapasitesini aşmış ama ağırlığı düşük.
 * Tek bir "doluluk" çubuğu bu durumu gizlerdi — hafif ama hacimli yük
 * paleti katmandan taşırır.
 */
export default {
  title: "Lojistik/KT2 · Paketleme/Palet planı",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt2-pallet-plan",
  component: PalletPlanScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const ROWS = pallets.default.data.items;
const SHIPMENT = ROWS[0]?.shipment ?? "SHP-2026-00042";

export const Default = {
  name: "Katman aşımı var",
  args: { shipmentName: SHIPMENT, rows: ROWS, can: { read: true, write: true } },
};

/** Her iki kapasite de sınırlar içinde — uyarı yok. */
export const WithinCapacity = {
  name: "Kapasite içinde",
  args: {
    shipmentName: SHIPMENT,
    rows: ROWS.map((p) => ({ ...p, layer_count: 3, is_overloaded: 0 })),
    can: { read: true, write: true },
  },
};

/** Ağırlık kapasitesi aşılmış: farklı bir eksen, aynı uyarı. */
export const OverWeight = {
  name: "Ağırlık aşımı",
  args: {
    shipmentName: SHIPMENT,
    rows: ROWS.map((p) => ({
      ...p,
      layer_count: 4,
      loaded_weight_kg: 920,
      is_overloaded: 1,
    })),
    can: { read: true, write: true },
  },
};

export const ReadOnlyRole = {
  name: "Rol · yalnız okuma",
  args: { ...Default.args, can: { read: true, write: false } },
};

export const Empty = {
  name: "Plan yok",
  args: { shipmentName: SHIPMENT, rows: [], can: { read: true, write: true } },
};
