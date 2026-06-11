<template>
  <div>
    <div data-tour="od-filters">
      <GlobalFilterBar />
    </div>

    <!-- KPI Row -->
    <DashboardGrid data-tour="od-kpis">
      <KpiCard
        :title="t('ordersDashboard.totalOrders')"
        value="5,248"
        icon="fas fa-bag-shopping"
        icon-bg="bg-blue-50"
        icon-color="text-blue-500"
        change="12.1"
        :change-positive="true"
      />
      <KpiCard
        :title="t('ordersDashboard.pendingOrders')"
        value="384"
        icon="fas fa-clock"
        icon-bg="bg-amber-50"
        icon-color="text-amber-500"
        change="3.2"
        :change-positive="false"
      />
      <KpiCard
        :title="t('ordersDashboard.completed')"
        value="4,691"
        icon="fas fa-check-circle"
        icon-bg="bg-emerald-50"
        icon-color="text-emerald-500"
        change="15.7"
        :change-positive="true"
      />
      <KpiCard
        :title="t('ordersDashboard.cancellationRate')"
        value="%1.4"
        icon="fas fa-ban"
        icon-bg="bg-red-50"
        icon-color="text-red-500"
        change="0.3"
        :change-positive="true"
        :change-label="t('ordersDashboard.improvement')"
      />
    </DashboardGrid>

    <!-- Sankey + Funnel Row -->
    <DashboardGrid class="mt-5">
      <WidgetWrapper
        :title="t('ordersDashboard.orderFlowDiagram')"
        :subtitle="t('ordersDashboard.statusTransitions')"
        size="lg"
        data-tour="od-flow"
      >
        <BaseChart :option="sankeyOption" height="350px" />
      </WidgetWrapper>

      <WidgetWrapper
        :title="t('ordersDashboard.orderConversionFunnel')"
        :subtitle="t('ordersDashboard.cartToDelivery')"
        size="lg"
      >
        <BaseChart :option="funnelOption" height="350px" />
      </WidgetWrapper>
    </DashboardGrid>

    <!-- Timeline + Table Row -->
    <DashboardGrid class="mt-5">
      <WidgetWrapper
        :title="t('ordersDashboard.orderTrend')"
        :subtitle="t('ordersDashboard.last30DaysVolume')"
        size="xl"
      >
        <BaseChart :option="trendOption" height="300px" />
      </WidgetWrapper>

      <WidgetWrapper
        :title="t('ordersDashboard.subOrderDistribution')"
        :subtitle="t('ordersDashboard.subOrdersBySeller')"
        size="md"
      >
        <BaseChart :option="subOrderBarOption" height="300px" />
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
  import { CHART_PALETTE } from "@/constants/dashboard";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();

  // Sayfa-içi onboarding: filtre çubuğu → KPI'lar → akış diyagramı.
  usePageTour("orders-dashboard", () => [
    { target: '[data-tour="od-filters"]', title: t("tourSteps.page.odFilters_t"), desc: t("tourSteps.page.odFilters_d") },
    { target: '[data-tour="od-kpis"]', title: t("tourSteps.page.odKpis_t"), desc: t("tourSteps.page.odKpis_d") },
    { target: '[data-tour="od-flow"]', title: t("tourSteps.page.odFlow_t"), desc: t("tourSteps.page.odFlow_d") },
  ]);

  const sankeyOption = computed(() => ({
    tooltip: { trigger: "item", triggerOn: "mousemove" },
    series: [
      {
        type: "sankey",
        emphasis: { focus: "adjacency" },
        lineStyle: { color: "gradient", opacity: 0.4 },
        nodeGap: 12,
        nodeWidth: 20,
        data: [
          { name: t("ordersDashboard.nodeCart") },
          { name: t("ordersDashboard.nodeOrderCreated") },
          { name: t("ordersDashboard.nodePaymentApproval") },
          { name: t("ordersDashboard.nodePreparing") },
          { name: t("ordersDashboard.nodeShipping") },
          { name: t("ordersDashboard.nodeDelivered") },
          { name: t("ordersDashboard.nodeCancelled") },
          { name: t("ordersDashboard.nodeReturn") },
        ],
        links: [
          {
            source: t("ordersDashboard.nodeCart"),
            target: t("ordersDashboard.nodeOrderCreated"),
            value: 5248,
          },
          {
            source: t("ordersDashboard.nodeOrderCreated"),
            target: t("ordersDashboard.nodePaymentApproval"),
            value: 5100,
          },
          {
            source: t("ordersDashboard.nodeOrderCreated"),
            target: t("ordersDashboard.nodeCancelled"),
            value: 148,
          },
          {
            source: t("ordersDashboard.nodePaymentApproval"),
            target: t("ordersDashboard.nodePreparing"),
            value: 4950,
          },
          {
            source: t("ordersDashboard.nodePaymentApproval"),
            target: t("ordersDashboard.nodeReturn"),
            value: 150,
          },
          {
            source: t("ordersDashboard.nodePreparing"),
            target: t("ordersDashboard.nodeShipping"),
            value: 4900,
          },
          {
            source: t("ordersDashboard.nodeShipping"),
            target: t("ordersDashboard.nodeDelivered"),
            value: 4691,
          },
          {
            source: t("ordersDashboard.nodeShipping"),
            target: t("ordersDashboard.nodeReturn"),
            value: 209,
          },
        ],
      },
    ],
  }));

  const funnelOption = computed(() => ({
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
            value: 8500,
            name: t("ordersDashboard.funnelAddToCart"),
            itemStyle: { color: CHART_PALETTE[0] },
          },
          {
            value: 5248,
            name: t("ordersDashboard.funnelOrder"),
            itemStyle: { color: CHART_PALETTE[1] },
          },
          {
            value: 5100,
            name: t("ordersDashboard.funnelPayment"),
            itemStyle: { color: CHART_PALETTE[3] },
          },
          {
            value: 4900,
            name: t("ordersDashboard.funnelPreparation"),
            itemStyle: { color: CHART_PALETTE[6] },
          },
          {
            value: 4691,
            name: t("ordersDashboard.funnelDelivery"),
            itemStyle: { color: CHART_PALETTE[9] },
          },
        ],
      },
    ],
  }));

  const trendOption = computed(() => {
    const days = Array.from({ length: 30 }, (_, i) => `${i + 1}.02`);
    const values = Array.from({ length: 30 }, () => Math.floor(Math.random() * 120 + 80));
    return {
      tooltip: { trigger: "axis" },
      grid: { top: 20, right: 16, bottom: 24, left: 48 },
      xAxis: { type: "category", data: days },
      yAxis: { type: "value" },
      series: [
        {
          type: "line",
          data: values,
          smooth: 0.3,
          symbol: "none",
          lineStyle: { width: 2 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(99,102,241,0.2)" },
                { offset: 1, color: "rgba(99,102,241,0)" },
              ],
            },
          },
          markLine: {
            data: [{ type: "average", name: t("ordersDashboard.average") }],
            lineStyle: { type: "dashed" },
          },
        },
      ],
    };
  });

  const subOrderBarOption = computed(() => ({
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { top: 10, right: 16, bottom: 10, left: 8, containLabel: true },
    xAxis: { type: "value" },
    yAxis: {
      type: "category",
      data: ["Mega Yapı", "Delta Kimya", "Atlas Metal", "Yıldız Plastik", "Ege Boya"],
      inverse: true,
    },
    series: [
      {
        type: "bar",
        data: [156, 128, 112, 89, 74],
        barWidth: 14,
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: (p) => CHART_PALETTE[p.dataIndex % CHART_PALETTE.length],
        },
        label: { show: true, position: "right", fontSize: 10, fontWeight: 600 },
      },
    ],
  }));
</script>
