<template>
  <div>
    <div data-tour="pd2-filters">
      <GlobalFilterBar />
    </div>

    <!-- KPI Row -->
    <DashboardGrid data-tour="pd2-kpis">
      <KpiCard
        :title="t('paymentsDashboard.totalRevenue')"
        value="₺12,847,390"
        icon="fas fa-turkish-lira-sign"
        icon-bg="bg-brand-50"
        icon-color="text-brand-700"
        change="18.4"
        :change-positive="true"
      />
      <KpiCard
        :title="t('paymentsDashboard.escrowBalance')"
        value="₺3,245,200"
        icon="fas fa-lock"
        icon-bg="bg-blue-50"
        icon-color="text-blue-500"
        change="8.2"
        :change-positive="true"
      />
      <KpiCard
        :title="t('paymentsDashboard.commissionRevenue')"
        value="₺892,120"
        icon="fas fa-percent"
        icon-bg="bg-emerald-50"
        icon-color="text-emerald-500"
        change="22.3"
        :change-positive="true"
      />
      <KpiCard
        :title="t('paymentsDashboard.refundRate')"
        value="%2.1"
        icon="fas fa-rotate-left"
        icon-bg="bg-amber-50"
        icon-color="text-amber-500"
        change="0.5"
        :change-positive="true"
        :change-label="t('paymentsDashboard.improvement')"
      />
    </DashboardGrid>

    <!-- Charts Row 1: Revenue Stacked Area + Payment Methods Donut -->
    <DashboardGrid class="mt-5" data-tour="pd2-charts">
      <WidgetWrapper
        :title="t('paymentsDashboard.paymentMethodDist')"
        :subtitle="t('paymentsDashboard.last90Days')"
        size="xl"
      >
        <BaseChart :option="stackedAreaOption" height="320px" />
      </WidgetWrapper>

      <WidgetWrapper
        :title="t('paymentsDashboard.paymentStatus')"
        :subtitle="t('paymentsDashboard.thisMonth')"
        size="md"
      >
        <BaseChart :option="paymentStatusDonut" height="320px" />
      </WidgetWrapper>
    </DashboardGrid>

    <!-- Charts Row 2: Escrow Waterfall + Gauge -->
    <DashboardGrid class="mt-5">
      <WidgetWrapper
        :title="t('paymentsDashboard.escrowLifecycle')"
        :subtitle="t('paymentsDashboard.monthlyEscrowFlow')"
        size="lg"
      >
        <BaseChart :option="escrowBarOption" height="300px" />
      </WidgetWrapper>

      <WidgetWrapper
        :title="t('paymentsDashboard.paymentSuccessRates')"
        :subtitle="t('paymentsDashboard.realtimePerf')"
        size="lg"
      >
        <!-- Mobilde gauge'lar dikey dizildiği için ekstra yükseklik gerekir -->
        <BaseChart :option="paymentGaugeOption" height="300px" mobile-height="480px" />
      </WidgetWrapper>
    </DashboardGrid>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import DashboardGrid from "@/components/dashboard/layout/DashboardGrid.vue";
  import WidgetWrapper from "@/components/dashboard/layout/WidgetWrapper.vue";
  import KpiCard from "@/components/dashboard/widgets/KpiCard.vue";
  import BaseChart from "@/components/dashboard/charts/BaseChart.vue";
  import GlobalFilterBar from "@/components/dashboard/filters/GlobalFilterBar.vue";
  import { MONTHS_TR } from "@/constants/dashboard";
  import { useTheme } from "@/composables/useTheme";
  import { useBreakpoint } from "@/composables/useBreakpoint";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();

  // Sayfa-içi onboarding: filtreler → KPI kartları → grafikler.
  usePageTour("payments-dashboard", () => [
    {
      target: '[data-tour="pd2-filters"]',
      title: t("tourSteps.page.pd2Filters_t"),
      desc: t("tourSteps.page.pd2Filters_d"),
    },
    {
      target: '[data-tour="pd2-kpis"]',
      title: t("tourSteps.page.pd2Kpis_t"),
      desc: t("tourSteps.page.pd2Kpis_d"),
    },
    {
      target: '[data-tour="pd2-charts"]',
      title: t("tourSteps.page.pd2Charts_t"),
      desc: t("tourSteps.page.pd2Charts_d"),
    },
  ]);

  const { currentTheme } = useTheme();
  const isDark = computed(() => currentTheme.value === "dark");

  const stackedAreaOption = computed(() => ({
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10 },
    grid: { top: 20, right: 16, bottom: 40, left: 48 },
    xAxis: { type: "category", data: MONTHS_TR },
    yAxis: { type: "value", axisLabel: { formatter: "₺{value}K" } },
    series: [
      {
        name: t("paymentsDashboard.creditCard"),
        type: "line",
        stack: "total",
        areaStyle: { opacity: 0.4 },
        smooth: true,
        data: [420, 380, 450, 480, 520, 490, 530, 560, 580, 610, 640, 680],
      },
      {
        name: t("paymentsDashboard.bankTransfer"),
        type: "line",
        stack: "total",
        areaStyle: { opacity: 0.4 },
        smooth: true,
        data: [280, 310, 290, 320, 350, 340, 360, 380, 400, 420, 450, 470],
      },
      {
        name: t("paymentsDashboard.escrow"),
        type: "line",
        stack: "total",
        areaStyle: { opacity: 0.4 },
        smooth: true,
        data: [120, 140, 130, 160, 180, 175, 190, 210, 230, 245, 260, 280],
      },
      {
        name: t("paymentsDashboard.installment"),
        type: "line",
        stack: "total",
        areaStyle: { opacity: 0.4 },
        smooth: true,
        data: [80, 90, 85, 95, 110, 105, 115, 125, 135, 145, 155, 165],
      },
    ],
  }));

  const paymentStatusDonut = computed(() => ({
    tooltip: { trigger: "item" },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10 },
    series: [
      {
        type: "pie",
        radius: ["52%", "78%"],
        center: ["50%", "42%"],
        itemStyle: {
          borderRadius: 6,
          borderWidth: 3,
          borderColor: isDark.value ? "#1e1e2e" : "#ffffff",
        },
        label: {
          show: true,
          position: "center",
          formatter: `{total|₺12.8M}\n{sub|${t("paymentsDashboard.total")}}`,
          rich: {
            total: {
              fontSize: 22,
              fontWeight: 700,
              color: isDark.value ? "#e5e7eb" : "#1f2937",
              lineHeight: 32,
            },
            sub: { fontSize: 11, color: "#9ca3af", lineHeight: 18 },
          },
        },
        data: [
          {
            value: 10240,
            name: t("paymentsDashboard.successful"),
            itemStyle: { color: "#10b981" },
          },
          { value: 1840, name: t("paymentsDashboard.pending"), itemStyle: { color: "#f59e0b" } },
          { value: 420, name: t("paymentsDashboard.failed"), itemStyle: { color: "#ef4444" } },
          { value: 347, name: t("paymentsDashboard.refund"), itemStyle: { color: "#8b5cf6" } },
        ],
      },
    ],
  }));

  const escrowBarOption = computed(() => ({
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { top: 0, right: 0, itemWidth: 10, itemHeight: 10 },
    grid: { top: 30, right: 16, bottom: 24, left: 48 },
    xAxis: { type: "category", data: MONTHS_TR.slice(-6) },
    yAxis: { type: "value", axisLabel: { formatter: "₺{value}K" } },
    series: [
      {
        name: t("paymentsDashboard.opened"),
        type: "bar",
        stack: "escrow",
        data: [320, 380, 420, 460, 510, 540],
        itemStyle: { color: "#3b82f6", borderRadius: [4, 4, 0, 0] },
      },
      {
        name: t("paymentsDashboard.released"),
        type: "bar",
        stack: "release",
        data: [280, 340, 390, 430, 470, 500],
        itemStyle: { color: "#10b981", borderRadius: [4, 4, 0, 0] },
      },
      {
        name: t("paymentsDashboard.refund"),
        type: "bar",
        stack: "release",
        data: [40, 40, 30, 30, 40, 40],
        itemStyle: { color: "#ef4444", borderRadius: [4, 4, 0, 0] },
      },
    ],
  }));

  const { isLg } = useBreakpoint();

  const paymentGaugeOption = computed(() => {
    // Mobilde (<768px) widget iç genişliği ~260px; yan yana iki gauge okunamıyor.
    // Bu yüzden gauge'lar dikey dizilir ve büyük detay yazısı 16px'e küçülür.
    const mobile = !isLg.value;
    const makeGauge = (center, value, name) => ({
      type: "gauge",
      center,
      radius: "70%",
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max: 100,
      axisLine: {
        lineStyle: {
          width: 12,
          color: [
            [0.5, "#ef4444"],
            [0.8, "#f59e0b"],
            [1, "#10b981"],
          ],
        },
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { distance: 12, fontSize: 9 },
      pointer: { length: "60%", width: 4, itemStyle: { color: "#f5b800" } },
      anchor: { show: true, size: 8, itemStyle: { color: "#f5b800", borderWidth: 2 } },
      title: { show: true, offsetCenter: [0, "72%"], fontSize: 11, fontWeight: 600 },
      detail: {
        valueAnimation: true,
        fontSize: mobile ? 16 : 22,
        fontWeight: 700,
        color: isDark.value ? "#e5e7eb" : "#1f2937",
        offsetCenter: [0, "45%"],
        formatter: "{value}%",
      },
      data: [{ value, name }],
    });

    return {
      series: [
        makeGauge(
          mobile ? ["50%", "28%"] : ["25%", "55%"],
          96.8,
          t("paymentsDashboard.successRate")
        ),
        makeGauge(
          mobile ? ["50%", "78%"] : ["75%", "55%"],
          88.5,
          t("paymentsDashboard.threeDsRate")
        ),
      ],
    };
  });
</script>
