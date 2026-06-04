<template>
  <div>
    <GlobalFilterBar />
    <DashboardGrid>
      <KpiCard
        :title="t('catalogDashboard.kpiTotalProducts')"
        value="12,847"
        icon="fas fa-cube"
        icon-bg="bg-violet-50"
        icon-color="text-violet-500"
        change="8.3"
        :change-positive="true"
      />
      <KpiCard
        :title="t('catalogDashboard.kpiActiveListings')"
        value="9,245"
        icon="fas fa-list"
        icon-bg="bg-blue-50"
        icon-color="text-blue-500"
        change="5.1"
        :change-positive="true"
      />
      <KpiCard
        :title="t('catalogDashboard.kpiCategory')"
        value="234"
        icon="fas fa-folder-tree"
        icon-bg="bg-amber-50"
        icon-color="text-amber-500"
        change="12"
        :change-positive="true"
        :change-label="t('catalogDashboard.newlyAdded')"
      />
      <KpiCard
        :title="t('catalogDashboard.kpiStockAlert')"
        value="38"
        icon="fas fa-bell"
        icon-bg="bg-red-50"
        icon-color="text-red-500"
        change="7"
        :change-positive="false"
        :change-label="t('catalogDashboard.increase')"
      />
    </DashboardGrid>

    <DashboardGrid class="mt-5">
      <WidgetWrapper
        :title="t('catalogDashboard.categoryTreeTitle')"
        :subtitle="t('catalogDashboard.categoryTreeSubtitle')"
        size="lg"
      >
        <BaseChart :option="treemapOption" height="350px" />
      </WidgetWrapper>
      <WidgetWrapper
        :title="t('catalogDashboard.skuPerfTitle')"
        :subtitle="t('catalogDashboard.skuPerfSubtitle')"
        size="lg"
      >
        <BaseChart :option="skuBarOption" height="350px" />
      </WidgetWrapper>
    </DashboardGrid>

    <DashboardGrid class="mt-5">
      <WidgetWrapper
        :title="t('catalogDashboard.productTrendTitle')"
        :subtitle="t('catalogDashboard.productTrendSubtitle')"
        size="xl"
      >
        <BaseChart :option="productTrendOption" height="280px" />
      </WidgetWrapper>
      <WidgetWrapper
        :title="t('catalogDashboard.listingStatusTitle')"
        :subtitle="t('catalogDashboard.listingStatusSubtitle')"
        size="md"
      >
        <BaseChart :option="listingStatusOption" height="280px" />
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

  const { t } = useI18n();
  const { currentTheme } = useTheme();
  const isDark = computed(() => currentTheme.value === "dark");

  const treemapOption = computed(() => ({
    tooltip: { formatter: `{b}: {c} ${t("catalogDashboard.productsUnit")}` },
    series: [
      {
        type: "treemap",
        roam: false,
        leafDepth: 2,
        breadcrumb: {
          show: true,
          itemStyle: {
            color: isDark.value ? "#2a2a38" : "#f3f4f6",
            borderColor: isDark.value ? "#3a3a4a" : "#e5e7eb",
            textStyle: { color: isDark.value ? "#9ca3af" : "#6b7280" },
          },
        },
        levels: [
          {
            itemStyle: {
              borderWidth: 2,
              borderColor: isDark.value ? "#2d2d3d" : "#e5e7eb",
              gapWidth: 2,
            },
          },
          {
            itemStyle: {
              borderWidth: 1,
              borderColor: isDark.value ? "#2d2d3d" : "#e5e7eb",
              gapWidth: 1,
            },
            upperLabel: { show: true, color: isDark.value ? "#e5e7eb" : "#374151" },
          },
        ],
        data: [
          {
            name: t("catalogDashboard.catChemicals"),
            value: 3200,
            children: [
              { name: t("catalogDashboard.catSolvents"), value: 1200 },
              { name: t("catalogDashboard.catResins"), value: 900 },
              { name: t("catalogDashboard.catAcids"), value: 650 },
              { name: t("catalogDashboard.catBases"), value: 450 },
            ],
          },
          {
            name: t("catalogDashboard.catBuildingMaterials"),
            value: 2800,
            children: [
              { name: t("catalogDashboard.catPaints"), value: 1100 },
              { name: t("catalogDashboard.catAdhesives"), value: 850 },
              { name: t("catalogDashboard.catInsulation"), value: 500 },
              { name: t("catalogDashboard.catCoating"), value: 350 },
            ],
          },
          {
            name: t("catalogDashboard.catPackaging"),
            value: 1500,
            children: [
              { name: t("catalogDashboard.catPlastic"), value: 600 },
              { name: t("catalogDashboard.catPaper"), value: 500 },
              { name: t("catalogDashboard.catMetal"), value: 400 },
            ],
          },
          {
            name: t("catalogDashboard.catRawMaterial"),
            value: 2100,
            children: [
              { name: t("catalogDashboard.catPolymer"), value: 900 },
              { name: t("catalogDashboard.catMetal"), value: 700 },
              { name: t("catalogDashboard.catTextile"), value: 500 },
            ],
          },
        ],
      },
    ],
  }));

  const skuBarOption = computed(() => ({
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { top: 10, right: 30, bottom: 10, left: 8, containLabel: true },
    xAxis: { type: "value" },
    yAxis: {
      type: "category",
      data: ["SKU-A001", "SKU-B045", "SKU-C012", "SKU-D089", "SKU-E034", "SKU-F067", "SKU-G023"],
      inverse: true,
    },
    series: [
      {
        type: "bar",
        data: [2450, 1890, 1560, 1340, 1120, 980, 840],
        barWidth: 14,
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: (p) => CHART_PALETTE[p.dataIndex % CHART_PALETTE.length],
        },
        label: { show: true, position: "right", fontSize: 10, fontWeight: 600 },
      },
    ],
  }));

  const productTrendOption = computed(() => ({
    tooltip: { trigger: "axis" },
    grid: { top: 20, right: 16, bottom: 24, left: 48 },
    xAxis: { type: "category", data: MONTHS_TR },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        data: [320, 280, 350, 420, 380, 460, 510, 490, 530, 580, 620, 680],
        itemStyle: { borderRadius: [4, 4, 0, 0], color: CHART_PALETTE[0] },
        label: { show: true, position: "top", fontSize: 10 },
      },
    ],
  }));

  const listingStatusOption = computed(() => ({
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
          borderColor: isDark.value ? "#1a1a28" : "#ffffff",
        },
        label: {
          show: true,
          position: "center",
          formatter: `{total|12,847}\n{sub|${t("catalogDashboard.kpiTotalProducts")}}`,
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
            value: 9245,
            name: t("catalogDashboard.statusActive"),
            itemStyle: { color: "#10b981" },
          },
          {
            value: 2100,
            name: t("catalogDashboard.statusPassive"),
            itemStyle: { color: "#6b7280" },
          },
          { value: 1502, name: t("catalogDashboard.statusDraft"), itemStyle: { color: "#f59e0b" } },
        ],
      },
    ],
  }));
</script>
