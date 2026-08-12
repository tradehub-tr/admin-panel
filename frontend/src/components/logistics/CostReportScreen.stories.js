import cost from "@/mocks/logistics/cost_report.json";

import CostReportScreen from "./CostReportScreen.vue";

/**
 * **L3 · Maliyet raporu** (TUR-118, TUR-121).
 *
 * Sözleşmedeki örnek veride MNG satırı bilinçli olarak ZARARDA: 12.710,00
 * ödendi, 11.480,00 alındı. Alış ve satış ayrı kolonlar olmasaydı bu
 * kaybolurdu.
 */
export default {
  title: "Lojistik/KT3 · Rapor/Maliyet",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt3-cost-report",
  component: CostReportScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const ROWS = cost.default.data.items;
const WITH_COST = { viewCost: true };

export const Default = {
  name: "Zarar eden kırılım var",
  args: { rows: ROWS, dimension: "carrier", can: WITH_COST },
};

/** Hepsi kârda — kırmızı uyarı şeridi hiç render edilmiyor. */
export const AllProfitable = {
  name: "Hepsi kârda",
  args: {
    rows: ROWS.map((row) => ({
      ...row,
      carrier_cost_total: 10000,
      customer_charge_total: 13000,
      margin_total: 3000,
      margin_rate: 0.2308,
      avg_cost_per_shipment: 10000 / row.shipment_count,
    })),
    dimension: "carrier",
    can: WITH_COST,
  },
};

/**
 * Maliyet görme yetkisi yok: rapor "0 TL" göstermiyor, yetki hatası
 * veriyor (B8 maliyet sekmesindeki kararla aynı).
 */
export const NoCostPermission = {
  name: "Yetki · maliyet görülemez",
  args: { rows: ROWS, dimension: "carrier", can: { viewCost: false } },
};

/** Karışık para birimi: toplam anlamsız olurdu, gizleniyor ve sebebi yazılı. */
export const MixedCurrency = {
  name: "Karışık para birimi",
  args: {
    rows: ROWS.map((row, index) =>
      index === 2 ? { ...row, currency: "EUR" } : row
    ),
    dimension: "carrier",
    can: WITH_COST,
  },
};

export const Loading = {
  name: "Yükleniyor",
  args: { rows: [], loading: true, can: WITH_COST },
};

export const Empty = {
  name: "Veri yok",
  args: { rows: [], dimension: "carrier", can: WITH_COST },
};

export const PermissionError = {
  name: "Hata · yetki yok",
  args: { rows: [], error: cost.error.error, can: WITH_COST },
};
