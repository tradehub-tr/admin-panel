<template>
  <div>
    <GlobalFilterBar data-tour="sd-filters" />

    <!-- KPI Row -->
    <DashboardGrid data-tour="sd-kpis">
      <KpiCard
        :title="t('sellersDashboard.kpiActiveSellers')"
        value="847"
        icon="fas fa-store"
        icon-bg="bg-violet-50"
        icon-color="text-violet-500"
        change="14.2"
        :change-positive="true"
      />
      <KpiCard
        :title="t('sellersDashboard.kpiPendingApplications')"
        value="23"
        icon="fas fa-file-pen"
        icon-bg="bg-amber-50"
        icon-color="text-amber-500"
        change="5"
        :change-positive="false"
        :change-label="t('sellersDashboard.changeNewApplication')"
      />
      <KpiCard
        :title="t('sellersDashboard.kpiAverageScore')"
        value="4.65"
        icon="fas fa-star"
        icon-bg="bg-emerald-50"
        icon-color="text-emerald-500"
        change="0.8"
        :change-positive="true"
      />
      <KpiCard
        :title="t('sellersDashboard.kpiSuspended')"
        value="12"
        icon="fas fa-ban"
        icon-bg="bg-red-50"
        icon-color="text-red-500"
        change="3"
        :change-positive="true"
        :change-label="t('sellersDashboard.changeDecreased')"
      />
    </DashboardGrid>

    <!-- Funnel + Radar Row -->
    <DashboardGrid class="mt-5">
      <WidgetWrapper
        data-tour="sd-funnel"
        :title="t('sellersDashboard.funnelTitle')"
        :subtitle="t('sellersDashboard.funnelSubtitle')"
        size="lg"
      >
        <BaseChart :option="onboardingFunnel" height="350px" />
      </WidgetWrapper>

      <WidgetWrapper
        :title="t('sellersDashboard.radarTitle')"
        :subtitle="t('sellersDashboard.radarSubtitle')"
        size="lg"
      >
        <BaseChart :option="radarOption" height="350px" />
      </WidgetWrapper>
    </DashboardGrid>

    <!-- Score Trend + Tier Distribution -->
    <DashboardGrid class="mt-5">
      <WidgetWrapper
        :title="t('sellersDashboard.scoreTrendTitle')"
        :subtitle="t('sellersDashboard.scoreTrendSubtitle')"
        size="xl"
      >
        <BaseChart :option="scoreTrendOption" height="300px" />
      </WidgetWrapper>

      <WidgetWrapper
        :title="t('sellersDashboard.tierTitle')"
        :subtitle="t('sellersDashboard.tierSubtitle')"
        size="md"
      >
        <BaseChart :option="tierDonutOption" height="300px" />
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
  const { currentTheme } = useTheme();
  const isDark = computed(() => currentTheme.value === "dark");

  // Sayfa-içi onboarding: filtreler → KPI'lar → onboarding hunisi.
  usePageTour("sellers-dashboard", () => [
    { target: '[data-tour="sd-filters"]', title: t("tourSteps.page.sdFilters_t"), desc: t("tourSteps.page.sdFilters_d") },
    { target: '[data-tour="sd-kpis"]', title: t("tourSteps.page.sdKpis_t"), desc: t("tourSteps.page.sdKpis_d") },
    { target: '[data-tour="sd-funnel"]', title: t("tourSteps.page.sdFunnel_t"), desc: t("tourSteps.page.sdFunnel_d") },
  ]);

  const onboardingFunnel = computed(() => ({
    tooltip: { trigger: "item", formatter: "{b}: {c}" },
    series: [
      {
        type: "funnel",
        sort: "descending",
        gap: 6,
        label: { position: "inside", formatter: "{b}\n{c}", fontSize: 11 },
        itemStyle: { borderRadius: 4 },
        data: [
          {
            value: 120,
            name: t("sellersDashboard.funnelApplication"),
            itemStyle: { color: CHART_PALETTE[0] },
          },
          {
            value: 95,
            name: t("sellersDashboard.funnelDocReview"),
            itemStyle: { color: CHART_PALETTE[3] },
          },
          {
            value: 78,
            name: t("sellersDashboard.funnelKycApproval"),
            itemStyle: { color: CHART_PALETTE[6] },
          },
          {
            value: 65,
            name: t("sellersDashboard.funnelContract"),
            itemStyle: { color: CHART_PALETTE[1] },
          },
          {
            value: 52,
            name: t("sellersDashboard.funnelApprovedSeller"),
            itemStyle: { color: CHART_PALETTE[9] },
          },
        ],
      },
    ],
  }));

  const radarOption = computed(() => ({
    tooltip: {},
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10 },
    radar: {
      indicator: [
        { name: t("sellersDashboard.radarDelivery"), max: 100 },
        { name: t("sellersDashboard.radarQuality"), max: 100 },
        { name: t("sellersDashboard.radarService"), max: 100 },
        { name: t("sellersDashboard.radarCompliance"), max: 100 },
        { name: t("sellersDashboard.radarSupply"), max: 100 },
        { name: t("sellersDashboard.radarCommunication"), max: 100 },
      ],
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: [92, 88, 95, 78, 85, 90],
            name: t("sellersDashboard.radarTopSeller"),
            areaStyle: { opacity: 0.3 },
          },
          {
            value: [75, 72, 70, 68, 71, 74],
            name: t("sellersDashboard.radarPlatformAvg"),
            lineStyle: { type: "dashed" },
            areaStyle: { opacity: 0.1 },
          },
        ],
      },
    ],
  }));

  const scoreTrendOption = computed(() => ({
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10 },
    grid: { top: 20, right: 16, bottom: 40, left: 48 },
    xAxis: { type: "category", data: MONTHS_TR },
    yAxis: { type: "value", min: 3.5, max: 5, axisLabel: { formatter: "{value}" } },
    series: [
      {
        name: t("sellersDashboard.trendTop10"),
        type: "line",
        data: [4.8, 4.82, 4.85, 4.87, 4.88, 4.9, 4.91, 4.92, 4.93, 4.94, 4.95, 4.96],
        smooth: true,
        lineStyle: { width: 2 },
      },
      {
        name: t("sellersDashboard.trendAverage"),
        type: "line",
        data: [4.3, 4.35, 4.32, 4.38, 4.4, 4.42, 4.45, 4.48, 4.5, 4.52, 4.55, 4.58],
        smooth: true,
        lineStyle: { width: 2, type: "dashed" },
      },
      {
        name: t("sellersDashboard.trendBottom10"),
        type: "line",
        data: [3.6, 3.55, 3.58, 3.62, 3.65, 3.6, 3.63, 3.67, 3.7, 3.72, 3.75, 3.78],
        smooth: true,
        lineStyle: { width: 2 },
      },
    ],
  }));

  const tierDonutOption = computed(() => ({
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
          formatter: `{total|847}\n{sub|${t("sellersDashboard.tierTotalSellers")}}`,
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
          { value: 42, name: t("sellersDashboard.tierPlatinum"), itemStyle: { color: "#8B5CF6" } },
          { value: 156, name: t("sellersDashboard.tierGold"), itemStyle: { color: "#F59E0B" } },
          { value: 312, name: t("sellersDashboard.tierSilver"), itemStyle: { color: "#6B7280" } },
          { value: 337, name: t("sellersDashboard.tierBronze"), itemStyle: { color: "#92400E" } },
        ],
      },
    ],
  }));
</script>
