<template>
  <div>
    <GlobalFilterBar data-tour="cp2-filters" />
    <DashboardGrid data-tour="cp2-kpis">
      <KpiCard
        :title="t('complianceDashboard.kpiKycCompletion')"
        value="%94.2"
        icon="fas fa-shield-halved"
        icon-bg="bg-emerald-50"
        icon-color="text-emerald-500"
        change="3.1"
        :change-positive="true"
      />
      <KpiCard
        :title="t('complianceDashboard.kpiPendingKyc')"
        value="18"
        icon="fas fa-file-shield"
        icon-bg="bg-amber-50"
        icon-color="text-amber-500"
        change="5"
        :change-positive="false"
        :change-label="t('complianceDashboard.increase')"
      />
      <KpiCard
        :title="t('complianceDashboard.kpiAvgRiskScore')"
        value="28/100"
        icon="fas fa-gauge"
        icon-bg="bg-blue-50"
        icon-color="text-blue-500"
        change="4.2"
        :change-positive="true"
        :change-label="t('complianceDashboard.improvement')"
      />
      <KpiCard
        :title="t('complianceDashboard.kpiPendingModeration')"
        value="7"
        icon="fas fa-eye"
        icon-bg="bg-red-50"
        icon-color="text-red-500"
        change="2"
        :change-positive="true"
        :change-label="t('complianceDashboard.decreased')"
      />
    </DashboardGrid>

    <DashboardGrid class="mt-5" data-tour="cp2-charts">
      <WidgetWrapper
        :title="t('complianceDashboard.kycStatusTitle')"
        :subtitle="t('complianceDashboard.kycStatusSubtitle')"
        size="lg"
      >
        <BaseChart :option="kycDonutOption" height="320px" />
      </WidgetWrapper>
      <WidgetWrapper
        :title="t('complianceDashboard.riskAssessmentTitle')"
        :subtitle="t('complianceDashboard.riskAssessmentSubtitle')"
        size="lg"
      >
        <BaseChart :option="riskScatterOption" height="320px" />
      </WidgetWrapper>
    </DashboardGrid>

    <DashboardGrid class="mt-5">
      <WidgetWrapper
        :title="t('complianceDashboard.certPeriodsTitle')"
        :subtitle="t('complianceDashboard.certPeriodsSubtitle')"
        size="xl"
      >
        <BaseChart :option="certBarOption" height="280px" />
      </WidgetWrapper>
      <WidgetWrapper
        :title="t('complianceDashboard.complianceScoreTitle')"
        :subtitle="t('complianceDashboard.complianceScoreSubtitle')"
        size="md"
      >
        <BaseChart :option="complianceGaugeOption" height="280px" />
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
  import { useTheme } from "@/composables/useTheme";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();
  const { currentTheme } = useTheme();

  // Sayfa-içi onboarding: filtreler → KPI'lar → grafikler.
  usePageTour("compliance-dashboard", () => [
    {
      target: '[data-tour="cp2-filters"]',
      title: t("tourSteps.page.cp2Filters_t"),
      desc: t("tourSteps.page.cp2Filters_d"),
    },
    {
      target: '[data-tour="cp2-kpis"]',
      title: t("tourSteps.page.cp2Kpis_t"),
      desc: t("tourSteps.page.cp2Kpis_d"),
    },
    {
      target: '[data-tour="cp2-charts"]',
      title: t("tourSteps.page.cp2Charts_t"),
      desc: t("tourSteps.page.cp2Charts_d"),
    },
  ]);
  const isDark = computed(() => currentTheme.value === "dark");

  const kycDonutOption = computed(() => ({
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
          borderColor: isDark.value ? "#1a1a28" : "#ffffff",
        },
        label: {
          show: true,
          position: "center",
          formatter: `{total|847}\n{sub|${t("complianceDashboard.total")}}`,
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
            value: 798,
            name: t("complianceDashboard.statusApproved"),
            itemStyle: { color: "#10b981" },
          },
          {
            value: 18,
            name: t("complianceDashboard.statusPending"),
            itemStyle: { color: "#f59e0b" },
          },
          {
            value: 31,
            name: t("complianceDashboard.statusRejectedIncomplete"),
            itemStyle: { color: "#ef4444" },
          },
        ],
      },
    ],
  }));

  const riskScatterOption = computed(() => {
    const genData = (count, minR, maxR) =>
      Array.from({ length: count }, () => [
        Math.random() * 100,
        Math.random() * 5,
        Math.random() * (maxR - minR) + minR,
      ]);
    return {
      tooltip: {
        formatter: (p) =>
          t("complianceDashboard.riskLabel") +
          ": " +
          p.data[0].toFixed(0) +
          "<br/>" +
          t("complianceDashboard.scoreLabel") +
          ": " +
          p.data[1].toFixed(1),
      },
      grid: { top: 20, right: 16, bottom: 24, left: 48 },
      xAxis: { name: t("complianceDashboard.axisRiskScore"), min: 0, max: 100 },
      yAxis: { name: t("complianceDashboard.axisSellerScore"), min: 0, max: 5 },
      series: [
        {
          name: t("complianceDashboard.riskLow"),
          type: "scatter",
          data: genData(40, 5, 12),
          symbolSize: (d) => d[2],
          itemStyle: { color: "rgba(16,185,129,0.6)", borderColor: "#10b981" },
        },
        {
          name: t("complianceDashboard.riskMedium"),
          type: "scatter",
          data: genData(15, 8, 15),
          symbolSize: (d) => d[2],
          itemStyle: { color: "rgba(245,158,11,0.6)", borderColor: "#f59e0b" },
        },
        {
          name: t("complianceDashboard.riskHigh"),
          type: "scatter",
          data: genData(5, 10, 20),
          symbolSize: (d) => d[2],
          itemStyle: { color: "rgba(239,68,68,0.6)", borderColor: "#ef4444" },
        },
      ],
    };
  });

  const certBarOption = computed(() => ({
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { top: 10, right: 30, bottom: 10, left: 8, containLabel: true },
    xAxis: { type: "value" },
    yAxis: {
      type: "category",
      data: ["ISO 9001", "TSE", "CE", "REACH", "GMP", "HACCP"],
      inverse: true,
    },
    series: [
      {
        type: "bar",
        data: [12, 8, 15, 5, 3, 7],
        barWidth: 14,
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: (p) => (p.data <= 5 ? "#ef4444" : p.data <= 10 ? "#f59e0b" : "#10b981"),
        },
        label: {
          show: true,
          position: "right",
          formatter: `{c} ${t("complianceDashboard.daysUnit")}`,
          fontSize: 10,
          fontWeight: 600,
        },
      },
    ],
  }));

  const complianceGaugeOption = computed(() => ({
    series: [
      {
        type: "gauge",
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        axisLine: {
          lineStyle: {
            width: 14,
            color: [
              [0.6, "#ef4444"],
              [0.85, "#f59e0b"],
              [1, "#10b981"],
            ],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { distance: 14, fontSize: 10 },
        pointer: { length: "60%", width: 5, itemStyle: { color: "#f5b800" } },
        anchor: { show: true, size: 10, itemStyle: { color: "#f5b800", borderWidth: 2 } },
        title: { show: true, offsetCenter: [0, "72%"], fontSize: 12, fontWeight: 600 },
        detail: {
          valueAnimation: true,
          fontSize: 28,
          fontWeight: 700,
          color: isDark.value ? "#e5e7eb" : "#1f2937",
          offsetCenter: [0, "45%"],
          formatter: "{value}%",
        },
        data: [{ value: 94.2, name: t("complianceDashboard.complianceScoreName") }],
      },
    ],
  }));
</script>
