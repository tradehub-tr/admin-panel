import { fn } from "storybook/test";

import { reportsMock } from "@/api/reportsMock";

import PerformanceReportScreen from "./PerformanceReportScreen.vue";

/**
 * **L2 · Performans raporu** (TUR-121, 17-FE — L1 kabuğunun paneli).
 *
 * Veri GERÇEK mock modülünden (`api/reportsMock`): sözleşmede MNG bilinçli
 * yavaş (avg 3.1+ gün). Özet oranlar sunucu toplamından — kırılım
 * oranlarının ortalaması değil.
 */
export default {
  title: "Lojistik/KT3 · Rapor/Performans",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt3-performance-report",
  component: PerformanceReportScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { onRetry: fn() },
};

const REPORT = reportsMock.performance("2026-07-01", "2026-07-31");

export const Default = {
  name: "Taşıyıcı kırılımı (dolu)",
  args: { report: REPORT },
};

/**
 * Küçük örneklem: 4 sevkiyatlık bir kırılımda düşük oran istatistiksel
 * gürültü — renklendirilmiyor, bunun yerine dipnot var.
 */
export const SmallSample = {
  name: "Küçük örneklem",
  args: {
    report: {
      ...REPORT,
      by_carrier: [
        { carrier: "Sürat Kargo", avg_days: 3.5, on_time_rate: 0.5, shipments: 4 },
        ...REPORT.by_carrier,
      ],
    },
  },
};

export const Loading = {
  name: "Yükleniyor",
  args: { report: null, loading: true },
};

export const Empty = {
  name: "Veri yok",
  args: { report: null },
};

export const PermissionError = {
  name: "Hata · yetki yok",
  args: {
    report: null,
    error: { code: "PERMISSION_DENIED", message: "Bu raporu görüntüleme yetkiniz yok." },
  },
};
