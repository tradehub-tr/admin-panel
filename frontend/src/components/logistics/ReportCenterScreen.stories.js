import performance from "@/mocks/logistics/performance_report.json";

import PerformanceReportScreen from "./PerformanceReportScreen.vue";
import ReportCenterScreen from "./ReportCenterScreen.vue";

/**
 * **L1 · Rapor merkezi** (TUR-118).
 *
 * Filtreler raporların üstünde ve ORTAK: iki rapor aynı kesiti
 * gösterdiğinde karşılaştırılabilir olur. Rapor içeriği slot'tan geliyor;
 * bu ekran kabuk ve filtre sahibi.
 */
export default {
  title: "Lojistik/KT3 · Rapor/Merkez",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt3-report-center",
  component: ReportCenterScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const ROWS = performance.default.data.items;

/** Slot dolu: kabuğun raporu nasıl taşıdığı görünsün. */
const WithReport = (args) => ({
  components: { ReportCenterScreen, PerformanceReportScreen },
  setup: () => ({ args, rows: ROWS }),
  template: `
    <ReportCenterScreen v-bind="args">
      <template #default="{ filters }">
        <PerformanceReportScreen :rows="rows" :dimension="filters.dimension" />
      </template>
    </ReportCenterScreen>
  `,
});

export const Default = {
  name: "Performans seçili",
  render: WithReport,
  args: { activeReport: "performance" },
};

export const CostSelected = {
  name: "Maliyet seçili",
  render: WithReport,
  args: { activeReport: "cost" },
};

/** Filtre uygulanmış — özet şeridi hangi kesitte olduğumuzu söylüyor. */
export const WithFilters = {
  name: "Filtreli",
  render: WithReport,
  args: {
    activeReport: "performance",
    initialFilters: {
      from_date: "2026-07-01",
      to_date: "2026-07-31",
      carrier: "YK",
      dimension: "shipping_method",
    },
  },
};

/**
 * Ters tarih aralığı: uygula devre dışı ve sebebi yazılı. Sessizce boş
 * rapor üretmek "veri yok" sanılmasına yol açardı.
 */
export const InvalidDateRange = {
  name: "Hata · ters tarih aralığı",
  render: WithReport,
  args: {
    activeReport: "performance",
    initialFilters: { from_date: "2026-07-31", to_date: "2026-07-01" },
  },
};
