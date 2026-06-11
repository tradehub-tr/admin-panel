<template>
  <div>
    <div data-tour="sov-verify">
      <SellerKybBanner />
    </div>
    <div data-tour="sov-dashboard">
      <DynamicDashboard
        dashboard-key="seller_overview"
        :title="t('sellerOverview.title')"
        :subtitle="t('sellerOverview.subtitle')"
        scope="__me__"
      />
    </div>
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";
  import DynamicDashboard from "./DynamicDashboard.vue";
  import SellerKybBanner from "@/components/SellerKybBanner.vue";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();

  // Sayfa-içi onboarding: KYB doğrulama bandı → satıcının kendi panosu (KPI + grafikler).
  usePageTour("seller-overview", () => [
    {
      target: '[data-tour="sov-verify"]',
      title: t("tourSteps.page.sovVerify_t"),
      desc: t("tourSteps.page.sovVerify_d"),
    },
    {
      target: '[data-tour="sov-dashboard"]',
      title: t("tourSteps.page.sovDashboard_t"),
      desc: t("tourSteps.page.sovDashboard_d"),
    },
  ]);
</script>
