import performance from "@/mocks/logistics/performance_report.json";

import PerformanceReportScreen from "./PerformanceReportScreen.vue";

/**
 * **L2 · Performans raporu** (TUR-118).
 *
 * Sözleşmedeki örnek veride MNG satırı bilinçli olarak kötü: ortalama
 * teslim 2,9 gün ile idare eder görünüyor ama p90 8,5 gün. Yalnız
 * ortalamaya bakan bir rapor bunu gizlerdi.
 */
export default {
  title: "Lojistik/KT3 · Rapor/Performans",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt3-performance-report",
  component: PerformanceReportScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const ROWS = performance.default.data.items;

export const Default = {
  name: "Taşıyıcı kırılımı",
  args: { rows: ROWS, dimension: "carrier" },
};

/**
 * Küçük örneklem: 4 sevkiyatlık bir kırılımda %25 başarısızlık
 * istatistiksel gürültü — renklendirilmiyor, bunun yerine dipnot var.
 */
export const SmallSample = {
  name: "Küçük örneklem",
  args: {
    rows: [
      {
        dimension: "SK", dimension_label: "Sürat Kargo",
        shipment_count: 4, delivered_count: 3, delayed_count: 1,
        failed_count: 1, returned_count: 0,
        avg_delivery_days: 3.5, p90_delivery_days: 5.0,
        on_time_rate: 0.5, failure_rate: 0.25, return_rate: 0,
      },
      ...ROWS,
    ],
    dimension: "carrier",
  },
};

/** Hepsi sağlıklı — uyarı rengi olmayan hâl de incelemede gerekli. */
export const AllHealthy = {
  name: "Sorunsuz",
  args: {
    rows: ROWS.map((row) => ({
      ...row,
      delayed_count: 2,
      failed_count: 0,
      returned_count: 1,
      on_time_rate: 0.96,
      failure_rate: 0,
      return_rate: 0.01,
      p90_delivery_days: row.avg_delivery_days * 1.4,
    })),
    dimension: "carrier",
  },
};

/** Gönderim yöntemi kırılımı — aynı bileşen, farklı sütun başlığı. */
export const ByShippingMethod = {
  name: "Yöntem kırılımı",
  args: {
    rows: ROWS.map((row, index) => ({
      ...row,
      dimension: ["Standart Kargo", "Hızlı Kargo", "Ambar Teslim"][index],
      dimension_label: ["Standart Kargo", "Hızlı Kargo", "Ambar Teslim"][index],
    })),
    dimension: "shipping_method",
  },
};

export const Loading = {
  name: "Yükleniyor",
  args: { rows: [], loading: true },
};

export const Empty = {
  name: "Veri yok",
  args: { rows: [], dimension: "carrier" },
};

export const PermissionError = {
  name: "Hata · yetki yok",
  args: { rows: [], error: performance.error.error },
};
