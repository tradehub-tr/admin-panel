<template>
  <div>
    <SellerKybBanner />
    <DynamicDashboard
      dashboard-key="seller_overview"
      :title="t('sellerOverview.title')"
      :subtitle="t('sellerOverview.subtitle')"
      scope="__me__"
    />
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";
  import DynamicDashboard from "./DynamicDashboard.vue";
  import SellerKybBanner from "@/components/SellerKybBanner.vue";

  const { t } = useI18n();
</script>
