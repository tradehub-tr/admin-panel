import { fn } from "storybook/test";

import { reportsMock } from "@/api/reportsMock";

import PerformanceReportScreen from "./PerformanceReportScreen.vue";
import ReportCenterScreen from "./ReportCenterScreen.vue";

/**
 * **L1 · Rapor merkezi kabuğu** (TUR-121, 17-FE).
 *
 * Tarih aralığı panellerin üstünde ve ORTAK: paneller aynı kesiti
 * gösterdiğinde karşılaştırılabilir olur. Operasyon paneli kabuğun kendi
 * içeriği; L2/L3 slot'tan geliyor (manifest `REPORT_PANELS` kararı — ayrı
 * rota yok).
 *
 * Veri GERÇEK mock modülünden (`api/reportsMock`) geliyor — elle yazılmış
 * fixture yok; sözleşme değişirse story de değişir, yalan söylemez.
 */
export default {
  title: "Lojistik/KT3 · Rapor/Merkez",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt3-report-center",
  component: ReportCenterScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    onPanelChange: fn(),
    onRangeChange: fn(),
    onPreset: fn(),
    onExport: fn(),
    onRetry: fn(),
  },
};

const RANGE = { dateFrom: "2026-07-01", dateTo: "2026-07-31" };
const OPERATIONS = reportsMock.operations(RANGE.dateFrom, RANGE.dateTo);

export const Default = {
  name: "Operasyon (dolu)",
  args: { panel: "operations", ...RANGE, operations: OPERATIONS, exportable: true },
};

/** Slot dolu: kabuğun L2/L3 panellerini nasıl taşıdığı görünsün. */
export const PerformancePanel = {
  name: "Performans paneli (slot)",
  render: (args) => ({
    components: { ReportCenterScreen, PerformanceReportScreen },
    setup: () => ({ args, report: reportsMock.performance(RANGE.dateFrom, RANGE.dateTo) }),
    template: `
      <ReportCenterScreen v-bind="args">
        <PerformanceReportScreen :report="report" />
      </ReportCenterScreen>
    `,
  }),
  args: { panel: "performance", ...RANGE, exportable: true },
};

/** Veri yok: CSV butonu disabled — yetki sorunu değil, indirilecek satır yok. */
export const Empty = {
  name: "Boş",
  args: { panel: "operations", ...RANGE, operations: null, exportable: false },
};

export const Loading = {
  name: "Yükleniyor",
  args: { panel: "operations", ...RANGE, loading: true, exportable: false },
};

export const ServerError = {
  name: "Hata · sunucu",
  args: {
    panel: "operations",
    ...RANGE,
    exportable: false,
    error: { code: "INTERNAL_ERROR", message: "Beklenmeyen bir hata oluştu. Kayıt altına alındı." },
  },
};

/**
 * Ters tarih aralığı: aralık yukarı YAYILMAZ ve sebebi yazılı. Sessizce boş
 * rapor üretmek "veri yok" sanılmasına yol açardı.
 *
 * Not (17-FE denetimi): container URL query'sini artık doğruluyor — canlıda
 * bu props durumu yalnız formda ELLE yazılan ters girişle oluşur (uyarı
 * localFrom/localTo'dan tetiklenir, hâlâ erişilebilir). Story o yerel
 * durumun görünümünü temsil ediyor.
 */
export const InvalidDateRange = {
  name: "Hata · ters tarih aralığı",
  args: {
    panel: "operations",
    dateFrom: "2026-07-31",
    dateTo: "2026-07-01",
    operations: OPERATIONS,
    exportable: true,
  },
};
