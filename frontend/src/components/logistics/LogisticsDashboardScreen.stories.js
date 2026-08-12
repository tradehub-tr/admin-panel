import shipments from "@/mocks/logistics/shipment.json";

import LogisticsDashboardScreen from "./LogisticsDashboardScreen.vue";

/**
 * **A1 · Lojistik panosu** (TUR-117, TUR-118).
 *
 * Faz A analizinde bulunan `LogisticsDashboard.vue` sabit sayılar ("1,247",
 * "14", "8") gösteriyordu — veri yokken bile dolu görünüyordu. Bu ekran
 * metriği dışarıdan alıyor; veri yoksa "—" yazıyor, uydurmuyor.
 *
 * Grafik kütüphanesi bilinçli olarak yok: bu veri için ECharts'ı bundle'a
 * sokmak bedelini karşılamıyor.
 */
export default {
  title: "Lojistik/KT1 · Pano",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt1-dashboard",
  component: LogisticsDashboardScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const STATUS_COUNTS = shipments.default.data.items.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] ?? 0) + 1;
  return acc;
}, {});

export const Default = {
  name: "Dolu",
  args: {
    metrics: { active: 41, delayed: 3, failed: 1, avgDeliveryDays: 2.4 },
    statusCounts: STATUS_COUNTS,
  },
};

/**
 * Her şey yolunda: gecikmiş ve başarısız sıfır. Sıfır değerler renklenmiyor —
 * "0 gecikmiş" yazısını kırmızı göstermek yanlış alarm olurdu.
 */
export const AllHealthy = {
  name: "Sorun yok",
  args: {
    metrics: { active: 41, delayed: 0, failed: 0, avgDeliveryDays: 1.9 },
    statusCounts: STATUS_COUNTS,
  },
};

/** Metrik gelmedi — "0" değil "—". Bilinmeyen ile sıfır aynı şey değil. */
export const NoMetrics = {
  name: "Veri yok",
  args: { metrics: {}, statusCounts: {} },
};

export const Loading = {
  name: "Yükleniyor",
  args: { metrics: {}, statusCounts: {}, loading: true },
};

export const FeatureDisabled = {
  name: "Hata · özellik kapalı",
  args: {
    metrics: {},
    statusCounts: {},
    error: {
      code: "FEATURE_DISABLED",
      message: "Bu lojistik özelliği henüz aktif değil: logistics_enabled",
    },
  },
};
