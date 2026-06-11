<template>
  <div data-tour="pov-overview">
    <DynamicDashboard
      dashboard-key="platform_overview"
      :title="t('platformOverview.title')"
      :subtitle="t('platformOverview.subtitle')"
      :show-seller-filter="true"
    />
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";
  import { usePageTour } from "@/composables/usePageTour";
  import DynamicDashboard from "./DynamicDashboard.vue";

  const { t } = useI18n();

  // Sayfa-içi onboarding: genel bakış → dönem filtresi → KPI/widget grid'i.
  usePageTour("platform-overview", () => [
    {
      target: '[data-tour="pov-overview"]',
      title: t("tourSteps.page.povOverview_t"),
      desc: t("tourSteps.page.povOverview_d"),
    },
    {
      target: '[data-tour="dash-period"]',
      title: t("tourSteps.page.povPeriod_t"),
      desc: t("tourSteps.page.povPeriod_d"),
    },
    {
      target: '[data-tour="dash-grid"]',
      title: t("tourSteps.page.povWidgets_t"),
      desc: t("tourSteps.page.povWidgets_d"),
    },
  ]);
</script>
