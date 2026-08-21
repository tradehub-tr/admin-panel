import { fn } from "storybook/test";

import { reportsMock } from "@/api/reportsMock";

import CostReportScreen from "./CostReportScreen.vue";

/**
 * **L3 · Maliyet raporu** (TUR-121, 17-FE — L1 kabuğunun paneli).
 *
 * Veri GERÇEK mock modülünden (`api/reportsMock`): MNG bilinçli ZARARDA
 * (maliyet 71,00 TL/sevkiyat, tahsilat 69,00 TL). Alış ve satış ayrı
 * kolonlar olmasaydı bu kaybolurdu.
 */
export default {
  title: "Lojistik/KT3 · Rapor/Maliyet",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt3-cost-report",
  component: CostReportScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { onRetry: fn() },
};

const REPORT = reportsMock.cost("2026-07-01", "2026-07-31");
const WITH_COST = { viewCost: true };

export const Default = {
  name: "Zarar eden kırılım var (dolu)",
  args: { report: REPORT, can: WITH_COST },
};

/** Hepsi kârda — kırmızı uyarı şeridi hiç render edilmiyor. */
export const AllProfitable = {
  name: "Hepsi kârda",
  args: {
    report: {
      ...REPORT,
      by_carrier: REPORT.by_carrier.map((row) => ({
        ...row,
        cost: row.shipments * 100,
        charge: row.shipments * 130,
        margin: row.shipments * 30,
      })),
    },
    can: WITH_COST,
  },
};

/**
 * Maliyet görme yetkisi yok (FE kapısı): rapor "0 TL" göstermiyor, yetki
 * hatası veriyor (B8 maliyet sekmesindeki kararla aynı). Container bu
 * durumda isteği HİÇ atmıyor — çifte kapının ikinci kanadı bu ekran.
 */
export const NoCostPermission = {
  name: "Yetki · maliyet görülemez",
  args: { report: REPORT, can: { viewCost: false } },
};

export const Loading = {
  name: "Yükleniyor",
  args: { report: null, loading: true, can: WITH_COST },
};

export const Empty = {
  name: "Veri yok",
  args: { report: null, can: WITH_COST },
};

/** Sunucu kapısı: canlı uç yetkisizde PERMISSION_DENIED döndürür (sözleşme). */
export const PermissionError = {
  name: "Hata · sunucu yetki reddi",
  args: {
    report: null,
    can: WITH_COST,
    error: {
      code: "PERMISSION_DENIED",
      message: "Bu rapor view.logistics_cost yetkisi gerektirir.",
    },
  },
};
