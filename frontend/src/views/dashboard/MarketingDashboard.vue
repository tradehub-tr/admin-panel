<template>
  <div>
    <div data-tour="md2-filters">
      <GlobalFilterBar />
    </div>
    <DashboardGrid data-tour="md2-kpis">
      <KpiCard
        :title="t('marketingDashboard.activeCampaigns')"
        value="12"
        icon="fas fa-bullhorn"
        icon-bg="bg-violet-50"
        icon-color="text-violet-500"
        change="3"
        :change-positive="true"
        :change-label="t('marketingDashboard.new')"
      />
      <KpiCard
        :title="t('marketingDashboard.couponUsage')"
        value="8,420"
        icon="fas fa-ticket"
        icon-bg="bg-blue-50"
        icon-color="text-blue-500"
        change="28.5"
        :change-positive="true"
      />
      <KpiCard
        :title="t('marketingDashboard.campaignRoi')"
        value="%342"
        icon="fas fa-chart-line"
        icon-bg="bg-emerald-50"
        icon-color="text-emerald-500"
        change="15.2"
        :change-positive="true"
      />
      <KpiCard
        :title="t('marketingDashboard.churnRate')"
        value="%4.2"
        icon="fas fa-user-minus"
        icon-bg="bg-red-50"
        icon-color="text-red-500"
        change="0.8"
        :change-positive="true"
        :change-label="t('marketingDashboard.improvement')"
      />
    </DashboardGrid>
    <DashboardGrid class="mt-5" data-tour="md2-charts">
      <WidgetWrapper
        :title="t('marketingDashboard.campaignPerformance')"
        :subtitle="t('marketingDashboard.roiComparison')"
        size="xl"
      >
        <BaseChart :option="campaignOption" height="320px" />
      </WidgetWrapper>
      <WidgetWrapper :title="t('marketingDashboard.couponDistribution')" size="md">
        <BaseChart :option="couponOption" height="320px" />
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
  import { CHART_PALETTE, MONTHS_TR } from "@/constants/dashboard";
  import { useTheme } from "@/composables/useTheme";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();

  // Sayfa-içi onboarding: filtreler → KPI kartları → grafikler.
  usePageTour("marketing-dashboard", () => [
    { target: '[data-tour="md2-filters"]', title: t("tourSteps.page.md2Filters_t"), desc: t("tourSteps.page.md2Filters_d") },
    { target: '[data-tour="md2-kpis"]', title: t("tourSteps.page.md2Kpis_t"), desc: t("tourSteps.page.md2Kpis_d") },
    { target: '[data-tour="md2-charts"]', title: t("tourSteps.page.md2Charts_t"), desc: t("tourSteps.page.md2Charts_d") },
  ]);

  const { currentTheme } = useTheme();
  const isDark = computed(() => currentTheme.value === "dark");

  const campaignOption = computed(() => ({
    tooltip: { trigger: "axis" },
    legend: { top: 0, right: 0 },
    grid: { top: 30, right: 16, bottom: 24, left: 48 },
    xAxis: { type: "category", data: MONTHS_TR.slice(-6) },
    yAxis: [
      { type: "value", axisLabel: { formatter: "{value}K" } },
      { type: "value", axisLabel: { formatter: "{value}%" } },
    ],
    series: [
      {
        name: t("marketingDashboard.spend"),
        type: "bar",
        data: [45, 52, 48, 62, 58, 72],
        itemStyle: { borderRadius: [4, 4, 0, 0], color: CHART_PALETTE[0] },
      },
      {
        name: t("marketingDashboard.revenue"),
        type: "bar",
        data: [120, 145, 138, 185, 178, 246],
        itemStyle: { borderRadius: [4, 4, 0, 0], color: CHART_PALETTE[1] },
      },
      {
        name: "ROI",
        type: "line",
        yAxisIndex: 1,
        data: [267, 279, 288, 298, 307, 342],
        smooth: true,
      },
    ],
  }));

  const couponOption = computed(() => ({
    tooltip: { trigger: "item" },
    legend: { bottom: 0 },
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
          formatter: `{total|8,420}\n{sub|${t("marketingDashboard.usage")}}`,
          rich: {
            total: {
              fontSize: 20,
              fontWeight: 700,
              color: isDark.value ? "#e5e7eb" : "#1f2937",
              lineHeight: 32,
            },
            sub: { fontSize: 11, color: "#9ca3af", lineHeight: 18 },
          },
        },
        data: [
          {
            value: 3890,
            name: t("marketingDashboard.percentageDiscount"),
            itemStyle: { color: CHART_PALETTE[0] },
          },
          {
            value: 2340,
            name: t("marketingDashboard.fixedAmount"),
            itemStyle: { color: CHART_PALETTE[1] },
          },
          {
            value: 1450,
            name: t("marketingDashboard.freeShipping"),
            itemStyle: { color: CHART_PALETTE[3] },
          },
          {
            value: 740,
            name: t("marketingDashboard.bulkPurchase"),
            itemStyle: { color: CHART_PALETTE[6] },
          },
        ],
      },
    ],
  }));
</script>
